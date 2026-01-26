# frontend/Dockerfile
#
# [파일 역할]
# - 프론트엔드(Next.js) 서버를 실행하기 위한 Docker 이미지를 생성하는 설계도입니다.
# - Node.js 환경 설정, 의존성 설치, 소스 코드 복사 등의 작업을 수행합니다.

# 1. 어떤 OS와 언어 환경에서 시작할지 결정 (Node.js 18의 가벼운 버전)
FROM node:20-alpine

# 2. 컨테이너 안에서 작업할 기본 폴더 위치를 /app 으로 설정
WORKDIR /app

# 3. package.json 파일을 먼저 복사 (소스코드보다 먼저 복사해야 빌드 속도 향상)
COPY package.json .

# 4. 복사된 파일을 이용해 자바스크립트 라이브러리(React, Next.js 등) 설치
RUN npm install --legacy-peer-deps

# 5. 나머지 모든 소스 코드를 /app 폴더로 복사
COPY . .