/**
 * AWS Services Index
 * Centralized exports for all AWS service wrappers
 */

// AI Services
export * from './bedrockClient';
export * from './pollyClient';
export * from './translateClient';
export * from './transcribeClient';
export * from './comprehendClient';
export * from './rekognitionClient';
export * from './textractClient';

// Data Services
export * from './dynamoClient';
export * from './s3Client';
export * from './kendraClient';
export * from './personalizeClient';

// Communication Services
export * from './snsClient';
export * from './sesClient';

// Location & DevOps
export * from './locationClient';
export * from './eventbridgeClient';
export * from './lambdaClient';
export * from './cloudwatchClient';
export * from './stepFunctionsClient';

// Orchestrator
export * from './aiOrchestrator';

// Default exports for convenience
import * as bedrockClient from './bedrockClient';
import * as pollyClient from './pollyClient';
import * as translateClient from './translateClient';
import * as transcribeClient from './transcribeClient';
import * as comprehendClient from './comprehendClient';
import * as rekognitionClient from './rekognitionClient';
import * as textractClient from './textractClient';
import * as dynamoClient from './dynamoClient';
import * as s3Client from './s3Client';
import * as snsClient from './snsClient';
import * as sesClient from './sesClient';
import * as kendraClient from './kendraClient';
import * as personalizeClient from './personalizeClient';
import * as locationClient from './locationClient';
import * as eventbridgeClient from './eventbridgeClient';
import * as lambdaClient from './lambdaClient';
import * as cloudwatchClient from './cloudwatchClient';
import * as stepFunctionsClient from './stepFunctionsClient';
import * as aiOrchestrator from './aiOrchestrator';

export default {
  bedrock: bedrockClient,
  polly: pollyClient,
  translate: translateClient,
  transcribe: transcribeClient,
  comprehend: comprehendClient,
  rekognition: rekognitionClient,
  textract: textractClient,
  dynamodb: dynamoClient,
  s3: s3Client,
  sns: snsClient,
  ses: sesClient,
  kendra: kendraClient,
  personalize: personalizeClient,
  location: locationClient,
  eventbridge: eventbridgeClient,
  lambda: lambdaClient,
  cloudwatch: cloudwatchClient,
  stepFunctions: stepFunctionsClient,
  orchestrator: aiOrchestrator,
};
