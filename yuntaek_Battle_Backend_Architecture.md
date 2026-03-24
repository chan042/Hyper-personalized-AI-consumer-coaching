# 윤택지수 대결 백엔드 아키텍처

## 1. 목적

이 문서는 현재 `duduk-project`의 인증 구조, 유저 스키마, 월간 윤택지수 생성 방식에 맞춰 `윤택지수 대결`을 구현하기 위한 백엔드 설계를 정리한 문서다.

이 문서에서 다루는 범위는 아래와 같다.

- 현재 로그인 방식에서 사용자를 어떻게 식별하고 친구를 찾을지
- 두 사용자가 서로의 미션 현황을 각자 기기에서 어떻게 볼지
- 대결용 데이터 모델
- 대결 신청, 수락, 만료, 진행, 결과 확정 로직
- 검증이 쉬운 고정 미션 12개
- 프론트 화면과 연결할 API

## 2. 현재 프로젝트 기준 사실

### 2-1. 인증 방식

현재 프로젝트는 아래 흐름으로 로그인한다.

- 프론트는 Google 로그인 후 Google Access Token을 받는다.
- 백엔드는 `/api/users/auth/google/`에서 Google UserInfo API로 검증한다.
- 검증 성공 시 JWT `access`, `refresh`를 발급한다.
- 프론트는 JWT를 `localStorage`에 저장하고 이후 모든 API에 `Authorization: Bearer ...`로 붙인다.
- 최종 사용자 정보는 `/api/users/profile/`로 가져온다.

즉, 윤택지수 대결 API는 로그인 수단을 따로 신경 쓸 필요가 없다.  
`request.user`만 신뢰하면 된다.

### 2-2. 현재 유저 스키마

현재 `User` 모델에서 대결에 실제로 쓸 수 있는 필드는 아래다.

| 필드 | 용도 |
|---|---|
| `id` | 내부 식별자 |
| `email` | 로그인 ID, 외부 공개 금지 |
| `username` | 기본 표시 이름 |
| `character_name` | 캐릭터 이름이 있으면 표시 이름으로 우선 사용 가능 |
| `character_type` | 기본 아바타 타입 |
| `profile_image` | 사용자 업로드 프로필 이미지 |
| `points` | 대결 보상 지급 대상 |
| `is_profile_complete` | 대결 참여 가능 여부 판단에 활용 가능 |
| `auth_provider`, `social_id` | 인증 정보, 외부 공개 금지 |

결론은 아래와 같다.

- 친구 검색에 `email`을 쓰면 안 된다.
- `social_id`도 절대 쓰면 안 된다.
- `username` 검색도 가능은 하지만, 현재 로그인 ID가 이메일 기반이므로 공개 검색 키로 쓰기엔 부적절하다.

따라서 대결용 공개 식별자는 별도로 둬야 한다.

## 3. 친구 찾기 방식

### 3-1. 결론

`BattleProfile.battle_code`를 새로 두고, 친구 찾기는 이 코드의 exact match로 처리한다.

### 3-2. 왜 별도 코드가 필요한가

- 현재 로그인 ID는 `email`이다.
- `username`은 서비스 표시명으로는 쓸 수 있지만 공개 검색 키로 쓰면 개인정보 노출과 오탐 가능성이 있다.
- 프로젝트에 친구 관계 테이블이 아직 없다.

따라서 가장 안전한 방식은 아래다.

1. 각 사용자에게 대결용 공개 키 `battle_code`를 1개 발급한다.
2. 사용자는 이 코드를 직접 친구에게 공유한다.
3. 친구는 검색 화면에 이 코드를 입력한다.
4. 백엔드는 exact match로 한 명만 반환한다.

### 3-3. `BattleProfile` 제안

| 필드 | 타입 | 설명 |
|---|---|---|
| `user` | OneToOne(User) | 사용자 연결 |
| `battle_code` | CharField(unique) | 친구 검색용 공개 키 |
| `active_battle` | FK(YuntaekBattle, null=True) | 현재 묶여 있는 대결 |
| `pending_result_battle` | FK(YuntaekBattle, null=True) | 결과는 확정됐지만 아직 본인이 `확인완료`를 누르지 않은 대결 |
| `is_enabled` | Boolean | 대결 기능 사용 가능 여부 |
| `created_at` | DateTime | 생성 시각 |
| `updated_at` | DateTime | 수정 시각 |

### 3-4. 검색 응답에 노출할 정보

검색 결과에는 아래만 내려주는 것이 적절하다.

| 응답 필드 | 값 |
|---|---|
| `battle_code` | 사용자에게 공개되는 대결 ID |
| `display_name` | `character_name` 우선, 없으면 `username` |

검색 결과에 내려주면 안 되는 값은 아래다.

- `email`
- `social_id`
- `points`
- 내부 `user_id`
- 예산, 취미, 결혼 여부 같은 개인정보 필드

### 3-5. 검색 API

- `GET /api/battles/users/lookup/?battle_code=AB12CD34`

검증 규칙은 아래다.

- exact match만 허용
- 자기 자신 검색 불가
- 존재하지 않으면 404
- rate limit 적용 권장

## 4. 서로의 미션 현황을 기기에서 공유하는 방식

### 4-1. 기본 원칙

서로의 기기가 직접 통신하는 구조가 아니다.  
두 기기는 같은 백엔드 상태를 읽어가는 구조다.

즉, 공유 방식은 아래다.

1. 한 사용자가 미션을 성공한다.
2. 백엔드가 `BattleMission`, `BattleParticipant`, `YuntaekBattle`를 갱신한다.
3. 백엔드가 양쪽 사용자에게 알림을 저장한다.
4. 두 사용자는 각자 진행 화면 API를 다시 호출해 최신 상태를 본다.

### 4-2. 현재 프로젝트에 맞는 현실적인 방식

현재 프로젝트에는 웹소켓이나 SSE 구조가 없다.  
반면 알림은 이미 30초 polling 구조가 있다.

따라서 대결 진행 화면은 아래 조합이 가장 현실적이다.

- 진행 화면 오픈 중: `GET /api/battles/current/progress/`를 10~15초 polling
- 앱 전체 배경 상태: 기존 `NotificationContext`의 30초 unread polling 사용
- 미션 성공 직후: 백엔드가 `BATTLE` 알림 2건 생성

### 4-3. 진행 화면에서 보여줄 스코어

배틀 카테고리(`alternative / growth / health / challenge`)는 공식 윤택지수 점수가 아직 나오기 전까지 `미션 선점 개수`만 보여준다.

- 내가 미션 1개 먼저 성공, 상대 0개면 `1:0`
- 내가 2개, 상대 1개면 `2:1`

이 값은 진행 표시용이며 최종 승패 계산에 직접 쓰이지 않는다.  
최종 승패는 월간 공식 점수가 생성된 뒤 확정한다.

### 4-4. 진행 상태 공유용 필드

`YuntaekBattle` 또는 `BattleParticipant`에 아래 필드를 두면 polling 최적화가 쉽다.

| 필드 | 설명 |
|---|---|
| `state_version` | 상태가 바뀔 때마다 +1 |
| `updated_at` | 마지막 변경 시각 |

프론트는 마지막으로 받은 `state_version`과 비교해 UI를 갱신하면 된다.

`state_version`은 아래처럼 `사용자에게 보이는 battle 상태`가 바뀔 때마다 증가시키는 규칙으로 통일하는 것이 안전하다.

- 신청 생성
- 신청 수락
- 거절 / 취소 / 만료
- 미션 선점
- `ACTIVE -> WAITING_FOR_SCORE` 전환
- 결과 확정

## 5. 대결 도메인 모델

대결은 기존 `apps.challenges`에 억지로 넣지 말고 `apps.battles`로 분리하는 것이 맞다.

```text
backend/apps/battles/
  models.py
  views.py
  serializers.py
  urls.py
  tasks.py
  admin.py
  services/
    request_service.py
    mission_service.py
    result_service.py
    reward_service.py
    notification_service.py
```

### 5-1. `YuntaekBattle`

| 필드 | 타입 | 설명 |
|---|---|---|
| `requester` | FK(User) | 신청자 |
| `opponent` | FK(User) | 상대 |
| `status` | CharField | `REQUESTED / ACTIVE / WAITING_FOR_SCORE / COMPLETED / DRAW / REJECTED / CANCELED / EXPIRED` |
| `category` | CharField | `alternative / growth / health / challenge` |
| `score_key` | CharField | 공식 점수 키 |
| `target_year` | Integer | 대결 대상 연도 |
| `target_month` | Integer | 대결 대상 월 |
| `requested_at` | DateTime | 신청 시각 |
| `request_deadline_at` | DateTime | 해당 월 15일 23:59:59 KST |
| `pair_key` | CharField(indexed) | `min_user_id:max_user_id:year:month` 형태의 역방향 중복 방지 키 |
| `accepted_at` | DateTime | 수락 시각 |
| `started_at` | DateTime | 대결 시작 시각 |
| `score_expected_at` | DateTime | 다음 달 1일 00:00 KST |
| `completed_at` | DateTime | 결과 확정 시각 |
| `closed_at` | DateTime | 거절/취소/만료/결과 확정 등 종료 시각 |
| `result_locked_at` | DateTime, null=True | 결과 스냅샷을 1회 고정한 시각 |
| `winner` | FK(User, null=True) | 승자 |
| `is_draw` | Boolean | 무승부 여부 |
| `last_settlement_error` | TextField, null=True | 최근 결과 확정 실패 사유 |
| `state_version` | Integer | 상태 버전 |
| `created_at` | DateTime | 생성 시각 |
| `updated_at` | DateTime | 수정 시각 |

### 5-2. `BattleParticipant`

| 필드 | 타입 | 설명 |
|---|---|---|
| `battle` | FK(YuntaekBattle) | 대결 연결 |
| `user` | FK(User) | 참가자 |
| `role` | CharField | `requester / opponent` |
| `mission_won_count` | Integer | 진행 화면 스코어용 |
| `mission_bonus_score` | Integer | 최종 계산용. 미션 1개당 +3 |
| `official_base_score` | Integer, null=True | 공식 월간 점수 |
| `final_score` | Integer, null=True | 공식 월간 점수 + 미션 보너스 |
| `official_score_snapshot` | JSONField | 결과 화면용 7개 항목 + 총점 + `analysis_warnings` |
| `profile_snapshot` | JSONField | 표시 이름, 프로필 이미지, 캐릭터 타입 |
| `result_seen_at` | DateTime, null=True | 사용자가 결과 화면에서 `확인완료`를 누른 시각 |
| `created_at` | DateTime | 생성 시각 |

