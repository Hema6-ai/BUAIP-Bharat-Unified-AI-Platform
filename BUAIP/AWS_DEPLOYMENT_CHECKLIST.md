## 🚀 AWS Bedrock + Kendra Deployment Checklist

Complete system refactor from **static templates → AWS Bedrock + Kendra RAG**.

---

## PRE-DEPLOYMENT VALIDATION

### ✅ Code Changes Completed

- [x] **Replaced** `app/api/scheme-conversation/route.ts`
  - FROM: Anthropic SDK with in-memory sessions
  - TO: AWS Bedrock + Kendra orchestration
  - NO mocks, NO static responses, PURE AI

- [x] **Created** `app/lib/aws/bedrock.ts`
  - BedrockRuntimeClient integration
  - Claude 3 Sonnet model support
  - Conversation wrapper functions

- [x] **Created** `app/lib/aws/kendra.ts`
  - KendraClient initialization
  - Intelligent query building from profile
  - Document retrieval with relevance scoring

- [x] **Created** `app/lib/aws/dynamodb.ts`
  - Session CRUD operations
  - Profile + conversation persistence
  - Multi-message context window (last 20)

- [x] **Updated** `.env.local`
  - Removed ANTHROPIC_API_KEY
  - Added BEDROCK_MODEL_ID
  - Added KENDRA_INDEX_ID
  - Added DYNAMODB_CONVERSATIONS_TABLE

- [x] **Created** `tests/test-aws-integration.ts`
  - Profile extraction tests
  - Query building examples
  - Conversation flow simulation

- [x] **Created** `AWS_BEDROCK_KENDRA_GUIDE.md`
  - Architecture documentation
  - API specification
  - Error handling guide

- [x] **Verification**: TypeScript builds successfully (0 errors)

---

## AWS SERVICE PREREQUISITES

Before deploying to production, ensure these are configured:

### 1. AWS Bedrock
```
[ ] Enable Claude model access in AWS Bedrock
    - Go to: AWS Console → Bedrock → Model Access
    - Enable: Claude 3 Sonnet (anthropic.claude-3-sonnet-20240229-v1:0)
    - Region: ap-south-1 (India, or your region)

[ ] Verify Claude is available
    - Test with AWS CLI:
      aws bedrock-runtime invoke-model \
        --model-id anthropic.claude-3-sonnet-20240229-v1:0 \
        --region ap-south-1 \
        --body '{"messages":[{"role":"user","content":"test"}]}'

[ ] Set up Bedrock pricing alerts
    - Go to: AWS Billing → Budgets
    - Set limit on Bedrock usage
```

### 2. Amazon Kendra
```
[ ] Create Kendra Index
    - Name: buaip-schemes-index
    - Edition: Developer (for testing) or Enterprise (production)
    - Language: English + Hindi (for India)
    
[ ] Index Scheme Documents
    - Upload government scheme PDFs to S3
    - Configure Kendra to index that S3 bucket
    - Or: Use Kendra's web crawler for government websites
    
[ ] Verify index status
    - Go to: AWS Console → Kendra → Indexes
    - Check: Document count > 50 (minimum for testing)
    - Check: Status = "Active"

[ ] Test search functionality
    aws kendra-runtime query \
      --index-id buaip-schemes-index \
      --query-text "schemes for female maharashtra farmer" \
      --region ap-south-1
```

### 3. Amazon DynamoDB
```
[ ] Create DynamoDB Table
    - Table Name: buaip-conversations
    - Partition Key: sessionId (String)
    - Billing Mode: On-demand (for variable traffic)
    
[ ] Configure table settings
    - Point-in-time recovery: Enabled
    - TTL attribute: Optional (for auto-cleanup)
    - Read/Write capacity: Auto-scaling enabled
    
[ ] Verify table is accessible
    aws dynamodb describe-table \
      --table-name buaip-conversations \
      --region ap-south-1
```

### 4. AWS IAM Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "arn:aws:bedrock:ap-south-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kendra:Query",
        "kendra:SubmitFeedback"
      ],
      "Resource": "arn:aws:kendra:ap-south-1:ACCOUNT_ID:index/buaip-schemes-index"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:ap-south-1:ACCOUNT_ID:table/buaip-conversations"
    }
  ]
}
```

---

## ENVIRONMENT CONFIGURATION

### .env.local Setup

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=ap-south-1

# Bedrock Configuration
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# Kendra Configuration
KENDRA_INDEX_ID=buaip-schemes-index

# DynamoDB Configuration
DYNAMODB_CONVERSATIONS_TABLE=buaip-conversations

# Optional: API Security (if implementing auth)
# API_KEY=your-secret-api-key
# JWT_SECRET=your-jwt-secret
```

