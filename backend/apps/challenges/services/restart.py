import copy
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.challenges.models import UserChallenge
from apps.challenges.services.lifecycle import resolve_challenge_start_at
from apps.challenges.services.progress import build_initial_progress_for_user_challenge


def restart_user_challenge(*, source_challenge, request, user_input_values=None):
    user_input_values = user_input_values or {}

    with transaction.atomic():
        locked = UserChallenge.objects.select_for_update().get(
            pk=source_challenge.pk,
            user=request.user,
        )

        if locked.status != "failed":
            raise ValidationError("실패한 챌린지만 재도전할 수 있습니다.")

        if not locked.is_current_attempt:
            raise ValidationError("이미 더 최신 시도가 존재합니다.")

        if locked.template_id:
            return _restart_template_challenge(
                source_challenge=locked,
                request=request,
                user_input_values=user_input_values,
            )

        return _restart_same_spec_challenge(source_challenge=locked)


def _restart_template_challenge(*, source_challenge, request, user_input_values):
    from apps.challenges.serializers import UserChallengeCreateSerializer

    serializer = UserChallengeCreateSerializer(
        data={
            "template_id": source_challenge.template_id,
            "user_input_values": user_input_values,
        },
        context={"request": request},
    )
    serializer.is_valid(raise_exception=True)

    source_challenge.is_current_attempt = False
    source_challenge.save(update_fields=["is_current_attempt", "updated_at"])

    return serializer.save(
        previous_attempt=source_challenge,
        attempt_group_id=source_challenge.attempt_group_id,
    )


def _restart_same_spec_challenge(*, source_challenge):
    now = timezone.now()
    success_conditions = copy.deepcopy(source_challenge.success_conditions or {})
    user_input_values = copy.deepcopy(source_challenge.user_input_values or {})
    system_generated_values = copy.deepcopy(source_challenge.system_generated_values or {})
    display_config = copy.deepcopy(source_challenge.display_config or {})
    success_description = copy.deepcopy(source_challenge.success_description or [])

    restart_challenge = UserChallenge(
        user=source_challenge.user,
        source_type=source_challenge.source_type,
        template=source_challenge.template,
        source_coaching=source_challenge.source_coaching,
        name=source_challenge.name,
        description=source_challenge.description,
        difficulty=source_challenge.difficulty,
        duration_days=source_challenge.duration_days,
        success_conditions=success_conditions,
        user_input_values=user_input_values,
        system_generated_values=system_generated_values,
        requires_daily_check=source_challenge.requires_daily_check,
        requires_photo=source_challenge.requires_photo,
        photo_frequency=source_challenge.photo_frequency,
        photo_description=source_challenge.photo_description,
        base_points=source_challenge.base_points,
        points_formula=source_challenge.points_formula,
        max_points=source_challenge.max_points,
        has_penalty=source_challenge.has_penalty,
        penalty_formula=source_challenge.penalty_formula,
        max_penalty=source_challenge.max_penalty,
        bonus_condition=copy.deepcopy(source_challenge.bonus_condition),
        bonus_points=source_challenge.bonus_points,
        success_description=success_description,
        display_config=display_config,
        attempt_number=source_challenge.attempt_number + 1,
        attempt_group_id=source_challenge.attempt_group_id,
        previous_attempt=source_challenge,
        is_current_attempt=True,
    )

    start_at = resolve_challenge_start_at(success_conditions, now)
    restart_challenge.started_at = start_at
    restart_challenge.ends_at = start_at + timedelta(days=restart_challenge.duration_days - 1)
    restart_challenge.status = "active" if start_at <= now else "ready"
    restart_challenge.progress = build_initial_progress_for_user_challenge(restart_challenge)

    source_challenge.is_current_attempt = False
    source_challenge.save(update_fields=["is_current_attempt", "updated_at"])

    restart_challenge.save()
    if restart_challenge.status == "active":
        from apps.challenges.signals import _update_challenge_progress

        _update_challenge_progress(restart_challenge, reference=start_at)
    return restart_challenge
