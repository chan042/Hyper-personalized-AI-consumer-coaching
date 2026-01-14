from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """
    Custom User model for Duduk project.
    Inherits from AbstractUser to allow future extension.
    이메일을 기본 로그인 필드로 사용합니다.
    """
    # 이메일 기반 인증 설정
    email = models.EmailField(unique=True, verbose_name='이메일')
    
    USERNAME_FIELD = 'email'  # 로그인 시 이메일 사용
    REQUIRED_FIELDS = ['username']  # createsuperuser 시 필요한 필드
    
    # 사용자 특성
    job = models.CharField(max_length=100, blank=True, null=True) # 직업
    hobbies = models.TextField(blank=True, null=True) # 취미 (예: 독서, 등산)
    self_development_field = models.CharField(max_length=100, blank=True, null=True) # 자기개발 분야

    # 인적 사항
    MARITAL_STATUS_CHOICES = [
        ('SINGLE', '미혼'),
        ('MARRIED', '기혼'),
    ]
    marital_status = models.CharField(max_length=10, choices=MARITAL_STATUS_CHOICES, default='SINGLE')
    has_children = models.BooleanField(default=False) # 자녀 유무
    birth_date = models.DateField(null=True, blank=True) # 생년월일

    # 온보딩 정보 수집 필드
    age = models.IntegerField(null=True, blank=True, verbose_name='나이')
    monthly_budget = models.DecimalField(
        max_digits=12, decimal_places=0, null=True, blank=True, 
        verbose_name='월 예산'
    )
    spending_to_improve = models.TextField(
        null=True, blank=True, verbose_name='개선하고 싶은 소비'
    )
    is_profile_complete = models.BooleanField(default=False, verbose_name='프로필 완성 여부')

    def __str__(self):
        return self.username
