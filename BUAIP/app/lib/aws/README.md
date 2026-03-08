# AWS Infrastructure Layer - BU-AIP Platform

Complete AWS service integration for the BU-AIP (Bharat Unified AI Platform) with 18 AWS services.

## Overview

The AWS infrastructure layer provides a modular, type-safe interface to 18 AWS services, enabling:

- **AI/ML Processing**: Bedrock, Polly, Translate, Transcribe, Comprehend, Rekognition, Textract
- **Data Management**: DynamoDB, S3, Kendra, Personalize
- **Communication**: SNS, SES
- **Location**: Location Service
- **Orchestration**: EventBridge, Lambda, Step Functions, CloudWatch

## Architecture

```
Next.js API Routes
    ↓
AI Orchestrator (aiOrchestrator.ts)
    ├── Preprocessing (Detect language, sentiment, entities)
    ├── AI Inference (Bedrock with engine context)
    └── Postprocessing (Translate, synthesize voice)
    ↓
AWS Service Layer (/app/lib/aws/)
    ├── bedrockClient.ts (LLM inference)
    ├── pollyClient.ts (Text-to-speech)
    ├── translateClient.ts (Multilingual translation)
    ├── transcribeClient.ts (Speech-to-text)
    ├── comprehendClient.ts (NLP analysis)
    ├── rekognitionClient.ts (Image analysis)
    ├── textractClient.ts (Document OCR)
    ├── dynamoClient.ts (NoSQL persistence)
    ├── s3Client.ts (Object storage)
    ├── snsClient.ts (Event notifications)
    ├── sesClient.ts (Email delivery)
    ├── kendraClient.ts (Knowledge search)
    ├── personalizeClient.ts (Recommendations)
    ├── locationClient.ts (Geolocation)
    ├── eventbridgeClient.ts (Event bus)
    ├── lambdaClient.ts (Serverless compute)
    ├── cloudwatchClient.ts (Monitoring/logging)
    └── stepFunctionsClient.ts (Workflow orchestration)
    ↓
AWS API Endpoints (Real AWS credentials required)
```

## Quick Setup

### 1. Install Dependencies

```bash
npm install @aws-sdk/client-bedrock-runtime @aws-sdk/client-polly \
  @aws-sdk/client-translate @aws-sdk/client-transcribe \
  @aws-sdk/client-comprehend @aws-sdk/client-rekognition \
  @aws-sdk/client-textract @aws-sdk/client-location \
  @aws-sdk/client-dynamodb @aws-sdk/client-s3 \
  @aws-sdk/client-sns @aws-sdk/client-ses @aws-sdk/client-kendra \
  @aws-sdk/client-personalize-runtime @aws-sdk/client-eventbridge \
  @aws-sdk/client-lambda @aws-sdk/client-cloudwatch @aws-sdk/client-logs \
  @aws-sdk/client-sfn @aws-sdk/util-dynamodb @aws-sdk/s3-request-presigner
```

### 2. Configure Environment Variables

Create `.env.local`:

```bash
# AWS Core (Required)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# AI Services
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
POLLY_DEFAULT_VOICE=Aditi
TRANSCRIBE_LANGUAGE=en-IN
KENDRA_INDEX_ID=your_kendra_index_id

# Data Services
AWS_S3_BUCKET_NAME=bu-aip-data
DYNAMODB_USERS_TABLE=bu-aip-users
DYNAMODB_SESSIONS_TABLE=bu-aip-sessions
DYNAMODB_INTERACTIONS_TABLE=bu-aip-interactions

# Communication
SES_FROM_EMAIL=noreply@bu-aip.dev
SNS_NOTIFICATIONS_TOPIC=arn:aws:sns:us-east-1:ACCOUNT:bu-aip-notifications

# Location Services
AWS_LOCATION_INDEX_NAME=place-index

# Monitoring
CLOUDWATCH_NAMESPACE=BU-AIP/Platform
CLOUDWATCH_LOG_GROUP=/aws/bu-aip
```

### 3. Validate Configuration

```typescript
import { validateConfiguration, getConfigSummary } from '@/app/lib/aws/config';

const { valid, errors } = validateConfiguration();
if (!valid) {
  console.error('Configuration errors:', errors);
}

const summary = getConfigSummary();
console.log('AWS Configuration:', summary);
```

