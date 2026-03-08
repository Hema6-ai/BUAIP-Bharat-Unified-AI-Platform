/**
 * AWS Textract Client Wrapper
 * Document text extraction and analysis
 */

import {
  TextractClient,
  StartDocumentTextDetectionCommand,
  StartDocumentAnalysisCommand,
  GetDocumentTextDetectionCommand,
  GetDocumentAnalysisCommand,
} from "@aws-sdk/client-textract";
import { awsConfig } from "./config";

export const textractClient = new TextractClient({
  region: awsConfig.region,
});

export interface TextractPage {
  pageNumber: number;
  text: string;
  width: number;
  height: number;
}

export interface TextractResult {
  jobId: string;
  status: string;
  pages: TextractPage[];
}

export interface DocumentBlock {
  type: string;
  text: string;
  confidence: number;
  geometry?: {
    boundingBox: {
      width: number;
      height: number;
      left: number;
      top: number;
    };
  };
}

/**
 * Start asynchronous OCR job on document in S3
 */
export async function startDocumentOCR(
  bucket: string,
  key: string,
  outputBucket?: string
): Promise<string> {
  try {
    const command = new StartDocumentTextDetectionCommand({
      DocumentLocation: {
        S3Object: {
          Bucket: bucket,
          Name: key,
        },
      },
      OutputConfig: outputBucket
        ? {
            S3Bucket: outputBucket,
          }
        : undefined,
    });

    const response = await textractClient.send(command);
    return response.JobId || "";
  } catch (error) {
    console.error("Start document OCR error:", error);
    throw error;
  }
}

/**
 * Get OCR job status and results
 */
export async function getDocumentOCRResults(
  jobId: string
): Promise<TextractResult> {
  try {
    const command = new GetDocumentTextDetectionCommand({
      JobId: jobId,
    });

    const response = await textractClient.send(command);

    // Manually aggregate text from blocks
    const blocks = response.Blocks || [];
    const textBlocks = blocks.filter((b) => b.BlockType === "LINE");
    const aggregatedText = textBlocks
      .map((b) => b.Text)
      .filter(Boolean)
      .join("\n");

    return {
      jobId: jobId,
      status: response.JobStatus || "UNKNOWN",
      pages: [
        {
          pageNumber: 1,
          text: aggregatedText,
          width: 0,
          height: 0,
        },
      ],
    };
  } catch (error) {
    console.error("Get document OCR results error:", error);
    throw error;
  }
}

/**
 * Start document analysis (includes forms, tables)
 */
export async function startDocumentAnalysis(
  bucket: string,
  key: string,
  featureTypes: ("TABLES" | "FORMS")[] = ["TABLES", "FORMS"],
  outputBucket?: string
): Promise<string> {
  try {
    const command = new StartDocumentAnalysisCommand({
      DocumentLocation: {
        S3Object: {
          Bucket: bucket,
          Name: key,
        },
      },
      FeatureTypes: featureTypes,
      OutputConfig: outputBucket
        ? {
            S3Bucket: outputBucket,
          }
        : undefined,
    });

    const response = await textractClient.send(command);
    return response.JobId || "";
  } catch (error) {
    console.error("Start document analysis error:", error);
    throw error;
  }
}

/**
 * Get document analysis results
 */
export async function getDocumentAnalysisResults(
  jobId: string
): Promise<DocumentBlock[]> {
  try {
    const command = new GetDocumentAnalysisCommand({
      JobId: jobId,
    });

    const response = await textractClient.send(command);
    const blocks = response.Blocks || [];

    return blocks.map((block) => ({
      type: block.BlockType || "BLOCK",
      text: block.Text || "",
      confidence: block.Confidence || 0,
      geometry: block.Geometry
        ? {
            boundingBox: {
              width: block.Geometry.BoundingBox?.Width || 0,
              height: block.Geometry.BoundingBox?.Height || 0,
              left: block.Geometry.BoundingBox?.Left || 0,
              top: block.Geometry.BoundingBox?.Top || 0,
            },
          }
        : undefined,
    }));
  } catch (error) {
    console.error("Get document analysis results error:", error);
    throw error;
  }
}

/**
 * Wait for async job to complete
 */
export async function waitForDocumentJob(
  jobId: string,
  maxWaitMs: number = 600000,
  isAnalysis: boolean = false
): Promise<string> {
  const startTime = Date.now();
  const pollInterval = 2000;

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const command = isAnalysis
        ? new GetDocumentAnalysisCommand({ JobId: jobId })
        : new GetDocumentTextDetectionCommand({ JobId: jobId });

      const response = isAnalysis
        ? await textractClient.send(
            new GetDocumentAnalysisCommand({ JobId: jobId })
          )
        : await textractClient.send(
            new GetDocumentTextDetectionCommand({ JobId: jobId })
          );

      if (response.JobStatus === "SUCCEEDED") {
        return response.JobStatus;
      }

      if (response.JobStatus === "FAILED") {
        throw new Error(`Document job ${jobId} failed`);
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    } catch (error) {
      console.error("Wait for document job error:", error);
      throw error;
    }
  }

  throw new Error(`Document job ${jobId} timed out`);
}

export default textractClient;
