from apps.battles.models import BattleMissionTemplate, YuntaekBattle
from apps.challenges.models import ChallengeTemplate


_TEMPLATE_REFERENCES = {
    "three_day_zero_spend": {
        "name": "3일 연속 무지출 챌린지",
        "code": "three_day_zero_spend",
    },
    "thirty_thousand_happiness": {
        "name": "3만원의 행복",
        "code": "thirty_thousand_happiness",
    },
    "no_x_day": {
        "name": "무00의 날",
        "code": "no_x_day",
    },
}


def build_battle_mission_template_definitions():
    return [
        {
            "category": YuntaekBattle.Category.ALTERNATIVE,
            "display_order": 1,
            "title": "AI 챌린지 1개 먼저 시작",
            "description": "AI 코칭카드를 챌린지로 먼저 만들어 시작해보세요.",
            "verification_type": "ai_challenge_started_count",
            "verification_config": {
                "source_type": "ai",
                "required_count": 1,
            },
        },
        {
            "category": YuntaekBattle.Category.ALTERNATIVE,
            "display_order": 2,
            "title": "AI 챌린지 1개 먼저 완료",
            "description": "AI 코칭카드로 만든 챌린지 1개를 상대보다 먼저 성공하세요!",
            "verification_type": "ai_challenge_completed_count",
            "verification_config": {
                "source_type": "ai",
                "required_count": 1,
            },
        },
        {
            "category": YuntaekBattle.Category.ALTERNATIVE,
            "display_order": 3,
            "title": "AI 챌린지 2개 먼저 완료",
            "description": "AI 코칭카드로 만든 챌린지 2개를 상대보다 먼저 성공하세요!",
            "verification_type": "ai_challenge_completed_count",
            "verification_config": {
                "source_type": "ai",
                "required_count": 2,
            },
        },
        {
            "category": YuntaekBattle.Category.GROWTH,
            "display_order": 1,
            "title": "교육/학습 카테고리 거래 1건 먼저 등록",
            "description": "`교육/학습` 카테고리 거래 1건을 먼저 등록하세요.",
            "verification_type": "transaction_category_count",
            "verification_config": {
                "category": "교육/학습",
                "required_count": 1,
            },
        },
        {
            "category": YuntaekBattle.Category.GROWTH,
            "display_order": 2,
            "title": "교육/학습 카테고리 누적 20,000원 먼저 달성",
            "description": "`교육/학습` 카테고리 거래 누적 20,000원을 먼저 달성하세요.",
            "verification_type": "transaction_category_amount",
            "verification_config": {
                "category": "교육/학습",
                "target_amount": 20000,
            },
        },
        {
            "category": YuntaekBattle.Category.GROWTH,
            "display_order": 3,
            "title": "교육/학습 카테고리 거래 3건 먼저 달성",
            "description": "`교육/학습` 카테고리 거래 3건을 먼저 달성하세요.",
            "verification_type": "transaction_category_count",
            "verification_config": {
                "category": "교육/학습",
                "required_count": 3,
            },
        },
        {
            "category": YuntaekBattle.Category.HEALTH,
            "display_order": 1,
            "title": "의료/건강 카테고리 거래 1건 먼저 등록",
            "description": "`의료/건강` 카테고리 거래 1건을 먼저 등록하세요.",
            "verification_type": "transaction_category_count",
            "verification_config": {
                "category": "의료/건강",
                "required_count": 1,
            },
        },
        {
            "category": YuntaekBattle.Category.HEALTH,
            "display_order": 2,
            "title": "카페/간식 카테고리 3일 연속 무지출 먼저 달성",
            "description": "`카페/간식` 카테고리 3일 연속 무지출을 먼저 달성하세요. 대결 시작 다음 날부터 매일 00:01 기준으로 정산됩니다.",
            "verification_type": "category_zero_spend_streak",
            "verification_config": {
                "category": "카페/간식",
                "required_days": 3,
            },
        },
        {
            "category": YuntaekBattle.Category.HEALTH,
            "display_order": 3,
            "title": "술/유흥 카테고리 7일 무지출 먼저 달성",
            "description": "`술/유흥` 카테고리 7일 무지출을 먼저 달성하세요. 대결 시작 다음 날부터 매일 00:01 기준으로 정산됩니다.",
            "verification_type": "category_zero_spend_streak",
            "verification_config": {
                "category": "술/유흥",
                "required_days": 7,
            },
        },
        {
            "category": YuntaekBattle.Category.CHALLENGE,
            "display_order": 1,
            "title": "3일 연속 무지출 챌린지 성공",
            "description": "두둑 챌린지인 '3일 연속 무지출 챌린지'를 상대보다 먼저 성공하세요!",
            "verification_type": "challenge_template_complete",
            "verification_config": {
                "template_name": _TEMPLATE_REFERENCES["three_day_zero_spend"]["name"],
                "template_code": _TEMPLATE_REFERENCES["three_day_zero_spend"]["code"],
            },
        },
        {
            "category": YuntaekBattle.Category.CHALLENGE,
            "display_order": 2,
            "title": "3만원의 행복 챌린지 성공",
            "description": "두둑 챌린지인 '3만원의 행복'을 상대보다 먼저 성공하세요!",
            "verification_type": "challenge_template_complete",
            "verification_config": {
                "template_name": _TEMPLATE_REFERENCES["thirty_thousand_happiness"]["name"],
                "template_code": _TEMPLATE_REFERENCES["thirty_thousand_happiness"]["code"],
            },
        },
        {
            "category": YuntaekBattle.Category.CHALLENGE,
            "display_order": 3,
            "title": "무00의 날 챌린지 성공",
            "description": "두둑 챌린지인 '무00의 날'을 상대보다 먼저 성공하세요!",
            "verification_type": "challenge_template_complete",
            "verification_config": {
                "template_name": _TEMPLATE_REFERENCES["no_x_day"]["name"],
                "template_code": _TEMPLATE_REFERENCES["no_x_day"]["code"],
            },
        },
    ]