### 5-3. `BattleMissionTemplate`

MVP에서는 카테고리별 3개씩 고정 미션을 둔다.

| 필드 | 타입 | 설명 |
|---|---|---|
| `category` | CharField | `alternative / growth / health / challenge` |
| `title` | CharField | 미션명 |
| `description` | TextField | 설명 |
| `verification_type` | CharField | 검증 방식 |
| `verification_config` | JSONField | 카테고리, 횟수, 금액, 연속일수 등 |
| `display_order` | Integer | 1~3 |
| `is_active` | Boolean | 활성 여부 |

### 5-4. `BattleMission`

| 필드 | 타입 | 설명 |
|---|---|---|
| `battle` | FK(YuntaekBattle) | 대결 연결 |
| `template` | FK(BattleMissionTemplate) | 미션 원본 |
| `title_snapshot` | CharField | 대결 시점 제목 |
| `description_snapshot` | TextField | 대결 시점 설명 |
| `verification_snapshot` | JSONField | 대결 시점 규칙 |
| `status` | CharField | `OPEN / WON / DRAW / EXPIRED` |
| `winner` | FK(User, null=True) | 먼저 성공한 사용자 |
| `won_at` | DateTime | 선점 시각 |
| `win_evidence_snapshot` | JSONField, null=True | 선점 시점 증빙 고정본 |
| `point_value` | Integer | 기본 3 |
| `created_at` | DateTime | 생성 시각 |

### 5-5. `BattleMissionAttempt`는 MVP에서 제외

MVP를 가볍게 가져가려면 `BattleMissionAttempt` 같은 상세 시도 로그 테이블은 두지 않는 편이 낫다.

근거는 아래다.

- 최종 결과 화면과 보상 정산에 필요한 값은 `BattleMission`의 최종 상태와 `BattleParticipant`의 최종 점수면 충분하다.
- 미션 판정은 거래 생성, 챌린지 완료, AI 챌린지 시작/완료 이벤트를 받을 때 즉시 처리할 수 있다.
- `BattleMissionAttempt`는 운영 디버깅에는 도움이 되지만, 사용자 UX와 핵심 정합성에는 필수 테이블이 아니다.
- 이 테이블은 미션 이벤트가 들어올 때마다 row가 늘어나므로, 장기적으로는 battle 핵심 테이블보다 더 빨리 커질 가능성이 높다.

따라서 MVP에서는 아래처럼 단순화하는 것이 좋다.

- 별도 `BattleMissionAttempt` row는 저장하지 않는다.
- 판정 성공 시 `BattleMission.status`, `winner`, `won_at`만 갱신한다.
- 판정 실패나 선착순 패배 같은 중간 로그는 영구 저장하지 않는다.
- 운영 확인이 꼭 필요하면 서버 로그나 에러 추적 도구에서만 단기적으로 확인한다.

### 5-6. `BattleReward`

| 필드 | 타입 | 설명 |
|---|---|---|
| `battle` | FK(YuntaekBattle) | 대결 연결 |
| `user` | FK(User) | 보상 수령자 |
| `points` | Integer | 지급 포인트 |
| `reason` | CharField | `BATTLE_WIN / BATTLE_DRAW / BATTLE_DELAY_COMPENSATION` |
| `created_at` | DateTime | 지급 시각 |

`unique_together (battle, user, reason)`으로 중복 지급을 막는다.

### 5-7. 상태 제약과 유니크 규칙

- `BattleProfile.active_battle`는 조회 최적화를 위한 캐시 포인터이고, 원본 진실은 `YuntaekBattle.status`다.
- `BattleProfile.pending_result_battle`는 결과 확인 UX를 위한 캐시 포인터이고, 원본 진실은 `BattleParticipant.result_seen_at is null`인 종료 대결 존재 여부다.
- `REQUESTED / ACTIVE / WAITING_FOR_SCORE`만 열린 상태로 취급한다.
- `REJECTED / CANCELED / EXPIRED / COMPLETED / DRAW` 같은 종료 상태로 바뀌는 모든 경로는 `active_battle` 해제 로직을 공통 서비스 1곳으로만 타게 한다.
- `pair_key`에 대해 `status in (REQUESTED, ACTIVE, WAITING_FOR_SCORE)` 조건부 unique constraint를 두면, 두 사람이 동시에 서로 신청해도 열린 대결 row는 1개만 생긴다.
- 사용자는 `REQUESTED`를 포함한 열린 대결을 동시에 2개 가질 수 없다. 즉, 누군가의 신청을 받은 상태만 되어도 다른 신청을 새로 받을 수 없게 막는다.
- 사용자는 본인 기준 `result_seen_at is null`인 종료 대결을 동시에 2개 가질 수 없게 막는 편이 안전하다. 즉, 결과를 아직 확인하지 않은 상태에서는 다음 대결 진입보다 결과 페이지 노출이 우선되어야 한다.
- 사용자는 같은 `target_year`, `target_month`에 `ACTIVE` 또는 `WAITING_FOR_SCORE` 대결을 2개 가질 수 없다.
- `REQUESTED` 상태에서는 신청 취소 후 재신청이 가능하지만, 한번 `ACTIVE`가 된 대결은 월말 결과가 나올 때까지 카테고리를 바꿔 다시 신청할 수 없게 막는 것이 안전하다.
- `BattleProfile.active_battle`, `pending_result_battle`는 캐시 포인터이므로, `GET /api/battles/entry/`와 `POST /api/battles/requests/` 시작 전에 `reconcile_battle_profile(...)` 같은 경량 보정 함수를 한 번 태우는 편이 안전하다.
- 이 보정 함수는 사용자의 `BattleProfile` 1건만 잠근 뒤, `active_battle`가 terminal 상태를 가리키면 비우고, `pending_result_battle`가 이미 확인 완료된 결과를 가리키면 비우고, 반대로 `result_seen_at is null`인 최신 종료 battle이 있으면 다시 채우는 정도만 수행한다.
- 즉, 전체 history를 재계산하는 무거운 복구가 아니라 `현재 포인터가 진실과 다를 때만 바로잡는 자가복구 단계`로 제한한다.
- `GET /api/battles/entry/`에서는 호출자 1명만 reconcile하면 충분하다.
- `POST /api/battles/requests/`에서는 요청자와 상대 `BattleProfile`를 잠근 뒤 두 사람 모두 reconcile해야 한다. 신청 가능 여부 판단이 양쪽 포인터에 모두 의존하기 때문이다.

### 5-8. 종료 후 데이터 보존 규칙

- 대결이 끝났다고 `YuntaekBattle`, `BattleParticipant`, `BattleMission`, `BattleReward` row를 바로 삭제하지 않는다.
- 대결 종료 시 리프레시되는 것은 `BattleProfile.active_battle` 같은 현재 진행 포인터뿐이다.
- 결과 확정 직후에는 양쪽 `BattleProfile.pending_result_battle`에 battle을 넣어 `확인 전 결과` 상태를 표시하고, 각 사용자가 `확인완료`를 누르면 그 사용자에 대해서만 해제한다.
- 사용자용 `history` 화면은 두지 않더라도, 종료된 battle row는 결과 확인, 중복 보상 방지, 알림 라우팅, 운영 확인의 원본이므로 남겨야 한다.
- 따라서 `배틀 db를 리프레시한다`는 의미는 `현재 슬롯을 비운다`에 가깝고, `과거 대결 row를 날린다`는 뜻으로 구현하면 안 된다.
- MVP에서는 종료된 battle row를 hard delete하지 않는 것이 안전하다.
- MVP에서는 `BattleMissionAttempt`를 아예 두지 않고, 최종 결과만 `BattleMission`에 남기는 편이 더 단순하다.
- 읽은 `Notification`은 영구 보관 대상이 아니므로, 별도 정리 배치로 일정 기간 후 삭제할 수 있다.
- 즉, 장기 보존 대상은 `YuntaekBattle`, `BattleParticipant`, `BattleMission`, `BattleReward`이고, 알림은 운영 로그 성격으로 다루는 편이 적절하다.

## 6. 점수 매핑

### 6-1. `MonthlyReport.score_snapshot`이란

`score_snapshot`은 특정 사용자, 특정 연월의 `공식 월간 윤택지수 계산 결과`를 JSON으로 저장해 둔 스냅샷이다.

현재 프로젝트 기준 저장 위치는 아래다.

- `MonthlyReport.user`
- `MonthlyReport.year`
- `MonthlyReport.month`
- `MonthlyReport.score_snapshot`
- `MonthlyReport.score_status`
- `MonthlyReport.score_generated_at`
- `MonthlyReport.score_error`

즉, `MonthlyReport` 1건 안에 `점수 스냅샷(score_snapshot)`과 `AI 해설 리포트(report_content)`가 같이 들어 있지만, 둘은 역할이 다르다.

- `score_snapshot`: battle 결과 확정에 쓰는 공식 점수 원본
- `report_content`: 사용자에게 보여주는 AI 해설 리포트

이 둘을 같은 것으로 취급하면 안 된다.

### 6-2. `score_snapshot` 생성 시점

기본 생성 시점은 `매월 1일 00:00 KST` 배치다.

예시:

- `2026년 3월`의 `score_snapshot`은 `2026년 4월 1일 00:00 KST` 배치에서 생성 대상

생성 흐름은 아래다.

1. Celery Beat가 매월 1일 00:00에 `generate_monthly_reports_for_all_users()`를 실행한다.
2. 배치는 각 사용자에 대해 전월 `(year, month)`를 구한다.
3. 먼저 `ensure_score_snapshot(user, year, month)`를 호출해 점수 스냅샷 생성을 시도한다.
4. 점수 스냅샷 생성이 끝난 뒤에야 AI 월간 리포트 `report_content` 생성으로 넘어간다.

즉, 순서상 `score_snapshot`이 먼저이고 `report_content`는 그 다음이다.

추가로 battle 결과 확정 로직에서도 `ensure_score_snapshot()`을 재호출할 수 있다.  
따라서 월간 배치가 일부 실패했더라도, battle finalize 시점에 사용자별 재시도가 가능해야 한다.

### 6-3. `score_snapshot` 데이터 구조

