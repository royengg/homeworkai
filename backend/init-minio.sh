#!/bin/bash
# Wait for MinIO to start
echo "Waiting for MinIO to start..."
until curl -s http://127.0.0.1:9000/minio/health/live; do
  sleep 1
done

echo "MinIO is up! Configuring bucket..."

# Configure mc alias (using local credentials from env or default)
# Note: In the ecosystem.config.js, we set MINIO_ROOT_USER/PASSWORD. 
# We need to use those here.
USER=${MINIO_ROOT_USER:-minioadmin}
PASS=${MINIO_ROOT_PASSWORD:-minioadmin123}
BUCKET=${STORAGE_BUCKET:-homeworkai-uploads}

mc alias set local http://127.0.0.1:9000 "$USER" "$PASS" 

# Create bucket if not exists
if ! mc ls local/$BUCKET >/dev/null 2>&1; then
  echo "Creating bucket: $BUCKET"
  mc mb local/$BUCKET
  # Set public policy if needed (optional for signed URLs but good for debugging)
  # mc anonymous set download local/$BUCKET
else
  echo "Bucket $BUCKET already exists"
fi

echo "MinIO initialization complete!"
