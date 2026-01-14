from django.urls import path
from .views import ParseTransactionView, CreateTransactionView, TransactionListView, CategoryStatsView

urlpatterns = [
    path('parse/', ParseTransactionView.as_view(), name='parse_transaction'),
    path('create/', CreateTransactionView.as_view(), name='create_transaction'),
    path('category-stats/', CategoryStatsView.as_view(), name='category_stats'),
    path('', TransactionListView.as_view(), name='list_transactions'),
]