현재 코드 기준 저장 구조는 아래 형태다.

```json
{
  "total_score": 87,
  "max_score": 100,
  "year": 2026,
  "month": 3,
  "breakdown": {
    "budget_achievement": 30,
    "alternative_action": 18,
    "spending_consistency": 7,
    "challenge_success": 1,
    "health_score": 12,
    "leakage_improvement": 10,
    "growth_consumption": 9
  },
  "analysis_warnings": []
}
```

의미는 아래와 같다.

- `total_score`: 100점 만점 기준 월간 총점
- `max_score`: 현재는 항상 100
- `year`, `month`: 대상 연월
- `breakdown`: 항목별 점수
- `analysis_warnings`: AI 항목 분석 실패 또는 부분 실패 경고

### 6-4. 어떤 항목이 AI를 쓰는가

현재 윤택지수 계산은 `알고리즘 기반 항목`과 `AI 기반 항목`이 섞여 있다.

AI를 쓰지 않는 항목:

- `budget_achievement`
- `alternative_action`
- `spending_consistency`
- `challenge_success`

AI를 쓰는 항목:

- `health_score`
- `leakage_improvement`
- `growth_consumption`

즉, `score_snapshot` 전체를 만드는 과정에서는 AI가 사용되지만, 모든 항목이 AI에 의존하는 것은 아니다.

### 6-5. AI가 실패하면 `score_snapshot`은 어떻게 되나

현재 코드의 중요한 특징은 `AI 항목 실패가 전체 점수 스냅샷 생성을 항상 막지는 않는다`는 점이다.

처리 규칙은 아래다.

1. `health_score`, `leakage_improvement`, `growth_consumption` 계산 중 AI 호출이 실패할 수 있다.
2. 현재 계산기 구현은 이런 실패를 `_safe_ai_component()`에서 잡는다.
3. 실패한 AI 항목은 `0점` 처리하고, `analysis_warnings`에 경고를 남긴다.
4. 따라서 `score_snapshot` 전체는 `READY`로 저장될 수 있다.

즉, 아래 둘은 다르다.

- `score_status=FAILED`
  - 스냅샷 자체를 만들지 못함
- `score_status=READY`이지만 `analysis_warnings` 존재
  - 스냅샷은 저장됐지만 일부 AI 항목이 부정확할 수 있음

이 차이는 battle 결과 확정에서 매우 중요하다.

### 6-6. `score_snapshot`은 어떻게 확인하나

서버 구현 기준 확인 경로는 아래다.

- DB: `MonthlyReport(user, year, month).score_snapshot`
- API: `GET /api/users/yuntaek-score/?year=YYYY&month=MM`

API 동작 규칙은 아래다.

- 저장된 `score_snapshot`이 `READY` 상태이면 그대로 응답
- 스냅샷이 없으면 생성하지 않고 `503` 반환
- `year`, `month`를 안 넘기면 기본값은 `전월`

즉, 현재 조회 API는 `생성 트리거`가 아니라 `캐시 조회 API`다.

### 6-7. `score_snapshot`과 battle 결과의 관계

battle 결과 확정은 거래를 다시 계산하거나 AI 리포트를 다시 읽는 방식으로 하지 않고,  
`score_snapshot`을 battle용 공식 입력값으로 사용해야 한다.

규칙은 아래처럼 잡는 것이 맞다.

1. battle이 `WAITING_FOR_SCORE` 상태가 되면 각 사용자의 `MonthlyReport.score_snapshot`을 조회한다.
2. 없거나 `FAILED`면 `ensure_score_snapshot()`으로 그 사용자만 재시도한다.
3. 있으면 `breakdown`에서 battle 카테고리에 대응하는 공식 점수 1개를 꺼낸다.
4. 그 값을 `BattleParticipant.official_base_score`에 저장한다.
5. 여기에 `mission_bonus_score`를 더해 최종 승패를 계산한다.
6. 동시에 결과 화면용으로 `score_snapshot.breakdown + total_score + analysis_warnings`를 battle 쪽 `official_score_snapshot`에 복사해 둔다.

중요한 점은 아래다.

- battle의 공식 승패 기준은 `선택 카테고리 공식 점수 + 미션 보너스`
- `score_snapshot.total_score`는 결과 화면 참고 정보일 뿐, battle 승패 기준과는 다를 수 있음
- battle은 `report_content` 없이도 결과를 확정할 수 있어야 함

### 6-8. battle 구현 시 `score_snapshot`에서 반드시 지켜야 할 것

- `0점` 자체만 보고 AI 토큰 부족이라고 판단하면 안 된다. 실제 정상 결과도 0점일 수 있다.
- AI 문제 판단은 `analysis_warnings`로 해야 한다.
- battle 카테고리에 필요한 AI 항목 warning이 있으면 결과 확정을 잠시 보류하고 `WAITING_FOR_SCORE`를 유지하는 것이 안전하다.
- battle 결과가 한 번 확정되면, 해당 시점의 `score_snapshot` 내용을 battle 전용 `official_score_snapshot`으로 복사해 고정해야 한다.
- 이후 사용자가 소비 기록을 수정하거나 삭제해 일반 월간 점수가 다시 계산되더라도, 이미 확정된 battle 결과는 바뀌지 않아야 한다.

### 6-9. 대결 항목 매핑

선택 가능한 대결 항목은 4개이고, 월간 공식 점수 키는 아래처럼 연결한다.

| 대결 항목 | enum | 공식 키 | 최대 점수 |
|---|---|---|---|
| 대안 행동 실현도 | `alternative` | `alternative_action` | 20 |
| 성장 | `growth` | `growth_consumption` | 10 |
| 건강 점수 | `health` | `health_score` | 15 |
| 챌린지 | `challenge` | `challenge_success` | 3 |

결과 화면에서는 아래 8개를 모두 보여준다.

- `budget_achievement`
- `alternative_action`
- `health_score`
- `growth_consumption`
- `leakage_improvement`
- `spending_consistency`
- `challenge_success`
- `total_score`

## 7. 로직 상세

### 7-1. 대결 신청

1. 로그인된 사용자가 친구의 `battle_code`를 입력한다.
2. 서버는 `BattleProfile` exact match로 상대를 찾는다.
3. 자기 자신이면 거절한다.
4. 현재 날짜가 매월 1일~15일인지 확인한다.
5. 신청자와 상대 `BattleProfile` 두 건을 `select_for_update()`로 잠근다.
6. 두 사람 모두 `active_battle is null`인지 확인한다.
7. 두 사람 모두 `pending_result_battle is null`인지 확인한다.
8. 현재 연월을 `target_year`, `target_month`로 저장한다.
9. `request_deadline_at = 해당 월 15일 23:59:59 KST`로 설정한다.
10. `status=REQUESTED`, `state_version=1`로 대결 생성 후 두 사람 `active_battle`를 채운다.
11. 상대에게 대결 신청 알림을 만든다.

추가 제약은 아래처럼 두는 것이 안전하다.

- 같은 `pair_key`로 이미 열린 대결이 있으면 새 row를 만들지 않는다.
- 특히 A가 B에게 신청한 직후 B가 A에게 동시에 신청하면, 후행 요청은 `409 CONFLICT`와 함께 기존 `battle_id`와 `action_hint=RESPOND_EXISTING_REQUEST`를 내려준다.
- `REJECTED / CANCELED / EXPIRED`로 닫힌 요청은 15일 이전이면 다시 신청할 수 있지만, 같은 월에 이미 `ACTIVE`가 된 사용자는 다른 카테고리로 재신청할 수 없다.

동시성까지 포함한 상세 규칙은 아래처럼 두는 것이 안전하다.

1. 신청 로직은 항상 두 `BattleProfile`을 `user_id` 오름차순 고정 순서로 잠근다. 그래야 교차 신청에서도 deadlock을 줄일 수 있다.
2. 잠금 후 `requester.active_battle`, `opponent.active_battle`를 다시 읽어 열린 대결 존재 여부를 확인한다.
3. 잠금 후 `requester.pending_result_battle`, `opponent.pending_result_battle`도 다시 읽는다.
4. `requester.active_battle`가 이미 있으면 `409 CONFLICT`, `error_code=REQUESTER_ALREADY_HAS_OPEN_BATTLE`를 반환한다.
5. `requester.pending_result_battle`가 이미 있으면 `409 CONFLICT`, `error_code=REQUESTER_HAS_PENDING_RESULT_CONFIRMATION`를 반환한다.
6. `opponent.pending_result_battle`가 이미 있으면 `409 CONFLICT`, `error_code=OPPONENT_HAS_PENDING_RESULT_CONFIRMATION`를 반환한다.
7. `opponent.active_battle`가 이미 있으면 아래처럼 분기한다.
8. 그 열린 대결이 같은 두 사람 사이의 기존 요청이면:
   - 같은 방향 재전송이면 새 row를 만들지 않고 기존 `battle_id`를 그대로 반환한다.
   - 반대 방향 교차 신청이면 `409 CONFLICT`, `error_code=BATTLE_REQUEST_ALREADY_EXISTS`, `action_hint=RESPOND_EXISTING_REQUEST`, `battle_id=기존 battle id`를 반환한다.
9. `opponent.active_battle`가 제3자와의 다른 열린 대결이면 `409 CONFLICT`, `error_code=OPPONENT_ALREADY_HAS_OPEN_BATTLE`를 반환한다.
10. 이 경우 제3자의 `battle_id`, 사용자 정보, 카테고리 같은 내부 정보는 노출하지 않는다.
11. 따라서 `A -> B`, `C -> B`가 동시에 들어오면 먼저 잠금을 잡은 요청만 성공하고, 후행 요청은 일반적으로 `OPPONENT_ALREADY_HAS_OPEN_BATTLE`로 실패한다.
12. 큐잉은 하지 않는다. 즉, 상대가 바빠서 실패한 신청을 자동 대기열로 보관하지 않는다.
13. 클라이언트는 이 에러를 받으면 사용자가 나중에 다시 신청하도록 안내하면 된다.

`REQUESTED` 상태의 프론트 노출은 아래처럼 두는 것이 자연스럽다.

- 신청자: `/challenge-battle/search` 내부 `request_pending` 뷰
- 상대: `/challenge-battle/search` 내부 `request_received` 뷰
- 이 상태는 아직 실제 대결 진행이 아니므로 `/challenge-battle/progress`로 보내지 않는 편이 맞다.
- 신청자 화면 문구 예: `홍길동님에게 대결을 신청했어요. 수락을 기다리는 중입니다.`
- 상대 화면 문구 예: `홍길동님이 대결을 신청했어요.` + `수락 / 거절`

