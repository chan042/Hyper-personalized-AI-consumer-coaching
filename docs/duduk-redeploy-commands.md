# Duduk 재배포 명령 정리

이 문서는 `duduk` 프로젝트에서 자주 쓰는 재배포 명령을 빠르게 복붙할 수 있도록 정리한 문서입니다.

현재 스테이징 환경:

- 프론트 웹: [https://duduk-web-staging-htj7x3xmnq-du.a.run.app](https://duduk-web-staging-htj7x3xmnq-du.a.run.app)
- 백엔드 API: [https://duduk-api-staging-htj7x3xmnq-du.a.run.app](https://duduk-api-staging-htj7x3xmnq-du.a.run.app)
- GCP 프로젝트: `duduk-300c`
- 리전: `asia-northeast3`

## 1. 프론트 웹 스테이징 재배포

언제 쓰나:

- `frontend/.env.production` 값 변경
- 화면, 스타일, 프론트 로직 변경
- Google OAuth Client ID 변경
- Kakao JS Key 변경

### 1-1. 정적 빌드 다시 생성

```bash
cd /Users/chan/Project/duduk-project/frontend
npm run build:mobile
```

### 1-2. 프론트 Cloud Run 재배포

```bash
cd /Users/chan/Project/duduk-project
CLOUDSDK_CORE_DISABLE_PROMPTS=1 \
GCP_PROJECT_ID=duduk-300c \
GCP_REGION=asia-northeast3 \
CLOUD_RUN_SERVICE=duduk-web-staging \
sh /Users/chan/Project/duduk-project/frontend/cloudrun/deploy.sh
```

### 1-3. 배포 후 확인

- 메인 페이지: [https://duduk-web-staging-htj7x3xmnq-du.a.run.app](https://duduk-web-staging-htj7x3xmnq-du.a.run.app)
- 로그인 페이지: [https://duduk-web-staging-htj7x3xmnq-du.a.run.app/login](https://duduk-web-staging-htj7x3xmnq-du.a.run.app/login)

## 2. 백엔드 API 스테이징 재배포

언제 쓰나:

- Django 코드 변경
- API 응답, 비즈니스 로직 변경
- `CORS`, `CSRF`, `ALLOWED_HOSTS` 변경
- Cloud Run 환경변수 변경

### 2-1. 백엔드 Cloud Run 재배포

```bash
cd /Users/chan/Project/duduk-project
CLOUDSDK_CORE_DISABLE_PROMPTS=1 \
GCP_PROJECT_ID=duduk-300c \
GCP_REGION=asia-northeast3 \
CLOUD_RUN_SERVICE=duduk-api-staging \
CLOUD_SQL_INSTANCE=duduk-300c:asia-northeast3:duduk-staging-db \
ENV_VARS_FILE=/Users/chan/Project/duduk-project/backend/cloudrun/env.staging.yaml \
sh /Users/chan/Project/duduk-project/backend/cloudrun/deploy.sh
```

### 2-2. 배포 후 확인

- 헬스체크: [https://duduk-api-staging-htj7x3xmnq-du.a.run.app/healthz/](https://duduk-api-staging-htj7x3xmnq-du.a.run.app/healthz/)

## 3. 모바일 앱에 프론트 변경 반영

언제 쓰나:

- 프론트 변경사항을 Capacitor iOS 앱과 Android 앱에도 반영하고 싶을 때

### 3-1. 모바일용 정적 빌드 생성 + Capacitor 동기화

```bash
cd /Users/chan/Project/duduk-project/frontend
npm run build:mobile
npx cap sync
```

### 3-2. 네이티브 프로젝트 열기

#### iOS

```bash
cd /Users/chan/Project/duduk-project/frontend
npx cap open ios
```

#### Android

```bash
cd /Users/chan/Project/duduk-project/frontend
npx cap open android
```

## 4. 작업 종류별로 어떤 명령을 쓰는지

### 화면이나 프론트 로직만 바뀐 경우

1. `frontend/.env.production` 또는 프론트 코드 수정
2. `npm run build:mobile`
3. 프론트 Cloud Run 재배포
4. 필요하면 `npx cap sync`

### 백엔드 API만 바뀐 경우

1. Django 코드 또는 `backend/cloudrun/env.staging.yaml` 수정
2. 백엔드 Cloud Run 재배포

### 프론트 변경을 앱에도 반영해야 하는 경우

1. `npm run build:mobile`
2. `npx cap sync`
3. `npx cap open ios` 또는 `npx cap open android`

## 5. 한 줄 요약

- 웹사이트 다시 올리기: `frontend/cloudrun/deploy.sh`
- API 서버 다시 올리기: `backend/cloudrun/deploy.sh`
- 앱 껍데기에 프론트 다시 반영하기: `npm run build:mobile && npx cap sync`
