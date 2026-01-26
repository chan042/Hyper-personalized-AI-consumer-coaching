네, 깃허브 `README.md` 파일에 바로 붙여넣으실 수 있도록, 요청하신 마크다운 문법(글자 크기, 줄바꿈, 구분선, 코드 블록 등)을 적용하여 작성해 드립니다.

프로젝트 파일(`docker-compose.yml`, `package.json`, Django 모델 등)에서 분석한 내용을 토대로 구체적인 기술 스택과 기능을 포함했습니다. 아래 내용을 그대로 복사해서 사용하시면 됩니다.

---

# 💰 두둑 (Duduk)

> **AI 기반 게이미피케이션 자산 관리 플랫폼** > "귀여운 캐릭터와 함께 즐겁게 돈을 모으세요!"

**두둑(Duduk)**은 딱딱하고 지루한 가계부 대신, **나만의 캐릭터를 육성**하고 **AI 코칭**을 받으며 자연스럽게 올바른 소비 습관을 기를 수 있는 핀테크 서비스입니다. Google Gemini AI를 활용한 맞춤형 조언과 다양한 챌린지를 통해 자산 관리를 게임처럼 즐길 수 있습니다.

---

## ✨ 주요 기능 (Key Features)

### 1. 🤖 AI 맞춤형 소비 코칭

Google의 **Generative AI (Gemini)**를 연동하여 사용자의 소비 패턴을 심층 분석합니다.

* **소비 분석**: 단순 통계를 넘어 '행동 변화 제안', '누수 소비 탐지' 등 구체적인 피드백 제공
* **절약 예측**: 코칭 실천 시 예상되는 절약 금액을 계산하여 동기 부여
* **위치/키워드 기반 대안**: 사용자의 지출 위치나 품목에 따른 대체 소비 방안 제시

### 2. 🐾 캐릭터 육성 시스템

절약은 더 이상 고통이 아닙니다. 내가 아낀 돈으로 나만의 **'두둑이'**를 키워보세요.

* **4가지 캐릭터**: 고양이(Cat), 강아지(Dog), 햄스터(Hamster), 양(Sheep) 중 선택 가능
* **성장 시스템**: 절약 활동과 미션 성공으로 얻은 포인트로 캐릭터 레벨업 및 꾸미기
* **감정 표현**: 사용자의 소비 상태에 따라 캐릭터의 표정과 반응이 달라짐 (행복, 걱정, 화남 등)

### 3. 🏆 게이미피케이션 챌린지

혼자가 아닌 함께하는 즐거움을 제공합니다.

* **다양한 모드**: 두둑 공식 챌린지, 이벤트 챌린지, 사용자 생성(Custom) 챌린지
* **자동 판정**: 목표 금액, 카테고리, 기간 설정에 따른 성공/실패 시스템 자동화
* **경쟁과 보상**: 친구들과 경쟁하거나 협력하며 포인트 획득

### 4. 📅 스마트한 자산 관리

* **예산 스냅샷**: 매일 자정을 기준으로 일일 권장 예산과 잔여 예산을 자동 계산
* **무지출 챌린지**: 지출이 없는 날 '무지출 확인' 도장을 찍어 성취감 고취
* **고정 지출 관리**: 월세, 구독료 등 고정비를 분리하여 실질적인 가용 예산 파악

---

## 🛠 기술 스택 (Tech Stack)

### Frontend

<img src="[https://img.shields.io/badge/Next.js_16-000000?style=flat&logo=nextdotjs&logoColor=white](https://www.google.com/search?q=https://img.shields.io/badge/Next.js_16-000000%3Fstyle%3Dflat%26logo%3Dnextdotjs%26logoColor%3Dwhite)"/> <img src="[https://img.shields.io/badge/React_19-61DAFB?style=flat&logo=react&logoColor=black](https://www.google.com/search?q=https://img.shields.io/badge/React_19-61DAFB%3Fstyle%3Dflat%26logo%3Dreact%26logoColor%3Dblack)"/> <img src="[https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white](https://www.google.com/search?q=https://img.shields.io/badge/Tailwind_CSS-38B2AC%3Fstyle%3Dflat%26logo%3Dtailwind-css%26logoColor%3Dwhite)"/>

