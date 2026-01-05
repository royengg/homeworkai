import { PutObjectCommand, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, storageBucket } from "../config/storage.config";
import { config } from "../config/app.config";

export async function presignPut(params: {
  key: string;
  contentType: string;
  bucket?: string;
  expiresIn?: number;
}) {
  const bucket = params.bucket ?? storageBucket;
  const expiresIn = params.expiresIn ?? 600;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: params.key,
    ContentType: params.contentType,
  });
  let url = await getSignedUrl(s3, command, { expiresIn });

  // REWRITE URL FOR PROXY
  // Internal: http://127.0.0.1:9000/bucket/key?...
  // Public:   https://backend.app/api/v1/s3/bucket/key?...
  // We replace the endpoint origin with our proxy path
  const endpoint = new URL(process.env.STORAGE_ENDPOINT || "http://127.0.0.1:9000");
  const publicProxyBase = `${config.backendPublicUrl}/api/v1/s3`;
  
  if (url.includes(endpoint.origin)) {
     url = url.replace(endpoint.origin, publicProxyBase);
  }

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  return { bucket, key: params.key, url, expiresAt };
}

export async function headObject(params: { key: string; bucket?: string }) {
  const bucket = params.bucket ?? storageBucket;
  const res = await s3.send(
    new HeadObjectCommand({ Bucket: bucket, Key: params.key })
  );
  return {
    bucket,
    key: params.key,
    contentLength: res.ContentLength ?? 0,
    contentType: res.ContentType ?? "",
    etag: (res.ETag || "").replaceAll('"', ""),
    lastModified: res.LastModified?.toISOString(),
  };
}

export async function presignGet(params: {
  key: string;
  bucket?: string;
  expiresIn?: number;
}) {
  const bucket = params.bucket ?? storageBucket;
  const expiresIn = params.expiresIn ?? 3600;
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: params.key,
  });
  let url = await getSignedUrl(s3, command, { expiresIn });

  // REWRITE URL FOR PROXY
  const endpoint = new URL(process.env.STORAGE_ENDPOINT || "http://127.0.0.1:9000");
  const publicProxyBase = `${config.backendPublicUrl}/api/v1/s3`;
  
  if (url.includes(endpoint.origin)) {
     url = url.replace(endpoint.origin, publicProxyBase);
  }

  return { bucket, key: params.key, url };
}
