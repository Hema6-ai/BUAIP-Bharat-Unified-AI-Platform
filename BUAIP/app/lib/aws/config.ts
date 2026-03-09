/**
 * AWS Services Configuration
 * All environment variables needed for the AWS integration
 */

// Simplified AWS config for client initialization
export const awsConfig = {
  region: process.env.AWS_REGION || 'ap-south-1',
};

// AWS Core Credentials (Required for all services)
export const AWS_CONFIG = {
  // Required - Support both AWS_ prefix and non-prefix names for Amplify compatibility
  AWS_REGION: process.env.BEDROCK_REGION || process.env.AWS_REGION || 'ap-south-1',
  AWS_ACCESS_KEY_ID: process.env.BEDROCK_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.BEDROCK_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY,

  // Optional: Use STS temporary credentials
  AWS_SESSION_TOKEN: process.env.AWS_SESSION_TOKEN,
};

// AI/ML Services Configuration
export const AI_SERVICES_CONFIG = {
  // Bedrock
  BEDROCK_MODEL_ID:
    process.env.BEDROCK_MODEL_ID ||
    'anthropic.claude-3-sonnet-20240229-v1:0',

  // Polly
  POLLY_DEFAULT_VOICE: process.env.POLLY_DEFAULT_VOICE || 'Aditi', // India English
  POLLY_ENGINE: process.env.POLLY_ENGINE || 'neural',

  // Transcribe
  TRANSCRIBE_OUTPUT_BUCKET: process.env.TRANSCRIBE_OUTPUT_BUCKET,
  TRANSCRIBE_LANGUAGE: process.env.TRANSCRIBE_LANGUAGE || 'en-IN',

  // Kendra
  KENDRA_INDEX_ID: process.env.KENDRA_INDEX_ID,
};

// Data Services Configuration
export const DATA_SERVICES_CONFIG = {
  // S3
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
  AWS_S3_DATA_PREFIX: process.env.AWS_S3_DATA_PREFIX || 'data/',
  AWS_S3_UPLOADS_PREFIX: process.env.AWS_S3_UPLOADS_PREFIX || 'uploads/',

  // DynamoDB
  DYNAMODB_TABLES: {
    users: process.env.DYNAMODB_USERS_TABLE || 'bu-aip-users',
    sessions: process.env.DYNAMODB_SESSIONS_TABLE || 'bu-aip-sessions',
    interactions:
      process.env.DYNAMODB_INTERACTIONS_TABLE || 'bu-aip-interactions',
    analytics:
      process.env.DYNAMODB_ANALYTICS_TABLE || 'bu-aip-analytics',
  },

  // Elasticsearch (if used instead of Kendra)
  ELASTICSEARCH_DOMAIN: process.env.ELASTICSEARCH_DOMAIN,
  ELASTICSEARCH_INDEX: process.env.ELASTICSEARCH_INDEX || 'schemes',
};

// Location Services Configuration
export const LOCATION_SERVICES_CONFIG = {
  AWS_LOCATION_INDEX_NAME:
    process.env.AWS_LOCATION_INDEX_NAME || 'place-index',
  AWS_LOCATION_MAP_NAME: process.env.AWS_LOCATION_MAP_NAME || 'map',
};

// Personalization Configuration
export const PERSONALIZATION_CONFIG = {
  PERSONALIZE_CAMPAIGN_ARN: process.env.PERSONALIZE_CAMPAIGN_ARN,
  PERSONALIZE_DATASET_GROUP_ARN:
    process.env.PERSONALIZE_DATASET_GROUP_ARN,
};

// Communication Services Configuration
export const COMMUNICATION_CONFIG = {
  // SNS Topics
  SNS_TOPICS: {
    notifications:
      process.env.SNS_NOTIFICATIONS_TOPIC ||
      'arn:aws:sns:us-east-1:ACCOUNT:bu-aip-notifications',
    alerts:
      process.env.SNS_ALERTS_TOPIC ||
      'arn:aws:sns:us-east-1:ACCOUNT:bu-aip-alerts',
    analytics:
      process.env.SNS_ANALYTICS_TOPIC ||
      'arn:aws:sns:us-east-1:ACCOUNT:bu-aip-analytics',
  },

  // SES
  SES_FROM_EMAIL: process.env.SES_FROM_EMAIL || 'noreply@bu-aip.dev',
  SES_FROM_NAME: process.env.SES_FROM_NAME || 'BU-AIP Platform',
};

// Workflow Services Configuration
export const WORKFLOW_CONFIG = {
  // Step Functions
  STEP_FUNCTION_ARNS: {
    nlpPipeline:
      process.env.STEP_FUNCTION_NLP_PIPELINE ||
      'arn:aws:states:us-east-1:ACCOUNT:stateMachine:nlp-pipeline',
    dataProcessing:
      process.env.STEP_FUNCTION_DATA_PROCESSING ||
      'arn:aws:states:us-east-1:ACCOUNT:stateMachine:data-processing',
  },

  // Lambda Functions
  LAMBDA_FUNCTIONS: {
    preprocessing: process.env.LAMBDA_PREPROCESSING_FUNCTION,
    postprocessing: process.env.LAMBDA_POSTPROCESSING_FUNCTION,
    nlpAnalysis: process.env.LAMBDA_NLP_ANALYSIS_FUNCTION,
  },

  // EventBridge
  EVENT_BUS_NAME: process.env.EVENT_BUS_NAME || 'default',
};

