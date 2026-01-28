#!/bin/bash
echo "Waiting for MinIO to start..."
until curl -s http://127.0.0.1:9000/minio/health/live; do
  sleep 1
done

echo "MinIO is up! Configuring bucket..."

USER=${MINIO_ROOT_USER:-minioadmin}
PASS=${MINIO_ROOT_PASSWORD:-minioadmin123}
BUCKET=${STORAGE_BUCKET:-homeworkai-uploads}

mc alias set local http://127.0.0.1:9000 "$USER" "$PASS" 

if ! mc ls local/$BUCKET >/dev/null 2>&1; then
  echo "Creating bucket: $BUCKET"
  mc mb local/$BUCKET
else
  echo "Bucket $BUCKET already exists"
fi

echo "MinIO initialization complete!"