### Validation Script

```typescript
// scripts/validate-aws-setup.ts
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { KendraClient, QueryCommand } from "@aws-sdk/client-kendra";
import { DynamoDBClient, DescribeTableCommand } from "@aws-sdk/client-dynamodb";

async function validateAWSSetup() {
  const results = {
    bedrock: false,
    kendra: false,
    dynamodb: false,
  };

  // Test Bedrock
  try {
    const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
    await bedrock.send(
      new InvokeModelCommand({
        modelId: process.env.BEDROCK_MODEL_ID,
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-06-01",
          max_tokens: 100,
          messages: [{ role: "user", content: "Hi" }],
        }),
      })
    );
    results.bedrock = true;
    console.log("✓ Bedrock: OK");
  } catch (err) {
    console.error("✗ Bedrock: FAILED", err.message);
  }

  // Test Kendra
  try {
    const kendra = new KendraClient({ region: process.env.AWS_REGION });
    await kendra.send(
      new QueryCommand({
        IndexId: process.env.KENDRA_INDEX_ID,
        QueryText: "government schemes",
      })
    );
    results.kendra = true;
    console.log("✓ Kendra: OK");
  } catch (err) {
    console.error("✗ Kendra: FAILED", err.message);
  }

  // Test DynamoDB
  try {
    const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });
    await dynamodb.send(
      new DescribeTableCommand({
        TableName: process.env.DYNAMODB_CONVERSATIONS_TABLE,
      })
    );
    results.dynamodb = true;
    console.log("✓ DynamoDB: OK");
  } catch (err) {
    console.error("✗ DynamoDB: FAILED", err.message);
  }

  const allPass = Object.values(results).every((v) => v);
  console.log(`\n${allPass ? "✅ ALL SERVICES READY" : "❌ SOME SERVICES FAILED"}`);

  return allPass;
}

validateAWSSetup();
```

---

## DEPLOYMENT STEPS

### Step 1: Pre-deployment Verification

```bash
# 1.1 Build the project
npm run build

# Expected: 0 errors, 0 warnings
# Verify: app/api/scheme-conversation/route.ts compiles

# 1.2 Run integration tests (optional)
npm test -- tests/test-aws-integration.ts

# 1.3 Validate AWS setup script
npm run validate-aws

# Expected: ✓ Bedrock, Kendra, DynamoDB all pass
```

### Step 2: Deploy to Staging

```bash
# Uses same AWS services, different environment
git checkout staging
git merge main
npm run build
npm run deploy:staging

# Test against real AWS (Kendra index with scheme documents)
# Manual testing of full conversation flow
```

### Step 3: Production Deployment

```bash
# 3.1 Create production AWS resources
# - Bedrock: Claude 3 Sonnet in production
# - Kendra: Enterprise edition index with 1000+ schemes
# - DynamoDB: Production table with auto-scaling

# 3.2 Deploy application
git checkout main
npm run build
npm run deploy:production

# 3.3 Enable monitoring
# - CloudWatch: Bedrock API calls
# - CloudWatch: Kendra query performance
# - CloudWatch: DynamoDB read/write capacity
# - X-Ray: End-to-end request tracing
```

---

## POST-DEPLOYMENT VERIFICATION

### ✅ Functional Tests

```bash
# Test 1: Profile Collection Flow
curl -X POST http://localhost:3000/api/scheme-conversation \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hi, I am looking for government schemes",
    "sessionId": "test_session_1"
  }'
# Expected Response: { type: "message", text: "...", profileProgress: { completed: 0, total: 8 } }

# Test 2: Profile Data Extraction
curl -X POST http://localhost:3000/api/scheme-conversation \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I am a 35 year old female from Maharashtra",
    "sessionId": "test_session_1"
  }'
# Expected Response: profileProgress shows 2-3 fields completed

# Test 3: Complete Profile → Schemes
# Send messages with all 8 required fields
# Final message should trigger Kendra retrieval
# Expected Response: { type: "schemes", schemes: [...], profileProgress: { completed: 8, total: 8 } }
```

