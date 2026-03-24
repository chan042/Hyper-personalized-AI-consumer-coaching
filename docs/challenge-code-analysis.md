# 챌린지 코드 분석 문서

## 1. 문서 범위

이 문서는 현재 워크트리 기준으로 챌린지 기능과 직접 연결된 아래 영역을 분석한 문서다.

- 백엔드: `backend/apps/challenges/*`
- AI 생성 경로: `backend/external/ai/client.py` 중 챌린지 관련 부분
- 프론트엔드: `frontend/src/app/(main)/challenge/page.js`, `frontend/src/components/challenge/*`, `frontend/src/lib/api/challenge.js`, `frontend/src/lib/challengeUtils.js`

분석 초점은 다음 다섯 가지다.

1. 각 파일의 역할과 함수 설명
2. 현재 챌린지 DB 구조 설명
3. 챌린지 상태 변화 로직 설명
4. custom/AI 챌린지 생성 파라미터 분석
5. 오류 가능성이 높은 부분 정리

---

## 2. 전체 구조 한눈에 보기

### 2.1 핵심 도메인 모델

- `ChallengeTemplate`
  - 두둑/이벤트 챌린지의 원본 템플릿
  - 성공 조건, 사용자 입력 정의, 포인트 규칙, 프론트 표시 설정을 저장
- `UserChallenge`
  - 실제 사용자의 챌린지 인스턴스
  - 템플릿 기반, 커스텀, AI 생성 챌린지를 모두 이 테이블로 통합 관리
- `ChallengeDailyLog`
  - 날짜별 지출 집계, 체크 여부, 사진 인증, 조건 판정 상세를 저장

### 2.2 주요 실행 흐름

1. 템플릿 챌린지는 `ChallengeTemplate`에서 시작한다.
2. 사용자가 도전하면 `UserChallengeCreateSerializer`가 `UserChallenge`를 생성한다.
3. 거래 저장 시 `signals.py`가 자동으로 진행률과 즉시 실패 여부를 갱신한다.
4. 사진 인증은 `views.py -> PhotoVerificationService -> AIClient` 흐름으로 검증된다.
5. 자정 배치 성격의 검사는 `check_daily_challenges` 관리 명령과 `run_daily_challenge_checks` Celery 태스크가 담당한다.
6. 종료 시점이 지나면 `finalization.py`가 성공/실패를 최종 확정한다.

### 2.3 condition_type 와 progress_type

챌린지 로직은 크게 두 축으로 동작한다.

- `success_conditions.type`
  - 성공/실패 판정 규칙
- `display_config.progress_type`
  - 프론트 진행률 표시 방식

현재 코드에서 쓰는 주요 타입은 아래와 같다.

| 구분 | 값 | 의미 |
| --- | --- | --- |
| condition_type | `amount_limit` | 목표 금액 이하 |
| condition_type | `zero_spend` | 특정 카테고리 지출 0원 유지 |
| condition_type | `compare` | 비교 기준보다 적게 사용 |
| condition_type | `photo_verification` | 사진 인증 기반 성공 |
| condition_type | `amount_limit_with_photo` | 금액 제한 + 매일 현금 사진 |
| condition_type | `amount_range` | 목표 금액의 허용 범위 내 소비 |
| condition_type | `daily_rule` | 요일별 금지 카테고리 미사용 |
| condition_type | `daily_check` | 매일 지출 입력 또는 무지출 체크 |
| condition_type | `random_budget` | 숨겨진 랜덤 예산 이하 사용 |
| condition_type | `custom` | AI/커스텀 챌린지 일반형 |
| progress_type | `amount` | 현재 금액 / 목표 금액 |
| progress_type | `zero_spend` | 무지출 유지 여부 |
| progress_type | `compare` | 비교 기준 대비 사용액 |
| progress_type | `daily_check` | 체크 완료 일수 |
| progress_type | `daily_rule` | 통과한 일수 |
| progress_type | `photo` | 인증 사진 수 |
| progress_type | `random_budget` | 숨겨진 예산 기반 진행률 |
| progress_type | `custom` | AI/커스텀용 일반 진행률 |

---

## 3. 파일별 분석

## 3.1 백엔드: 앱 진입점/라우팅/배치

### `backend/apps/challenges/apps.py`

파일 역할:
- Django 앱 설정
- 앱 기동 시 시그널 모듈 로딩

함수/클래스:

| 이름 | 설명 |
| --- | --- |
| `ChallengesConfig` | 앱 메타데이터를 정의한다. |
| `ChallengesConfig.ready()` | 앱 시작 시 `apps.challenges.signals`를 import 하여 거래 저장 시그널을 등록한다. |

### `backend/apps/challenges/urls.py`

파일 역할:
- 챌린지 API 라우팅 등록

함수/클래스:

| 이름 | 설명 |
| --- | --- |
| `router.register(...)` | 템플릿, 내 챌린지, 일별 로그 ViewSet을 REST 라우터에 연결한다. |
| `urlpatterns` | `dashboard/`, `points/`, `stats/` 같은 추가 API를 노출한다. |

### `backend/apps/challenges/tasks.py`

파일 역할:
- Celery 태스크로 일일 판정 배치를 실행

함수:

| 이름 | 설명 |
| --- | --- |
| `run_daily_challenge_checks(run_date=None, dry_run=False)` | Django 관리 명령 `check_daily_challenges`를 Celery 태스크에서 호출한다. |

### `backend/apps/challenges/management/commands/check_daily_challenges.py`

파일 역할:
- 일일 실패 조건 검사
- 거래가 없는 날까지 포함한 progress 보정
- 종료 시점 자동 판정
- 미래의 나에게 알림 발송

함수/메서드:

| 이름 | 설명 |
| --- | --- |
| `_contains_convenience_store_keyword()` | 소비처가 편의점인지 문자열 기준으로 판별한다. |
| `_count_verified_photos()` | 일별 로그의 인증 완료 사진 수를 계산한다. |
| `_sum_convenience_spending()` | 일별 로그의 편의점 지출 합계를 계산한다. |
| `Command.add_arguments()` | `--date`, `--dry-run` 옵션을 등록한다. |
| `Command.handle()` | 활성 챌린지를 순회하며 일일 실패 검사, progress 갱신, 종료 판정을 수행한다. |
| `Command._check_daily_check_failure()` | 전날 지출 입력/무지출 체크 누락 시 실패 처리한다. |
| `Command._check_photo_missing_failure()` | 전날 현금 인증 사진 누락 시 실패 처리한다. |
| `Command._check_one_plus_one_failure()` | 전날 편의점 지출은 있었는데 1+1 인증이 없으면 실패 처리한다. |
| `Command._send_future_message_notification()` | `next_month_category` 타입에서 다음 달 1일에 사용자 메시지를 알림으로 보낸다. |

### `backend/apps/challenges/management/commands/seed_challenges.py`

파일 역할:
- 시드 함수 실행용 래퍼 명령

함수/메서드:

| 이름 | 설명 |
| --- | --- |
| `Command.add_arguments()` | `--force-update` 옵션을 받는다. |
| `Command.handle()` | `seed_challenge_templates()`를 호출하고 결과를 출력한다. |

---

## 3.2 백엔드: 상수/모델

### `backend/apps/challenges/constants.py`

파일 역할:
- 챌린지 조건 타입과 비교 타입 상수 정의
- 편의점 키워드 목록 정의

내용:

| 상수 | 설명 |
| --- | --- |
| `CONVENIENCE_STORE_KEYWORDS` | 편의점 문자열 탐지용 키워드 목록 |
| `CONDITION_TYPE_*` | 성공 조건 타입 |
| `COMPARE_TYPE_*` | 비교형 챌린지의 세부 비교 기준 |

함수:
- 없음

### `backend/apps/challenges/models.py`

파일 역할:
- 챌린지 핵심 DB 모델 정의
- 챌린지 완료/포인트/패널티/보너스 계산 로직 포함

#### `ChallengeTemplate`

역할:
- 시스템이 제공하는 템플릿 정의
- 두둑 챌린지와 이벤트 챌린지를 저장

메서드:

| 이름 | 설명 |
| --- | --- |
| `__str__()` | `[출처] 이름` 형태 문자열을 반환한다. |
| `is_event_active` | 이벤트 템플릿이 현재 기간 안에 있는지 계산한다. |

#### `UserChallenge`

역할:
- 사용자별 실제 챌린지 인스턴스
- 템플릿, 커스텀, AI 챌린지를 하나의 모델로 통합

메서드:

| 이름 | 설명 |
| --- | --- |
| `__str__()` | 사용자명, 챌린지명, 상태를 문자열로 반환한다. |
| `remaining_days` | `lifecycle.get_remaining_days()`를 이용해 남은 일수를 계산한다. |
| `update_progress(progress_data)` | JSON progress를 저장한다. |
| `complete_challenge(is_success, final_spent=None, failure_reason=None)` | 성공/실패 확정, 포인트/패널티 반영, 로그 삭제, 알림 예약까지 한 번에 처리한다. |
| `_send_result_notification_after_commit(...)` | 트랜잭션 커밋 뒤 결과 알림을 발송한다. |
| `claim_reward()` | 완료된 챌린지의 포인트 지급을 수행한다. |
| `_handle_completion_side_effects(is_success)` | 현재는 `random_budget` 성공 시 숨겨진 예산을 progress에 공개한다. |
| `_calculate_points()` | `points_formula`가 있으면 안전 수식 평가기로 포인트를 계산하고, 없으면 `base_points`를 반환한다. |
| `_calculate_penalty()` | `penalty_formula`가 있으면 패널티를 계산한다. |
| `_build_formula_variables()` | 수식 계산에 필요한 `{spent}`, `{target}`, `{saved}`, `{over}`, `{base}`, `{random_budget}` 값을 만든다. |
| `_check_bonus_condition()` | `under_target_percent`, `zero_spend`, `streak`, `jackpot` 타입 보너스를 검사한다. |

#### `ChallengeDailyLog`

역할:
- 날짜별 지출/체크/사진 인증 데이터를 저장

메서드:

| 이름 | 설명 |
| --- | --- |
| `__str__()` | `챌린지명 - 날짜` 문자열을 반환한다. |

### `backend/apps/challenges/admin.py`

파일 역할:
- Django Admin에서 챌린지 모델을 관리하기 위한 설정

클래스:

| 이름 | 설명 |
| --- | --- |
| `ChallengeTemplateAdmin` | 템플릿 목록 표시, 필터, fieldset 구성을 정의한다. |
| `UserChallengeAdmin` | 사용자 챌린지 목록과 상세 fieldset을 정의한다. |
| `ChallengeDailyLogAdmin` | 일별 로그 목록 표시/검색/필터를 정의한다. |

함수:
- 없음

주의:
- 이 파일은 현재 모델에서 제거된 `icon`, `icon_color` 필드를 계속 참조한다.

---

## 3.3 백엔드: 템플릿 시드/데이터 생성

### `backend/apps/challenges/seed_challenges.py`

파일 역할:
- 두둑 기본 챌린지 템플릿 정의
- DB 시드 처리

내용:

| 이름 | 설명 |
| --- | --- |
| `DUDUK_CHALLENGE_TEMPLATES` | 현재 기본 챌린지 정의 목록. `success_conditions`, `display_config`, `user_inputs`까지 포함한다. |
| `DUDUK_CHALLENGES` | 하위 호환용 별칭 |
| `seed_default_challenges` | 하위 호환용 별칭 |
| `get_challenge_by_name` | 하위 호환용 별칭 |

함수:

| 이름 | 설명 |
| --- | --- |
| `seed_challenge_templates(force_update=False)` | 템플릿을 생성하거나, 옵션에 따라 기존 템플릿도 덮어쓴다. |
| `get_template_by_name(name)` | 활성 템플릿을 이름으로 조회한다. |

핵심 포인트:

- 템플릿은 단순 UI 데이터가 아니라 로직 데이터다.
- 각 항목에 `success_conditions`, `display_config`, `requires_photo`, `photo_frequency`, `points_formula` 등이 들어 있어 런타임 동작에 직접 영향을 준다.

---

## 3.4 백엔드: 직렬화/생성 로직

### `backend/apps/challenges/serializers.py`

파일 역할:
- 템플릿/사용자 챌린지 직렬화
- 템플릿 시작, 커스텀 생성, AI 저장 로직
- 비교형 챌린지 기준 금액 계산

함수/클래스:

| 이름 | 설명 |
| --- | --- |
| `_get_last_month_bounds(reference_dt=None)` | 지난달 시작일/종료일을 계산한다. |
| `_get_template_availability(template, user, reference_dt=None)` | 전월 데이터가 필요한 템플릿이 실제 도전 가능한지 검사한다. |
| `ChallengeTemplateSerializer` | 템플릿 상세 응답. 이벤트 남은 시간, 가용성 여부를 포함한다. |
| `ChallengeTemplateSerializer.get_remaining_event_time()` | 이벤트 종료까지 남은 초를 반환한다. |
| `ChallengeTemplateSerializer.get_is_available()` | 로그인 사용자의 템플릿 도전 가능 여부를 반환한다. |
| `ChallengeTemplateSerializer.get_unavailable_reason()` | 도전 불가 이유를 반환한다. |
| `ChallengeTemplateListSerializer` | 템플릿 목록 응답. `my_challenge_status`, `my_challenge_id`까지 포함한다. |
| `ChallengeTemplateListSerializer.get_is_available()` | 목록에서도 가용성 계산을 수행한다. |
| `ChallengeTemplateListSerializer.get_unavailable_reason()` | 목록에서도 불가 사유를 반환한다. |
| `UserChallengeSerializer` | 사용자 챌린지 상세 응답. 진행률, 설정, 결과를 모두 담는다. |
| `UserChallengeSerializer.get_template_name()` | 템플릿 이름을 반환한다. |
| `UserChallengeSerializer.get_user_inputs()` | 템플릿 기반 챌린지의 입력 정의를 반환한다. |
| `UserChallengeListSerializer` | 목록용 축약 응답이다. |
| `UserChallengeListSerializer.get_user_inputs()` | 템플릿의 입력 정의를 목록에도 붙인다. |
| `UserChallengeCreateSerializer` | 템플릿 기반 챌린지 시작 시 검증/생성을 담당한다. |
| `UserChallengeCreateSerializer.validate_template_id()` | 활성 템플릿인지, 이벤트 기간인지 확인한다. |
| `UserChallengeCreateSerializer.validate()` | 필수 입력, daily_rule 중복 카테고리, 가용성을 검증한다. |
| `UserChallengeCreateSerializer.create()` | 템플릿을 실제 `UserChallenge`로 복제하고, `success_conditions`, `system_generated_values`, `progress`, `status`를 초기화한다. |
| `UserChallengeCreateSerializer._resolve_start_at()` | 시작 시각 계산을 위임한다. |
| `UserChallengeCreateSerializer._generate_daily_rules()` | `무00의 날`의 요일별 금지 카테고리를 생성한다. 월~목은 사용자 입력, 금~일은 랜덤이다. |
| `UserChallengeCreateSerializer._create_initial_progress()` | 템플릿 유형에 맞는 초기 progress를 만든다. |
| `UserChallengeCreateSerializer._calculate_compare_base()` | 비교형 챌린지의 기준 금액을 계산한다. |
| `CustomChallengeCreateSerializer` | 순수 사용자 커스텀 챌린지를 생성한다. |
| `CustomChallengeCreateSerializer.validate_target_categories()` | 유효한 카테고리인지 검사한다. |
| `CustomChallengeCreateSerializer.create()` | `amount_limit` 또는 `zero_spend` 타입의 저장 상태 챌린지를 만든다. |
| `ChallengeDailyLogSerializer` | 일별 로그 응답 직렬화 |
| `UserPointsSerializer` | 포인트 응답 직렬화 |
| `BaseChallengeGenerateSerializer` | AI 생성 요청 공통 난이도 필드 정의 |
| `AIChallengGenerateSerializer` | 일반 AI 생성 요청에서 `details`를 받는다. |
| `CoachingChallengeGenerateSerializer` | 코칭 기반 생성 요청에서 `coaching_id`를 받는다. |
| `BaseChallengePreviewSerializer` | AI 생성 미리보기 응답 형식을 정의한다. |
| `AIChallengePreviewSerializer` | 일반 AI 생성 미리보기 |
| `CoachingChallengePreviewSerializer` | 코칭 기반 미리보기 |
| `BaseChallengeStartSerializer` | AI 생성 결과를 저장 가능한 `UserChallenge`로 바꾸는 공통 베이스 |
| `BaseChallengeStartSerializer.validate_target_categories()` | AI 생성 결과의 카테고리를 검증한다. |
| `BaseChallengeStartSerializer._build_success_conditions()` | AI/코칭 생성 결과를 내부 JSON `success_conditions`로 변환한다. |
| `BaseChallengeStartSerializer._build_display_config()` | AI/코칭 챌린지의 프론트 표시 설정을 만든다. |
| `BaseChallengeStartSerializer._build_initial_progress()` | AI/코칭 챌린지의 초기 progress를 만든다. |
| `BaseChallengeStartSerializer._create_user_challenge()` | AI/코칭 생성 챌린지를 `saved` 상태의 `UserChallenge`로 저장한다. |
| `RestartChallengeSerializer` | 재도전 요청에서 `user_input_values`를 받는다. |
| `AIChallengeStartSerializer.create()` | 일반 AI 챌린지를 저장한다. |
| `CoachingChallengeStartSerializer.create()` | 코칭 기반 AI 챌린지를 저장한다. |

핵심 포인트:

- 템플릿 기반 챌린지는 생성 시점에 바로 `active` 또는 `ready`가 된다.
- 커스텀/AI 챌린지는 우선 `saved` 상태로 저장되고, 이후 별도 `start` 액션으로 시작된다.
- 비교형/랜덤 예산처럼 런타임 계산이 필요한 값은 `system_generated_values`에 보관한다.

---

## 3.5 백엔드: API/View 계층

### `backend/apps/challenges/views.py`

파일 역할:
- 템플릿 조회, 내 챌린지 CRUD, AI 생성 미리보기/저장, 사진 업로드, 대시보드 API를 제공