### 7-2. 대결 수락

1. 상대가 수락 API를 호출한다.
2. 다시 날짜가 15일 이내인지 확인한다.
3. `YuntaekBattle`, 양쪽 `BattleProfile`를 잠근다.
4. 카테고리에 맞는 고정 미션 3개를 `BattleMission`으로 복제한다.
5. `BattleParticipant` 2건을 만든다.
6. `profile_snapshot`에 표시 이름/프로필 이미지를 저장한다.
7. `accepted_at`, `started_at`을 기록한다.
8. `score_expected_at = 다음 달 1일 00:00 KST`로 저장한다.
9. `status=ACTIVE`, `state_version += 1`로 전환한다.
10. 양쪽에 시작 알림을 만든다.

### 7-3. 거절/취소/만료와 공통 정리

종료 상태 전환은 `close_battle_and_release_profiles(battle_id, final_status)` 같은 공통 서비스 1곳으로 강제하는 것이 핵심이다.

처리 규칙은 아래다.

1. 거절은 `REQUESTED` 상태에서 상대만 할 수 있다.
2. 취소는 `REQUESTED` 상태에서 신청자만 할 수 있다.
3. 만료는 `request_deadline_at < now`인 `REQUESTED` 대결을 배치가 닫는다.
4. 공통 서비스는 `YuntaekBattle`, 양쪽 `BattleProfile`를 `select_for_update()`로 잠근다.
5. 이미 terminal 상태면 no-op으로 끝내 idempotent하게 만든다.
6. 상태를 `REJECTED / CANCELED / EXPIRED` 중 하나로 바꾸고 `closed_at=now`, `state_version += 1`을 기록한다.
7. `BattleProfile.active_battle == battle`인 경우에만 `null`로 비운다. 이 조건이 없으면 이후 새 대결까지 잘못 비울 수 있다.
8. 알림 발송은 트랜잭션 커밋 후 task 또는 outbox로 넘긴다.

이 규칙을 쓰면 거절, 취소, 만료 뒤 정리가 누락되어 사용자가 계속 대결 중으로 남는 문제를 막을 수 있다.

### 7-4. 진행 중 미션 판정

핵심 원칙은 `먼저 성공한 사용자만 점수를 가져간다`다.

MVP에서는 `BattleMissionAttempt` 같은 상세 시도 로그를 남기지 않고, 미션 최종 상태만 `BattleMission`에 반영하는 편이 낫다.

즉, 판정 성공 또는 무승부 확정 시에는 해당 `BattleMission`의 최종 상태만 갱신하고, 실패나 선착순 패배 같은 중간 상태는 영구 row로 남기지 않는다.

또한 대결 레이어는 챌린지 성공 여부를 다시 AI로 판정하지 않고,  
기존 챌린지 시스템이 이미 확정한 상태값이나 거래 이벤트 결과를 그대로 받아서 사용한다.

처리 순서는 아래다.

1. 거래 등록, 챌린지 상태 전이(`active`, `completed`) 같은 미션 관련 이벤트가 발생한다.
2. 해당 사용자의 활성 대결을 찾는다.
3. 열린 미션(`status=OPEN`)만 조회한다.
4. 각 미션의 `verification_snapshot`으로 충족 여부를 판정한다.
5. 충족한 미션이 있으면 그 `BattleMission` 행을 `select_for_update()`로 잠근다.
6. 이미 상대가 선점했으면 추가 저장 없이 종료한다.
7. 아직 아무도 선점하지 않았으면:
   - `winner=user`
   - `status=WON`
   - `won_at=now`
   - `win_evidence_snapshot=<선점 시점 증빙 JSON>`
   - `BattleParticipant.mission_won_count += 1`
   - `BattleParticipant.mission_bonus_score += 3`
   - `YuntaekBattle.state_version += 1`
8. 양쪽 사용자에게 미션 선점 알림을 만든다.

판정 세부 규칙은 아래처럼 두는 것이 안전하다.

- 거래 기반 미션은 이벤트 발생 시각이 `battle.started_at` 이후인 거래만 인정한다.
- 챌린지 완료 기반 미션은 `UserChallenge`의 생성 시각이나 시작 시각이 아니라 `completed_at`만 본다.
- 따라서 대결 시작 전부터 진행 중이던 챌린지가 대결 기간 중 `completed`가 되면 미션 성공으로 인정한다.
- 이미 대결 시작 전에 `completed`였던 챌린지는 인정하지 않는다.
- 사용자가 같은 챌린지를 실패 후 재도전해서 대결 기간 중 최종적으로 `completed`가 되면 그 성공을 인정한다.
- 단, 선점은 여전히 `completed_at`이 더 빠른 쪽만 가져간다.
- 미션이 한 번 `WON`이 되면 `win_evidence_snapshot`을 원본 근거로 보고, 이후 거래 수정/삭제나 챌린지 재변경으로 이미 선점된 미션을 되돌리지 않는다.
- 미션이 `DRAW`로 확정된 경우에도 이후 재판정으로 `WON`으로 뒤집지 않는다.

### 7-5. 월 종료 후 정산 대기 전환

1. `target_month`가 끝나고 다음 달 1일 00:00 KST가 지나면, 해당 월 `ACTIVE` 대결을 `WAITING_FOR_SCORE`로 바꾼다.
2. 이 전환은 월간 점수 생성 batch 성공 여부와 분리한다.
3. 이 전환 시 `state_version += 1`을 함께 기록한다.
4. 이 상태에서는 아직 결과가 확정되지 않았으므로 양쪽 `BattleProfile.active_battle`를 그대로 둔다.
5. 따라서 사용자는 `WAITING_FOR_SCORE` 동안 다음 대결을 새로 만들 수 없다.
6. 이후 결과 확정은 battle 단위로 재시도 가능한 별도 task가 맡는다.

`WAITING_FOR_SCORE`의 의미는 아래처럼 명확히 두는 것이 좋다.

- 대결은 아직 끝나지 않은 열린 상태다.
- 따라서 사용자는 결과가 나오기 전까지 `GET /api/battles/current/`, `GET /api/battles/current/progress/`로 현재 대결을 계속 볼 수 있어야 한다.
- 다만 미션 선점이나 거래/챌린지 기반 추가 점수 반영은 `target_month` 종료 시각까지만 인정한다.
- 즉, `WAITING_FOR_SCORE`는 `대결방은 열려 있지만 점수 입력은 닫힌 상태`로 보면 된다.
- 결과 확정 전까지는 다른 대결을 새로 시작할 수 없다.
- 결과 확정 후에만 `active_battle`가 비워지고 다음 대결이 가능해진다.

### 7-6. 정산 대기 후 결과 확정

현재 코드 기준 월간 공식 점수는 `매월 1일 00:00 KST`에 전월분이 생성된다.

예시:

- 2026년 3월 대결 결과 확정 시점: 2026년 4월 1일 00:00 KST 이후

핵심 원칙은 `월간 리포트 배치 성공`과 `대결 결과 확정`을 직접 묶지 않는 것이다.

결과 확정 순서는 아래다.

1. `WAITING_FOR_SCORE` 상태의 대결 1건에 대해 `finalize_single_battle(battle_id)`를 실행한다.
2. `YuntaekBattle`, `BattleParticipant` 2건, 양쪽 `BattleProfile`를 잠근다.
3. 이미 `status in (COMPLETED, DRAW)`이거나 `result_locked_at`이 있으면 그대로 종료한다.
4. 각 사용자의 `MonthlyReport.score_snapshot`을 조회한다.
5. 스냅샷이 없거나 실패 상태면 해당 사용자에 대해서만 `ensure_score_snapshot(user, year, month)`를 재시도하고, 대결은 `WAITING_FOR_SCORE`에 둔 채 `last_settlement_error`만 남긴다.
6. `score_snapshot.analysis_warnings`를 읽어 battle 카테고리에 필요한 AI 항목이 정상 생성되었는지 확인한다.
7. battle 카테고리와 경고 매핑은 아래처럼 둔다.
   - `alternative`: battle 승패 계산에는 AI 항목 의존 없음
   - `challenge`: battle 승패 계산에는 AI 항목 의존 없음
   - `health`: `health_score` warning이 있으면 결과 확정 보류
   - `growth`: `growth_consumption` warning이 있으면 결과 확정 보류
8. 이 판단은 `0점인지 여부`가 아니라 `analysis_warnings` 존재 여부로 한다. 실제 0점은 정상 결과일 수 있으므로, `0점`만 보고 토큰 부족으로 해석하면 안 된다.
9. 별도 probe 호출이나 간단한 내부 테스트로 토큰 상태를 다시 확인하지 않는다. 실제 `score_snapshot` 생성 결과와 `analysis_warnings`를 신뢰하는 편이 단순하고 안전하다.
10. battle 카테고리에 필요한 AI 항목 warning이 있으면:
   - 대결은 계속 `WAITING_FOR_SCORE`에 둔다.
   - `last_settlement_error=AI_ANALYSIS_UNAVAILABLE:<component_name>`를 기록한다.
   - 결과는 아직 확정하지 않는다.
   - 일반 승패 보상도 아직 지급하지 않는다.
   - 사용자에게 `현재 AI 토큰/분석 문제로 정확한 대결 결과를 계산 중입니다` 안내를 보여준다.
   - `BATTLE_RESULT_DELAYED` 알림을 보낸다.
11. battle 카테고리와 직접 관련 없는 warning만 있는 경우:
   - battle 공식 승패 계산은 계속 진행할 수 있다.
   - 다만 결과 화면의 전체 윤택지수 7개 항목과 총점은 `참고값` 또는 `일부 AI 항목 지연 가능` 배너와 함께 보여주는 편이 안전하다.
