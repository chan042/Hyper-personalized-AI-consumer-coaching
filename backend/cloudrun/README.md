# Cloud Run Staging Guide

This directory contains the minimum files needed to deploy the `duduk` Django API to
Cloud Run as a stage-1 staging service.

## What stage 1 means

- Cloud Run serves the Django API over HTTPS.
- Cloud SQL provides PostgreSQL.
- Redis/Celery worker/beat are not part of this first deployment yet.
- To keep coaching generation usable without Redis, set `COACHING_TASK_MODE=sync`.

## Files

- `deploy.sh`: deploys the backend to Cloud Run from source with the repo's Dockerfile
- `env.staging.example.yaml`: example env vars file for `gcloud run deploy --env-vars-file`

## Before you deploy

1. Install the Google Cloud CLI (`gcloud`) on your Mac.
2. Create or select a GCP project.
3. Enable these APIs:
   - Cloud Run Admin API
   - Cloud Build API
   - Cloud SQL Admin API
4. Create a PostgreSQL Cloud SQL instance.
5. Create the `duduk` database and database user.
6. Make sure your Cloud Run service account can connect to Cloud SQL.

## Prepare env vars

1. Copy `env.staging.example.yaml` to `env.staging.yaml`.
2. Fill in real values.
3. Set `POSTGRES_HOST` to `/cloudsql/<PROJECT_ID>:<REGION>:<INSTANCE_NAME>`.
4. Keep `COACHING_TASK_MODE: "sync"` for stage 1.

`env.staging.yaml` is gitignored because it contains secrets.

## Deploy

```bash
export GCP_PROJECT_ID="your-gcp-project-id"
export GCP_REGION="asia-northeast3"
export CLOUD_RUN_SERVICE="duduk-api-staging"
export CLOUD_SQL_INSTANCE="your-gcp-project-id:asia-northeast3:duduk-staging-db"
export ENV_VARS_FILE="/Users/chan/Project/duduk-project/backend/cloudrun/env.staging.yaml"

sh /Users/chan/Project/duduk-project/backend/cloudrun/deploy.sh
```

## Verify

After deploy, open:

- `https://<cloud-run-service-url>/healthz/`

Expected response:

```json
{"status":"ok","database":"ok"}
```

## After deploy

1. Put the Cloud Run URL into the frontend mobile build env:

```env
NEXT_PUBLIC_API_URL=https://your-cloud-run-service-url
```

2. Rebuild the frontend mobile bundle:

```bash
cd /Users/chan/Project/duduk-project/frontend
npm run build:mobile
npx cap sync
```

## Known stage-1 limits

- Scheduled Celery tasks are not running yet.
- Local `MEDIA_ROOT` storage is still in use; Cloud Storage should be added later.
- Google login and Camera are still pending mobile-specific hardening.