함수/클래스:

| 이름 | 설명 |
| --- | --- |
| `_get_template_queryset_for_user(user, tab=None)` | 사용자의 현재 도전 상태를 붙인 템플릿 queryset을 만든다. |
| `ChallengeTemplateViewSet` | 템플릿 목록/상세 API |
| `ChallengeTemplateViewSet.get_serializer_class()` | 목록/상세에 따라 serializer를 바꾼다. |
| `ChallengeTemplateViewSet.get_queryset()` | 탭(`duduk`, `event`)에 따라 템플릿을 필터링한다. |
| `ChallengeTemplateViewSet.preview_input()` | 비교형 챌린지 도전 전 기준 금액을 미리 보여준다. |
| `UserChallengeViewSet` | 사용자 챌린지 API의 중심 ViewSet |
| `UserChallengeViewSet.get_serializer_class()` | 액션별 serializer를 선택한다. |
| `UserChallengeViewSet.get_queryset()` | 상태/소스 필터를 적용하고 조회 전에 상태 동기화를 수행한다. |
| `UserChallengeViewSet.create()` | 템플릿 기반 챌린지 시작 |
| `UserChallengeViewSet.create_custom()` | 커스텀 챌린지 생성 |
| `UserChallengeViewSet.generate_ai()` | 일반 AI 챌린지 미리보기 생성 |
| `UserChallengeViewSet.start_ai()` | AI 생성 결과를 저장한다. |
| `UserChallengeViewSet._get_user_spending_summary()` | 최근 30일 카테고리별 지출 요약을 만들어 AI 프롬프트에 넣는다. |
| `UserChallengeViewSet.generate_from_coaching()` | 코칭 카드 기반 AI 챌린지 미리보기 생성 |
| `UserChallengeViewSet.start_from_coaching()` | 코칭 기반 AI 챌린지 저장 |
| `UserChallengeViewSet.start()` | `saved` 또는 `ready` 상태 챌린지를 시작한다. |
| `UserChallengeViewSet.cancel()` | 진행 중 챌린지를 삭제한다. |
| `UserChallengeViewSet.restart()` | 실패한 챌린지를 새 시도로 재생성한다. |
| `UserChallengeViewSet.claim_reward()` | 보상 수령 처리 후 챌린지와 로그를 삭제한다. |
| `UserChallengeViewSet.daily_logs()` | 일별 로그 조회 |
| `UserChallengeViewSet.upload_photo()` | 사진 인증 검증과 저장, progress 갱신을 담당한다. |
| `ChallengeDashboardView.get()` | 템플릿/상태별 챌린지/포인트를 한 번에 반환한다. |
| `UserPointsView.get()` | 사용자 포인트 조회 |
| `ChallengeDailyLogViewSet.get_queryset()` | 내 챌린지의 일별 로그만 보이도록 제한한다. |
| `ChallengeStatsView.get()` | 챌린지 수, 성공률, 유형별 개수를 계산한다. |

---

## 3.6 백엔드: 시그널/진행률/실패 판정

### `backend/apps/challenges/signals.py`

파일 역할:
- 거래 저장 시 챌린지 진행률 자동 반영
- 챌린지 유형별 즉시 실패 판정
- 성공 여부 평가

함수:

| 이름 | 설명 |
| --- | --- |
| `_contains_convenience_store_keyword()` | 편의점 문자열 탐지 |
| `_normalize_target_categories()` | 카테고리 목록 정규화 |
| `_count_verified_photos()` | 인증된 사진 수 계산 |
| `_iter_elapsed_dates()` | 시작일부터 현재 또는 종료일까지의 날짜 목록 생성 |
| `_sum_convenience_spending()` | 편의점 지출 합산 |
| `_should_track_transaction()` | 특정 거래가 이 챌린지의 추적 대상인지 판단한다. 키워드 우선, 없으면 카테고리 기반이다. |
| `update_challenge_progress_on_transaction()` | `Transaction` 생성 시 활성 챌린지들을 찾아 progress 갱신과 자동 실패 판정을 실행한다. |
| `_update_daily_log()` | 날짜별 지출/거래 건수/카테고리별 지출/소비처별 지출을 누적한다. |
| `_update_challenge_progress()` | `progress_type`에 맞는 세부 progress 계산 함수로 분기한다. |
| `_update_amount_progress()` | 금액 제한형 progress 계산 |
| `_update_zero_spend_progress()` | 무지출형 progress 계산 |
| `_update_compare_progress()` | 비교형 progress 계산 |
| `_month_bounds()` | 월 시작/끝 날짜 계산 |
| `_next_month()` | 다음 달 계산 |
| `_build_future_compare_progress()` | `미래의 나에게` 타입의 2단계 progress를 계산한다. |
| `_update_daily_check_progress()` | 매일 체크형 progress 계산 |
| `_update_daily_rule_progress()` | 요일별 금지 카테고리형 progress 계산 |
| `_check_auto_judgement()` | 기한 만료와 즉시 실패 핸들러 호출을 총괄한다. |
| `_check_amount_limit_failure()` | 금액 초과 즉시 실패 |
| `_check_compare_failure()` | 비교 기준 초과 즉시 실패 |
| `_check_zero_spend_failure()` | 무지출 위반 즉시 실패 |
| `_check_amount_limit_with_photo_failure()` | 금액 초과 또는 전일 사진 누락 실패 |
| `_check_photo_verification_failure()` | 1+1 사진 조건 위반 검사 |
| `_check_amount_range_failure()` | 허용 범위 초과 실패 |
| `_check_daily_rule_failure()` | 요일 규칙 위반 실패 |
| `_check_random_budget_failure()` | 랜덤 예산 초과 실패 함수. 현재 정의만 되어 있고 매핑은 빠져 있다. |
| `_check_custom_failure()` | AI/커스텀 일반형 실패 검사 |
| `IMMEDIATE_FAILURE_HANDLERS` | condition_type 별 즉시 실패 핸들러 매핑 |
| `_check_photo_missing_failure()` | 현금 챌린지에서 시작일부터 어제까지 사진 누락이 있는지 검사 |
| `_check_one_plus_one_failure()` | 편의점 지출이 있었는데 인증 사진이 없는 날이 있는지 검사 |
| `_update_photo_progress()` | 사진 기반 progress 계산 |
| `_update_random_budget_progress()` | 랜덤 예산형 progress 계산 |
| `_evaluate_success()` | 챌린지 종료 시 최종 성공 여부를 평가한다. |

핵심 포인트:

- 이 파일이 사실상 챌린지 런타임 판정 엔진이다.
- 생성 로직은 serializer 쪽에 있지만, 진행/실패/성공 판정은 대부분 여기서 일어난다.

---

## 3.7 백엔드: 서비스 레이어

### `backend/apps/challenges/services/lifecycle.py`

파일 역할:
- 날짜/시작일/종료일/남은 일수 계산

함수:

| 이름 | 설명 |
| --- | --- |
| `get_local_date(value)` | datetime/date를 로컬 date로 변환한다. |
| `resolve_reference_date(reference=None)` | 기준 날짜를 결정한다. |
| `get_challenge_start_date(user_challenge)` | 챌린지 시작 date를 계산한다. |
| `resolve_challenge_start_at(success_conditions=None, reference=None)` | 기본은 즉시 시작이고, `last_month_week` 비교형은 월요일 시작으로 보정한다. |
| `get_challenge_end_date(user_challenge)` | 시작일과 기간을 기준으로 종료일을 계산한다. |
| `has_challenge_started(user_challenge, reference=None)` | 기준 날짜가 시작일 이후인지 판별한다. |
| `is_challenge_expired(user_challenge, reference=None)` | 종료일이 지났는지 판별한다. |
| `get_remaining_days(user_challenge, reference=None)` | 남은 일수를 계산한다. |

### `backend/apps/challenges/services/progress_factory.py`

파일 역할:
- 챌린지 생성 시 초기 progress JSON을 만드는 팩토리

함수:

| 이름 | 설명 |
| --- | --- |
| `build_initial_progress(...)` | `progress_type`에 따라 progress 기본 구조를 만든다. |
| `build_initial_progress_for_template(...)` | 템플릿 기반 챌린지의 초기 progress를 만든다. |
| `build_initial_progress_for_user_challenge(...)` | 이미 생성된 `UserChallenge` 인스턴스 기준으로 초기 progress를 만든다. |

### `backend/apps/challenges/services/finalization.py`

파일 역할:
- 기간 종료 챌린지 최종 판정
- `ready -> active` 상태 자동 전환

함수:

| 이름 | 설명 |
| --- | --- |
| `finalize_expired_challenge(user_challenge, reference=None, dry_run=False)` | 만료된 활성 챌린지를 성공/실패로 확정한다. |
| `activate_started_ready_challenges_for_user(user, reference=None, dry_run=False)` | 시작일이 된 `ready` 챌린지를 `active`로 바꾼다. |
| `finalize_expired_challenges_for_user(user, reference=None, dry_run=False)` | 사용자의 활성 챌린지 중 만료된 것들을 정리한다. |
| `refresh_user_challenge_states(user, reference=None, dry_run=False)` | 조회 시점의 상태를 동기화한다. |

