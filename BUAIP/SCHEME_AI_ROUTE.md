# Scheme AI API Route

## Overview
The `/api/scheme-ai` endpoint connects to AWS Bedrock Claude to provide AI-powered government scheme explanations tailored for citizens.

**Real Bedrock Integration**: ✅ No mock responses - uses AWS Bedrock Runtime API

## Request Format

**Endpoint**: `POST /api/scheme-ai`

**Content-Type**: `application/json`

```json
{
  "schemeName": "Pradhan Mantri Kisan Samman Nidhi",
  "schemeDescription": "Direct income support scheme for farmers",
  "language": "Hindi",
  "region": "India"
}
```

### Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `schemeName` | string | Yes | - | Official name of the government scheme |
| `schemeDescription` | string | No | "" | Brief description of scheme purpose |
| `language` | string | No | "English" | Response language (e.g., "Hindi", "Tamil", "English") |
| `region` | string | No | "India" | Geographic region the scheme operates in |

## Response Format

**Status**: `200 OK`

```json
{
  "schemeName": "Pradhan Mantri Kisan Samman Nidhi",
  "language": "Hindi",
  "region": "India",
  "eligibility": "All farmers with valid Aadhar and land records...",
  "documentsNeeded": [
    "Aadhar card",
    "Land ownership certificate",
    "Bank account details",
    "Self-declaration form"
  ],
  "howToApply": "Step 1: Visit pmkisan.gov.in...",
  "offlineProcess": "Visit your nearest common service center...",
  "importantDeadlines": "Applications accepted year-round. Annual verification required by December.",
  "commonRejectionReasons": [
    "Incomplete land records",
    "Name mismatch in documents",
    "Non-agricultural land",
    "Invalid bank account"
  ],
  "additionalNotes": "Benefit amount: ₹6000 per year in 3 installments...",
  "timestamp": "2026-03-01T10:30:45.123Z"
}
```

## Error Responses

### Missing Required Field (400)
```json
{
  "error": "schemeName is required"
}
```

### AWS/Bedrock Error (503)
```json
{
  "error": "AWS Bedrock service error",
  "message": "Error details from AWS",
  "hint": "Ensure AWS credentials are configured in .env.local"
}
```

### Server Error (500)
```json
{
  "error": "Failed to generate scheme explanation"
}
```

## Prerequisites

### AWS Configuration
Ensure these environment variables are set in `.env.local`:

```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
```

### AWS Permissions
Your AWS IAM user/role needs `bedrock:InvokeModel` permission:

```json
{
  "Effect": "Allow",
  "Action": "bedrock:InvokeModel",
  "Resource": "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
}
```

## Usage Examples

### JavaScript/React
```typescript
const response = await fetch("/api/scheme-ai", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    schemeName: "Pradhan Mantri Awas Yojana",
    schemeDescription: "Housing scheme for low-income families",
    language: "Hindi",
    region: "India"
  })
});

const explanation = await response.json();
console.log(explanation.eligibility);
console.log(explanation.documentsNeeded);
console.log(explanation.commonRejectionReasons);
```

### Integration with SchemeAssistancePanel
```typescript
import { useEffect, useState } from "react";

export function SchemeAIExplainer({ schemeName, schemeDescription }) {
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/scheme-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schemeName,
        schemeDescription,
        language: navigator.language || "English",
        region: "India"
      })
    })
    .then(r => r.json())
    .then(setExplanation)
    .finally(() => setLoading(false));
  }, [schemeName, schemeDescription]);

  if (loading) return <div>Generating scheme explanation...</div>;
  if (!explanation) return <div>Error loading explanation</div>;

  return (
    <div>
      <section>
        <h3>Eligibility</h3>
        <p>{explanation.eligibility}</p>
      </section>
      <section>
        <h3>Required Documents</h3>
        <ul>
          {explanation.documentsNeeded.map(doc => (
            <li key={doc}>{doc}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3>How to Apply</h3>
        <p>{explanation.howToApply}</p>
      </section>
      <section>
        <h3>Offline Process</h3>
        <p>{explanation.offlineProcess}</p>
      </section>
      <section>
        <h3>Important Deadlines</h3>
        <p>{explanation.importantDeadlines}</p>
      </section>
      <section>
        <h3>Common Rejection Reasons</h3>
        <ul>
          {explanation.commonRejectionReasons.map(reason => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </section>
      {explanation.additionalNotes && (
        <section>
          <h3>Additional Information</h3>
          <p>{explanation.additionalNotes}</p>
        </section>
      )}
    </div>
  );
}
```

## Bedrock Prompt Structure

The API sends a structured, multi-language prompt to Bedrock Claude that requests:

1. **Eligibility** - Demographic, income, professional criteria
2. **Documents Needed** - Official list of required documents
3. **How to Apply** - Step-by-step online application process
4. **Offline Process** - Government office application procedures
5. **Important Deadlines** - Critical dates and timelines
6. **Common Rejection Reasons** - Reasons applications get rejected
7. **Additional Notes** - Disclaimers and extra information

The response is parsed and structured into the JSON format above.

## Language Support

Supports any language that Claude understands. Common examples:
- English
- Hindi
- Tamil
- Telugu
- Marathi
- Gujarati
- Bengali
- Kannada
- Malayalam
- Punjabi

## Architecture

```
Client → POST /api/scheme-ai
         ↓
Request validation & prompt building
         ↓
AWS Bedrock Runtime (Claude)
         ↓
Response parsing & structuring
         ↓
Structured JSON response
```

## Testing

Use curl to test the endpoint:

```bash
curl -X POST http://localhost:3000/api/scheme-ai \
  -H "Content-Type: application/json" \
  -d '{
    "schemeName": "Pradhan Mantri Kisan Samman Nidhi",
    "schemeDescription": "Direct income support scheme for farmers",
    "language": "English",
    "region": "India"
  }'
```

## Performance Notes

- **Latency**: ~2-5 seconds (Bedrock request time)
- **Token Usage**: ~800 max tokens per request
- **Cost**: Pay-as-you-go based on input/output tokens to Bedrock Claude
- **Timeout**: No enforced timeout (Lambda/Next.js may apply defaults)

## Security Considerations

1. **AWS Credentials**: Never expose in client-side code
2. **Input Validation**: Request body validated for required fields
3. **Rate Limiting**: Consider adding rate limiting in production
4. **Bedrock Quotas**: Monitor AWS Bedrock usage limits

## Troubleshooting

### "AWS Bedrock service error"
- Verify AWS credentials in `.env.local`
- Check AWS IAM permissions include `bedrock:InvokeModel`
- Confirm model ID matches available model in region

### Empty or malformed response
- Bedrock may have timed out
- Check CloudWatch logs for AWS API errors
- Verify scheme name is specific and well-known

### Response parsing issues
- Response structure may vary; parsing logic is flexible
- Check raw Bedrock response in server logs
- Adjust section header matching if needed

## Integration Points

- **SchemeDetailModal**: Display in scheme detail view
- **CitizenDashboard**: Show on scheme cards for quick info
- **SchemeAssistancePanel**: Include in AI assistance section
- **MobileApp**: Serve localized explanations
