import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const s3Routes = Router();

s3Routes.use(
  "/",
  createProxyMiddleware({
    target: process.env.STORAGE_ENDPOINT || "http://127.0.0.1:9000",
    changeOrigin: true,
    pathRewrite: {
      "^/api/v1/s3": "",
    },
    onProxyReq: (proxyReq: any) => {
      proxyReq.setHeader("Host", "localhost:9000");
    },
  } as any)
);

export default s3Routes;
