from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Count


class Command(BaseCommand):
    help = "Seed deployment reference data: challenges, shop items, and battle mission templates."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force-update",
            action="store_true",
            help="Update existing challenge and battle templates to match code definitions.",
        )
        parser.add_argument(
            "--prune-shop",
            action="store_true",
            help="Delete shop items that are not present in the current seed list.",
        )

    def handle(self, *args, **options):
        from apps.battles.seed_mission_templates import (
            build_battle_mission_template_definitions,
            seed_battle_mission_templates,
        )
        from apps.challenges.seed_challenges import (
            DUDUK_CHALLENGE_TEMPLATES,
            seed_challenge_templates,
        )
        from apps.shop.seed_shop_items import SHOP_ITEMS, seed_shop_items

        force_update = options["force_update"]
        prune_shop = options["prune_shop"]

        self.stdout.write("Seeding reference data...")

        with transaction.atomic():
            challenge_result = seed_challenge_templates(force_update=force_update)
            shop_result = seed_shop_items(prune=prune_shop)
            battle_result = seed_battle_mission_templates(force_update=force_update)
            validation = self._validate_seeded_data(
                expected_challenge_names=[item["name"] for item in DUDUK_CHALLENGE_TEMPLATES],
                expected_shop_names=[item["name"] for item in SHOP_ITEMS],
                expected_battle_template_count=len(build_battle_mission_template_definitions()),
            )

        self.stdout.write(
            self.style.SUCCESS(
                "seed_reference_data done. "
                f"challenges(created={challenge_result['created']}, updated={challenge_result['updated']}, skipped={challenge_result['skipped']}), "
                f"shop(created={shop_result['created']}, updated={shop_result['updated']}, deleted={shop_result['deleted']}, pruned={shop_result['pruned']}), "
                f"battles(created={battle_result['created']}, updated={battle_result['updated']}, skipped={battle_result['skipped']})"
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                "validation ok. "
                f"challenges={validation['challenge_count']}, "
                f"shop={validation['shop_count']}, "
                f"battle_templates={validation['battle_count']}"
            )
        )

    def _validate_seeded_data(
        self,
        *,
        expected_challenge_names,
        expected_shop_names,
        expected_battle_template_count,
    ):
        from apps.battles.models import BattleMissionTemplate
        from apps.challenges.models import ChallengeTemplate
        from apps.shop.models import ShopItem

        expected_challenge_names = list(expected_challenge_names)
        expected_shop_names = list(expected_shop_names)

        challenge_queryset = ChallengeTemplate.objects.filter(
            source_type="duduk",
            name__in=expected_challenge_names,
        )
        challenge_names = set(challenge_queryset.values_list("name", flat=True))
        missing_challenges = sorted(set(expected_challenge_names) - challenge_names)
        duplicate_challenges = list(
            challenge_queryset.values("name")
            .annotate(count=Count("id"))
            .filter(count__gt=1)
            .values_list("name", flat=True)
        )

        shop_queryset = ShopItem.objects.filter(name__in=expected_shop_names)
        shop_names = set(shop_queryset.values_list("name", flat=True))
        missing_shop_items = sorted(set(expected_shop_names) - shop_names)
        duplicate_shop_items = list(
            shop_queryset.values("name")
            .annotate(count=Count("id"))
            .filter(count__gt=1)
            .values_list("name", flat=True)
        )

        battle_templates = list(
            BattleMissionTemplate.objects.filter(is_active=True).order_by("category", "display_order", "id")
        )
        missing_battle_template_refs = [
            f"{template.category}:{template.display_order}:{template.title}"
            for template in battle_templates
            if template.verification_type == "challenge_template_complete"
            and not (
                (template.verification_config or {}).get("template_code")
                or (template.verification_config or {}).get("template_id")
            )
        ]

        errors = []
        if missing_challenges:
            errors.append(f"missing challenge templates: {', '.join(missing_challenges)}")
        if duplicate_challenges:
            errors.append(f"duplicate challenge templates: {', '.join(sorted(duplicate_challenges))}")
        if missing_shop_items:
            errors.append(f"missing shop items: {', '.join(missing_shop_items)}")
        if duplicate_shop_items:
            errors.append(f"duplicate shop items: {', '.join(sorted(duplicate_shop_items))}")
        if len(battle_templates) != expected_battle_template_count:
            errors.append(
                f"battle mission template count mismatch: expected {expected_battle_template_count}, got {len(battle_templates)}"
            )
        if missing_battle_template_refs:
            errors.append(
                "battle mission templates missing challenge template references: "
                + ", ".join(missing_battle_template_refs)
            )

        if errors:
            raise CommandError("; ".join(errors))

        return {
            "challenge_count": len(challenge_names),
            "shop_count": len(shop_names),
            "battle_count": len(battle_templates),
        }