def _validate_challenge_template_dependencies(definitions):
    template_code_to_name = {
        definition["verification_config"].get("template_code"): definition["verification_config"].get("template_name")
        for definition in definitions
        if definition["verification_type"] == "challenge_template_complete"
        and definition["verification_config"].get("template_code")
    }
    existing_codes = set(
        ChallengeTemplate.objects.filter(code__in=template_code_to_name, is_active=True)
        .values_list("code", flat=True)
    )
    missing_template_names = sorted(
        name for code, name in template_code_to_name.items() if code not in existing_codes
    )
    if missing_template_names:
        raise ValueError(
            "배틀 미션 시드에 필요한 챌린지 템플릿이 없습니다: "
            + ", ".join(missing_template_names)
        )


def _needs_dependency_refresh(template, definition):
    if definition["verification_type"] != "challenge_template_complete":
        return False

    existing_config = template.verification_config or {}
    desired_config = definition["verification_config"] or {}
    return (
        existing_config.get("template_code") != desired_config.get("template_code")
        or existing_config.get("template_name") != desired_config.get("template_name")
    )


def seed_battle_mission_templates(force_update=False):
    definitions = build_battle_mission_template_definitions()
    _validate_challenge_template_dependencies(definitions)

    created = 0
    updated = 0
    skipped = 0

    for definition in definitions:
        template, was_created = BattleMissionTemplate.objects.get_or_create(
            category=definition["category"],
            display_order=definition["display_order"],
            defaults={
                "title": definition["title"],
                "description": definition["description"],
                "verification_type": definition["verification_type"],
                "verification_config": definition["verification_config"],
                "is_active": True,
            },
        )

        if was_created:
            created += 1
            continue

        should_update = force_update or _needs_dependency_refresh(template, definition)
        if not should_update:
            skipped += 1
            continue

        changed = False
        for field in ["title", "description", "verification_type", "verification_config"]:
            new_value = definition[field]
            if getattr(template, field) != new_value:
                setattr(template, field, new_value)
                changed = True

        if not template.is_active:
            template.is_active = True
            changed = True

        if changed:
            template.save(
                update_fields=[
                    "title",
                    "description",
                    "verification_type",
                    "verification_config",
                    "is_active",
                ]
            )
            updated += 1
        else:
            skipped += 1

    return {
        "created": created,
        "updated": updated,
        "skipped": skipped,
    }


_build_template_definitions = build_battle_mission_template_definitions
