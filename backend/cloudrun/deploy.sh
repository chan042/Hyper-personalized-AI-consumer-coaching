#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
BACKEND_DIR=$(CDPATH= cd -- "$REPO_ROOT/backend" && pwd)

: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
: "${GCP_REGION:?Set GCP_REGION}"
: "${CLOUD_RUN_SERVICE:=duduk-api-staging}"
: "${CLOUD_SQL_INSTANCE:?Set CLOUD_SQL_INSTANCE}"

ENV_VARS_FILE=${ENV_VARS_FILE:-"$SCRIPT_DIR/env.staging.yaml"}
CLOUD_RUN_MEMORY=${CLOUD_RUN_MEMORY:-1Gi}
CLOUD_RUN_CPU=${CLOUD_RUN_CPU:-1}
CLOUD_RUN_TIMEOUT=${CLOUD_RUN_TIMEOUT:-300}
CLOUD_RUN_MIN_INSTANCES=${CLOUD_RUN_MIN_INSTANCES:-0}
CLOUD_RUN_MAX_INSTANCES=${CLOUD_RUN_MAX_INSTANCES:-3}

if [ ! -f "$ENV_VARS_FILE" ]; then
  echo "Missing env vars file: $ENV_VARS_FILE" >&2
  echo "Copy backend/cloudrun/env.staging.example.yaml to backend/cloudrun/env.staging.yaml and fill it in first." >&2
  exit 1
fi

gcloud run deploy "$CLOUD_RUN_SERVICE" \
  --project "$GCP_PROJECT_ID" \
  --region "$GCP_REGION" \
  --platform managed \
  --source "$BACKEND_DIR" \
  --allow-unauthenticated \
  --port 8080 \
  --memory "$CLOUD_RUN_MEMORY" \
  --cpu "$CLOUD_RUN_CPU" \
  --timeout "$CLOUD_RUN_TIMEOUT" \
  --min-instances "$CLOUD_RUN_MIN_INSTANCES" \
  --max-instances "$CLOUD_RUN_MAX_INSTANCES" \
  --add-cloudsql-instances "$CLOUD_SQL_INSTANCE" \
  --env-vars-file "$ENV_VARS_FILE"

SERVICE_URL=$(
  gcloud run services describe "$CLOUD_RUN_SERVICE" \
    --project "$GCP_PROJECT_ID" \
    --region "$GCP_REGION" \
    --format='value(status.url)'
)

echo ""
echo "Cloud Run service deployed."
echo "Service URL: $SERVICE_URL"
echo "Health check: ${SERVICE_URL}/healthz/"
