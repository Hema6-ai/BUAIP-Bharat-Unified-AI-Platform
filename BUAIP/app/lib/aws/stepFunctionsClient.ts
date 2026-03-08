/**
 * AWS Step Functions Client Wrapper
 * Workflow orchestration
 */

import {
  SFNClient,
  StartExecutionCommand,
  GetExecutionHistoryCommand,
  StopExecutionCommand,
  ListExecutionsCommand,
  DescribeExecutionCommand,
} from "@aws-sdk/client-sfn";
import { awsConfig } from "./config";

export const stepFunctionsClient = new SFNClient({
  region: awsConfig.region,
});

export interface ExecutionInput {
  [key: string]: any;
}

export interface WorkflowExecution {
  executionArn: string;
  stateMachineArn: string;
  status: "RUNNING" | "SUCCEEDED" | "FAILED" | "TIMED_OUT" | "ABORTED";
  startDate: Date;
  stopDate?: Date;
  output?: any;
  error?: string;
  cause?: string;
}

export interface ExecutionHistory {
  eventId: number;
  type: string;
  timestamp: Date;
  detail: any;
}

/**
 * Start execution of state machine
 */
export async function startExecution(
  stateMachineArn: string,
  input: ExecutionInput,
  executionName?: string
): Promise<string> {
  try {
    const command = new StartExecutionCommand({
      stateMachineArn,
      input: JSON.stringify(input),
      name: executionName,
    });

    const response = await stepFunctionsClient.send(command);
    return response.executionArn || "";
  } catch (error) {
    console.error("Start execution error:", error);
    throw error;
  }
}

/**
 * Get execution details
 */
export async function getExecution(
  executionArn: string
): Promise<WorkflowExecution> {
  try {
    const command = new DescribeExecutionCommand({
      executionArn,
    });

    const response = await stepFunctionsClient.send(command);

    let output;
    if (response.output) {
      try {
        output = JSON.parse(response.output);
      } catch {
        output = response.output;
      }
    }

    return {
      executionArn: response.executionArn || executionArn,
      stateMachineArn: response.stateMachineArn || "",
      status:
        (response.status as
          | "RUNNING"
          | "SUCCEEDED"
          | "FAILED"
          | "TIMED_OUT"
          | "ABORTED") || "RUNNING",
      startDate: response.startDate || new Date(),
      stopDate: response.stopDate,
      output,
      error: response.error,
      cause: response.cause,
    };
  } catch (error) {
    console.error("Get execution error:", error);
    throw error;
  }
}

/**
 * Get execution history
 */
export async function getExecutionHistory(
  executionArn: string,
  maxResults: number = 100
): Promise<ExecutionHistory[]> {
  try {
    const command = new GetExecutionHistoryCommand({
      executionArn,
      maxResults,
    });

    const response = await stepFunctionsClient.send(command);
    const events = response.events || [];

    return events.map((event) => ({
      eventId: event.id || 0,
      type: event.type || "UNKNOWN",
      timestamp: event.timestamp || new Date(),
      detail: parseEventDetail(event),
    }));
  } catch (error) {
    console.error("Get execution history error:", error);
    throw error;
  }
}

/**
 * Stop execution
 */
export async function stopExecution(executionArn: string): Promise<void> {
  try {
    const command = new StopExecutionCommand({
      executionArn,
    });

    await stepFunctionsClient.send(command);
  } catch (error) {
    console.error("Stop execution error:", error);
    throw error;
  }
}

/**
 * List executions for state machine
 */
export async function listExecutions(
  stateMachineArn: string,
  statusFilter?: string,
  maxResults: number = 100
): Promise<WorkflowExecution[]> {
  try {
    const command = new ListExecutionsCommand({
      stateMachineArn,
      statusFilter: statusFilter as any,
      maxResults,
    });

    const response = await stepFunctionsClient.send(command);
    const executions = response.executions || [];

    return executions.map((exe) => ({
      executionArn: exe.executionArn || "",
      stateMachineArn: exe.stateMachineArn || "",
      status: (exe.status as any) || "UNKNOWN",
      startDate: exe.startDate || new Date(),
      stopDate: exe.stopDate,
    }));
  } catch (error) {
    console.error("List executions error:", error);
    throw error;
  }
}

/**
 * Wait for execution completion
 */
export async function waitForExecution(
  executionArn: string,
  maxWaitMs: number = 600000
): Promise<WorkflowExecution> {
  const startTime = Date.now();
  const pollInterval = 2000;

  while (Date.now() - startTime < maxWaitMs) {
    const execution = await getExecution(executionArn);

    if (execution.status === "SUCCEEDED") {
      return execution;
    }

    if (
      execution.status === "FAILED" ||
      execution.status === "TIMED_OUT" ||
      execution.status === "ABORTED"
    ) {
      throw new Error(
        `Execution ${execution.executionArn} ${execution.status}: ${execution.cause}`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Execution ${executionArn} timed out after ${maxWaitMs}ms`);
}

/**
 * Execute workflow and wait for completion
 */
export async function executeWorkflow(
  stateMachineArn: string,
  input: ExecutionInput,
  executionName?: string,
  maxWaitMs?: number
): Promise<WorkflowExecution> {
  const executionArn = await startExecution(
    stateMachineArn,
    input,
    executionName
  );

  return waitForExecution(executionArn, maxWaitMs);
}

/**
 * Parallel workflow execution
 */
export async function executeParallelWorkflows(
  stateMachineArn: string,
  inputs: ExecutionInput[],
  namePrefix: string = "execution"
): Promise<WorkflowExecution[]> {
  try {
    const executionArns = await Promise.all(
      inputs.map((input, index) =>
        startExecution(
          stateMachineArn,
          input,
          `${namePrefix}-${index}-${Date.now()}`
        )
      )
    );

    return Promise.all(
      executionArns.map((arn) => waitForExecution(arn))
    ).catch((error) => {
      console.error("Parallel workflow execution error:", error);
      throw error;
    });
  } catch (error) {
    console.error("Execute parallel workflows error:", error);
    throw error;
  }
}

/**
 * Parse event details from Step Functions history
 */
function parseEventDetail(event: any): any {
  const details: { [key: string]: any } = {
    type: event.type,
  };

  // Extract specific details based on event type
  if (event.taskFailedEventDetails) {
    details.error = event.taskFailedEventDetails.error;
    details.cause = event.taskFailedEventDetails.cause;
  }

  if (event.taskSucceededEventDetails) {
    try {
      details.output = JSON.parse(event.taskSucceededEventDetails.output);
    } catch {
      details.output = event.taskSucceededEventDetails.output;
    }
  }

  if (event.executionFailedEventDetails) {
    details.error = event.executionFailedEventDetails.error;
    details.cause = event.executionFailedEventDetails.cause;
  }

  if (event.stateEnteredEventDetails) {
    details.state = event.stateEnteredEventDetails.name;
  }

  return details;
}

export default stepFunctionsClient;
