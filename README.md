# 💰 두둑 (Duduk) - AI 기반 게이미피케이션 자산 관리 플랫폼

**두둑(Duduk)**은 사용자가 즐겁게 소비 습관을 개선하고 자산을 관리할 수 있도록 돕는 **AI 기반 핀테크 플랫폼**입니다.
단순한 가계부 기능을 넘어, **캐릭터 육성**, **맞춤형 챌린지**, 그리고 **Google Gemini 기반의 AI 소비 코칭**을 통해 사용자가 능동적으로 자산을 관리하는 경험을 제공합니다.

## 🌟 주요 기능 (Key Features)

### 1. 🤖 AI 맞춤형 소비 코칭

* **Google Generative AI (Gemini)**를 활용하여 사용자의 소비 내역을 분석합니다.
* **소비 분석 및 제안**: 행동 변화 제안, 누수 소비 탐지, 위치/키워드 기반의 대안을 제시합니다.
* **절약 금액 예측**: 코칭을 따랐을 때 예상되는 절약 금액을 계산해 동기를 부여합니다.

### 2. 🏆 게이미피케이션 챌린지 시스템

* **다양한 챌린지 모드**:
* **두둑 챌린지**: 플랫폼에서 제공하는 기본 절약 미션
* **이벤트 챌린지**: 기간 한정으로 진행되는 특별 미션
* **사용자 챌린지**: 사용자가 직접 목표(금액, 카테고리 등)를 설정하여 생성하는 챌린지


* **성공/실패 판정**: 목표 금액, 기간, 카테고리 등 설정된 조건에 따라 AI 및 시스템이 자동으로 성공 여부를 판정합니다.
* **보상 시스템**: 챌린지 성공 시 포인트를 지급하여 성취감을 고취시킵니다.

### 3. 🐾 캐릭터 육성 및 포인트 시스템

* **나만의 캐릭터**: 고양이, 강아지, 햄스터, 양 등 4가지 타입의 '두둑이' 캐릭터를 선택하여 키울 수 있습니다.
* **포인트 경제**: 절약 활동과 챌린지 성공으로 모은 포인트로 캐릭터를 꾸미거나 레벨업 할 수 있습니다.

### 4. 📅 체계적인 예산 및 지출 관리

* **일일/월별 예산 스냅샷**: 매일 권장 예산과 잔여 예산을 자동으로 계산하여 보여줍니다.
* **무지출 확인**: 지출이 없는 날은 '무지출 확인' 도장을 찍어 긍정적인 피드백을 제공합니다.
* **고정 지출 관리**: 월세, 구독료 등 고정 지출을 별도로 관리하여 가용 예산을 정확하게 파악합니다.

## 🛠 기술 스택 (Tech Stack)

### Frontend

* **Framework**: Next.js 16.0.7 (App Router)
* **Library**: React 19, Lucide React (Icons), Axios
* **Styling**: Tailwind CSS (Global CSS 및 Module CSS 활용)

### Backend

* **Framework**: Django 5.x, Django REST Framework
* **Database**: PostgreSQL 15 (Alpine)
* **AI**: Google Generative AI SDK (Gemini)
* **Authentication**: SimpleJWT (JSON Web Token)

### DevOps & Tools

* **Containerization**: Docker, Docker Compose
* **Dependency Management**: pip (Python), npm (Node.js)

## 🏗 시스템 아키텍처 (Architecture)

프로젝트는 **Docker Compose**를 통해 데이터베이스, 백엔드, 프론트엔드 서비스가 통합되어 실행됩니다.

| 서비스명 | 역할 | 포트 |
| --- | --- | --- |
| **db** | PostgreSQL 데이터베이스 서버 | 5432 |
| **backend** | Django 기반 API 서버 (비즈니스 로직, AI 연동) | 8000 |
| **frontend** | Next.js 기반 웹 애플리케이션 서버 | 3000 |

## 🚀 시작하기 (Getting Started)

이 프로젝트는 Docker 환경에서 간편하게 실행할 수 있도록 구성되어 있습니다.

### 1. 사전 요구 사항 (Prerequisites)

* Docker Desktop
* Docker Compose

### 2. 프로젝트 설치

```bash
git clone https://github.com/your-username/duduk-project.git
cd duduk-project

```

### 3. 환경 변수 설정 (.env)

루트 디렉토리에 `.env` 파일을 생성하고 아래 내용을 설정해주세요. (보안상 실제 키 값은 제외됨)

```env
# PostgreSQL 설정
POSTGRES_USER=myuser
POSTGRES_PASSWORD=mypassword
POSTGRES_DB=duduk_db

# Django Secret Key & Debug
SECRET_KEY=your_django_secret_key
DEBUG=True

# Google Gemini API Key
GOOGLE_API_KEY=your_google_gemini_api_key

```

### 4. 실행 (Run)

Docker Compose를 이용하여 모든 서비스를 빌드하고 실행합니다.

```bash
docker-compose up --build

```

* **Backend API**: http://localhost:8000
* **Frontend Web**: http://localhost:3000

## 📂 폴더 구조 (Project Structure)

```
duduk-project/
├── backend/                # Django 백엔드
│   ├── apps/               # 기능별 앱 분리
│   │   ├── users/          # 사용자, 캐릭터, 프로필
│   │   ├── transactions/   # 가계부, 예산, 지출 내역
│   │   ├── coaching/       # AI 코칭, 피드백
│   │   └── challenges/     # 챌린지 관리
│   ├── config/             # Django 설정
│   ├── external/           # 외부 API (Gemini) 클라이언트
│   ├── Dockerfile          # 백엔드 이미지 빌드 설정
│   └── requirements.txt    # Python 의존성 목록
│
├── frontend/               # Next.js 프론트엔드
│   ├── public/             # 정적 파일 (캐릭터 이미지 등)
│   ├── src/
│   │   ├── app/            # Next.js App Router 페이지
│   │   ├── components/     # 재사용 가능한 컴포넌트
│   │   └── lib/            # API 호출 함수 등 유틸리티
│   ├── Dockerfile          # 프론트엔드 이미지 빌드 설정
│   └── package.json        # Node.js 의존성 목록
│
└── docker-compose.yml      # 전체 서비스 오케스트레이션 설정

```

---

**Duduk Project** - Smart Finance, Fun Life! 💸
