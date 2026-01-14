from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth import get_user_model

from .models import Transaction
from external.gemini.client import GeminiClient

User = get_user_model()

class ParseTransactionView(APIView):
    """
    자연어 텍스트를 입력받아 AI(Gemini)를 통해 구조화된 데이터로 변환하는 뷰
    DB에 저장하지 않고, 분석 결과만 반환합니다.
    """
    permission_classes = [IsAuthenticated]  # 인증된 사용자만 사용 가능

    def post(self, request):
        text = request.data.get('text', '')
        if not text:
            return Response({"error": "No text provided"}, status=status.HTTP_400_BAD_REQUEST)

        # Gemini AI 클라이언트를 사용하여 텍스트 분석
        client = GeminiClient()
        parsed_data = client.analyze_text(text)
        
        if not parsed_data:
            return Response({"error": "Failed to parse text"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        return Response(parsed_data)

class CreateTransactionView(APIView):
    """
    분석된(또는 사용자가 입력한) 데이터를 받아 실제 DB에 지출 내역을 저장하는 뷰
    """
    permission_classes = [IsAuthenticated]  # 인증된 사용자만 사용 가능

    def post(self, request):
        data = request.data
        
        # 로그인한 사용자 사용
        user = request.user

        try:
            from django.utils import timezone
            transaction_date = data.get('date')
            
            # 날짜가 없으면 현재 시간으로 설정
            if not transaction_date:
                transaction_date = timezone.now()

            # DB에 Transaction 객체 생성 및 저장
            transaction = Transaction.objects.create(
                user=user,
                category=data.get('category', '기타'),
                item=data.get('item', ''),
                store=data.get('store', ''),
                amount=data.get('amount', 0),
                memo=data.get('memo', ''),
                date=transaction_date,
                address=data.get('address', ''),
                is_fixed=data.get('is_fixed', False)
            )

            return Response({"message": "Transaction created", "id": transaction.id}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class TransactionListView(APIView):
    """
    사용자의 지출 내역 목록을 조회하는 뷰
    """
    permission_classes = [IsAuthenticated]  # 인증된 사용자만 사용 가능

    def get(self, request):
        # 로그인한 사용자의 지출 내역만 조회
        user = request.user
        
        # 최신순으로 정렬하여 조회 (날짜 같으면 최신 등록순)
        transactions = Transaction.objects.filter(user=user).order_by('-date', '-id')
        
        # Serializer를 따로 안 만들었으므로 수동 직렬화 (MVP)
        data = []
        for t in transactions:
            data.append({
                "id": t.id,
                "category": t.category,
                "item": t.item,
                "store": t.store,
                "amount": t.amount,
                "memo": t.memo,
                "date": t.date,
                "address": t.address,
                "is_fixed": t.is_fixed
            })
        return Response(data)

class CategoryStatsView(APIView):
    """
    사용자의 카테고리별 지출 통계를 조회하는 뷰
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # 사용자의 모든 지출 내역 조회
        transactions = Transaction.objects.filter(user=user)
        
        # 카테고리별 지출 합계 계산
        from django.db.models import Sum
        category_stats = transactions.values('category').annotate(
            total=Sum('amount')
        ).order_by('-total')
        
        # 전체 지출 금액 계산
        total_spending = sum(item['total'] for item in category_stats)
        
        # 카테고리별 데이터 구성 (비율 포함)
        result = []
        for item in category_stats:
            result.append({
                'category': item['category'],
                'amount': item['total'],
                'percent': round((item['total'] / total_spending * 100), 1) if total_spending > 0 else 0
            })
        
        return Response({
            'categories': result,
            'total': total_spending
        })
