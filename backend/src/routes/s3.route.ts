import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const s3Routes = Router();

// Proxy S3 requests to internal MinIO
// API Path via proxy: /api/v1/s3/bucket/key 
// Target MinIO:      http://localhost:9000/bucket/key
// WE MUST REMOVE /api/v1/s3 prefix so MinIO gets just /bucket/key
s3Routes.use(
  "/",
  createProxyMiddleware({
    target: process.env.STORAGE_ENDPOINT || "http://127.0.0.1:9000",
    changeOrigin: true,
    pathRewrite: {
      "^/api/v1/s3": "", // Strip the proxy prefix
    },
    onProxyReq: (proxyReq: any) => {
      // MinIO expects host header to match its binding often, safe to force localhost
      // or keep legitimate host. For local-in-docker, localhost:9000 is safe.
      proxyReq.setHeader("Host", "localhost:9000");
    },
  } as any)
);

export default s3Routes;
