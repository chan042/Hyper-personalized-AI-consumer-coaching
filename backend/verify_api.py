import os
import django
import sys

# Add backend directory to sys.path
sys.path.append('/Users/lyuchan/antigravity/duduk-project/backend')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.transactions.models import Transaction

User = get_user_model()

def run_verification():
    # Create User
    username = 'testuser'
    password = 'testpassword123'
    if not User.objects.filter(username=username).exists():
        user = User.objects.create_user(username=username, password=password)
        print(f"User {username} created.")
    else:
        user = User.objects.get(username=username)
        print(f"User {username} already exists.")

    # Initialize Client
    client = APIClient()
    client.force_authenticate(user=user)

    # --- New Endpoints Verification ---
    print("\n--- Testing Custom Endpoints ---")

    # 1. Test Parse
    parse_data = {"text": "스타벅스 5000원"}
    response = client.post('/api/transactions/parse/', parse_data, format='json')
    print(f"Parse Response: {response.status_code}")
    if response.status_code == 200:
        print("Parse Result:", response.data)
        parsed_result = response.data
    else:
        print("Parse Failed:", response.data)
        parsed_result = {
            "category": "Cafe",
            "item": "Americano",
            "store": "Starbucks",
            "amount": 5000,
            "memo": "Parsed manually"
        }

    # 2. Test Create
    # Note: Create endpoint now expects parsed data directly
    response = client.post('/api/transactions/create/', parsed_result, format='json')
    print(f"Create Response: {response.status_code}")
    if response.status_code == 201:
        print("Create Success:", response.data)
    else:
        print("Create Failed:", response.data)

    # 3. Test Coaching
    response = client.get('/api/coaching/advice/')
    print(f"Coaching Response: {response.status_code}")
    if response.status_code == 200:
        print("Coaching Result:", response.data)
    else:
        print("Coaching Failed:", response.data)

if __name__ == "__main__":
    run_verification()
