from django.db import connection
from django.http import JsonResponse


def healthz(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()

        return JsonResponse(
            {
                'status': 'ok',
                'database': 'ok',
            }
        )
    except Exception as exc:
        return JsonResponse(
            {
                'status': 'degraded',
                'database': 'error',
                'detail': str(exc),
            },
            status=503,
        )
