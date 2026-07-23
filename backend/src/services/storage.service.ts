import {
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, storageBucket } from "../config/storage.config";
import { logger } from "../config/logger.config";

export async function presignPut(params: {
  key: string;
  contentType: string;
  contentLength: number;
  bucket?: string;
  expiresIn?: number;
}) {
  const bucket = params.bucket ?? storageBucket;
  const expiresIn = params.expiresIn ?? 600;
  // Signing ContentLength forces the client's PUT body to match the declared
  // size; any mismatch invalidates the SigV4 signature, preventing oversized
  // uploads. defense-in-depth: confirmUpload also re-checks the real size.
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: params.key,
    ContentType: params.contentType,
    ContentLength: params.contentLength,
  });
  const url = await getSignedUrl(s3, command, { expiresIn });

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  return { bucket, key: params.key, url, expiresAt };
}

export async function headObject(params: { key: string; bucket?: string }) {
  const bucket = params.bucket ?? storageBucket;
  const res = await s3.send(
    new HeadObjectCommand({ Bucket: bucket, Key: params.key }),
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

  return { bucket, key: params.key, url };
}

export async function deleteObject(params: { key: string; bucket?: string }) {
  const bucket = params.bucket ?? storageBucket;
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: params.key }));
    logger.info("Deleted object from storage", { bucket, key: params.key });
  } catch (error) {
    logger.error("Failed to delete object from storage", {
      bucket,
      key: params.key,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function deleteObjectsByPrefix(params: {
  prefix: string;
  bucket?: string;
}) {
  const bucket = params.bucket ?? storageBucket;
  const keys: string[] = [];

  try {
    const listResponse = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: params.prefix }),
    );

    if (listResponse.Contents && listResponse.Contents.length > 0) {
      for (const obj of listResponse.Contents) {
        if (obj.Key) keys.push(obj.Key);
      }
    }

    for (const key of keys) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      } catch (error) {
        logger.error("Failed to delete object by prefix", {
          bucket,
          key,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    if (keys.length > 0) {
      logger.info("Deleted objects by prefix from storage", {
        bucket,
        prefix: params.prefix,
        count: keys.length,
      });
    }

    return keys;
  } catch (error) {
    logger.error("Failed to list objects by prefix from storage", {
      bucket,
      prefix: params.prefix,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return keys;
  }
}