### `backend/apps/challenges/services/daily_check_sync.py`

파일 역할:
- `daily_check` 타입 챌린지의 로그와 `DailySpendingConfirmation` 동기화

함수:

| 이름 | 설명 |
| --- | --- |
| `_get_daily_check_challenges_for_date(user, target_date)` | 해당 날짜에 영향을 받는 daily_check 챌린지를 찾는다. |
| `sync_daily_check_log_with_confirmation(user, target_date, is_no_spending)` | 무지출 확인 변경을 특정 날짜의 챌린지 로그에 반영한다. |
| `ensure_daily_check_logs(user_challenge, end_date)` | 시작일부터 종료일까지 빠진 로그를 생성한다. |
| `sync_daily_check_logs_from_confirmations(user_challenge, start_date, end_date)` | 무지출 확인 데이터와 로그 체크 상태를 동기화한다. |
| `is_no_spending_confirmed(user_id, check_date)` | 특정 날짜 무지출 확인 여부를 반환한다. |

### `backend/apps/challenges/services/failure_reason.py`

파일 역할:
- 실패 사유 메시지 생성

함수:

| 이름 | 설명 |
| --- | --- |
| `_to_int()` | 안전한 정수 변환 |
| `reason_photo_not_verified_yesterday()` | 현금 인증 누락 메시지 |
| `reason_daily_check_missing()` | daily_check 누락 메시지 |
| `reason_one_plus_one_photo_missing()` | 원플원 인증 누락 메시지 |
| `reason_amount_exceeded()` | 금액 초과 메시지 |
| `reason_compare_exceeded()` | 비교 기준 초과 메시지 |
| `reason_zero_spend_violation()` | 무지출 위반 메시지 |
| `reason_amount_range_exceeded()` | 허용 범위 초과 메시지 |
| `reason_daily_rule_violation()` | 요일 규칙 위반 메시지 |
| `reason_random_budget_exceeded()` | 랜덤 예산 초과 메시지 |
| `reason_generic_failure()` | 기본 실패 메시지 |
| `infer_failure_reason(user_challenge, final_spent=None)` | 챌린지 유형에 맞는 실패 사유를 추론한다. |

### `backend/apps/challenges/services/photo_verification.py`

파일 역할:
- 사진 인증 검증 서비스
- 현금 챌린지, 중고거래 인증, 편의점 1+1 인증을 처리

클래스/메서드:

| 이름 | 설명 |
| --- | --- |
| `PhotoVerificationService` | 사진 인증 서비스 메인 클래스 |
| `PhotoVerificationService.verify()` | 챌린지 유형에 맞는 사진 검증 루틴으로 분기한다. |
| `PhotoVerificationService._resolve_image_data()` | base64 또는 URL에서 이미지를 읽고 MIME 타입을 정리한다. |
| `PhotoVerificationService._verify_cash_challenge()` | 남은 현금과 사진 속 현금 합계를 비교해 인증한다. |
| `PhotoVerificationService._verify_marketplace_post()` | 중고거래 등록 화면인지 검증한다. |
| `PhotoVerificationService._verify_one_plus_one()` | OCR + AI 분석으로 편의점 1+1/2+1 구매인지 검증한다. |
| `PhotoVerificationService._failed()` | 실패 응답 포맷을 통일한다. |

### `backend/apps/challenges/services/restart.py`

파일 역할:
- 실패 챌린지 재도전 로직

함수:

| 이름 | 설명 |
| --- | --- |
| `restart_user_challenge(...)` | 실패했고 최신 시도인 챌린지만 재도전하게 하고, 템플릿 기반/동일 명세 기반으로 분기한다. |
| `_restart_template_challenge(...)` | 템플릿 챌린지는 기존 생성 serializer를 재사용해 새 시도를 만든다. |
| `_restart_same_spec_challenge(...)` | 커스텀/AI 챌린지는 기존 스펙을 deep copy 해서 새 `UserChallenge`를 만든다. |

### `backend/apps/challenges/services/safe_formula.py`

파일 역할:
- DB 문자열 수식을 안전하게 계산

클래스/함수:

| 이름 | 설명 |
| --- | --- |
| `FormulaEvaluationError` | 수식 평가 예외 |
| `_replace_placeholders()` | `{target}` 같은 플레이스홀더를 실제 값으로 치환한다. |
| `_SafeFormulaEvaluator` | 허용된 AST 노드만 방문하는 안전한 계산기 |
| `_SafeFormulaEvaluator.visit_Expression()` | 표현식 루트 처리 |
| `_SafeFormulaEvaluator.visit_Constant()` | 숫자/불리언 상수만 허용 |
| `_SafeFormulaEvaluator.visit_Name()` | 변수명 또는 허용 함수명만 허용 |
| `_SafeFormulaEvaluator.visit_BinOp()` | 산술 연산 처리 |
| `_SafeFormulaEvaluator.visit_UnaryOp()` | 단항 연산 처리 |
| `_SafeFormulaEvaluator.visit_Compare()` | 비교 연산 처리 |
| `_SafeFormulaEvaluator.visit_BoolOp()` | and/or 처리 |
| `_SafeFormulaEvaluator.visit_IfExp()` | 삼항 연산 처리 |
| `_SafeFormulaEvaluator.visit_Call()` | 허용 함수만 호출 |
| `_SafeFormulaEvaluator.generic_visit()` | 허용하지 않은 문법 차단 |
| `evaluate_formula(expression, variables)` | 수식을 파싱, 검증, 계산해 최종 숫자를 반환한다. |

---

## 3.8 백엔드: AI 생성 경로

### `backend/external/ai/client.py` 중 챌린지 관련 부분

파일 역할:
- Gemini 기반 AI 클라이언트
- 챌린지 생성, 코칭 생성, 이미지 분석, 리포트 생성까지 모두 포함
- 이 문서에서는 챌린지 생성과 사진 인증에 연결된 부분만 다룬다

챌린지 관련 상수/모델/함수:

| 이름 | 설명 |
| --- | --- |
| `CATEGORIES` | AI가 사용할 수 있는 카테고리 목록 |
| `DIFFICULTY_POINTS` | 난이도별 기본 포인트 범위 |
| `CHALLENGE_SCHEMA` | AI에게 요구하는 JSON 형식 설명 |
| `DIFFICULTY_GUIDE` | 난이도별 성공 조건 강도를 설명하는 프롬프트 가이드 |
| `calculate_points(difficulty)` | 난이도 기반 기본 포인트를 계산한다. |
| `parse_json_response(text)` | 모델이 반환한 텍스트에서 JSON을 추출한다. |
| `AIBaseModel` | Pydantic 베이스. 초과 필드를 무시한다. |
| `NumericConstraints` | AI 응답의 수치 제약(`duration_days`, `target_amount`) |
| `ChallengeResponse` | AI 챌린지 응답 스키마 |
| `AIClient.__init__(purpose="analysis")` | 목적별 Gemini API 키와 모델명을 초기화한다. |
| `AIClient._parse(...)` | Gemini 응답을 구조화 JSON으로 받아 Pydantic 검증까지 수행한다. |
| `AIClient.generate_challenge(details, difficulty=None, user_spending_summary=None)` | 일반 사용자 입력 기반 챌린지를 생성한다. |
| `AIClient.generate_challenge_from_coaching(coaching_data, difficulty=None)` | 코칭 결과 기반 챌린지를 생성한다. |
| `AIClient._process_challenge_result(result, fallback_name, user_difficulty=None)` | AI 응답을 프론트/백엔드 저장 형식에 맞게 후처리한다. |
| `AIClient.analyze_cash_photo(...)` | 현금 사진 검증 모델 호출 |
| `AIClient.analyze_marketplace_post_photo(...)` | 중고거래 게시글 사진 검증 모델 호출 |
| `AIClient.analyze_one_plus_one_photo(...)` | 편의점 1+1/2+1 사진 검증 모델 호출 |

핵심 포인트:

- 챌린지 생성 결과는 최종적으로 `ChallengeResponse` 스키마로 제한된다.
- 저장 전 후처리에서 `base_points`, `duration_days`, `target_amount`, `target_categories`가 정규화된다.
- 즉, AI가 자유롭게 문장을 생성해도 저장 구조는 꽤 단순한 JSON으로 귀결된다.

---

## 3.9 프론트엔드: API/유틸/페이지/컴포넌트

### `frontend/src/lib/api/challenge.js`

파일 역할:
- 챌린지 관련 백엔드 API 래퍼
- 백엔드 snake_case 응답을 프론트 화면용 객체로 변환

함수:

| 이름 | 설명 |
| --- | --- |
| `transformTemplate()` | `ChallengeTemplate` 응답을 프론트용 객체로 변환한다. |
| `transformUserChallenge()` | `UserChallenge` 응답을 프론트용 객체로 변환한다. |
| `sortByDifficulty()` | 난이도 기준으로 목록을 정렬한다. |
| `getChallengeTemplates(tab='duduk')` | 템플릿 목록 조회 |
| `getChallengeTemplateDetail(id)` | 템플릿 상세 조회 |
| `previewTemplateInput(templateId, userInputValues={})` | 비교형 템플릿 입력 프리뷰 조회 |
| `getChallenges(tab='duduk')` | 템플릿 목록 조회 별칭 |
| `getChallengeDashboard()` | 대시보드 통합 조회 |
| `getMyChallenges(status=null)` | 내 챌린지 목록 조회 |
| `getMyChallengeDetail(id)` | 내 챌린지 상세 조회 |
| `getUserChallenges()` | custom/ai 챌린지 목록을 병합 조회 |
| `startChallenge(templateId, userInputValues={})` | 템플릿 기반 시작 |
| `cancelChallenge(id)` | 진행 중 챌린지 취소 |
| `restartChallenge(id, userInputValues={})` | 실패 챌린지 재도전 |
| `uploadPhoto(id, payload)` | 사진 인증 업로드 |
| `getDailyLogs(id)` | 일별 로그 조회 |
| `getUserPoints()` | 사용자 포인트 조회 |
| `getChallengeStats()` | 챌린지 통계 조회 |
| `createUserChallenge(challengeData)` | 커스텀 챌린지 생성 API |
| `generateAIChallenge(title, details, difficulty)` | AI 챌린지 미리보기 생성 |
| `startAIChallenge(challengeData)` | AI 챌린지 저장 |
| `generateChallengeFromCoaching(coachingId, difficulty='normal')` | 코칭 기반 AI 생성 |
| `startChallengeFromCoaching(coachingId, challengeData)` | 코칭 기반 AI 저장 |
| `deleteChallenge(id)` | 저장된 사용자 챌린지 삭제 |
| `startSavedChallenge(id)` | `saved` 또는 `ready` 챌린지 시작 |
| `getOngoingChallenges()` | 활성 챌린지 목록 조회 |
| `claimReward(id)` | 보상 수령 |

### `frontend/src/lib/challengeUtils.js`

파일 역할:
- 챌린지 UI 공통 유틸리티

함수:

| 이름 | 설명 |
| --- | --- |
| `WEEK_DAYS` | 주간 캘린더용 요일 메타 정보 |
| `normalizeWeekdayKey(rawKey)` | 요일 키를 `sun`~`sat`로 정규화한다. |
| `normalizeDailyRules(dailyRules)` | daily_rules JSON을 프론트 표시용으로 정리한다. |
| `getChallengeStartDayIndex(challenge, fallbackDayIndex=1)` | 챌린지 시작 요일 인덱스를 반환한다. |
| `getOrderedWeekDays(startDayIndex)` | 시작 요일부터 순환하는 주간 배열을 만든다. |
| `isTodayByOffset(startedAt, dayOffset, todayDateString)` | 시작일 기준 offset 날짜가 오늘인지 판단한다. |
| `getChallengeDaysLeft(challenge)` | 남은 일수를 가져온다. |
| `getChallengeDdayLabel(challenge)` | `D-3`, `결과 반영 중` 같은 라벨을 만든다. |
| `getDifficultyLabel(difficulty)` | 난이도 라벨을 `EASY/NORMAL/HARD`로 통일한다. |
| `getDifficultyStyle(difficulty)` | 난이도별 색상 스타일을 반환한다. |
| `getDifficultyButtonStyle(...)` | 난이도 선택 버튼 스타일 계산 |
| `getCharacterFace(difficulty, characterType)` | 난이도와 캐릭터 타입에 맞는 이미지 경로 반환 |
| `getDifficultyBackgroundColor(difficulty)` | 상세 모달 원형 배경색 반환 |
| `getProgressPercent(progress)` | progress JSON에서 퍼센트를 계산한다. |
| `getProgressText(progress, durationDays)` | progress를 사람이 읽는 텍스트로 변환한다. |
| `getProgressData(progress)` | snake_case/camelCase를 흡수한 공통 progress 객체를 만든다. |

### `frontend/src/components/challenge/useChallenge.js`

파일 역할:
- 카드와 상세 모달이 공통으로 쓰는 챌린지 상태 해석 훅

함수:

| 이름 | 설명 |
| --- | --- |
| `useChallenge(challenge, isOngoing=false)` | status 기반 플래그, progressPercent, 버튼 텍스트/타입, 포인트 표시값을 계산한다. |
| `getButtonText()` | 상태에 맞는 버튼 문구를 반환한다. |
| `getButtonType()` | 상태에 맞는 버튼 타입 키를 반환한다. |
| `getProgressDisplayText()` | progress 표시 문구를 반환한다. |
| `getPointsDisplay()` | 랜덤 예산 챌린지의 `???P` 포함 포인트 표시값을 만든다. |

### `frontend/src/components/challenge/ChallengeCard.js`

파일 역할:
- 챌린지 목록의 개별 카드 UI

함수:

| 이름 | 설명 |
| --- | --- |
| `ChallengeCard(...)` | 카드 전체 렌더링 컴포넌트 |
| `handleCardClick(e)` | 버튼 클릭이 아닌 카드 클릭만 상세 모달로 연결한다. |
| `handleButtonClick(e)` | 상태에 따라 보상 수령, 상세 열기 등을 분기한다. |
| `getButtonStyle(buttonType)` | 버튼 타입에 맞는 인라인 스타일을 선택한다. |

### `frontend/src/components/challenge/ChallengeDetailModal.js`

파일 역할:
- 챌린지 상세 보기
- 입력값 수집
- 비교형 프리뷰
- 사진 업로드
- 상태별 액션 버튼 제공

함수:

| 이름 | 설명 |
| --- | --- |
| `isCategoryInput(input)` | 입력 항목이 카테고리 선택인지 판별한다. |
| `ChallengeDetailModal(...)` | 상세 모달 메인 컴포넌트 |
| `handleClickOutside(event)` | 모달 외부 클릭 시 닫는다. |
| `showDuplicateTooltip(dayKey)` | 요일별 금지 카테고리 중복 선택 경고를 표시한다. |
| `fetchComparePreview(nextInputValues)` | 비교형 템플릿 입력 프리뷰를 불러온다. |
| `handleFileSelect(e)` | 파일 선택 후 업로드 콜백을 호출한다. |
| `handleCameraClick()` | 카메라 capture 속성으로 파일 입력을 연다. |
| `handleGalleryClick()` | 일반 갤러리 선택으로 파일 입력을 연다. |
| `getProgressPercent()` | progress 퍼센트를 정수로 변환한다. |
| `buildStartInputValues()` | 입력값을 시작 API에 넘길 형태로 정규화한다. |
| `validateRequiredInputs()` | 필수 입력 누락 여부를 검사한다. |

### `frontend/src/components/challenge/CustomChallengeModal.js`

파일 역할:
- 사용자가 상세 설명과 난이도를 넣고 AI 챌린지를 생성하는 모달

함수:

| 이름 | 설명 |
| --- | --- |
| `CustomChallengeModal(...)` | AI 생성 입력 모달 |
| `handleClose()` | 입력값을 초기화하고 모달을 닫는다. |
| `handleOverlayClick(e)` | 배경 클릭으로 모달을 닫는다. |
| `handleGenerate()` | 상세 설명/난이도 검증 후 `onGenerate('', details, difficulty)`를 호출한다. |

### `frontend/src/components/challenge/AIGeneratedChallengeModal.js`

파일 역할:
- AI가 생성한 챌린지를 상세 모달 형태로 미리 보여주고 저장/재생성 버튼을 제공

함수:

| 이름 | 설명 |
| --- | --- |
| `AIGeneratedChallengeModal(...)` | AI 생성 미리보기 모달 |
| `handleSaveClick()` | 현재 수정본을 저장 콜백으로 넘긴다. |
| `customFooter` | 재생성/저장 버튼 푸터를 구성한다. |

### `frontend/src/components/challenge/ChallengeTabs.js`

파일 역할:
- 상단 탭 UI

함수:

| 이름 | 설명 |
| --- | --- |
| `ChallengeTabs({ tabs, activeTab, onTabChange })` | 탭 목록을 가로 스크롤 가능한 버튼으로 렌더링한다. |

### `frontend/src/components/challenge/ChallengeHeader.js`

파일 역할:
- 제목과 포인트 배지를 표시하는 보조 헤더

함수:

| 이름 | 설명 |
| --- | --- |
| `ChallengeHeader({ title, points })` | 제목과 포인트 배지를 렌더링한다. |

### `frontend/src/components/challenge/ChallengeFilters.js`

파일 역할:
- 필터 버튼 그룹 UI

함수:

| 이름 | 설명 |
| --- | --- |
| `ChallengeFilters({ filters, activeFilter, onFilterChange })` | 활성 필터에 맞는 버튼 스타일을 적용한다. |

### `frontend/src/app/(main)/challenge/page.js`

파일 역할:
- 챌린지 페이지 메인 컨테이너
- 대시보드 조회, 탭별 목록 정리, 모달 상태 관리

함수:

