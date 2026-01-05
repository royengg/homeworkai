module.exports = {
  apps: [
    {
      name: 'redis',
      script: 'redis-server',
      args: '--bind 127.0.0.1 --port 6379 --appendonly no --save ""',
      interpreter: 'none',
      autorestart: true,
    },
    {
      name: 'minio',
      script: '/usr/local/bin/minio',
      args: 'server /data/minio --address :9000 --console-address :9001',
      interpreter: 'none',
      autorestart: true,
      env: {
        MINIO_ROOT_USER: process.env.MINIO_ROOT_USER || 'minioadmin',
        MINIO_ROOT_PASSWORD: process.env.MINIO_ROOT_PASSWORD || 'minioadmin123',
      },
    },
    {
      name: 'api',
      script: 'npx',
      args: 'tsx src/app.ts',
      autorestart: true,
      wait_ready: true,
      listen_timeout: 15000,
      env: {
        NODE_ENV: process.env.NODE_ENV || 'production',
      },
    },
    {
      name: 'worker',
      script: 'npx',
      args: 'tsx src/workers/analyze.worker.ts',
      autorestart: true,
      env: {
        NODE_ENV: process.env.NODE_ENV || 'production',
      },
    },
    {
      name: 'init-minio',
      script: './init-minio.sh',
      autorestart: false,
      env: {
        MINIO_ROOT_USER: process.env.MINIO_ROOT_USER || 'minioadmin',
        MINIO_ROOT_PASSWORD: process.env.MINIO_ROOT_PASSWORD || 'minioadmin123',
        STORAGE_BUCKET: process.env.STORAGE_BUCKET || 'homeworkai-uploads',
      }
    }
  ],
};
