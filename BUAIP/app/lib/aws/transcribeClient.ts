/**
 * AWS Transcribe Client Wrapper
 * Speech-to-text transcription
 */

import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
} from "@aws-sdk/client-transcribe";
import { awsConfig } from "./config";

export const transcribeClient = new TranscribeClient({
  region: awsConfig.region,
});

export interface TranscribeOptions {
  languageCode?: string;
  outputBucketName?: string;
  jobName?: string;
}

export interface TransscriptionResult {
  jobName: string;
  status: string;
  transcript?: string;
}

/**
 * Start async transcription job for audio file in S3
 */
export async function startTranscriptionJob(
  s3Uri: string,
  options?: TranscribeOptions
): Promise<string> {
  try {
    const jobName =
      options?.jobName ||
      `transcription-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const command = new StartTranscriptionJobCommand({
      TranscriptionJobName: jobName,
      LanguageCode: (options?.languageCode || "en-IN") as any,
      MediaFormat: s3Uri.endsWith(".mp3") ? "mp3" : "wav",
      Media: {
        MediaFileUri: s3Uri,
      },
      OutputBucketName:
        options?.outputBucketName || process.env.AWS_S3_BUCKET_NAME,
    });

    const response = await transcribeClient.send(command);
    return jobName;
  } catch (error) {
    console.error("Start transcription error:", error);
    throw error;
  }
}

/**
 * Get transcription job status and results
 */
export async function getTranscriptionJob(
  jobName: string
): Promise<TransscriptionResult> {
  try {
    const command = new GetTranscriptionJobCommand({
      TranscriptionJobName: jobName,
    });

    const response = await transcribeClient.send(command);
    const job = response.TranscriptionJob;

    if (!job) {
      throw new Error(`Job ${jobName} not found`);
    }

    return {
      jobName: job.TranscriptionJobName || jobName,
      status: job.TranscriptionJobStatus || "UNKNOWN",
      transcript: job.Transcript?.TranscriptFileUri,
    };
  } catch (error) {
    console.error("Get transcription error:", error);
    throw error;
  }
}

/**
 * Poll for transcription completion (waits up to 5 minutes)
 */
export async function waitForTranscription(
  jobName: string,
  maxWaitMs: number = 300000
): Promise<string> {
  const startTime = Date.now();
  const pollInterval = 2000; // 2 seconds

  while (Date.now() - startTime < maxWaitMs) {
    const result = await getTranscriptionJob(jobName);

    if (result.status === "COMPLETED") {
      return result.transcript || "";
    }

    if (result.status === "FAILED") {
      throw new Error(`Transcription job ${jobName} failed`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Transcription job ${jobName} timed out`);
}

/**
 * Transcribe audio buffer directly (converts to S3 first)
 */
export async function transcribeAudioBuffer(
  audioBuffer: Buffer,
  options?: TranscribeOptions
): Promise<string> {
  try {
    // Note: This would require S3 integration to upload buffer first
    // For now, this is a placeholder that documents the pattern
    const s3Key = `transcribe/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.mp3`;

    // Upload to S3 (requires S3Client integration)
    // const s3Uri = await uploadToS3(audioBuffer, s3Key);

    // Start transcription
    // const jobName = await startTranscriptionJob(s3Uri, options);

    // Returns job name for polling
    throw new Error("Audio buffer transcription requires S3 integration");
  } catch (error) {
    console.error("Transcribe audio buffer error:", error);
    throw error;
  }
}

export default transcribeClient;
