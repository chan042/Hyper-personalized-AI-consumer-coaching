# Cloud SQL 배포 DB를 DBeaver로 확인하는 방법

이 문서는 팀원들이 각자 로컬 환경에서 `Cloud SQL for PostgreSQL` 스테이징 DB를 `DBeaver`로 조회하거나 수정할 수 있도록 접속 절차를 정리한 문서입니다.

## 핵심 요약

- `DBeaver`만 설치해서는 바로 접속할 수 없습니다.
- 각 팀원은 자기 노트북에서 `Cloud SQL Auth Proxy`를 직접 실행해야 합니다.
- 각 팀원은 Google 계정으로 로그인되어 있어야 하고, GCP에서 `Cloud SQL Client` 권한이 있어야 합니다.
- DB 계정 정보는 문서에 적지 말고 별도로 공유합니다.

## 공통 접속 정보

- GCP 프로젝트: `duduk-300c`
- Cloud SQL 인스턴스: `duduk-staging-db`
- Instance connection name: `duduk-300c:asia-northeast3:duduk-staging-db`
- Database: `duduk_db`
- Host: `127.0.0.1`
- Port: `5433`

## 사전 준비

각 팀원 로컬 환경에 아래가 필요합니다.

- `gcloud CLI`
- `DBeaver`
- `Cloud SQL Auth Proxy`
- GCP IAM 권한: `Cloud SQL Client`

## 1. Google 로그인

각 팀원은 아래 명령을 1회 실행합니다.

```bash
gcloud auth login
gcloud auth application-default login
gcloud auth list
```

## 2. Cloud SQL Auth Proxy 다운로드

### Apple Silicon 맥(M1/M2/M3)

```bash
cd ~/Downloads
curl -L -o cloud-sql-proxy \
"https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.21.1/cloud-sql-proxy.darwin.arm64"
chmod +x cloud-sql-proxy
./cloud-sql-proxy --version
```

### Intel 맥

```bash
cd ~/Downloads
curl -L -o cloud-sql-proxy \
"https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.21.1/cloud-sql-proxy.darwin.amd64"
chmod +x cloud-sql-proxy
./cloud-sql-proxy --version
```

## 3. Cloud SQL Auth Proxy 실행

각 팀원은 자기 노트북에서 아래 명령을 실행합니다.

```bash
~/Downloads/cloud-sql-proxy --port 5433 duduk-300c:asia-northeast3:duduk-staging-db
```

주의:

- 이 명령을 실행한 터미널은 닫으면 안 됩니다.
- 각자 자기 로컬에서 프록시를 띄워야 합니다.
- 한 사람이 띄운 프록시를 다른 사람이 같이 쓰는 구조가 아닙니다.

## 4. DBeaver 연결 설정

`DBeaver`에서 새 연결을 만들 때 아래 값으로 입력합니다.

- Driver: `PostgreSQL`
- Host: `127.0.0.1`
- Port: `5433`
- Database: `duduk_db`
- Username: 별도 공유받은 DB 계정
- Password: 별도 공유받은 DB 비밀번호

### SSL 설정

`Edit Connection` 또는 새 연결 창에서:

- `SSL` 탭
- `SSL mode = disable`

프록시가 Cloud SQL과의 암호화/인증을 처리하므로, DBeaver 쪽 SSL은 끕니다.

## 5. 연결 후 확인 방법

연결에 성공하면 DBeaver에서 다음 경로로 이동합니다.

- `Schemas`
- `public`
- `Tables`

원하는 테이블을 더블클릭하면:

- `Properties`: 컬럼/스키마 정보
- `Data`: 행 데이터 조회 및 직접 수정

수정 후에는:

- `Save`
- 또는 `Cmd+S`
- 필요하면 `Commit`

을 실행합니다.

## 6. 수정 내용 반영

DB 수정 자체는 재배포 없이 반영됩니다.

- 웹: 새로고침
- 모바일 시뮬레이터: 화면 재진입 또는 앱 재실행

단, 일부 화면은 프론트 캐시나 서버 스냅샷을 사용할 수 있으므로 즉시 반영되지 않을 수도 있습니다.

## 7. 자주 발생하는 문제

### DBeaver 연결 실패

확인할 것:

- `cloud-sql-proxy`가 실행 중인지
- `gcloud auth application-default login`을 했는지
- 본인 계정에 `Cloud SQL Client` 권한이 있는지
- Host/Port를 `127.0.0.1:5433`으로 넣었는지

### 프록시는 켰는데 접속이 안 됨

아래 명령으로 포트가 열렸는지 확인합니다.

```bash
lsof -i tcp:5433
```

### SSL 관련 오류

`DBeaver`의 `SSL` 설정이 `disable`인지 확인합니다.

## 8. 운영상 권장 사항

- 빠른 공유가 목적이면 공용 DB 계정을 사용할 수 있습니다.
- 다만 누가 어떤 데이터를 수정했는지 추적하기 어렵습니다.
- 가능하면 팀원별 DB 계정을 따로 만드는 것이 더 안전합니다.
- 실제 비밀번호는 문서나 저장소에 커밋하지 말고 별도로 공유합니다.

## 참고 문서

- Cloud SQL Auth Proxy: <https://docs.cloud.google.com/sql/docs/postgres/connect-auth-proxy>
- Cloud SQL 사용자 관리: <https://docs.cloud.google.com/sql/docs/postgres/create-manage-users>