* **Framework**: Next.js 16.0.7 (App Router 기반)
* **State Management**: React Context API
* **Styling**: Tailwind CSS
* **HTTP Client**: Axios

### Backend

<img src="[https://img.shields.io/badge/Django_5-092E20?style=flat&logo=django&logoColor=white](https://www.google.com/search?q=https://img.shields.io/badge/Django_5-092E20%3Fstyle%3Dflat%26logo%3Ddjango%26logoColor%3Dwhite)"/> <img src="[https://img.shields.io/badge/DRF-A30000?style=flat&logo=django&logoColor=white](https://www.google.com/search?q=https://img.shields.io/badge/DRF-A30000%3Fstyle%3Dflat%26logo%3Ddjango%26logoColor%3Dwhite)"/> <img src="[https://img.shields.io/badge/Gemini_AI-8E75B2?style=flat&logo=google&logoColor=white](https://www.google.com/search?q=https://img.shields.io/badge/Gemini_AI-8E75B2%3Fstyle%3Dflat%26logo%3Dgoogle%26logoColor%3Dwhite)"/>

* **Framework**: Django 5.x, Django REST Framework (DRF)
* **Database**: PostgreSQL 15
* **AI**: Google Generative AI SDK (Gemini)
* **Authentication**: JWT (SimpleJWT)

### DevOps

<img src="[https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white](https://www.google.com/search?q=https://img.shields.io/badge/Docker-2496ED%3Fstyle%3Dflat%26logo%3Ddocker%26logoColor%3Dwhite)"/> <img src="[https://img.shields.io/badge/Docker_Compose-2496ED?style=flat&logo=docker&logoColor=white](https://www.google.com/search?q=https://img.shields.io/badge/Docker_Compose-2496ED%3Fstyle%3Dflat%26logo%3Ddocker%26logoColor%3Dwhite)"/>

* **Containerization**: Docker, Docker Compose

---

## 🏗 시스템 아키텍처 (Architecture)

프로젝트는 **Docker Compose**를 통해 3개의 주요 컨테이너로 구성되어 실행됩니다.

| 서비스 (Service) | 역할 (Role) | 포트 (Port) | 설명 |
| --- | --- | --- | --- |
| **frontend** | Web Server | 3000 | Next.js 기반의 사용자 인터페이스 |
| **backend** | API Server | 8000 | Django 기반의 비즈니스 로직 및 AI 연동 |
| **db** | Database | 5432 | PostgreSQL 데이터 저장소 |

---

## 🚀 시작하기 (Getting Started)

이 프로젝트는 Docker 환경에 최적화되어 있어, 복잡한 설치 없이 바로 실행할 수 있습니다.

### 1. 프로젝트 복제 (Clone)

```bash
git clone https://github.com/your-repo/duduk-project.git
cd duduk-project

```

### 2. 환경 변수 설정 (.env)

루트 디렉토리에 `.env` 파일을 생성하고 아래 정보를 입력하세요.

```env
# Database
POSTGRES_USER=myuser
POSTGRES_PASSWORD=mypassword
POSTGRES_DB=duduk_db

# Backend
SECRET_KEY=your_django_secret_key_here
DEBUG=True
GOOGLE_API_KEY=your_gemini_api_key_here  # AI 코칭을 위해 필요

```

### 3. 실행 (Run)

Docker Compose를 사용하여 모든 서비스를 한 번에 실행합니다.

```bash
docker-compose up --build

```

* **Frontend 접속**: [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000)
* **Backend API**: [http://localhost:8000](https://www.google.com/search?q=http://localhost:8000)

---

## 📂 폴더 구조 (Project Structure)

```text
duduk-project/
├── backend/                # Django Backend
│   ├── apps/               # 기능별 모듈 (users, transactions, coaching, challenges)
│   ├── config/             # 프로젝트 설정 (settings.py 등)
│   ├── external/           # 외부 API 연동 (Gemini)
│   └── Dockerfile
├── frontend/               # Next.js Frontend
│   ├── src/
│   │   ├── app/            # 페이지 라우팅
│   │   ├── components/     # UI 컴포넌트
│   │   └── lib/            # 유틸리티 및 API 클라이언트
│   └── Dockerfile
├── docker-compose.yml      # 컨테이너 오케스트레이션 설정
└── README.md

```

---

## 📜 라이선스 (License)

This project is licensed under the MIT License.
