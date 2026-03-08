/**
 * AWS S3 Client Wrapper
 * Object storage operations
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createReadStream } from "fs";
import { Readable } from "stream";
import { awsConfig } from "./config";

export const s3Client = new S3Client({
  region: awsConfig.region,
});

export interface S3Object {
  key: string;
  size: number;
  lastModified: Date;
  etag?: string;
}

/**
 * Upload file to S3 from buffer
 */
export async function uploadBuffer(
  bucket: string,
  key: string,
  buffer: Buffer,
  contentType: string = "application/octet-stream"
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    const response = await s3Client.send(command);
    return `s3://${bucket}/${key}`;
  } catch (error) {
    console.error("Upload buffer error:", error);
    throw error;
  }
}

/**
 * Upload file to S3 from file path
 */
export async function uploadFile(
  bucket: string,
  key: string,
  filePath: string,
  contentType: string = "application/octet-stream"
): Promise<string> {
  try {
    const fileStream = createReadStream(filePath);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileStream as any,
      ContentType: contentType,
    });

    const response = await s3Client.send(command);
    return `s3://${bucket}/${key}`;
  } catch (error) {
    console.error("Upload file error:", error);
    throw error;
  }
}

/**
 * Download file from S3 as buffer
 */
export async function downloadBuffer(
  bucket: string,
  key: string
): Promise<Buffer> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);
    const chunks: Buffer[] = [];

    if (response.Body instanceof Readable) {
      for await (const chunk of response.Body) {
        chunks.push(Buffer.from(chunk));
      }
    }

    return Buffer.concat(chunks);
  } catch (error) {
    console.error("Download buffer error:", error);
    throw error;
  }
}

/**
 * Get S3 object metadata
 */
export async function getObjectMetadata(
  bucket: string,
  key: string
): Promise<{
  size: number;
  lastModified: Date | undefined;
  contentType?: string;
  etag?: string;
}> {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);

    return {
      size: response.ContentLength || 0,
      lastModified: response.LastModified,
      contentType: response.ContentType,
      etag: response.ETag,
    };
  } catch (error) {
    console.error("Get object metadata error:", error);
    throw error;
  }
}

/**
 * Delete object from S3
 */
export async function deleteObject(bucket: string, key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error("Delete object error:", error);
    throw error;
  }
}

/**
 * List objects in S3 bucket
 */
export async function listObjects(
  bucket: string,
  prefix: string = "",
  maxKeys: number = 1000
): Promise<S3Object[]> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: maxKeys,
    });

    const response = await s3Client.send(command);
    const contents = response.Contents || [];

    return contents
      .filter((obj) => obj.Key)
      .map((obj) => ({
        key: obj.Key || "",
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date(),
        etag: obj.ETag,
      }));
  } catch (error) {
    console.error("List objects error:", error);
    throw error;
  }
}

/**
 * Copy object within S3
 */
export async function copyObject(
  sourceBucket: string,
  sourceKey: string,
  destinationBucket: string,
  destinationKey: string
): Promise<string> {
  try {
    const command = new CopyObjectCommand({
      CopySource: `${sourceBucket}/${sourceKey}`,
      Bucket: destinationBucket,
      Key: destinationKey,
    });

    const response = await s3Client.send(command);
    return `s3://${destinationBucket}/${destinationKey}`;
  } catch (error) {
    console.error("Copy object error:", error);
    throw error;
  }
}

/**
 * Generate presigned URL for temporary access
 */
export async function generatePresignedUrl(
  bucket: string,
  key: string,
  expirationSeconds: number = 3600
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, {
      expiresIn: expirationSeconds,
    });

    return url;
  } catch (error) {
    console.error("Generate presigned URL error:", error);
    throw error;
  }
}

/**
 * Upload JSON to S3
 */
export async function uploadJSON(
  bucket: string,
  key: string,
  data: any
): Promise<string> {
  const jsonBuffer = Buffer.from(JSON.stringify(data), "utf-8");
  return uploadBuffer(bucket, key, jsonBuffer, "application/json");
}

/**
 * Download JSON from S3
 */
export async function downloadJSON(bucket: string, key: string): Promise<any> {
  const buffer = await downloadBuffer(bucket, key);
  return JSON.parse(buffer.toString("utf-8"));
}

export default s3Client;
