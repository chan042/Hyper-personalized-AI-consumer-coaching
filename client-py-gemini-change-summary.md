# `client.py` 변경 설명

## 1. 문서 목적

이 문서는 [`backend/external/ai/client.py`](../backend/external/ai/client.py) 에 들어간 이미지 매칭 관련 변경을 설명한다.

중심 질문은 3가지다.

1. 이 파일이 현재 어떤 역할을 하는가
2. Gemini API 기능 중 무엇을 사용하는가
3. 왜 이렇게 수정했는가


## 2. 이 파일의 현재 역할

`client.py` 는 "Gemini 호출을 직접 다루는 단일 진입점"이다.

이미지 매칭 기준으로 보면 이 파일은 아래 3개 작업을 담당한다.

1. 이미지에서 가게명과 요청 메뉴별 단가 확인
2. 주문 문장을 메뉴 단위로 분해
3. 웹 검색으로 메뉴 가격 보강

중요한 점은, 이 파일이 **총액 계산을 하지 않는다는 것**이다.
총액 합산, 결과 병합, 실패 판정은 서비스 레이어인 `image_match_services.py` 가 담당한다.

즉 역할 분리는 아래처럼 되어 있다.

- `client.py`: Gemini 호출과 응답 검증
- `image_match_services.py`: 도메인 로직, 합산, 최종 성공/실패 판정


## 3. 사용 중인 Gemini API 기능

### 3.1 `models.generate_content`

가장 기본이 되는 호출 방식이다.

- 사용 위치: `AIClient._generate_content_with_fallback()`
- 역할: 텍스트, 이미지, 검색 도구 호출을 모두 같은 엔진으로 실행

왜 필요한가:

- 이미지 분석
- 메뉴 파싱
- 웹 검색 가격 조회

를 한 파일에서 일관된 방식으로 다루기 위해서다.


### 3.2 Structured Outputs

현재 코드에서는 Gemini의 structured output 기능을 사용한다.

- 구현 포인트: `response_mime_type="application/json"` + `response_json_schema`
- 적용 위치: `_build_generation_config()`

현재 structured output을 쓰는 대표 작업:

1. `analyze_image_match()`
2. `parse_menu_expression()`
3. `analyze_text()`

왜 필요한가:

- 자유 텍스트보다 JSON 구조가 안정적이다.
- 후처리 코드가 단순해진다.
- `requested_name`, `unit_amount`, `lookup_trace` 같은 필드를 더 엄격하게 받을 수 있다.

중요한 해석:

- structured output은 **출력 형식**을 강하게 잡아준다.
- 하지만 `언제 found=true 인가` 같은 **판단 기준**은 프롬프트가 보완한다.


### 3.3 Google Search Tool

웹 가격 조회에는 Gemini의 Google Search tool을 사용한다.

- 구현 포인트: `types.Tool(google_search=types.GoogleSearch())`
- 적용 작업: `grounded_web_lookup`, `coaching_search`

왜 필요한가:

- 메뉴 가격을 웹 페이지 기반으로 확인해야 하기 때문이다.
- 특히 이미지에서 가격을 못 찾은 메뉴를 웹으로 보강할 때 필요하다.

중요한 점:

- 현재 웹 가격 조회는 "검색 tool 사용 + 후단 검증" 구조다.
- 현재 코드에서는 이 경로에 structured output schema를 직접 넣지 않고, 검색 응답을 파싱한 뒤 Pydantic 검증을 한다.


### 3.4 Grounding Metadata 활용

이번 변경에서 가장 중요한 추가점이다.

현재 코드가 실제로 읽는 grounding metadata:

- `groundingChunks`
- `webSearchQueries`

왜 필요한가:

- 모델이 적은 `source_url` 문자열만 믿으면 hallucination을 막기 어렵다.
- 실제 Google Search grounding source 안에 있는 URL인지 확인해야 "근거 있는 가격"이라고 볼 수 있다.

현재 검증 방식:

1. 검색 응답에서 grounded source URL 목록 추출
2. 모델이 반환한 `source_url` 정규화
3. grounded source 안에 실제로 있는 URL인지 비교
4. 없으면 `found=false` 로 강등

즉, 지금 웹 가격 조회는 **모델 텍스트 신뢰**가 아니라 **grounding source 검증** 기반으로 바뀌었다.


### 3.5 ThinkingConfig

Gemini 2.5 계열 모델에서 `thinking_budget` 을 task별로 다르게 준다.

- 구현 포인트: `types.ThinkingConfig(thinking_budget=...)`
- 적용 위치: `_build_generation_config()`

현재 방향:

- 추출형 작업: `thinking_budget=0`
- 검색/코칭 작업: 소량 reasoning 허용

왜 이렇게 했는가:

- 이미지 가격 추출, 메뉴 파싱은 창의성보다 일관성이 중요하다.
- 검색 기반 작업은 소량의 추론이 도움이 된다.


### 3.6 API Version

현재 기본 API 버전은 `v1beta` 다.

- 상수: `DEFAULT_GEMINI_API_VERSION = "v1beta"`

왜 수정했는가:

- 예전 `v1alpha`보다 운영 안정성이 낫다.
- 현재 사용하는 기능과 문서 기준에 더 잘 맞는다.

중요한 점:

- `v1beta` 로 바꿨다고 해서 토큰이 크게 늘어나는 것은 아니다.
- 토큰에 더 큰 영향을 주는 것은 프롬프트 길이, 검색 사용 여부, thinking 사용 여부다.


## 4. 왜 이렇게 수정했는가

### 4.1 task별 설정을 분리하려고

이전 구조는 작업 종류가 달라도 설정이 거의 비슷했다.