## Usage Examples

### AI Orchestration

```typescript
import { orchestrateRequest } from '@/app/lib/aws/aiOrchestrator';

const response = await orchestrateRequest({
  userId: 'user123',
  engine: 'annadata', // farmer advisory
  userInput: 'मेरी पणत में कीटनाशक समस्या है',
  sourceLanguage: 'hi', // Hindi
  targetLanguage: 'en', // English
  includeVoice: true,
});

console.log(response.result); // AI response
console.log(response.voiceUrl); // MP3 audio
```

### Direct Service Usage

#### Bedrock (LLM Inference)

```typescript
import {
  invokeBedrockModel,
  invokeBedrockWithSystem,
  invokeBedrockBatch,
} from '@/app/lib/aws/bedrockClient';

// Single prompt
const response = await invokeBedrockModel(
  'What are the benefits of crop rotation?'
);

// With system context
const advice = await invokeBedrockWithSystem(
  'You are a farmer advisor',
  'How to improve soil fertility?'
);

// Batch processing
const responses = await invokeBedrockBatch([
  'Question 1?',
  'Question 2?',
  'Question 3?',
]);
```

#### Polly (Text-to-Speech)

```typescript
import {
  synthesizeToBase64,
  synthesizeToMp3,
  getAvailableVoices,
} from '@/app/lib/aws/pollyClient';

// Get available voices for Hindi
const voices = await getAvailableVoices('hi');

// Synthesize as Base64 (for embedding)
const base64Audio = await synthesizeToBase64(
  'नमस्कार किसान भाइयों',
  { language: 'hi' }
);

// Save to file
const buffer = await synthesizeToMp3(
  'Good morning farmers',
  { language: 'en' }
);
```

#### DynamoDB (Persistence)

```typescript
import {
  putItem,
  getItem,
  queryItems,
  updateItem,
} from '@/app/lib/aws/dynamoClient';

// Save user session
await putItem('bu-aip-sessions', {
  userId: 'user123',
  engineUsed: 'annadata',
  query: 'crop disease query',
  response: 'AI response',
  timestamp: new Date().toISOString(),
});

// Retrieve user interactions
const interactions = await queryItems('bu-aip-interactions', {
  keyConditionExpression: 'userId = :userId',
  expressionAttributeValues: {
    ':userId': 'user123',
  },
});
```

#### S3 (File Storage)

```typescript
import {
  uploadBuffer,
  downloadBuffer,
  listObjects,
  generatePresignedUrl,
} from '@/app/lib/aws/s3Client';

// Upload image for analysis
const imageBuffer = fs.readFileSync('crop.jpg');
const s3Path = await uploadBuffer(
  'bu-aip-data',
  'images/crop-analysis-001.jpg',
  imageBuffer,
  'image/jpeg'
);

// Download
const imgBuffer = await downloadBuffer('bu-aip-data', 'images/crop.jpg');

// Generate public URL (1 hour expiry)
const url = await generatePresignedUrl('bu-aip-data', 'images/crop.jpg', 3600);
```

#### Translate (Multilingual)

```typescript
import {
  translateText,
  translateBatch,
  translateToEnglish,
  translateFromEnglish,
} from '@/app/lib/aws/translateClient';

// Translate Hindi to English
const en = await translateText(
  'यह बहुत अच्छा है',
  'hi',
  'en'
);

// Batch translate
const translations = await translateBatch(
  ['Hello', 'Good morning', 'Thank you'],
  'en',
  'hi'
);

// Shorthand
const english = await translateToEnglish('Namaste', 'hi');
const hindi = await translateFromEnglish('Thank you', 'hi');
```

#### Comprehend (NLP Analysis)

```typescript
import {
  detectLanguage,
  analyzeSentiment,
  extractKeyPhrases,
  extractEntities,
  analyzeText,
} from '@/app/lib/aws/comprehendClient';

// Full analysis
const analysis = await analyzeText(
  'The farmer reported excellent crop yield this season'
);

console.log(analysis.sentiment.sentiment); // POSITIVE
console.log(analysis.keyPhrases); // ['crop yield', 'season']
console.log(analysis.entities); // extracted named entities
```