| 이름 | 설명 |
| --- | --- |
| `ChallengePage()` | 챌린지 메인 페이지 컴포넌트 |
| `animate(now)` | 포인트 카운트업 애니메이션 프레임 계산 |
| `fetchUserPoints()` | 대시보드 API로 포인트만 다시 읽는다. |
| `fetchChallenges()` | 대시보드 데이터를 탭 기준으로 가공해 화면 상태를 만든다. |
| `handleCardClick(challenge)` | 선택한 챌린지를 상세 모달에 띄운다. |
| `handleCloseModal()` | 상세 모달을 닫는다. |
| `handleCancelChallenge(challenge)` | 취소 API를 호출하고 목록을 새로고침한다. |
| `handlePhotoUpload(challenge, file)` | 이미지 검증 후 base64 업로드를 수행한다. |
| `handleStartChallenge(challenge, userInputs={})` | 템플릿 시작 또는 저장된 챌린지 시작을 처리한다. |
| `handleRestartChallenge(challenge, userInputs={})` | 실패 챌린지를 재도전한다. |
| `handleCreateChallenge()` | 커스텀 입력 모달을 연다. |
| `handleGenerateAIChallenge(title, details, difficulty)` | AI 미리보기 생성 |
| `handleSaveAIChallenge(editedData)` | AI 생성 결과 저장 |
| `handleDeleteChallenge(challenge)` | 저장 챌린지 삭제 |
| `handleRegenerateAIChallenge()` | AI 생성 미리보기에서 입력 모달로 되돌린다. |
| `handleClaimReward(challenge)` | 보상 수령 후 목록과 포인트를 갱신한다. |

추가 메모:

- 현재 메인 페이지에서 `직접 만들기`는 실제로 순수 커스텀 생성 API를 쓰지 않고, AI 생성 입력 모달을 연다.
- 즉, `createUserChallenge()` API는 존재하지만 이 페이지에서는 사용하지 않는다.

---

## 4. 챌린지 DB 설명

## 4.1 현재 핵심 테이블

### 4.1.1 `ChallengeTemplate`

역할:
- 시스템 정의 템플릿

주요 필드:

| 필드 | 의미 |
| --- | --- |
| `name`, `description` | 템플릿 기본 정보 |
| `source_type` | `duduk` 또는 `event` |
| `difficulty` | `easy`, `normal`, `hard` |
| `base_points`, `points_formula`, `max_points` | 포인트 규칙 |
| `has_penalty`, `penalty_formula`, `max_penalty` | 실패 시 패널티 규칙 |
| `bonus_condition`, `bonus_points` | 추가 보너스 규칙 |
| `duration_days` | 기본 기간 |
| `success_conditions` | 실제 판정 로직 JSON |
| `user_inputs` | 프론트에서 받아야 할 입력 정의 JSON |
| `requires_daily_check`, `requires_photo`, `photo_frequency`, `photo_description` | 추가 인증 규칙 |
| `success_description` | 사용자에게 보여줄 성공 조건 설명 |
| `display_config` | 프론트 진행률/표시 방식 JSON |
| `event_start_at`, `event_end_at`, `event_banner_url` | 이벤트 챌린지 전용 필드 |
| `is_active`, `display_order` | 운영 제어용 필드 |

### 4.1.2 `UserChallenge`

역할:
- 실제 사용자 참여 기록

주요 필드:

| 필드 | 의미 |
| --- | --- |
| `user` | 참여 사용자 |
| `source_type` | `duduk`, `event`, `custom`, `ai` |
| `template` | 템플릿 기반 챌린지면 원본 템플릿 FK |
| `source_coaching` | 코칭 기반 AI 생성일 때 원본 코칭 FK |
| `name`, `description`, `difficulty` | 실행 시점의 챌린지 정보 스냅샷 |
| `duration_days`, `started_at`, `ends_at` | 실행 기간 |
| `success_conditions` | 실제 판정 로직 스냅샷 |
| `user_input_values` | 사용자가 넣은 값 |
| `system_generated_values` | 비교 기준, 랜덤 예산, 미래의 나에게 알림 플래그 같은 시스템 계산값 |
| `display_config` | 프론트 표시 설정 스냅샷 |
| `progress` | 현재 진행률 JSON |
| `status` | `saved`, `ready`, `active`, `completed`, `failed` |
| `final_spent`, `earned_points`, `penalty_points`, `bonus_earned`, `completed_at` | 결과 데이터 |
| `attempt_number`, `attempt_group_id`, `is_current_attempt`, `previous_attempt` | 재도전 히스토리 관리 |

인덱스:

| 인덱스 | 목적 |
| --- | --- |
| `(user, status)` | 상태별 사용자 조회 최적화 |
| `(user, status, is_current_attempt)` | 최신 시도 중심 조회 최적화 |
| `(attempt_group_id)` | 재도전 묶음 조회 |
| `(ends_at)` | 만료 판정 조회 |

### 4.1.3 `ChallengeDailyLog`

역할:
- 날짜별 챌린지 로그

주요 필드:

| 필드 | 의미 |
| --- | --- |
| `user_challenge`, `log_date` | 어느 챌린지의 어느 날짜인지 식별 |
| `spent_amount`, `transaction_count`, `spent_by_category` | 자동 지출 집계 |
| `is_checked`, `checked_at` | daily_check 수동 체크 상태 |
| `photo_urls` | 사진 인증 데이터 목록 |
| `condition_met`, `condition_detail` | 추가 판정 결과와 세부 데이터 |
| `note` | 메모 |

제약:

- `unique_together = (user_challenge, log_date)`

## 4.2 JSON 필드가 중요한 이유

현재 챌린지 설계는 정규화 테이블보다 JSON 필드 의존도가 높다.

- `success_conditions`
  - 판정 규칙의 사실상 중심
  - 예: `target_amount`, `categories`, `compare_type`, `daily_rules`
- `display_config`
  - 프론트 UI 렌더링 스펙
  - 예: `progress_type`, `primary_metric`, `special_display`
- `progress`
  - 계산 결과 캐시
  - 예: `current`, `target`, `photo_count`, `daily_status`, `phase`
- `system_generated_values`
  - 런타임 내부 상태
  - 예: `compare_base`, `random_budget`, `future_message_notified`

즉, 챌린지 로직은 관계형 컬럼 + JSON 스냅샷 혼합 구조다.

## 4.3 마이그레이션 기준 DB 진화 요약

| 마이그레이션 | 의미 |
| --- | --- |
| `0001_initial` | 초기에 `Challenge`, `AIGeneratedChallenge`, `UserChallenge`가 분리돼 있었다. |
| `0003_*`, `0004_*` | AI 챌린지를 기존 챌린지 모델로 통합하는 방향으로 변경됐다. |
| `0005_*` | 현재 구조의 `ChallengeTemplate`, 확장된 `UserChallenge` 모델이 도입됐다. |
| `0007`, `0010`, `0012` | 상태값이 `cancelled` 제거, `saved` 추가 등으로 현재 구조에 맞게 바뀌었다. |
| `0013_userchallenge_attempt_grouping` | 재도전 묶음용 `attempt_group_id`, `is_current_attempt`가 추가됐다. |

---

## 5. 챌린지 상태 변화 로직

## 5.1 현재 상태값

| 상태 | 의미 |
| --- | --- |
| `saved` | 저장만 되었고 아직 시작 전. 주로 custom/AI 챌린지 |
| `ready` | 시작 예약 상태. 주로 특정 날짜 시작이 필요한 템플릿 |
| `active` | 진행 중 |
| `completed` | 성공 완료 |
| `failed` | 실패 완료 |

## 5.2 생성 경로별 초기 상태

| 생성 경로 | 생성 위치 | 초기 상태 |
| --- | --- | --- |
| 템플릿 기반 시작 | `UserChallengeCreateSerializer.create()` | `start_at <= now` 이면 `active`, 아니면 `ready` |
| 커스텀 생성 | `CustomChallengeCreateSerializer.create()` | `saved` |
| AI 저장 | `BaseChallengeStartSerializer._create_user_challenge()` | `saved` |
| 실패 챌린지 재도전(템플릿) | `restart.py -> UserChallengeCreateSerializer` | `active` 또는 `ready` |
| 실패 챌린지 재도전(custom/ai) | `restart.py -> _restart_same_spec_challenge()` | `active` 또는 `ready` |

## 5.3 상태 전이 흐름

### A. 템플릿 기반

1. `ChallengeTemplate` 선택
2. `UserChallengeCreateSerializer.create()`에서 `UserChallenge` 생성
3. 시작 시각이 미래면 `ready`, 아니면 `active`
4. 거래 저장/사진 업로드/배치 판정에 따라 `completed` 또는 `failed`
5. 성공 후 `claim_reward()`가 호출되면 현재 구현에서는 챌린지 레코드를 삭제

### B. custom / AI

1. `saved` 상태로 생성
2. `views.py:start()` 호출 시 `started_at`, `ends_at`, `status` 갱신
3. 이후 템플릿 기반과 동일하게 `active -> completed/failed`
4. 실패 시 `restart.py`가 새로운 시도를 생성하고 이전 시도는 `is_current_attempt=False`

## 5.4 상태를 바꾸는 실제 코드 위치

