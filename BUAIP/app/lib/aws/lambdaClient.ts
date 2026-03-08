/**
 * AWS Lambda Client Wrapper
 * Serverless function invocation
 */

import {
  LambdaClient,
  InvokeCommand,
  GetFunctionCommand,
  UpdateFunctionCodeCommand,
  CreateFunctionCommand,
  DeleteFunctionCommand,
  ListFunctionsCommand,
} from "@aws-sdk/client-lambda";
import { awsConfig } from "./config";

export const lambdaClient = new LambdaClient({
  region: awsConfig.region,
});

export interface LambdaInvokeOptions {
  invocationType?: "Event" | "RequestResponse" | "DryRun";
  logType?: "None" | "Tail";
}

export interface LambdaResponse {
  statusCode: number;
  body?: any;
  logs?: string;
}

export interface LambdaFunctionInfo {
  name: string;
  arn: string;
  runtime: string;
  handler: string;
  timeout: number;
  memorySize: number;
}

/**
 * Invoke Lambda function synchronously
 */
export async function invokeLambdaSync(
  functionName: string,
  payload: any
): Promise<LambdaResponse> {
  try {
    const command = new InvokeCommand({
      FunctionName: functionName,
      InvocationType: "RequestResponse",
      Payload: JSON.stringify(payload),
      LogType: "Tail",
    });

    const response = await lambdaClient.send(command);

    let body: any;
    if (response.Payload) {
      const payloadStr = new TextDecoder().decode(response.Payload);
      try {
        body = JSON.parse(payloadStr);
      } catch {
        body = payloadStr;
      }
    }

    return {
      statusCode: response.StatusCode || 200,
      body,
      logs: response.LogResult,
    };
  } catch (error) {
    console.error("Invoke Lambda sync error:", error);
    throw error;
  }
}

/**
 * Invoke Lambda function asynchronously (fire and forget)
 */
export async function invokeLambdaAsync(
  functionName: string,
  payload: any
): Promise<string> {
  try {
    const command = new InvokeCommand({
      FunctionName: functionName,
      InvocationType: "Event",
      Payload: JSON.stringify(payload),
    });

    const response = await lambdaClient.send(command);
    return functionName; // Return function name since FunctionArn not in response
  } catch (error) {
    console.error("Invoke Lambda async error:", error);
    throw error;
  }
}

/**
 * Invoke Lambda with dry run
 */
export async function testLambdaInvoke(
  functionName: string,
  payload: any
): Promise<boolean> {
  try {
    const command = new InvokeCommand({
      FunctionName: functionName,
      InvocationType: "DryRun",
      Payload: JSON.stringify(payload),
    });

    await lambdaClient.send(command);
    return true;
  } catch (error) {
    console.error("Test Lambda invoke error:", error);
    return false;
  }
}

/**
 * Get Lambda function information
 */
export async function getLambdaFunction(
  functionName: string
): Promise<LambdaFunctionInfo> {
  try {
    const command = new GetFunctionCommand({
      FunctionName: functionName,
    });

    const response = await lambdaClient.send(command);
    const config = response.Configuration;

    return {
      name: config?.FunctionName || "",
      arn: config?.FunctionArn || "",
      runtime: config?.Runtime || "",
      handler: config?.Handler || "",
      timeout: config?.Timeout || 0,
      memorySize: config?.MemorySize || 0,
    };
  } catch (error) {
    console.error("Get Lambda function error:", error);
    throw error;
  }
}

/**
 * List Lambda functions
 */
export async function listLambdaFunctions(): Promise<LambdaFunctionInfo[]> {
  try {
    const command = new ListFunctionsCommand({});
    const response = await lambdaClient.send(command);

    return (response.Functions || []).map((func) => ({
      name: func.FunctionName || "",
      arn: func.FunctionArn || "",
      runtime: func.Runtime || "",
      handler: func.Handler || "",
      timeout: func.Timeout || 0,
      memorySize: func.MemorySize || 0,
    }));
  } catch (error) {
    console.error("List Lambda functions error:", error);
    throw error;
  }
}

/**
 * Update Lambda function code
 */
export async function updateLambdaCode(
  functionName: string,
  zipFileBuffer: Buffer
): Promise<string> {
  try {
    const command = new UpdateFunctionCodeCommand({
      FunctionName: functionName,
      ZipFile: zipFileBuffer,
    });

    const response = await lambdaClient.send(command);
    return response.CodeSha256 || "";
  } catch (error) {
    console.error("Update Lambda code error:", error);
    throw error;
  }
}

/**
 * Invoke multiple Lambda functions in parallel
 */
export async function invokeLambdasParallel(
  functionNames: string[],
  payload: any
): Promise<{ [functionName: string]: LambdaResponse }> {
  try {
    const results: { [functionName: string]: LambdaResponse } = {};

    const promises = functionNames.map((name) =>
      invokeLambdaSync(name, payload)
        .then((response) => {
          results[name] = response;
        })
        .catch((error) => {
          console.error(`Error invoking ${name}:`, error);
          results[name] = {
            statusCode: 500,
            body: { error: error.message },
          };
        })
    );

    await Promise.all(promises);

    return results;
  } catch (error) {
    console.error("Invoke Lambdas parallel error:", error);
    throw error;
  }
}

/**
 * Invoke Lambda with retry logic
 */
export async function invokeLambdaWithRetry(
  functionName: string,
  payload: any,
  maxRetries: number = 3
): Promise<LambdaResponse> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await invokeLambdaSync(functionName, payload);
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        // Exponential backoff
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

/**
 * Chain Lambda invocations
 */
export async function chainLambdaInvocations(
  functionNames: string[],
  initialPayload: any
): Promise<any> {
  try {
    let result = initialPayload;

    for (const functionName of functionNames) {
      const response = await invokeLambdaSync(functionName, result);

      if (response.statusCode === 200 && response.body) {
        result = response.body;
      } else {
        throw new Error(
          `Lambda ${functionName} failed with status ${response.statusCode}`
        );
      }
    }

    return result;
  } catch (error) {
    console.error("Chain Lambda invocations error:", error);
    throw error;
  }
}

export default lambdaClient;