12. 두 사람 점수가 battle 카테고리 기준으로 모두 준비되면 선택 항목 공식 점수를 각각 `official_base_score`에 저장한다.
13. `final_score = official_base_score + mission_bonus_score`를 계산한다.
14. 높은 점수면 승자 확정, 같으면 무승부 처리한다.
15. 결과 화면용 7개 항목 + 총점 + `analysis_warnings`를 `official_score_snapshot`에 저장한다.
16. `result_locked_at=now`를 기록한다.
17. 일반 보상을 지급한다.
18. 이 battle이 과거에 `BATTLE_RESULT_DELAYED`를 한 번이라도 보낸 적이 있으면, 일반 보상과 별도로 지연 보상도 추가 지급한다.
19. `status=COMPLETED` 또는 `status=DRAW`, `completed_at=now`, `closed_at=now`, `state_version += 1`로 바꾼다.
20. 양쪽 `active_battle`를 비운다.
21. 양쪽 `pending_result_battle`에 현재 battle을 채운다.
22. 두 `BattleParticipant.result_seen_at`은 여전히 `null` 상태로 둔다.
23. 결과 알림을 보낸다.

이렇게 하면 신규 사용자 점수 생성 실패나 일부 사용자 `MonthlyReport` 충돌이 있어도 모든 대결 결과 확정이 한 번에 막히지 않고, battle 단위로 독립 재시도할 수 있다.

또한 `official_base_score`, `final_score`, `official_score_snapshot`, `winner`는 `result_locked_at`이 기록된 뒤 다시 계산하지 않는다.  
즉, 결과가 나온 이후 소비 기록이 수정되거나 삭제되어 일반 월간 리포트가 바뀌어도 이미 확정된 대결 결과는 바뀌지 않는다.

중요한 점은 battle 결과 확정이 `MonthlyReport.report_content`와 직접 연결되면 안 된다는 것이다.

- battle 결과 확정에 필요한 값은 `MonthlyReport.score_snapshot` 또는 그 재생성 결과뿐이다.
- 사용자가 `/api/users/yuntaek-report/`로 AI 월간 리포트를 먼저 열어봐야 battle 결과가 생기는 구조로 만들면 안 된다.
- 현재 코드 기준 월간 리포트 조회 API는 캐시를 읽기만 하고, 리포트가 없으면 503을 반환한다. 즉, 조회 자체가 생성 트리거가 아니다.
- 따라서 battle 결과 확인도 `레포트를 먼저 확인해야 함`이라는 UX에 묶지 않는 것이 맞다.
- battle 결과 화면은 결과가 확정되면 독립적으로 열려야 하고, 필요하면 별도로 `이번 달 리포트도 확인해보세요` 안내만 추가하면 된다.

### 7-7. 결과 확인 처리

프론트 명세 기준 결과 페이지의 하단 CTA는 `내 윤택지수 리포트 보러가기`보다 `확인완료`가 더 자연스럽다.  
battle 결과는 월간 리포트 준비 여부와 분리되어야 하므로, 결과 확인 동작도 리포트 이동이 아니라 `결과 확인 처리` 자체로 두는 편이 맞다.

권장 흐름은 아래다.

1. 사용자가 윤택지수 메인에서 `윤택지수 대결` 버튼을 누른다.
2. 서버는 `battle entry resolver`에서 아래 우선순위로 진입 대상을 결정한다.
   - `active_battle.status=REQUESTED`면 `/challenge-battle/search` 내부 `request_pending` 또는 `request_received`
   - `active_battle.status in (ACTIVE, WAITING_FOR_SCORE)`면 `/challenge-battle/progress`
   - `pending_result_battle`가 있으면 `/challenge-battle/result2`
   - 둘 다 없으면 `/challenge-battle/search`의 `intro` 뷰
3. 결과 페이지는 battle이 이미 `COMPLETED` 또는 `DRAW` 상태인 row를 보여준다.
4. 결과 페이지 하단 CTA는 `확인완료` 1개만 둔다.
5. 사용자가 `확인완료`를 누르면 `POST /api/battles/{battle_id}/confirm-result/`를 호출한다.
6. 서버는 해당 사용자의 `BattleParticipant.result_seen_at=now`를 기록한다.
7. `BattleProfile.pending_result_battle == battle`인 경우에만 `null`로 비운다.
8. 응답에는 `redirect_hint=yuntaek_home` 또는 이에 준하는 값을 내려 메인 윤택지수 페이지로 복귀시킨다.
9. 이후 사용자가 다시 `윤택지수 대결` 버튼을 누르면, 열려 있는 대결이나 미확인 결과가 없으므로 인트로 페이지로 진입한다.

추가 제약은 아래처럼 두는 것이 안전하다.

- 사용자는 본인 기준 `pending_result_battle`가 남아 있는 동안 새 대결 신청 또는 수락을 할 수 없게 막는다.
- 결과 확인은 사용자별이다. A가 확인완료를 눌렀다고 해서 B의 `pending_result_battle`까지 같이 비우면 안 된다.
- 사용자용 `history` 화면은 제공하지 않아도 되지만, battle row 자체는 운영/보상 정합성을 위해 남겨둔다.
- 결과 확인은 읽기 액션이 아니라 상태 변화이므로, 별도 API로 명시적으로 기록하는 편이 안전하다.

### 7-8. 보상 지급

- 승자 확정: 승자 1명에게 `500P`
- 무승부: 두 사용자에게 각각 `500P`
- 결과 지연 보상: 결과가 `BATTLE_RESULT_DELAYED`를 거쳤다가 나중에 정상 확정된 battle이면, 두 사용자 모두에게 별도 보너스 보상을 지급

지연 보상은 정책 상수로 분리하는 것이 안전하다.

- 예: `BATTLE_DELAY_COMPENSATION_POINTS = 200`
- 이 값은 운영 중 조정 가능하도록 settings 또는 상수 파일로 분리
- 지연 보상은 `reason=BATTLE_DELAY_COMPENSATION`으로 일반 승패 보상과 별도 기록

지급 순서는 아래다.

1. `BattleReward` 생성
2. `User.points += points`
3. `User.total_points_earned += points`

이 세 단계는 한 트랜잭션으로 묶는다.

추가 제약은 아래처럼 두는 것이 좋다.

- 지연 보상은 battle당 사용자별 1회만 지급한다.
- 일반 승패 보상과 지연 보상은 별도 row로 남긴다.
- 무승부라도 지연이 있었다면 `500P + 지연 보상` 구조가 된다.
- 사과 메시지는 알림으로 보내고, 보상 지급 이력은 `BattleReward`에서 추적한다.

## 8. 고정 미션 12개

MVP에서는 카테고리 4개(`alternative / growth / health / challenge`)에 3개씩 고정 미션을 둔다.

### 8-1. 대안 행동 실현도

이 카테고리는 현재 윤택지수 계산에서 `AI 챌린지` 수행과 가장 직접적으로 연결된다.  
그래서 미션도 `source_type='ai'` 기준으로 검증한다.  
단, `생성(saved)`만으로는 너무 가벼우므로 실제 행동 시작/완료 기준으로 잡는 편이 낫다.

| 순서 | 미션명 | 검증 방식 | 검증 규칙 |
|---|---|---|---|
| 1 | AI 챌린지 1개 먼저 시작 | `challenge_started` | 대결 시작 후 `UserChallenge(source_type='ai')`가 `active`가 된 첫 시각 |
| 2 | AI 챌린지 1개 먼저 완료 | `challenge_complete` | 대결 기간 중 `UserChallenge(source_type='ai', status='completed')` 1건 |
| 3 | AI 챌린지 2개 먼저 완료 | `challenge_complete_count` | 대결 기간 중 `UserChallenge(source_type='ai', status='completed')` 2건 |

### 8-2. 성장

성장 미션은 AI나 자유 텍스트 키워드 매칭을 쓰지 않고,  
표준 거래 카테고리 `교육/학습`만으로 판정하는 편이 가장 단순하고 안정적이다.

주의:

- 이 섹션은 **배틀 미션 보너스 판정 규칙**이다.
- 월말 공식 점수(`growth_consumption`)는 기존처럼 `score_snapshot`에서 계산한다.
- 즉, `성장` 대결의 **base score는 월말 공식 점수**, **미션 보너스는 카테고리 기반**으로 분리된다.

| 순서 | 미션명 | 검증 방식 | 검증 규칙 |
|---|---|---|---|
| 1 | 교육/학습 카테고리 거래 1건 먼저 등록 | `transaction_category_count` | `category='교육/학습'` 거래 1건 |
| 2 | 교육/학습 카테고리 누적 20,000원 먼저 달성 | `transaction_category_amount` | `category='교육/학습'` 거래 누적 20,000원 |
| 3 | 교육/학습 카테고리 거래 3건 먼저 달성 | `transaction_category_count` | `category='교육/학습'` 거래 3건 |

### 8-3. 건강 점수

건강 미션도 AI를 다시 호출하지 않고 카테고리 기반으로 처리한다.

설계 의도:

- `의료/건강` 거래만으로 3개 미션을 모두 구성하면 병원비가 큰 사용자가 유리해질 수 있다.
- 그래서 건강 항목은 `의료/건강` 1개 + 절제형 카테고리 미션 2개로 섞는 편이 더 자연스럽다.
- `카페/간식`, `술/유흥` 미션은 해당 카테고리만 0원이면 성공이며, 다른 카테고리 지출은 허용한다.

| 순서 | 미션명 | 검증 방식 | 검증 규칙 |
|---|---|---|---|
| 1 | 의료/건강 카테고리 거래 1건 먼저 등록 | `transaction_category_count` | `category='의료/건강'` 거래 1건 |
| 2 | 카페/간식 카테고리 3일 연속 무지출 먼저 달성 | `category_zero_spend_streak` | 대결 기간 중 연속 3일 동안 `category='카페/간식'` 지출 0원 |
| 3 | 술/유흥 카테고리 7일 무지출 먼저 달성 | `category_zero_spend_streak` | 대결 기간 중 연속 7일 동안 `category='술/유흥'` 지출 0원 |

추가 규칙:

- 연속 일수 계산은 KST 기준 `date`의 달력 날짜를 사용한다.
- 해당 날짜에 다른 카테고리 지출이 있어도 무방하다.
- 해당 날짜에 목표 카테고리 지출만 0원이면 streak를 유지한다.
- streak 미션은 조건을 처음 만족한 시각에 즉시 선점 처리하고, 이후 거래 수정/삭제로 이미 선점된 미션을 되돌리지 않는다.

### 8-4. 챌린지

챌린지 항목은 기존 챌린지 모델을 그대로 활용하면 된다.

이 카테고리는 `대결 중 챌린지 완료`만 판정에 쓰고,  
배틀 레이어가 별도 AI 판정을 다시 수행하지 않는다.

