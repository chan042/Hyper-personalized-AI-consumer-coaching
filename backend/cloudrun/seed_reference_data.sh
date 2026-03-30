#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
BACKEND_DIR=$(CDPATH= cd -- "$REPO_ROOT/backend" && pwd)

: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
: "${GCP_REGION:?Set GCP_REGION}"
: "${CLOUD_SQL_INSTANCE:?Set CLOUD_SQL_INSTANCE}"

CLOUD_RUN_JOB=${CLOUD_RUN_JOB:-duduk-api-seed-staging}
ENV_VARS_FILE=${ENV_VARS_FILE:-"$SCRIPT_DIR/env.staging.yaml"}
CLOUD_RUN_TASK_TIMEOUT=${CLOUD_RUN_TASK_TIMEOUT:-900}
CLOUD_RUN_MEMORY=${CLOUD_RUN_MEMORY:-1Gi}
CLOUD_RUN_CPU=${CLOUD_RUN_CPU:-1}
SEED_REFERENCE_ARGS=${SEED_REFERENCE_ARGS:-manage.py,seed_reference_data,--force-update}

if [ ! -f "$ENV_VARS_FILE" ]; then
  echo "Missing env vars file: $ENV_VARS_FILE" >&2
  echo "Copy backend/cloudrun/env.staging.example.yaml to backend/cloudrun/env.staging.yaml and fill it in first." >&2
  exit 1
fi

set -- \
  gcloud run jobs deploy "$CLOUD_RUN_JOB" \
  --project "$GCP_PROJECT_ID" \
  --region "$GCP_REGION" \
  --tasks 1 \
  --parallelism 1 \
  --max-retries 0 \
  --task-timeout "$CLOUD_RUN_TASK_TIMEOUT" \
  --memory "$CLOUD_RUN_MEMORY" \
  --cpu "$CLOUD_RUN_CPU" \
  --set-cloudsql-instances "$CLOUD_SQL_INSTANCE" \
  --env-vars-file "$ENV_VARS_FILE" \
  --command python \
  --args "$SEED_REFERENCE_ARGS" \
  --execute-now \
  --wait

if [ -n "${CLOUD_RUN_IMAGE:-}" ]; then
  set -- "$@" --image "$CLOUD_RUN_IMAGE"
else
  set -- "$@" --source "$BACKEND_DIR"
fi

if [ -n "${CLOUD_RUN_SERVICE_ACCOUNT:-}" ]; then
  set -- "$@" --service-account "$CLOUD_RUN_SERVICE_ACCOUNT"
fi

"$@"