문제:

- 이미지 추출과 웹 검색은 성격이 다른데 같은 temperature 계열을 쓰면 품질이 흔들릴 수 있다.

수정:

- `GEMINI_TASK_PRESETS` 도입
- task별 `temperature`, `thinking_budget` 분리

효과:

- extraction은 더 deterministic
- 검색은 더 근거 중심


### 4.2 schema를 stronger하게 만들려고

이전에는 structured output을 써도 schema 설명이 약했고, 프롬프트가 길어질 수밖에 없었다.

수정:

- `Field(description=...)`
- `enum`
- `ge=0`
- `_sanitize_schema()` 보강

효과:

- 프롬프트가 schema와 같은 규칙을 중복 설명할 필요가 줄었다.
- optional field도 제약이 유지되어 응답 품질이 좋아졌다.


### 4.3 웹 fallback의 신뢰도를 올리려고

이전 문제:

- 검색 도구는 켰지만
- 모델이 반환한 `source_url`을 사실상 그대로 믿는 구조였다.

수정:

- `_normalize_public_url()`
- `_extract_grounded_sources()`
- `_extract_web_search_queries()`
- `_validate_grounded_web_result()`

효과:

- grounding에 없는 URL은 실패 처리
- `diningcode` 같은 source type도 실제 도메인 기준으로 보정
- 디버깅 시 어떤 검색어와 어떤 grounded URL이 붙었는지 확인 가능


### 4.4 이미지 매칭 응답 계약을 단순하게 유지하려고

예전에는 이미지 응답에 legacy `image_price_match` 형식도 남아 있었다.

지금은 방향을 명확히 했다.

- AI는 `item_matches`만 책임진다.
- 총액 계산은 서비스 레이어가 한다.

왜 이 방향이 좋은가:

- 메뉴별 단가 확인과 총액 합산은 책임이 다르다.
- 총액 계산을 AI와 서비스가 동시에 하면 중복과 불일치가 생긴다.


## 5. 주요 메서드별 설명

### 5.1 `_build_generation_config()`

역할:

- task preset 적용
- structured output schema 설정
- Google Search tool 설정
- thinking 설정

의미:

이 메서드가 현재 `client.py` 의 설정 중심점이다.
작업별 Gemini 호출 차이는 대부분 여기서 결정된다.


### 5.2 `_sanitize_schema()`

역할:

- Pydantic schema를 Gemini structured output에 맞게 정리

왜 중요한가:

- optional field가 `anyOf`로 바뀌면서 설명/enum/minimum 같은 제약이 사라지면 structured output 품질이 떨어진다.
- 이 메서드는 그 제약이 유지되도록 돕는다.


### 5.3 `_parse()`

역할:

- Gemini 호출
- 구조화 응답 파싱
- Pydantic 검증

의미:

`client.py` 의 공통 실행기다.
이미지 분석, 메뉴 파싱, 텍스트 분석 대부분이 여기로 모인다.


### 5.4 `analyze_image_match()`

역할:

- 메뉴판 이미지 같은 입력에서
- `store_name`
- 요청 메뉴별 `item_matches`

를 함께 받는다.

중요한 점:

- 이미지 전체 메뉴를 다 추출하는 메서드는 아니다.
- **사용자가 요청한 메뉴 기준으로** 단가가 보이는지 확인하는 메서드다.


### 5.5 `parse_menu_expression()`

역할:

- 주문 문장을 메뉴 단위로만 분해
- 가격, 카테고리, 가게명 추정은 하지 않음

왜 분리했는가:

- 메뉴 파싱을 작은 구조화 작업으로 분리해야
- ambiguous 처리와 재사용이 쉬워진다.


### 5.6 `resolve_price_from_web_search()`

역할:

- Google Search 기반으로 메뉴 가격 조회
- grounding metadata 기반으로 결과 검증

이 메서드의 핵심 변화:

예전:

- 모델이 `source_url` 을 적으면 거의 그대로 신뢰

지금:

- grounded source에 실제로 존재하는 URL일 때만 성공
- grounded domain 기준으로 `source_type` 재정렬

즉, 이 메서드는 현재 "검색 + 검증" 메서드다.


## 6. 현재 구조의 장점

1. Gemini 호출 정책이 한 파일에 모여 있다.
2. task별 설정 차이가 코드에 명시적이다.
3. structured output과 schema 제약이 강화되었다.
4. 웹 fallback이 grounding 검증 기반으로 바뀌어 hallucinated URL 위험이 줄었다.
5. 이미지 매칭은 메뉴별 단가 검증, 서비스는 총액 계산으로 책임이 나뉘었다.


## 7. 현재 의도적으로 하지 않은 것

현재 코드에 **아직 없는 것**도 분명히 해야 한다.

1. URL Context는 아직 사용하지 않는다.
2. 웹 검색 경로에서 Structured Outputs + Tools를 한 요청에 강하게 묶는 구조는 아직 아니다.
3. 메뉴판 전체 후보를 exhaustive하게 푸는 구조는 현재 client 레이어에 없다.

즉 지금 단계의 목표는 "더 많은 기능 추가"가 아니라,
**현재 구조 안에서 Gemini 호출을 안정적이고 검증 가능하게 만드는 것**이다.


## 8. 한 줄 요약

`client.py` 의 이번 변경은 단순 리팩토링이 아니라,

- task별 Gemini 설정 분리
- structured output 품질 강화
- Google Search grounding 기반 검증
- legacy 응답 계약 축소

를 통해 이미지 매칭과 웹 가격 조회를 **더 예측 가능하고 신뢰 가능한 구조**로 바꾼 작업이다.