#### Rekognition (Image Analysis)

```typescript
import {
  detectLabels,
  detectText,
  detectModerationLabels,
} from '@/app/lib/aws/rekognitionClient';

const imageBuffer = fs.readFileSync('field.jpg');

// Detect objects/scenes
const labels = await detectLabels(imageBuffer, 10);
// [{ name: 'crops', confidence: 0.95 }, ...]

// Extract text from image
const text = await detectText(imageBuffer);

// Content moderation
const moderation = await detectModerationLabels(imageBuffer);
```

#### Textract (Document OCR)

```typescript
import {
  startDocumentOCR,
  getDocumentOCRResults,
  waitForDocumentJob,
} from '@/app/lib/aws/textractClient';

// Long-running OCR job
const jobId = await startDocumentOCR('bu-aip-data', 'forms/application.pdf');

// Wait for completion
await waitForDocumentJob(jobId);

// Get results
const result = await getDocumentOCRResults(jobId);
```

#### Location (Geolocation)

```typescript
import {
  forwardGeocode,
  reverseGeocode,
  searchNearbyPlaces,
} from '@/app/lib/aws/locationClient';

// Convert address to coordinates
const places = await forwardGeocode('Delhi Agricultural Market');

// Convert coordinates to address
const address = await reverseGeocode({
  latitude: 28.5355,
  longitude: 77.3910,
});

// Find nearby services
const nearbyServices = await searchNearbyPlaces(
  { latitude: 28.5355, longitude: 77.3910 },
  'agricultural extension center'
);
```

#### SNS (Notifications)

```typescript
import {
  publishMessage,
  publishJSON,
  subscribeEmail,
} from '@/app/lib/aws/snsClient';

// Send notification
await publishMessage(
  'arn:aws:sns:us-east-1:ACCOUNT:bu-aip-notifications',
  'Crop disease alert for your field'
);

// Send structured notification
await publishJSON(
  'arn:aws:sns:us-east-1:ACCOUNT:bu-aip-analytics',
  { event: 'crop_selection', crop: 'wheat', region: 'Punjab' }
);

// Subscribe farmer's email
await subscribeEmail(
  'arn:aws:sns:us-east-1:ACCOUNT:bu-aip-notifications',
  'farmer@example.com'
);
```

#### SES (Email)

```typescript
import { sendSimpleEmail, sendBulkEmail } from '@/app/lib/aws/sesClient';

// Send email
await sendSimpleEmail(
  'noreply@bu-aip.dev',
  ['farmer@example.com'],
  'Crop Advisory',
  '<h1>Wheat planting guide</h1><p>Best time to plant...</p>'
);

// Bulk email
await sendBulkEmail(
  'noreply@bu-aip.dev',
  [
    { email: 'farmer1@example.com', htmlBody: '<p>Your custom message</p>' },
    { email: 'farmer2@example.com', htmlBody: '<p>Your custom message</p>' },
  ]
);
```

#### Lambda (Serverless Compute)

```typescript
import { invokeLambdaSync, invokeLambdaAsync } from '@/app/lib/aws/lambdaClient';

// Synchronous invocation
const response = await invokeLambdaSync('my-preprocessing-function', {
  text: 'Some input data',
});

// Asynchronous (fire-and-forget)
await invokeLambdaAsync('my-background-job', {
  userId: 'user123',
  action: 'send-report',
});
```

#### CloudWatch (Monitoring)

```typescript
import {
  putMetric,
  getMetricStats,
  createAlarm,
  putLogEvents,
} from '@/app/lib/aws/cloudwatchClient';

// Track custom metric
await putMetric('BU-AIP/Platform', 'AnnadataQueries', 1, 'Count', {
  Region: 'Maharashtra',
  CropType: 'wheat',
});

// Get metrics
const stats = await getMetricStats(
  'BU-AIP/Platform',
  'AnnadataQueries',
  'Sum',
  new Date(Date.now() - 3600000),
  new Date()
);

// Create alarm
await createAlarm({
  alarmName: 'high-error-rate',
  metricName: 'Errors',
  namespace: 'BU-AIP/Platform',
  statistic: 'Sum',
  period: 300,
  evaluationPeriods: 2,
  threshold: 100,
  comparisonOperator: 'GreaterThanThreshold',
});

// Log events
await putLogEvents('/aws/bu-aip', 'query-logs', [
  'Query: farm health',
  'Response: Generated advisory',
]);
```