또한 사용자가 대결 시작 전에 이미 해당 챌린지를 진행 중이었더라도  
`completed_at`이 대결 기간 안이면 인정하는 것이 사용자 경험상 더 낫다.

| 순서 | 미션명 | 검증 방식 | 검증 규칙 |
|---|---|---|---|
| 1 | 3일 연속 무지출 챌린지 먼저 완료 | `challenge_template_complete` | 사전 등록된 `template_id`가 `3일 연속 무지출 챌린지` 템플릿이고 `completed_at >= battle.started_at` |
| 2 | 3만원의 행복 먼저 완료 | `challenge_template_complete` | 사전 등록된 `template_id`가 `3만원의 행복` 템플릿이고 `completed_at >= battle.started_at` |
| 3 | 무00의 날 먼저 완료 | `challenge_template_complete` | 사전 등록된 `template_id`가 `무00의 날` 템플릿이고 `completed_at >= battle.started_at` |

구현 규칙은 아래처럼 두는 것이 안전하다.

- 챌린지 미션은 `created_at`, `started_at`이 아니라 `completed_at`만 기준으로 인정한다.
- 따라서 대결 전부터 진행 중이던 챌린지도 대결 기간 중 성공하면 인정한다.
- 이미 대결 전에 성공 완료된 챌린지는 인정하지 않는다.
- 실패 후 재도전한 경우에도, 재도전 후 `completed_at`이 대결 기간 안이면 인정한다.
- 현재 코드의 재도전은 같은 `UserChallenge` row를 재사용할 수 있으므로, row 생성 시점이 아니라 최종 `status='completed'` 전환과 `completed_at`을 보는 것이 맞다.
- 챌린지 미션 식별은 템플릿 이름 문자열이 아니라 `template_id` 비교로 고정하는 것이 안전하다.

## 9. 미션 검증 이벤트 연결

현재 프로젝트에는 이미 거래 저장과 챌린지 progress 갱신 signal이 있다.  
대결 미션도 같은 이벤트를 다시 활용하면 된다.

### 9-1. 거래 기반 미션

트리거:

- `Transaction` 생성
- `Transaction` 수정
- `Transaction` 삭제

사용 데이터:

- `category`
- `amount`
- `date`

처리 규칙:

- category 기반 미션은 표준 거래 카테고리 18개(`식비`, `생활`, `카페/간식`, `온라인 쇼핑`, `패션/쇼핑`, `뷰티/미용`, `교통`, `자동차`, `주거/통신`, `의료/건강`, `문화/여가`, `여행/숙박`, `교육/학습`, `자녀/육아`, `반려동물`, `경조/선물`, `술/유흥`, `기타`)만 사용한다.
- 과거 데이터에 `카페`처럼 비표준 별칭이 있으면 배틀 판정 전에 표준값으로 정규화해야 한다. 예: `카페 -> 카페/간식`
- `transaction_category_count`는 `transaction.category` exact match 기준으로 누적 건수를 센다.
- `transaction_category_amount`는 `transaction.category` exact match 기준으로 누적 금액을 센다.
- 성장 미션은 `category='교육/학습'`만 사용한다.
- 건강 미션 1번은 `category='의료/건강'`만 사용한다.
- count/amount 미션은 `OPEN` 상태인 동안 현재 DB 기준 누적값을 다시 계산할 수 있어야 한다. 즉, 생성뿐 아니라 수정/삭제도 반영한다.
- 수정 이벤트로 카테고리, 금액, 날짜가 바뀌면 해당 시점의 최신 데이터 기준으로 누적 건수/금액을 다시 계산한다.
- 삭제 이벤트로 누적값이 줄어들 수 있으며, 미션이 아직 `OPEN`이면 진행 상태에도 반영한다.
- 단, 수정/삭제가 이미 `WON`으로 선점된 미션을 되돌리지는 않는다.
- 수정으로 인해 처음 임계값을 넘긴 경우의 `won_at`은 원거래의 소비 시각이 아니라 `수정이 커밋된 시각`으로 기록한다. 즉, 수정 반영은 허용하되 성공 시각을 과거로 소급하지 않는다.
- count/amount 미션이 선점되면 `win_evidence_snapshot`에 아래를 고정 저장한다.
  - `trigger_transaction_id`
  - `triggered_at`
  - `category`
  - `count_snapshot` 또는 `amount_snapshot`
- 따라서 선점 이후 사용자가 같은 거래를 수정/삭제하더라도 이미 가져간 미션 승리는 유지한다.

### 9-2. 카테고리 무지출 streak 미션

`category_zero_spend_streak`는 거래 생성 이벤트만으로는 완결 판정이 어렵다.  
이유는 성공일에 거래가 아예 없는 경우 이벤트가 발생하지 않기 때문이다.

따라서 이 미션은 `매일 00:01 KST` 자정 배치가 전날을 닫으면서 판정하는 구조가 더 적절하다.

트리거:

- 일일 battle streak 정산 task (`settle_battle_category_zero_spend(previous_date)`)

사용 데이터:

- battle 기간 중 전날 날짜의 `Transaction`
- `category`
- `date`
- battle별 목표 카테고리, 목표 streak 일수

처리 규칙:

- 배치는 `ACTIVE` 상태 battle 중 `category_zero_spend_streak` 미션이 남아 있는 건만 본다.
- 전날 날짜에 대해 사용자별 목표 카테고리 지출 합계를 계산한다.
- 다른 카테고리 지출은 무시하고, 목표 카테고리 합계만 본다.
- 전날 목표 카테고리 지출이 0원이면 streak를 +1, 아니면 0으로 리셋한다.
- streak가 목표 일수(예: 3일, 7일)에 처음 도달한 시점에 즉시 선점 처리한다.
- 같은 배치 실행에서 두 사용자가 모두 같은 `streak_end_date`로 목표 일수에 처음 도달하면, 해당 미션은 `DRAW`로 처리한다.
- 이 경우 `winner=null`, `BattleParticipant.mission_won_count`/`mission_bonus_score`는 양쪽 모두 증가시키지 않는다.
- 선점 시 `win_evidence_snapshot`에 아래를 저장한다.
  - `target_category`
  - `streak_days`
  - `streak_start_date`
  - `streak_end_date`
  - `evaluated_at`
- 무승부인 경우 `win_evidence_snapshot.draw_reason=SAME_STREAK_END_DATE`를 함께 저장한다.
- `DailySpendingConfirmation`은 `그날 전체 무지출` 확인용이므로, `카페/간식만 0원`, `술/유흥만 0원` 같은 category streak 미션 판정에는 사용하지 않는다.

### 9-3. 챌린지 상태 전이 기반 미션

트리거:

- `UserChallenge.status`가 `active`로 바뀜
- `UserChallenge.status`가 `completed`로 바뀜

사용 데이터:

- `template_id`
- `name`
- `source_type`
- `completed_at`
- `attempt_number`

처리 규칙:

- 대결 시스템은 `completed`로 확정된 챌린지만 사용하고, 챌린지 성공 여부를 다시 계산하지 않는다.
- `challenge_started` 검증은 `source_type='ai'` 챌린지의 `status=active` 전이만 사용한다.
- 챌린지 미션 식별은 `template_id` 기준으로 고정한다.
- 챌린지 미션은 `completed_at >= battle.started_at`인지로만 인정 여부를 결정한다.
- 따라서 대결 시작 전에 이미 진행 중이던 챌린지가 대결 중 완료되면 인정된다.
- 이미 대결 전에 완료된 챌린지는 무시한다.
- 실패 후 재도전하여 같은 row가 다시 `completed`가 된 경우도 `completed_at`이 대결 기간 안이면 인정한다.

## 10. API 설계

공통 권한 규칙은 아래처럼 두는 것이 안전하다.

- 모든 battle API는 로그인 사용자만 호출 가능
- `battle_id`가 들어가는 상세 API는 해당 battle 참가자만 접근 가능
- `accept`, `reject`는 상대 역할 사용자만 가능
- `cancel`은 신청자만 가능
- 참가자가 아닌 제3자에게는 항상 `404 NOT FOUND`로 응답한다. battle 존재 여부 자체를 숨기는 편이 안전하다.

### 10-1. 프로필/친구 찾기

- `GET /api/battles/profile/me/`
  - 내 `battle_code`, 현재 대결 요약
- `POST /api/battles/profile/issue-code/`
  - 대결 코드 생성 또는 재발급
- `GET /api/battles/users/lookup/?battle_code=AB12CD34`
  - exact match 검색

### 10-2. 신청/응답

- `POST /api/battles/requests/`
  - body: `opponent_code`, `category`
  - `category` 허용값: `alternative / growth / health / challenge`
- `POST /api/battles/{battle_id}/accept/`
- `POST /api/battles/{battle_id}/reject/`
- `POST /api/battles/{battle_id}/cancel/`

신청 API의 대표 에러 응답 규칙은 아래처럼 명시하는 것이 좋다.

- `409 CONFLICT / REQUESTER_ALREADY_HAS_OPEN_BATTLE`
  - 신청자가 이미 다른 열린 대결을 가지고 있음
- `409 CONFLICT / OPPONENT_ALREADY_HAS_OPEN_BATTLE`
  - 상대가 이미 다른 열린 대결을 가지고 있음
- `409 CONFLICT / REQUESTER_HAS_PENDING_RESULT_CONFIRMATION`
  - 신청자가 이전 대결 결과를 아직 확인하지 않음
- `409 CONFLICT / OPPONENT_HAS_PENDING_RESULT_CONFIRMATION`
  - 상대가 이전 대결 결과를 아직 확인하지 않음
- `409 CONFLICT / BATTLE_REQUEST_ALREADY_EXISTS`
  - 같은 두 사람 사이 기존 열린 신청이 이미 존재함
  - 교차 신청이면 `action_hint=RESPOND_EXISTING_REQUEST`와 `battle_id` 포함 가능
- `400 BAD REQUEST / SELF_CHALLENGE_NOT_ALLOWED`
  - 자기 자신에게 신청
- `400 BAD REQUEST / BATTLE_REQUEST_WINDOW_CLOSED`
  - 신청 가능 기간 아님

### 10-3. 진입/진행/결과

- `GET /api/battles/entry/`
- `GET /api/battles/current/`
- `GET /api/battles/current/progress/`
- `GET /api/battles/{battle_id}/result/`
- `POST /api/battles/{battle_id}/confirm-result/`