| 전이 | 코드 위치 | 설명 |
| --- | --- | --- |
| `saved -> active/ready` | `views.py:start()` | 저장 챌린지 시작 |
| `ready -> active` | `finalization.py:activate_started_ready_challenges_for_user()` | 조회/배치 시 자동 활성화 |
| `active -> failed` | `signals.py` 즉시 실패 핸들러 | 거래 저장 직후 실패 가능 |
| `active -> completed` | `complete_challenge(True, ...)` | 종료 평가 또는 사진 성공 직후 |
| `active -> failed/completed` | `finalization.py:finalize_expired_challenge()` | 기간 종료 후 최종 판정 |
| `failed -> 새 시도 생성` | `services/restart.py` | 기존 시도는 과거 시도로 남김 |

## 5.5 상태 변화 상세 시나리오

### 템플릿 시작

- 위치: `serializers.py`
- 핵심:
  - `success_conditions`에 사용자 입력 병합
  - 필요하면 `compare_base`, `random_budget`, `daily_rules` 계산
  - `start_at`, `ends_at`, `progress` 초기화
  - `active` 또는 `ready` 저장

### 거래 저장 시

- 위치: `signals.py`
- 핵심:
  - 활성 챌린지 조회
  - 이 거래가 추적 대상인지 `_should_track_transaction()`으로 검사
  - `ChallengeDailyLog` 업데이트
  - `progress` 재계산
  - 즉시 실패 조건 검사

### 사진 인증 시

- 위치: `views.py:upload_photo()`
- 핵심:
  - 이미지/base64 수신
  - `PhotoVerificationService.verify()` 호출
  - 통과하면 해당 날짜 로그의 `photo_urls`에 저장
  - `_update_photo_progress()` 실행
  - `photo_verification + once` 타입은 즉시 성공 처리 가능

### 기간 종료 시

- 위치: `services/finalization.py`
- 핵심:
  - `progress`를 마지막으로 다시 계산
  - `_evaluate_success()`로 최종 성공 여부 판정
  - `complete_challenge()`로 성공/실패 확정

---

## 6. custom / AI 챌린지 생성 파라미터 분석

## 6.1 custom 챌린지 생성 파라미터

### 프론트 요청 파라미터

위치:
- `frontend/src/lib/api/challenge.js:createUserChallenge()`

요청 필드:

| 파라미터 | 의미 | 백엔드 사용 위치 |
| --- | --- | --- |
| `name` | 챌린지 이름 | `CustomChallengeCreateSerializer` |
| `description` | 설명 | `CustomChallengeCreateSerializer` |
| `difficulty` | 난이도 | `UserChallenge.difficulty` |
| `duration_days` | 기간 | `UserChallenge.duration_days` |
| `target_amount` | 목표 금액. 없으면 zero_spend로 간주 | `success_conditions.target_amount` |
| `target_categories` | 추적 대상 카테고리 | `success_conditions.categories` |

### 백엔드 매핑 방식

위치:
- `backend/apps/challenges/serializers.py:CustomChallengeCreateSerializer.create()`

매핑 규칙:

| 입력 | 내부 변환 |
| --- | --- |
| `target_amount` 존재 | `success_conditions.type = amount_limit` |
| `target_amount` 없음 | `success_conditions.type = zero_spend` |
| `target_categories` 없음 | `["all"]` 로 저장 |
| `progress_type` | 금액이 있으면 `amount`, 없으면 `zero_spend` |
| 상태 | `saved` 로 저장 |

해석:

- 이 경로는 완전한 자유 설계형이라기보다, 사실상 `amount_limit` / `zero_spend` 두 유형만 지원한다.
- 다른 condition_type 은 custom 생성 API로 만들 수 없다.

## 6.2 AI 챌린지 생성 파라미터

### 프론트 입력

위치:
- `frontend/src/components/challenge/CustomChallengeModal.js`
- `frontend/src/lib/api/challenge.js:generateAIChallenge()`

실제 입력 흐름:

1. 사용자는 모달에서 `details`, `difficulty`를 입력한다.
2. 프론트는 `generateAIChallenge(title, details, difficulty)`를 호출한다.
3. 현재 UI는 `title`을 비워서 넘기고 있다.

프론트 요청 필드:

| 파라미터 | 의미 | 비고 |
| --- | --- | --- |
| `title` | 현재는 빈 문자열로 전달 | 백엔드 serializer에는 없음 |
| `details` | 사용자가 원하는 챌린지 설명 | AI 프롬프트의 핵심 입력 |
| `difficulty` | 사용자가 원하는 난이도 | 없으면 AI가 결정 가능 |

### 백엔드 입력

위치:
- `backend/apps/challenges/views.py:generate_ai()`
- `backend/apps/challenges/serializers.py:AIChallengGenerateSerializer`

실제 수용 필드:

| 파라미터 | 사용 여부 |
| --- | --- |
| `details` | 사용 |
| `difficulty` | 사용 |
| `title` | 현재 serializer 정의에 없음 |

### `AIClient.generate_challenge()` 입력 파라미터 분석

위치:
- `backend/external/ai/client.py:generate_challenge()`

함수 시그니처:

| 파라미터 | 타입 | 의미 |
| --- | --- | --- |
| `details` | `str` | 사용자의 자유 서술 입력 |
| `difficulty` | `str \| None` | 난이도 강제 또는 힌트 |
| `user_spending_summary` | `str \| None` | 최근 소비 패턴 요약. AI 개인화용 |

프롬프트에 실제로 들어가는 데이터:

| 항목 | 출처 | 역할 |
| --- | --- | --- |
| `[사용자 입력]` | `details` | 챌린지 주제, 제한하고 싶은 소비, 목적 |
| `[사용자 소비 패턴]` | `_get_user_spending_summary()` | 최근 30일 주요 지출 카테고리 요약 |
| `[난이도]` | `difficulty` | AI가 성공 조건 강도를 조절할 기준 |
| `[사용 가능한 카테고리]` | `CATEGORIES` 상수 | 허용된 카테고리 목록 제한 |
| `CHALLENGE_SCHEMA` | 상수 문자열 | AI 출력 JSON 구조 강제 |
| `DIFFICULTY_GUIDE` | 상수 문자열 | 난이도별 강도 가이드 |

### AI 응답 스키마

위치:
- `ChallengeResponse`

필드:

| 필드 | 의미 |
| --- | --- |
| `name` | 챌린지 이름 |
| `difficulty` | 난이도 |
| `description` | 짧은 설명 |
| `success_conditions` | 사람이 읽는 성공 조건 문장 배열 |
| `numeric_constraints.duration_days` | 기간 |
| `numeric_constraints.target_amount` | 목표 금액 |
| `target_keywords` | 거래 키워드 매칭용 |
| `target_categories` | 카테고리 기반 추적용 |

### AI 응답 후처리

위치:
- `AIClient._process_challenge_result()`

후처리 규칙:

| 처리 | 설명 |
| --- | --- |
| `difficulty` | 사용자 입력이 있으면 사용자 값을 우선 사용 |
| `base_points` | `calculate_points()`로 재계산 |
| `duration_days` | `numeric_constraints.duration_days`에서 꺼내 평탄화 |
| `target_amount` | `numeric_constraints.target_amount`에서 꺼내 정수화 |
| `target_categories` | 비어 있으면 `["기타"]`를 기본값으로 넣음 |
| `name`, `description`, `success_conditions`, `target_keywords` | 최소 기본값 보정 |

해석:

- AI는 자유 문장을 생성하지만, 실제 저장 직전에는 매우 단순한 구조로 축약된다.
- 따라서 AI가 `compare`, `daily_rule`, `photo` 같은 복합 챌린지를 생성하려면 추가 매핑 로직이 필요하다.
- 현재 기본 AI 저장 구조는 사실상 `amount_limit` 또는 `custom` 성격에 더 가깝다.

## 6.3 코칭 기반 AI 생성 파라미터

### 프론트 요청

위치:
- `generateChallengeFromCoaching(coachingId, difficulty)`

요청 필드:

| 파라미터 | 의미 |
| --- | --- |
| `coaching_id` | 원본 코칭 ID |
| `difficulty` | 원하는 난이도 |

### 백엔드 -> AIClient 입력

위치:
- `views.py:generate_from_coaching()`
- `client.py:generate_challenge_from_coaching()`

AI에 전달되는 `coaching_data` 구조:

| 키 | 의미 |
| --- | --- |
| `id` | 코칭 ID |
| `title` | 코칭 제목 |
| `subject` | 코칭 주제 |
| `analysis` | 소비 분석 |
| `coaching_content` | 사용자에게 보여준 코칭 문구 |

해석:

- 일반 AI 생성이 사용자 자유서술 + 지출 요약 기반이라면,
- 코칭 기반 생성은 이미 분석이 끝난 요약 결과를 기반으로 챌린지를 설계한다.

## 6.4 AI 저장 파라미터

위치:
- `BaseChallengeStartSerializer`

저장 시 받는 필드:

| 필드 | 의미 |
| --- | --- |
| `name` | 챌린지 이름 |
| `description` | 설명 |
| `difficulty` | 난이도 |
| `duration_days` | 기간 |
| `base_points` | 기본 포인트 |
| `success_conditions` | 사람이 읽는 성공 조건 배열 |
| `target_amount` | 목표 금액 |
| `target_categories` | 대상 카테고리 |
| `target_keywords` | 대상 키워드 |
| `condition_type` | 내부 판정 타입 |
| `coaching_id` | 코칭 기반 저장일 때 원본 코칭 연결용 |