// Monitoring Configuration
export const MONITORING_CONFIG = {
  // CloudWatch
  CLOUDWATCH_NAMESPACE:
    process.env.CLOUDWATCH_NAMESPACE || 'BU-AIP/Platform',
  CLOUDWATCH_LOG_GROUP: process.env.CLOUDWATCH_LOG_GROUP || '/aws/bu-aip',

  // Enable detailed metrics
  ENABLE_DETAILED_METRICS:
    process.env.ENABLE_DETAILED_METRICS === 'true',

  // Alert thresholds
  ERROR_RATE_THRESHOLD: parseFloat(
    process.env.ERROR_RATE_THRESHOLD || '0.05'
  ),
  RESPONSE_TIME_THRESHOLD: parseInt(
    process.env.RESPONSE_TIME_THRESHOLD || '5000'
  ),
};

// Feature Flags
export const FEATURE_FLAGS = {
  // Enable/disable specific services
  ENABLE_BEDROCK:
    process.env.ENABLE_BEDROCK !== 'false',
  ENABLE_POLLY:
    process.env.ENABLE_POLLY !== 'false',
  ENABLE_TRANSLATE:
    process.env.ENABLE_TRANSLATE !== 'false',
  ENABLE_TRANSCRIBE:
    process.env.ENABLE_TRANSCRIBE !== 'false',
  ENABLE_COMPREHEND:
    process.env.ENABLE_COMPREHEND !== 'false',
  ENABLE_REKOGNITION:
    process.env.ENABLE_REKOGNITION !== 'false',
  ENABLE_TEXTRACT:
    process.env.ENABLE_TEXTRACT !== 'false',
  ENABLE_LOCATION:
    process.env.ENABLE_LOCATION !== 'false',
  ENABLE_DYNAMODB:
    process.env.ENABLE_DYNAMODB !== 'false',
  ENABLE_S3:
    process.env.ENABLE_S3 !== 'false',
  ENABLE_SNS:
    process.env.ENABLE_SNS !== 'false',
  ENABLE_SES:
    process.env.ENABLE_SES !== 'false',
  ENABLE_KENDRA:
    process.env.ENABLE_KENDRA !== 'false',
  ENABLE_PERSONALIZE:
    process.env.ENABLE_PERSONALIZE !== 'false',
  ENABLE_EVENTBRIDGE:
    process.env.ENABLE_EVENTBRIDGE !== 'false',
  ENABLE_LAMBDA:
    process.env.ENABLE_LAMBDA !== 'false',
  ENABLE_STEP_FUNCTIONS:
    process.env.ENABLE_STEP_FUNCTIONS !== 'false',
  ENABLE_CLOUDWATCH:
    process.env.ENABLE_CLOUDWATCH !== 'false',
};

// Validate required configuration
export function validateConfiguration(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check AWS credentials
  if (!AWS_CONFIG.AWS_ACCESS_KEY_ID) {
    errors.push('AWS_ACCESS_KEY_ID is required');
  }

  if (!AWS_CONFIG.AWS_SECRET_ACCESS_KEY) {
    errors.push('AWS_SECRET_ACCESS_KEY is required');
  }

  // Check service-specific requirements
  if (FEATURE_FLAGS.ENABLE_S3 && !DATA_SERVICES_CONFIG.AWS_S3_BUCKET_NAME) {
    errors.push(
      'AWS_S3_BUCKET_NAME is required when S3 is enabled'
    );
  }

  if (FEATURE_FLAGS.ENABLE_KENDRA && !AI_SERVICES_CONFIG.KENDRA_INDEX_ID) {
    errors.push(
      'KENDRA_INDEX_ID is required when Kendra is enabled'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Get configuration summary (for logging)
export function getConfigSummary(): Record<string, any> {
  return {
    region: AWS_CONFIG.AWS_REGION,
    hasCredentials: !!(
      AWS_CONFIG.AWS_ACCESS_KEY_ID &&
      AWS_CONFIG.AWS_SECRET_ACCESS_KEY
    ),
    s3Bucket: DATA_SERVICES_CONFIG.AWS_S3_BUCKET_NAME,
    dynamodbTables: DATA_SERVICES_CONFIG.DYNAMODB_TABLES,
    enabledServices: Object.entries(FEATURE_FLAGS)
      .filter(([_key, value]) => value === true)
      .map(([key, _value]) => key.replace('ENABLE_', '').toLowerCase()),
    monitoring: {
      logGroup: MONITORING_CONFIG.CLOUDWATCH_LOG_GROUP,
      namespace: MONITORING_CONFIG.CLOUDWATCH_NAMESPACE,
      detailedMetrics: MONITORING_CONFIG.ENABLE_DETAILED_METRICS,
    },
  };
}

export default {
  AWS_CONFIG,
  AI_SERVICES_CONFIG,
  DATA_SERVICES_CONFIG,
  LOCATION_SERVICES_CONFIG,
  PERSONALIZATION_CONFIG,
  COMMUNICATION_CONFIG,
  WORKFLOW_CONFIG,
  MONITORING_CONFIG,
  FEATURE_FLAGS,
  validateConfiguration,
  getConfigSummary,
};