`GET /api/battles/entry/`는 윤택지수 메인에서 `윤택지수 대결` 버튼을 눌렀을 때 프론트가 가장 먼저 호출하는 API로 두는 것이 좋다.

- 호출 시작 시 `reconcile_battle_profile(user)`를 먼저 수행해 포인터를 보정한다.
- `active_battle.status=REQUESTED`면 `next_screen=search`, `view_mode=request_pending|request_received`
- `active_battle.status in (ACTIVE, WAITING_FOR_SCORE)`면 `next_screen=progress`
- `pending_result_battle`가 있으면 `next_screen=result`
- 둘 다 없으면 `next_screen=intro`
- MVP에서는 배틀 카테고리가 모두 미션형이므로 결과 화면 라우팅은 `/challenge-battle/result2`로 고정하는 편이 단순하다.

`REQUESTED` 상태에서 프론트가 바로 화면을 그릴 수 있도록 `entry` 응답에는 아래 정도를 포함하는 편이 좋다.

- `battle_id`
- `next_screen`
- `view_mode`
- `category`
- `opponent_display_name`
- `request_deadline_at`
- `can_accept`
- `can_reject`
- `can_cancel`

예시:

```json
{
  "battle_id": 12,
  "next_screen": "search",
  "view_mode": "request_received",
  "category": "health",
  "opponent_display_name": "홍길동",
  "request_deadline_at": "2026-03-15T23:59:59+09:00",
  "can_accept": true,
  "can_reject": true,
  "can_cancel": false
}
```

결과 조회 API는 `WAITING_FOR_SCORE` 상태도 내려줄 수 있어야 한다.

- 결과 지연 중이면 `200 OK`와 함께 `result_ready=false`, `status=WAITING_FOR_SCORE`, `delay_reason_code`, `delay_message`를 내려주는 편이 프론트 처리에 유리하다.
- 예: `delay_reason_code=AI_ANALYSIS_UNAVAILABLE`, `delay_message=현재 AI 분석 지연으로 정확한 결과를 계산 중입니다. 정상화되면 알림으로 안내드리겠습니다.`
- 결과가 아직 확정되지 않았을 때 굳이 `404`를 주는 것보다, 대결 자체는 존재하므로 `pending result` payload를 주는 편이 낫다.

`POST /api/battles/{battle_id}/confirm-result/` 처리 규칙은 아래처럼 두는 것이 안전하다.

- 호출자는 해당 battle 참가자만 가능
- battle 상태는 `COMPLETED` 또는 `DRAW`여야 함
- 이미 `result_seen_at`이 있으면 그대로 성공 처리하는 idempotent 응답
- 성공 시 내 `result_seen_at` 기록, 내 `pending_result_battle` 해제
- 응답 예: `{"ok": true, "redirect_hint": "yuntaek_home"}`

## 11. 프론트 응답 예시

### 11-1. 친구 검색 결과

```json
{
  "battle_code": "AB12CD34",
  "display_name": "김윤택"
}
```

### 11-2. 진행 화면

API 응답의 `missions[].status`는 기계용 enum으로 두고, 프론트가 이를 표시 문구로 변환하는 편이 안전하다.

- API enum 예: `OPEN / WON / DRAW / EXPIRED`
- 프론트 표시 예: `진행중 / 완료됨 / 무승부 / 종료됨`

```json
{
  "battle_id": 12,
  "status": "ACTIVE",
  "category": "health",
  "target_year": 2026,
  "target_month": 3,
  "state_version": 5,
  "result_ready": false,
  "me": {
    "name": "홍길동",
    "mission_won_count": 1,
    "mission_bonus_score": 3,
    "current_score": 1
  },
  "opponent": {
    "name": "김철수",
    "mission_won_count": 0,
    "mission_bonus_score": 0,
    "current_score": 0
  },
  "missions": [
    {
      "id": 101,
      "title": "의료/건강 카테고리 거래 1건 먼저 등록",
      "description": "`의료/건강` 카테고리 거래 1건을 먼저 등록하세요.",
      "status": "WON",
      "winner_name": "홍길동",
      "point_value": 3
    }
  ]
}
```

### 11-3. 결과 화면

```json
{
  "battle_id": 12,
  "status": "COMPLETED",
  "category": "health",
  "target_year": 2026,
  "target_month": 3,
  "winner_user_id": 1,
  "winner_name": "홍길동",
  "is_draw": false,
  "result_title": "홍길동님 Win!",
  "reward_policy": {
    "winner_points": 500,
    "draw_points_each": 500
  },
  "me": {
    "official_base_score": 12,
    "mission_bonus_score": 6,
    "final_score": 18
  },
  "opponent": {
    "official_base_score": 10,
    "mission_bonus_score": 3,
    "final_score": 13
  },
  "score_breakdown": [
    { "key": "budget_achievement", "label": "예산 달성률", "max_score": 35, "me": 30, "opponent": 25 },
    { "key": "alternative_action", "label": "대안 행동 실현도", "max_score": 20, "me": 18, "opponent": 17 },
    { "key": "health_score", "label": "건강 점수", "max_score": 15, "me": 12, "opponent": 10 },
    { "key": "growth_consumption", "label": "성장", "max_score": 10, "me": 9, "opponent": 8 },
    { "key": "leakage_improvement", "label": "필수 지출", "max_score": 10, "me": 10, "opponent": 6 },
    { "key": "spending_consistency", "label": "소비 일관성", "max_score": 7, "me": 7, "opponent": 6 },
    { "key": "challenge_success", "label": "챌린지", "max_score": 3, "me": 1, "opponent": 2 }
  ],
  "total_score": {
    "me": 87,
    "opponent": 74,
    "max_score": 100
  }
}
```

무승부일 때는 아래처럼 내려주는 편이 안전하다.

```json
{
  "battle_id": 12,
  "status": "DRAW",
  "category": "health",
  "winner_user_id": null,
  "winner_name": null,
  "is_draw": true,
  "result_title": "무승부"
}
```

## 12. 알림 설계

현재 코드의 `NotificationType`은 `COACHING / MONTHLY_REPORT / CHALLENGE` 수준의 큰 도메인 타입만 가지고 있다.  
배틀도 같은 방식으로 `BATTLE` 1개를 추가하는 편이 낫다.

즉, 배틀 알림마다 `notification_type`을 전부 따로 늘리는 것보다는 아래 구조가 더 안전하다.

- 상위 타입: `notification_type = BATTLE`
- 세부 타입: `event_code` 또는 `subtype`
- 추가 데이터: `payload` JSON

권장 이유는 아래다.

- 현재 알림 타입은 `리다이렉트 대분류`에 가깝고, 세부 이벤트마다 top-level type을 늘리면 모델과 프론트 분기가 과도하게 커진다.
- 배틀은 신청, 수락, 거절, 만료, 진행, 결과, 보상처럼 이벤트가 많아서 `notification_type`만으로 구분하면 타입이 금방 비대해진다.
- `BATTLE + event_code` 구조면 리스트 필터, 뱃지 집계, 리다이렉트 분기를 안정적으로 유지할 수 있다.

`Notification` 모델 확장 제안은 아래다.

| 필드 | 타입 | 설명 |
|---|---|---|
| `notification_type` | CharField | 상위 도메인 타입. battle은 `BATTLE` |
| `event_code` | CharField | 세부 이벤트 코드 |
| `related_id` | Integer | battle 알림에서는 `battle_id` |
| `payload` | JSONField | mission_id, reward_points, redirect_hint 등 |

알림 보존 원칙은 아래처럼 두는 것이 좋다.

- `Notification`은 battle 최종 정합성의 원본이 아니라, 사용자에게 보여주는 메시지와 진입 유도 정보다.
- battle의 최종 권위 데이터는 `YuntaekBattle`, `BattleParticipant`, `BattleReward`에 남는다.
- 따라서 읽은 알림을 영구 보관할 필요는 없다.
- `pending_result_battle`, `result_seen_at` 같은 진입 상태는 battle 도메인 테이블이 들고 있으므로, 오래된 battle 알림을 지워도 결과 로직이 깨지지 않는다.

권장 정리 정책은 아래다.

- 읽은 battle 알림: `created_at` 기준 90일 후 삭제
- 읽지 않은 battle 알림: 최소 90일은 유지
- 결과/보상 알림도 battle 원본 row가 남아 있으므로 장기 영구 보관까지는 불필요
- 정리 배치는 우선 `is_read=True AND created_at < cutoff` 조건부터 시작하는 것이 안전하다

권장 `event_code`는 아래다.

- `BATTLE_REQUEST_RECEIVED`
- `BATTLE_REQUEST_ACCEPTED`
- `BATTLE_REQUEST_REJECTED`
- `BATTLE_REQUEST_CANCELED`
- `BATTLE_REQUEST_EXPIRED`
- `BATTLE_WAITING_FOR_RESULT`
- `BATTLE_MISSION_WON`
- `BATTLE_RESULT_COMPLETED`
- `BATTLE_REWARD_WIN`
- `BATTLE_REWARD_DRAW`

필요한 알림은 아래다.

- 대결 신청 도착
- 대결 신청 수락
- 대결 신청 취소
- 대결 신청 거절
- 15일 미수락으로 신청 만료
- 월 종료 후 결과 대기 안내
- 결과 지연 안내
- 미션 선점
- 결과 확정
- 승리 보상 지급
- 무승부 보상 지급
- 지연 보상 지급 + 사과 안내

`Notification.get_redirect_url()` 또는 `payload.redirect_hint`에는 아래 연결이 필요하다.

- `BATTLE_REQUEST_RECEIVED`, `BATTLE_REQUEST_ACCEPTED`, `BATTLE_REQUEST_REJECTED`, `BATTLE_REQUEST_CANCELED`, `BATTLE_REQUEST_EXPIRED`, `BATTLE_MISSION_WON`, `BATTLE_WAITING_FOR_RESULT`
  - `/challenge-battle/progress`
- `BATTLE_RESULT_DELAYED`, `BATTLE_RESULT_COMPLETED`, `BATTLE_REWARD_WIN`, `BATTLE_REWARD_DRAW`, `BATTLE_DELAY_COMPENSATION_GRANTED`
  - `/challenge-battle/result2`

추가로 battle 알림은 `related_id=battle_id`를 항상 채우는 것이 좋다.  
그래야 알림 클릭 시 현재 대결인지, 과거 결과인지 안정적으로 라우팅할 수 있다.