#### Step Functions (Workflows)

```typescript
import {
  startExecution,
  waitForExecution,
  getExecutionHistory,
} from '@/app/lib/aws/stepFunctionsClient';

// Start workflow
const executionArn = await startExecution(
  'arn:aws:states:us-east-1:ACCOUNT:stateMachine:nlp-pipeline',
  { text: 'crop disease query' }
);

// Wait for completion
const result = await waitForExecution(executionArn);

// Get execution details
const history = await getExecutionHistory(executionArn);
```

## Engine-Specific Integration

### ANNADATA (Farmer Advisory)

```typescript
import { orchestrateRequest } from '@/app/lib/aws/aiOrchestrator';

const farmResponse = await orchestrateRequest({
  userId: 'farmer123',
  engine: 'annadata',
  userInput: 'गेहूं की फसल में कीटनाशक कैसे लगाएं?',
  sourceLanguage: 'hi',
  targetLanguage: 'hi',
  includeVoice: true, // Gujarati audio response
});
// Includes: AI advisory + voice
```

### UDYOG (Entrepreneurship Guidance)

```typescript
const entrepreneurResponse = await orchestrateRequest({
  userId: 'entrepreneur123',
  engine: 'udyog',
  userInput: 'I want to start a small business. What are the steps?',
  sourceLanguage: 'en',
  targetLanguage: 'en',
  metadata: { businessType: 'services', region: 'Mumbai' },
});
// Includes: Business registration + funding opportunities
```

### NYAYA (Legal Advisory)

```typescript
const legalResponse = await orchestrateRequest({
  userId: 'citizen123',
  engine: 'nyaya',
  userInput: 'मुझे अपने अधिकारों के बारे में जानना है',
  sourceLanguage: 'hi',
  targetLanguage: 'hi',
  metadata: { issueType: 'tenant-rights' },
});
// Includes: Legal information + resource links
```

## Performance Optimization

### Caching

```typescript
import { putItem, getItem } from '@/app/lib/aws/dynamoClient';

// Cache frequent queries
const cacheKey = `query_${md5(userInput)}`;
let result = await getItem('cache-table', { id: cacheKey });

if (!result) {
  result = await orchestrateRequest(request);
  await putItem('cache-table', { id: cacheKey, data: result, ttl: 3600 });
}
```

### Batch Processing

```typescript
import { invokeBedrockBatch } from '@/app/lib/aws/bedrockClient';

// Process multiple queries efficiently
const results = await invokeBedrockBatch([
  'Query 1?',
  'Query 2?',
  'Query 3?',
]);
```

### Async Workflows

```typescript
import { publishMessage } from '@/app/lib/aws/snsClient';

// Fire-and-forget for non-critical operations
await publishMessage(topic, JSON.stringify(event));
// Don't wait for result
```

## Monitoring & Debugging

### Cloudwatch Logs

```typescript
import { getLogEvents } from '@/app/lib/aws/cloudwatchClient';

// View system logs
const logs = await getLogEvents('/aws/bu-aip', 'query-logs', 100);
logs.forEach((log) => console.log(log));
```

### Metrics Dashboard

Create CloudWatch dashboard to monitor:

- Query volume (requests/minute)
- Response time (average, p99)
- Error rate (%)
- Cost tracking

### Development/Testing

```bash
# Test individual service
npm test -- bedrockClient.test.ts

# Test orchestrator
npm test -- aiOrchestrator.test.ts

# Full integration test
npm run test:integration
```

## Cost Optimization

1. **Use DynamoDB on-demand** for variable workloads
2. **Enable S3 Intelligent-Tiering** for automatic cost optimization
3. **Set CloudWatch log retention** (30 days recommended)
4. **Use Lambda reserved concurrency** for predictable workloads
5. **Batch Bedrock requests** when possible
6. **Cache Translate results** for common phrases

---

**Documentation Version**: 1.0  
**Last Updated**: 2024
