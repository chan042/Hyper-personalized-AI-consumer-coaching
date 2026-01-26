from rest_framework import serializers
from .models import Transaction

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ['id', 'category', 'item', 'store', 'amount', 'memo', 'date', 'address', 'is_fixed']