다만 결과 알림은 사용자가 이미 `확인완료`를 눌렀는지까지 같이 봐야 한다.

- 해당 사용자의 `result_seen_at is null`이면 결과 페이지로 진입
- 이미 `result_seen_at`이 있으면 `/challenge-battle/search` 또는 윤택지수 메인으로 보내는 fallback을 두는 편이 UX가 단순하다

### 12-1. 현 코드 기준 필요한 변경

현재 `Notification` 모델은 아래 필드만 가지고 있다.

- `notification_type`
- `title`
- `message`
- `related_id`
- `related_year`
- `related_month`

즉, battle 세부 이벤트를 안정적으로 구분할 `event_code`, `payload`가 아직 없다.  
또한 현재 `notification_type` enum에는 `BATTLE`도 없다.

### 12-2. Notification 모델 마이그레이션안

권장 순서는 `하위 호환을 유지하면서 필드를 먼저 늘리고`, 그 다음 battle 알림부터 새 구조를 쓰는 방식이다.

1. 스키마 마이그레이션 1
   - `Notification.NotificationType`에 `BATTLE` 추가
   - `event_code = models.CharField(max_length=50, blank=True, default='')` 추가
   - `payload = models.JSONField(default=dict, blank=True)` 추가
2. 코드 배포 1
   - `create_notification()`이 `event_code`, `payload`를 받을 수 있게 수정
   - `Notification.get_redirect_url()`이 `event_code`를 우선 보고, 없으면 기존 `notification_type` fallback을 타게 수정
   - 기존 `COACHING`, `MONTHLY_REPORT`, `CHALLENGE` 생성 코드는 그대로 두고, battle만 새 구조 사용 시작
3. 선택적 데이터 마이그레이션
   - 기존 row는 굳이 모두 backfill하지 않아도 된다.
   - 필요하면 아래처럼 최소한의 `event_code`만 채울 수 있다.
   - `COACHING -> COACHING_CREATED`
   - `MONTHLY_REPORT -> MONTHLY_REPORT_CREATED`
   - 챌린지 성공/실패 알림은 기존 title 규칙을 보고 `CHALLENGE_COMPLETED` 등으로 분류할 수 있지만, MVP에서는 생략 가능
4. 코드 배포 2
   - battle 알림 생성 헬퍼 추가
   - 프론트에서 `notification_type=BATTLE`이면 `event_code` 기준으로 문구/아이콘/redirect 처리
5. 선택적 정리 단계
   - 충분히 안정화되면 기존 알림도 점진적으로 `event_code` 기반으로 맞출 수 있다.
   - 하지만 top-level `notification_type` 체계는 유지하는 편이 낫다.

예시 마이그레이션 스펙:

| 단계 | 작업 | 비고 |
|---|---|---|
| 1 | `notification_type` enum에 `BATTLE` 추가 | 기존 데이터 영향 거의 없음 |
| 2 | `event_code` nullable/blank 필드 추가 | 기존 row와 하위 호환 |
| 3 | `payload` JSONField 추가 | 확장 정보 저장 |
| 4 | `get_redirect_url()` fallback 구조로 수정 | 구버전 row도 동작 |
| 5 | battle 알림 생성 함수 도입 | 새 알림부터 적용 |

예시 Django 모델 변경 방향:

```python
class NotificationType(models.TextChoices):
    COACHING = 'COACHING', '코칭 생성'
    MONTHLY_REPORT = 'MONTHLY_REPORT', '월간 리포트 생성'
    CHALLENGE = 'CHALLENGE', '챌린지'
    BATTLE = 'BATTLE', '대결'

event_code = models.CharField(max_length=50, blank=True, default='')
payload = models.JSONField(default=dict, blank=True)
```

예시 battle 알림 payload:

```json
{
  "battle_id": 12,
  "mission_id": 101,
  "reward_points": 500,
  "redirect_hint": "result"
}
```

### 12-3. Notification 정리 배치

알림은 battle 핵심 데이터가 아니라 사용자 노출용 메시지이므로, 정리 배치를 두는 것이 안전하다.

근거는 아래다.

- battle 결과 정합성의 원본은 `YuntaekBattle`, `BattleParticipant`, `BattleReward`다.
- 사용자의 현재 진입 상태도 `BattleProfile.pending_result_battle`, `BattleParticipant.result_seen_at`가 관리한다.
- 따라서 오래된 battle 알림을 지워도 승패, 보상, 결과 확인 로직은 유지된다.
- 반면 알림은 이벤트마다 row가 쌓이므로, 장기적으로는 핵심 battle 테이블보다 더 빨리 커질 수 있다.

권장 방식은 아래다.

1. 매일 1회 `cleanup_old_notifications()` 배치를 실행한다.
2. 우선 대상은 `notification_type='BATTLE' AND is_read=True AND created_at < cutoff`로 제한한다.
3. 초기 cutoff는 90일로 둔다.
4. battle 결과 정합성은 도메인 테이블이 보장하므로, 알림 삭제 전 별도 battle 스냅샷 보관은 필요 없다.
5. unread 알림까지 바로 지우지 말고, 먼저 read 알림만 정리하는 정책으로 시작하는 편이 안전하다.

### 12-4. 배틀 결과와 월간 리포트 의존성

현재 프로젝트 코드 기준으로는 `레포트를 먼저 확인해야 battle 결과를 볼 수 있는 구조`가 아니다.

근거는 아래다.

- `YuntaekScoreView`는 저장된 `score_snapshot`만 조회하고, 없으면 503을 반환한다.
- `MonthlyReportView`도 저장된 `report_content`만 조회하고, 없으면 503을 반환한다.
- 즉, 둘 다 `조회 시 생성` 구조가 아니다.
- 월간 생성은 `generate_monthly_reports_for_all_users()` batch가 담당한다.
- 이 batch는 먼저 `ensure_score_snapshot()`으로 점수 스냅샷을 만들고, 그 다음 AI 리포트를 생성한다.

따라서 battle 결과 확정은 아래 원칙으로 구현하는 것이 맞다.

- battle 결과 확정은 `score_snapshot`만으로 가능해야 한다.
- `report_content` 존재 여부와 battle 결과 노출을 묶지 않는다.
- 사용자가 월간 리포트를 클릭하지 않아도 battle 결과는 열려야 한다.
- battle 결과 알림을 눌렀을 때, 해당 사용자가 아직 `확인완료`를 누르지 않았다면 바로 `/challenge-battle/result`로 들어가게 하는 것이 맞다.
- 결과 확인이 끝난 뒤에는 battle 메인 진입 시 인트로로 보내고, 월간 리포트 이동은 별도 CTA로 분리하는 편이 안전하다.

### 12-5. 결과 지연 알림과 보상 알림

`analysis_warnings` 때문에 결과 확정이 지연되는 경우 아래 순서를 권장한다.

1. `finalize_single_battle()`가 관련 AI warning을 감지한다.
2. `BATTLE_RESULT_DELAYED` 알림을 생성한다.
3. 프론트 결과 페이지는 `result_ready=false` 배너를 표시한다.
4. 주기적 retry task가 나중에 `score_snapshot`을 다시 확인한다.
5. warning이 사라지고 결과가 확정되면 일반 결과 알림을 보낸다.
6. 이전에 지연 알림이 있었던 battle이면 `BATTLE_DELAY_COMPENSATION_GRANTED` 알림과 함께 지연 보상을 추가 지급한다.

권장 `event_code` 목록에 아래를 추가한다.

- `BATTLE_RESULT_DELAYED`
- `BATTLE_DELAY_COMPENSATION_GRANTED`

## 13. 배치와 연동

### 13-1. 15일 만료 task

매일 1회 또는 매시 1회 아래를 실행한다.

- `REQUESTED` 상태
- `request_deadline_at < now`

대상 대결은 직접 갱신하지 말고 `close_battle_and_release_profiles(..., EXPIRED)` 공통 서비스로 닫는다.

### 13-2. 월 종료 상태 전환 task

매월 1일 00:00 KST 이후 아래 task를 실행한다.

- `move_battles_to_waiting_for_score(year, month)`

이 task는 전월 `ACTIVE` 대결을 `WAITING_FOR_SCORE`로만 전환한다.  
월간 점수 생성 batch 성공 여부와 직접 묶지 않는다.

### 13-3. 결과 확정 재시도 task

매 5분~10분마다 또는 queue worker로 아래를 실행한다.

- `retry_waiting_battles(year, month)`
- 내부에서 각 battle마다 `finalize_single_battle(battle_id)` 호출

월간 점수 batch가 정상 종료되면 빠른 반영을 위해 해당 월 battle들을 한 번 enqueue해도 되지만, 최종 복구 경로는 이 주기적 retry task가 맡는 구조가 안전하다.

### 13-4. Notification 정리 task

매일 1회 오래된 read battle 알림을 정리한다.

- `notification_type='BATTLE'`
- `is_read=True`
- `created_at < cutoff`

초기 cutoff는 90일로 둔다.

## 14. 구현 순서

1. `apps.battles` 앱 생성
2. `BattleProfile`, `YuntaekBattle`, `BattleParticipant`, `BattleMission`, `BattleReward` 모델 구현
3. `battle_code` 발급/검색 API 구현
4. 신청/수락/거절/취소/만료 로직 구현
5. 진행 화면 polling API 구현
6. 미션 판정 로직 구현
7. 거절/취소/만료 공통 정리 서비스 구현
8. 월 종료 시 `WAITING_FOR_SCORE` 전환 로직 구현
9. 결과 확정 재시도 + 결과 스냅샷 고정 로직 구현
10. 보상 지급 구현
11. 알림 연결
12. read battle 알림 정리 배치 구현

## 15. 결론

현재 프로젝트 구조에서 윤택지수 대결은 아래 방식이 가장 현실적이다.

- 친구 찾기: `battle_code` exact match
- 상태 공유: 서버 상태 저장 + 진행 화면 polling + 기존 알림 polling
- 진행 스코어: 미션 선점 개수
- 최종 결과: 선택 항목 공식 점수 + 미션 보너스
- 결과 고정: 결과 생성 시점의 공식 점수 스냅샷을 1회 저장 후 재계산 금지
- 미션 구성: 거래 이벤트와 챌린지 상태 전이처럼 이미 수집되는 데이터만 사용

이 구조면 현재 로그인 방식과 유저 스키마를 그대로 유지하면서도 대결 기능을 무리 없이 붙일 수 있다.
