from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = '초기 상점 아이템 데이터를 생성합니다.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--no-prune',
            action='store_true',
            help='시드 목록에 없는 기존 상점 아이템을 삭제하지 않습니다.',
        )

    def handle(self, *args, **options):
        from apps.shop.seed_shop_items import seed_shop_items

        self.stdout.write('상점 아이템 데이터 생성을 시작합니다...')
        result = seed_shop_items(prune=not options['no_prune'])

        self.stdout.write(
            self.style.SUCCESS(
                f"총 {result['created']}개 생성, {result['updated']}개 업데이트 완료."
            )
        )
        if result['deleted'] > 0:
            self.stdout.write(self.style.WARNING(f"총 {result['deleted']}개 미사용 아이템 삭제 완료."))