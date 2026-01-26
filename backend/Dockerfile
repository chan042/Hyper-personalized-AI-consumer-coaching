# backend/Dockerfile
#
# [파일 역할]
# - 백엔드(Django) 서버를 실행하기 위한 Docker 이미지를 생성하는 설계도입니다.
# - Python 환경 설정, 의존성 설치, 소스 코드 복사 등의 작업을 수행합니다.

# 1. 어떤 OS와 언어 환경에서 시작할지 결정 (Python 3.11의 가벼운 버전)
FROM python:3.11-slim

# 2. 해킹 방지를 위해 파이썬의 표준 출력/에러 버퍼를 사용하지 않음
ENV PYTHONUNBUFFERED 1

# 3. 컨테이너 안에서 작업할 기본 폴더 위치를 /app 으로 설정
WORKDIR /app

# 4. requirements.txt 파일을 먼저 복사 (소스코드보다 먼저 복사해야 빌드 속도 향상)
COPY requirements.txt requirements.txt

# 5. 복사된 파일을 이용해 파이썬 라이브러리(Django 등) 설치
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# 6. 나머지 모든 소스 코드를 /app 폴더로 복사
COPY . .