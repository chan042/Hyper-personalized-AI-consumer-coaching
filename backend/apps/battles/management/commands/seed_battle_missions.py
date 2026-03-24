from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed battle mission templates into the database."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force-update",
            action="store_true",
            help="Update existing battle mission templates as well.",
        )

    def handle(self, *args, **options):
        from apps.battles.seed_mission_templates import seed_battle_mission_templates

        result = seed_battle_mission_templates(force_update=options["force_update"])
        self.stdout.write(
            self.style.SUCCESS(
                f"seed_battle_missions done. created={result['created']}, "
                f"updated={result['updated']}, skipped={result['skipped']}"
            )
        )
