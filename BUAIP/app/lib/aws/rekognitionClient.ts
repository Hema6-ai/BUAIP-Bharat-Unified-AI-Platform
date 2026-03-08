/**
 * AWS Rekognition Client Wrapper
 * Image and video analysis
 */

import {
  RekognitionClient,
  DetectLabelsCommand,
  DetectTextCommand,
  DetectModerationLabelsCommand,
} from "@aws-sdk/client-rekognition";
import { readFileSync } from "fs";
import { awsConfig } from "./config";

export const rekognitionClient = new RekognitionClient({
  region: awsConfig.region,
});

export interface Label {
  name: string;
  confidence: number;
  instances?: Array<{
    boundingBox?: {
      width: number;
      height: number;
      left: number;
      top: number;
    };
  }>;
}

export interface TextDetection {
  text: string;
  confidence: number;
  type: "LINE" | "WORD";
  boundingBox?: {
    width: number;
    height: number;
    left: number;
    top: number;
  };
}

export interface ModerationLabel {
  name: string;
  confidence: number;
}

/**
 * Detect objects and scenes in image from file path
 */
export async function detectLabelsFromFile(
  filePath: string,
  maxLabels: number = 10
): Promise<Label[]> {
  try {
    const imageData = readFileSync(filePath);

    const command = new DetectLabelsCommand({
      Image: {
        Bytes: imageData,
      },
      MaxLabels: maxLabels,
      MinConfidence: 50,
    });

    const response = await rekognitionClient.send(command);

    return (response.Labels || []).map((label: any) => ({
      name: label.Name || "",
      confidence: (label.Confidence || 0) / 100,
      instances: label.Instances?.map((inst: any) => ({
        boundingBox: inst.BoundingBox
          ? {
              width: inst.BoundingBox.Width || 0,
              height: inst.BoundingBox.Height || 0,
              left: inst.BoundingBox.Left || 0,
              top: inst.BoundingBox.Top || 0,
            }
          : undefined,
      })),
    }));
  } catch (error) {
    console.error("Detect labels from file error:", error);
    throw error;
  }
}

/**
 * Detect objects and scenes in image from S3
 */
export async function detectLabelsFromS3(
  bucket: string,
  key: string,
  maxLabels: number = 10
): Promise<Label[]> {
  try {
    const command = new DetectLabelsCommand({
      Image: {
        S3Object: {
          Bucket: bucket,
          Name: key,
        },
      },
      MaxLabels: maxLabels,
      MinConfidence: 50,
    });

    const response = await rekognitionClient.send(command);

    return (response.Labels || []).map((label: any) => ({
      name: label.Name || "",
      confidence: (label.Confidence || 0) / 100,
    }));
  } catch (error) {
    console.error("Detect labels from S3 error:", error);
    throw error;
  }
}

/**
 * Detect and extract text from image
 */
export async function detectText(
  imageBuffer: Buffer
): Promise<TextDetection[]> {
  try {
    const command = new DetectTextCommand({
      Image: {
        Bytes: imageBuffer,
      },
    });

    const response = await rekognitionClient.send(command);

    return (response.TextDetections || []).map((detection: any) => ({
      text: detection.DetectedText || "",
      confidence: (detection.Confidence || 0) / 100,
      type: detection.Type as "LINE" | "WORD",
      boundingBox: detection.Geometry?.BoundingBox
        ? {
            width: detection.Geometry.BoundingBox.Width || 0,
            height: detection.Geometry.BoundingBox.Height || 0,
            left: detection.Geometry.BoundingBox.Left || 0,
            top: detection.Geometry.BoundingBox.Top || 0,
          }
        : undefined,
    }));
  } catch (error) {
    console.error("Detect text error:", error);
    throw error;
  }
}

/**
 * Detect inappropriate content
 */
export async function detectModerationLabels(
  imageBuffer: Buffer,
  minConfidence: number = 50
): Promise<ModerationLabel[]> {
  try {
    const command = new DetectModerationLabelsCommand({
      Image: {
        Bytes: imageBuffer,
      },
      MinConfidence: minConfidence,
    });

    const response = await rekognitionClient.send(command);

    return (response.ModerationLabels || []).map((label: any) => ({
      name: label.Name || "",
      confidence: (label.Confidence || 0) / 100,
    }));
  } catch (error) {
    console.error("Detect moderation labels error:", error);
    throw error;
  }
}

/**
 * Comprehensive image analysis
 */
export async function analyzeImage(
  imageBuffer: Buffer
): Promise<{
  labels: Label[];
  text: TextDetection[];
  moderation: ModerationLabel[];
}> {
  try {
    const [labels, text, moderation] = await Promise.all([
      detectLabels(imageBuffer, 10),
      detectText(imageBuffer),
      detectModerationLabels(imageBuffer),
    ]);

    return {
      labels,
      text,
      moderation,
    };
  } catch (error) {
    console.error("Analyze image error:", error);
    throw error;
  }
}

/**
 * Detect labels with buffer input
 */
export async function detectLabels(
  imageBuffer: Buffer,
  maxLabels: number = 10
): Promise<Label[]> {
  try {
    const command = new DetectLabelsCommand({
      Image: {
        Bytes: imageBuffer,
      },
      MaxLabels: maxLabels,
      MinConfidence: 50,
    });

    const response = await rekognitionClient.send(command);

    return (response.Labels || []).map((label: any) => ({
      name: label.Name || "",
      confidence: (label.Confidence || 0) / 100,
    }));
  } catch (error) {
    console.error("Detect labels error:", error);
    throw error;
  }
}

export default rekognitionClient;