### ✅ Performance Tests

```bash
# Measure response times
time curl -X POST http://localhost:3000/api/scheme-conversation \
  -H "Content-Type: application/json" \
  -d '{"message":"I am female from Maharashtra","sessionId":"perf_test"}'

# Expected: 
# - Message only: 2-3s (Bedrock API latency)
# - With schemes: 5-8s (Bedrock + Kendra)
```

### ✅ Error Handling Tests

```bash
# Test 1: Missing message
curl -X POST http://localhost:3000/api/scheme-conversation \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: { error: "Missing or invalid 'message' field" }

# Test 2: Invalid session
# (Should create new session automatically)
curl -X POST http://localhost:3000/api/scheme-conversation \
  -H "Content-Type: application/json" \
  -d '{"message":"test message"}'
# Expected: Returns with new sessionId

# Test 3: Bedrock error (if service unavailable)
# Expected: { error: "An error occurred" } with 500 status
```

### ✅ AWS Service Monitoring

```bash
# CloudWatch Logs
aws logs tail /aws/bedrock/ --follow
aws logs tail /aws/kendra/ --follow
aws logs tail /aws/dynamodb/ --follow

# Bedrock API Metrics
# - InvokeModel call count
# - Input/output token usage
# - Model latency
# - Error rate

# Kendra Metrics
# - Query count
# - Response time
# - Index document count
# - Index health score

# DynamoDB Metrics
# - Read/write capacity used
# - Throttle events
# - Item count
# - Stream records
```

---

## COST ESTIMATION

### AWS Bedrock
- **Pricing**: $0.003 per 1K input tokens, $0.015 per 1K output tokens
- **Estimate**: 50K conversations/month × 500 input tokens = $75/month
- **Max**: With 1M conversations = $1,500/month

### Amazon Kendra
- **Pricing**: 
  - Developer edition: $35/day (testing)
  - Enterprise edition: $900/month + $5 per captured metric
- **Estimate**: Start with Developer, upgrade as needed

### DynamoDB
- **Pricing** (On-demand): $1.25 per million write units, $0.25 per million read units
- **Estimate**: 100K conversations/month = ~$50/month

### **Total Monthly Cost (Production)**:
- Low volume (10K conversations): $150-200
- Medium volume (100K conversations): $500-600
- High volume (1M conversations): $5,000-7,000

---

## ROLLBACK PLAN

If production issues occur:

```bash
# 1. Revert to previous version
git revert HEAD

# 2. Redeploy
npm run deploy:production

# 3. Alternative: Restore from Bedrock fallback
# (Consider adding mock responses for critical errors)

# 4. Check DynamoDB for data loss
aws dynamodb scan --table-name buaip-conversations --limit 10
```

---

## MONITORING & ALERTING

### CloudWatch Alarms

```bash
# Bedrock Error Rate > 1%
# - Alert: on-call engineer
# - Action: Check model availability

# Kendra Index Health < 100%
# - Alert: on-call engineer  
# - Action: Reindex documents

# DynamoDB Read Throttling
# - Alert: on-call engineer
# - Action: Increase auto-scaling limits

# API Response Time > 10s
# - Alert: performance team
# - Action: Optimize queries
```

### Logging

All services log to CloudWatch:
- Bedrock: Input/output tokens, model latency
- Kendra: Query text, result count, relevance scores
- DynamoDB: Write/read ops, session counts

---

## SUPPORT & TROUBLESHOOTING

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Bedrock: `ModelNotFound` | Model ID wrong | Verify BEDROCK_MODEL_ID in .env |
| Kendra: `IndexNotFound` | Index doesn't exist | Create buaip-schemes-index in Kendra console |
| Kendra: No results | No documents indexed | Upload scheme PDFs to S3, configure crawler |
| DynamoDB: `ResourceNotFound` | Table doesn't exist | Create buaip-conversations table |
| Session history: Empty | First request | Expected - builds up over conversation |

### Debug Mode

```typescript
// Enable debug logging in route.ts
const DEBUG = true;
if (DEBUG) {
  console.log("[Profile]", updatedProfile);
  console.log("[Kendra Query]", kendraQuery);
  console.log("[Session ID]", sessionId);
}
```

---



