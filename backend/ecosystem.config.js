module.exports = {
  apps: [
    {
      name: "api",
      script: "npx",
      args: "tsx src/app.ts",
      autorestart: true,
      wait_ready: true,
      listen_timeout: 15000,
      env: {
        NODE_ENV: process.env.NODE_ENV || "production",
      },
    },
    {
      name: "worker",
      script: "npx",
      args: "tsx src/workers/analyze.worker.ts",
      autorestart: true,
      env: {
        NODE_ENV: process.env.NODE_ENV || "production",
      },
    },
  ],
};