저장 후 내부 변환:

| 내부 필드 | 값 |
| --- | --- |
| `success_conditions.type` | `condition_type` 또는 금액 존재 여부 기반 기본값 |
| `display_config.progress_type` | 현재 구현상 `amount` 또는 `custom` |
| `progress` | 현재 구현상 `amount` 또는 `custom` 초기 구조 |
| `status` | `saved` |
| `system_generated_values.generated_by` | `gpt` 또는 `gpt_coaching` |

---

## 7. 오류 가능성 높은 부분

아래는 현재 코드 기준으로 실제 장애나 오동작 가능성이 높은 부분들이다.

### 7.1 [높음] 성공 포인트가 이중 지급될 가능성

관련 위치:
- `backend/apps/challenges/models.py`
- `backend/apps/challenges/views.py`

근거:

- `complete_challenge(True, ...)` 안에서 이미 사용자 포인트를 증가시킨다.
- 이후 `claim_reward()`에서도 다시 `self.user.points += self.earned_points`를 수행한다.
- `views.py:claim_reward()`는 이 `claim_reward()`를 호출한 뒤 챌린지 레코드를 삭제한다.

영향:

- 성공한 챌린지는 완료 시점과 보상 수령 시점에 각각 포인트가 반영될 수 있다.

### 7.2 [높음] Admin 설정이 현재 모델과 불일치

관련 위치:
- `backend/apps/challenges/admin.py`
- `backend/apps/challenges/migrations/0008_remove_challengetemplate_icon_and_more.py`

근거:

- Admin fieldset 이 `icon`, `icon_color`를 참조한다.
- 현재 `ChallengeTemplate`, `UserChallenge` 모델에는 해당 필드가 없다.

영향:

- Django Admin 상세 페이지 진입 시 예외가 발생할 가능성이 크다.

### 7.3 [높음] AI/코칭 저장 챌린지의 `condition_type` 과 `progress_type` 이 어긋날 수 있음

관련 위치:
- `backend/apps/challenges/serializers.py`

근거:

- `BaseChallengeStartSerializer`는 `condition_type`으로 거의 모든 챌린지 타입을 허용한다.
- 하지만 `_build_display_config()`와 `_build_initial_progress()`는 사실상 `amount` 또는 `custom`만 만든다.

영향:

- 예를 들어 `daily_check`, `photo_verification`, `compare`, `random_budget` 타입을 AI가 만들어도,
- 실제 progress 구조와 판정 구조가 불일치할 수 있다.

### 7.4 [높음] 랜덤 예산 챌린지의 즉시 실패 핸들러가 매핑되지 않음

관련 위치:
- `backend/apps/challenges/signals.py`

근거:

- `_check_random_budget_failure()` 함수는 존재한다.
- 그런데 `IMMEDIATE_FAILURE_HANDLERS`에서 `CONDITION_TYPE_RANDOM_BUDGET` 값이 `None`으로 들어가 있다.

영향:

- 거래 저장 직후 랜덤 예산 초과를 즉시 실패로 못 잡고, 만료 시점 또는 다른 경로에서만 실패가 확정될 수 있다.

### 7.5 [높음] 거래 수정/삭제 시 챌린지 progress 가 보정되지 않음

관련 위치:
- `backend/apps/challenges/signals.py`

근거:

- `post_save(sender=Transaction)` 에서 `created` 가 `True`일 때만 동작한다.
- 거래 수정(update) 또는 삭제(delete) 경로를 처리하는 시그널이 없다.

영향:

- 사용자가 거래 금액/카테고리를 수정하거나 삭제하면 `ChallengeDailyLog`, `progress`, 실패 상태가 실제와 어긋날 수 있다.

### 7.6 [중간] 사진 업로드가 항상 오늘 날짜 로그에 저장됨

관련 위치:
- `backend/apps/challenges/views.py`
- `backend/apps/challenges/services/photo_verification.py`

근거:

- `upload_photo()`는 `captured_at`를 받아도 `today = timezone.now().date()` 기준으로 로그를 생성한다.
- `PhotoVerificationService.verify()`의 `log_date` 인자는 현재 실제 검증 분기에서 사용되지 않는다.

영향:

- 어제 소비에 대한 인증 사진을 자정 이후 업로드하면 오늘 로그에 들어간다.
- 전일 기준 실패 조건을 가진 챌린지에서 오판정 가능성이 있다.

### 7.7 [중간] 프론트는 `status=saved` 조회를 보내지만 백엔드는 지원하지 않음

관련 위치:
- `frontend/src/lib/api/challenge.js`
- `backend/apps/challenges/views.py`

근거:

- 프론트는 `getMyChallenges()`에서 `saved -> saved`로 매핑한다.
- 백엔드 `get_queryset()`은 `active`, `ready`, `completed`, `failed`, `finished`만 처리한다.

영향:

- `?status=saved` 요청이 실제로는 saved만 필터하지 못하고 더 넓은 결과를 반환할 수 있다.

### 7.8 [중간] 동일 템플릿의 중복 예약 챌린지를 막지 못할 수 있음

관련 위치:
- `backend/apps/challenges/serializers.py`

근거:

- 템플릿 기반 생성 시 중복 검사는 `status='active'` 만 본다.
- `ready` 상태의 같은 템플릿은 중복 생성 가능하다.

영향:

- 월요일 시작형 비교 챌린지 같은 경우 같은 템플릿을 여러 개 예약할 수 있다.

### 7.9 [중간] 시드 데이터 카테고리명이 현재 카테고리 체계와 어긋남

관련 위치:
- `backend/apps/challenges/seed_challenges.py`
- `backend/apps/challenges/serializers.py`

근거:

- `외식/배달 X` 템플릿은 `categories = ["식비", "카페", "술/유흥"]`
- 현재 유효 카테고리 목록은 `카페/간식` 이고 `카페`는 없다.

영향:

- 카페 지출이 실제로는 추적되지 않을 가능성이 있다.

### 7.10 [중간] 보상 수령 시 완료 챌린지를 삭제해서 통계와 히스토리가 왜곡될 수 있음

관련 위치:
- `backend/apps/challenges/views.py`
- `backend/apps/challenges/views.py:ChallengeStatsView`

근거:

- 보상 수령 후 `UserChallenge` 와 `daily_logs` 를 삭제한다.
- 그런데 통계 API는 `UserChallenge` 테이블을 직접 집계한다.

영향:

- 완료 수, 성공률, 챌린지별 누적 이력, 챌린지 기반 획득 포인트 총합이 실제보다 작아질 수 있다.

### 7.11 [낮음] AI 생성 요청의 `title` 파라미터가 프론트-백엔드 사이에서 어긋남

관련 위치:
- `frontend/src/lib/api/challenge.js`
- `backend/apps/challenges/serializers.py`

근거:

- 프론트는 `generateAIChallenge(title, details, difficulty)` 로 `title`을 보낸다.
- 백엔드 생성 serializer는 `details`, `difficulty`만 정의한다.

영향:

- 현재는 기능상 큰 문제는 아니어도, API 계약이 불명확해 유지보수 시 혼란이 생길 수 있다.

### 7.12 [낮음] AI 결과 후처리의 fallback 이 빈 문자열을 보정하지 못함

관련 위치:
- `backend/external/ai/client.py:_process_challenge_result()`

근거:

- `setdefault()`는 키가 존재하면 빈 문자열이어도 대체하지 않는다.
- `ChallengeResponse` 기본값이 `name=""` 이기 때문에, 이름이 비어 있는 응답이 들어오면 fallback 이름이 안 들어갈 수 있다.

영향:

- AI 미리보기에서 빈 제목이 내려오거나 저장 단계 validation 에 걸릴 가능성이 있다.

---

## 8. 정리

현재 챌린지 시스템은 구조적으로는 잘 분리되어 있다.

- 모델: `models.py`
- 생성: `serializers.py`
- API: `views.py`
- 실시간 진행률/즉시 실패: `signals.py`
- 날짜 계산/최종 판정: `services/*`
- AI 생성/사진 분석: `external/ai/client.py`
- 프론트 상태 조합: `page.js`, `ChallengeDetailModal.js`, `useChallenge.js`

특히 좋은 점은 다음과 같다.

- `ChallengeTemplate -> UserChallenge` 스냅샷 구조가 명확하다.
- 판정 로직을 `signals.py`, `finalization.py`, `failure_reason.py`로 꽤 체계적으로 나눴다.
- 비교형, 랜덤 예산, 사진 인증처럼 서로 다른 챌린지 타입을 JSON 기반으로 확장할 수 있게 설계했다.

반면 현재 가장 먼저 점검해야 할 부분은 아래 세 가지다.

1. 포인트 이중 지급 여부
2. AI 저장 챌린지의 `condition_type` / `progress_type` 불일치
3. Admin 구버전 필드 참조와 거래 수정/삭제 시 progress 불일치

이 세 가지는 실제 사용자 데이터 오염이나 운영 장애로 이어질 가능성이 가장 높다.
