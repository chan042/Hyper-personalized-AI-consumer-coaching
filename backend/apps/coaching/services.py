import logging

from django.db import IntegrityError, transaction
from django.db.models import Max
from django.utils import timezone

from apps.transactions.models import Transaction
from external.ai.client import AIClient

from .models import Coaching, CoachingGenerationRequest


logger = logging.getLogger(__name__)

COACHING_TRIGGER_TRANSACTION_COUNT = 3
MAX_COACHINGS_PER_USER = 4
MAX_ERROR_LENGTH = 1000


def _truncate_error_message(message):
    return (message or "")[:MAX_ERROR_LENGTH]


def _build_transaction_context(transactions):
    return "".join(
        (
            f"- {transaction.date.strftime('%Y-%m-%d')} "
            f"{transaction.category} / {transaction.item} "
            f"({transaction.store}) / {transaction.amount}원\n"
        )
        for transaction in transactions
    )


def _cleanup_old_coachings(user_id, keep=MAX_COACHINGS_PER_USER):
    coaching_ids_to_keep = list(
        Coaching.objects.filter(user_id=user_id)
        .order_by("-created_at", "-id")
        .values_list("id", flat=True)[:keep]
    )
    if not coaching_ids_to_keep:
        return

    Coaching.objects.filter(user_id=user_id).exclude(id__in=coaching_ids_to_keep).delete()


def _get_fallback_boundary_transaction_id(user_id):
    last_coaching = Coaching.objects.filter(user_id=user_id).order_by("-created_at", "-id").first()
    if not last_coaching:
        return 0

    return (
        Transaction.objects.filter(
            user_id=user_id,
            created_at__lte=last_coaching.created_at,
        )
        .order_by("-id")
        .values_list("id", flat=True)
        .first()
        or 0
    )


def get_last_claimed_transaction_id(user_id):
    queued_boundary = (
        CoachingGenerationRequest.objects.filter(user_id=user_id).aggregate(
            max_end_transaction_id=Max("end_transaction_id")
        )["max_end_transaction_id"]
        or 0
    )
    if queued_boundary:
        return queued_boundary

    return _get_fallback_boundary_transaction_id(user_id)


def schedule_coaching_generation_requests(
    user_id,
    threshold=COACHING_TRIGGER_TRANSACTION_COUNT,
):
    created_request_ids = []

    while True:
        last_claimed_transaction_id = get_last_claimed_transaction_id(user_id)
        next_batch_transaction_ids = list(
            Transaction.objects.filter(
                user_id=user_id,
                id__gt=last_claimed_transaction_id,
            )
            .order_by("id")
            .values_list("id", flat=True)[:threshold]
        )

        if len(next_batch_transaction_ids) < threshold:
            break

        end_transaction_id = next_batch_transaction_ids[-1]

        try:
            with transaction.atomic():
                generation_request = CoachingGenerationRequest.objects.create(
                    user_id=user_id,
                    start_after_transaction_id=last_claimed_transaction_id or None,
                    end_transaction_id=end_transaction_id,
                    transaction_count=threshold,
                )
        except IntegrityError:
            refreshed_boundary = get_last_claimed_transaction_id(user_id)
            if refreshed_boundary <= last_claimed_transaction_id:
                logger.info(
                    "Coaching generation request creation raced without boundary advance "
                    "(user_id=%s, end_transaction_id=%s)",
                    user_id,
                    end_transaction_id,
                )
                break
            continue

        created_request_ids.append(generation_request.id)

    if created_request_ids:
        from .tasks import run_coaching_generation_queue

        run_coaching_generation_queue.delay(user_id)

    return created_request_ids


def _claim_next_pending_request(user_id):
    try:
        with transaction.atomic():
            generation_request = (
                CoachingGenerationRequest.objects.select_for_update()
                .filter(
                    user_id=user_id,
                    status=CoachingGenerationRequest.Status.PENDING,
                )
                .order_by("end_transaction_id", "id")
                .first()
            )
            if not generation_request:
                return None

            generation_request.status = CoachingGenerationRequest.Status.PROCESSING
            generation_request.started_at = timezone.now()
            generation_request.last_error = ""
            generation_request.save(
                update_fields=["status", "started_at", "last_error"]
            )
            return generation_request
    except IntegrityError:
        logger.info(
            "Another worker is already processing coaching requests for user_id=%s",
            user_id,
        )
        return None


def _generate_coaching_for_request(generation_request):
    window_start_id = generation_request.start_after_transaction_id or 0
    context_transactions = list(
        Transaction.objects.filter(
            user_id=generation_request.user_id,
            id__gt=window_start_id,
            id__lte=generation_request.end_transaction_id,
        )
        .order_by("id")
    )

    if len(context_transactions) < generation_request.transaction_count:
        raise ValueError("코칭 생성에 필요한 소비 내역이 부족합니다.")

    transaction_list_str = _build_transaction_context(context_transactions)

    advice_data = AIClient(purpose="coaching").get_advice(transaction_list_str)
    if not advice_data:
        raise ValueError("AI 코칭 생성에 실패했습니다.")

    coaching = Coaching.objects.create(
        user_id=generation_request.user_id,
        subject=advice_data.get("subject", "소비 분석"),
        title=advice_data.get("title", "소비 코칭"),
        analysis=advice_data.get("analysis", ""),
        coaching_content=advice_data.get("coaching_content", ""),
        estimated_savings=advice_data.get("estimated_savings", 0),
        sources=advice_data.get("sources", []),
    )

    from apps.notifications.services import create_coaching_notification

    create_coaching_notification(coaching.user, coaching)
    _cleanup_old_coachings(coaching.user_id)
    return coaching


def process_pending_coaching_generation_requests(user_id):
    processed_request_ids = []
    failed_request_ids = []

    while True:
        generation_request = _claim_next_pending_request(user_id)
        if not generation_request:
            break

        try:
            coaching = _generate_coaching_for_request(generation_request)
        except Exception as exc:
            logger.exception(
                "Failed to generate coaching for request_id=%s",
                generation_request.id,
            )
            CoachingGenerationRequest.objects.filter(id=generation_request.id).update(
                status=CoachingGenerationRequest.Status.FAILED,
                completed_at=timezone.now(),
                last_error=_truncate_error_message(str(exc)),
            )
            failed_request_ids.append(generation_request.id)
            continue

        CoachingGenerationRequest.objects.filter(id=generation_request.id).update(
            status=CoachingGenerationRequest.Status.COMPLETED,
            completed_at=timezone.now(),
            coaching_id=coaching.id,
            last_error="",
        )
        processed_request_ids.append(generation_request.id)

    return {
        "user_id": user_id,
        "processed_request_ids": processed_request_ids,
        "failed_request_ids": failed_request_ids,
    }
