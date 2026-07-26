// Production PM2 config — runs the compiled `dist/` output (no tsx watcher).
// Keeps the worker and the API in one process tree so a single container can
// serve both on a VPS. To scale them independently, split this into two
// services (one with only `api`, one with only `worker`).
module.exports = {
  apps: [
    {
      name: "api",
      cwd: "/app",
      script: "dist/app.js",
      instances: 1,
      autorestart: true,
      wait_ready: true,
      listen_timeout: 15000,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "worker",
      cwd: "/app",
      script: "dist/workers/analyze.worker.js",
      instances: 1,
      autorestart: true,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
