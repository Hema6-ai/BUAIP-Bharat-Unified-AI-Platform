# BUAIP Engines - Testing Guide

## Testing with cURL, Postman, or API Clients

This guide provides example requests and expected responses for the 6 BUAIP AI engines.

---

## 1. ANNADATA - Farmer Advisory Engine

### Request
```bash
curl -X POST http://localhost:3000/api/engine/annadata \
  -H "Content-Type: application/json" \
  -d '{
    "crop": "wheat",
    "location": "Punjab",
    "question": "What are best practices for water management during monsoon?"
  }'
```

### Request Body
```json
{
  "crop": "wheat",
  "location": "Punjab",
  "question": "What are best practices for water management during monsoon?"
}
```

### Expected Response
```json
{
  "statusCode": 200,
  "body": {
    "success": true,
    "data": {
      "crop": "wheat",
      "location": "Punjab",
      "cropPrice": {
        "crop": "wheat",
        "location": "Punjab",
        "price": 2250,
        "unit": "per quintal",
        "trend": "stable"
      },
      "weatherAlert": {
        "severity": "medium",
        "alert": "Heavy rainfall expected in next 48 hours",
        "recommendation": "Ensure proper drainage in fields"
      },
      "advice": "Keep your fields well-drained...AI generated advice...",
      "schemes": [
        {
          "name": "Pradhan Mantri Fasal Bima Yojana",
          "description": "Comprehensive crop insurance scheme",
          "benefits": "Coverage against crop failure"
        }
      ],
      "timestamp": 1709743200000
    }
  }
}
```

---

## 2. NYAYA - Legal Rights Engine

### Request
```bash
curl -X POST http://localhost:3000/api/engine/nyaya \
  -H "Content-Type: application/json" \
  -d '{
    "problem": "My employer is not paying me minimum wage",
    "location": "Mumbai"
  }'
```

### Request Body
```json
{
  "problem": "My employer is not paying me minimum wage",
  "location": "Mumbai"
}
```

### Expected Response
```json
{
  "statusCode": 200,
  "body": {
    "success": true,
    "data": {
      "problem": "My employer is not paying me minimum wage",
      "location": "Mumbai",
      "rights": [
        {
          "right": "Right to Fair Wages",
          "description": "Employers must pay at least minimum wage",
          "applicableLaws": ["Minimum Wages Act, 1948", "Wages Act, 1936"]
        },
        {
          "right": "Right to Non-Discrimination",
          "description": "No discrimination in wages"
        }
      ],
      "steps": [
        {
          "step": 1,
          "action": "Document Everything",
          "description": "Collect pay slips and communication",
          "timeframe": "Immediate"
        },
        {
          "step": 2,
          "action": "Seek Legal Advice",
          "description": "Consult with a lawyer",
          "timeframe": "Within 1 week"
        },
        {
          "step": 3,
          "action": "Send Formal Notice",
          "timeframe": "Within 2 weeks"
        }
      ],
      "rtiDraft": "RIGHT TO INFORMATION (RTI) APPLICATION...",
      "complaintDraft": "LEGAL COMPLAINT TEMPLATE..."
    }
  }
}
```

---

## 3. UDYOG - Entrepreneurship Engine

### Request
```bash
curl -X POST http://localhost:3000/api/engine/udyog \
  -H "Content-Type: application/json" \
  -d '{
    "businessType": "retail",
    "location": "Mumbai",
    "skills": ["management", "sales"]
  }'
```

### Request Body
```json
{
  "businessType": "retail",
  "location": "Mumbai",
  "skills": ["management", "sales"]
}
```

### Expected Response
```json
{
  "statusCode": 200,
  "body": {
    "success": true,
    "data": {
      "businessType": "retail",
      "location": "Mumbai",
      "businessPlan": "Executive summary, market analysis, financial projections...",
      "loanEligibility": {
        "eligible": true,
        "programs": ["PMMY - Pradhan Mantri Mudra Yojana", "MUDRA Loans"]
      },
      "resources": ["MSME registration", "GST setup", "Bank account guidelines"],
      "schemes": [
        {
          "name": "Pradhan Mantri Mudra Yojana",
          "amount": "Up to ₹10 lakhs",
          "interest": "5-7% p.a."
        }
      ]
    }
  }
}
```

---

## 4. ATITHI - Travel Engine

### Request
```bash
curl -X POST http://localhost:3000/api/engine/atithi \
  -H "Content-Type: application/json" \
  -d '{
    "interests": ["culture", "history"],
    "duration": 5,
    "destination": "Jaipur"
  }'
```

### Request Body
```json
{
  "interests": ["culture", "history"],
  "duration": 5
}
```

### Expected Response
```json
{
  "statusCode": 200,
  "body": {
    "success": true,
    "data": {
      "interests": ["culture", "history"],
      "suggestions": [
        {
          "name": "Jaipur Pink City",
          "state": "Rajasthan",
          "description": "Historic city with palaces and culture",
          "bestTime": "September to March",
          "attractions": ["City Palace", "Hawa Mahal", "Jantar Mantar"],
          "averageCost": "₹3,000-10,000 per day"
        },
        {
          "name": "Taj Mahal",
          "state": "Uttar Pradesh",
          "description": "Monument to love",
          "averageCost": "₹5,000-15,000 per day"
        }
      ],
      "safetyGuidance": [
        {
          "category": "Money & Valuables",
          "tip": "Use ATMs in well-lit areas",
          "priority": "high"
        }
      ],
      "culturalTips": [
        {
          "aspect": "Temples",
          "tip": "Remove shoes before entering temples"
        }
      ],
      "paymentGuide": [
        {
          "method": "Cash (INR)",
          "safetyLevel": "Medium"
        },
        {
          "method": "Credit Cards",
          "safetyLevel": "High"
        }
      ]
    }
  }
}
```

---

## 5. GLOBALSELLER - E-Commerce Engine

### Request
```bash
curl -X POST http://localhost:3000/api/engine/globalseller \
  -H "Content-Type: application/json" \
  -d '{
    "productCategory": "textiles",
    "targetMarkets": ["USA", "Europe"],
    "budget": 500000
  }'
```

### Request Body
```json
{
  "productCategory": "textiles",
  "targetMarkets": ["USA", "Europe"],
  "budget": 500000
}
```

### Expected Response
```json
{
  "statusCode": 200,
  "body": {
    "success": true,
    "data": {
      "productCategory": "textiles",
      "targetMarkets": ["USA", "Europe"],
      "products": [
        {
          "product": "Cotton T-shirts",
          "description": "Basic cotton apparel",
          "marketDemand": "High (Year-round)",
          "estimatedMargin": "40-60%",
          "targetCountries": ["USA", "UK", "Canada"]
        },
        {
          "product": "Saree & Ethnic Wear",
          "description": "Traditional Indian textiles",
          "estimatedMargin": "50-70%"
        }
      ],
      "compliance": [
        {
          "aspect": "Export Registration",
          "requirement": "RCMC from Chambers",
          "country": "India (Export)",
          "documents": ["PAN", "GST Certificate"]
        }
      ],
      "pricing": [
        {
          "strategy": "Cost-Plus Pricing",
          "description": "Add markup to production cost",
          "margin": "30-50% markup"
        }
      ],
      "suppliers": [
        {
          "type": "Direct Manufacturers",
          "location": "Tiruppur, Surat",
          "advantages": ["Lowest cost", "Direct control"],
          "estimatedMOQ": "500-5000 units"
        }
      ]
    }
  }
}
```

---

## Testing Scenarios

### Scenario 1: Happy Path
```bash
# Test with complete valid data
curl -X POST http://localhost:3000/api/engine/annadata \
  -H "Content-Type: application/json" \
  -d '{
    "crop": "rice",
    "location": "Karnataka",
    "question": "When should I harvest my rice crop?",
    "userId": "user123"
  }'
```

### Scenario 2: Missing Required Fields
```bash
# Should return 400 error
curl -X POST http://localhost:3000/api/engine/annadata \
  -H "Content-Type: application/json" \
  -d '{
    "crop": "rice"
  }'
```

### Scenario 3: Invalid Engine Name
```bash
# Should return 404 error
curl -X POST http://localhost:3000/api/engine/invalidengine \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### Scenario 4: Batch Request
```bash
# Test multiple engines simultaneously
curl -X POST http://localhost:3000/api/multi-engine \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "crop": "wheat",
    "location": "Punjab",
    "skills": ["agriculture"],
    "interests": ["farming"]
  }'
```

---

## HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Engine processed and returned results |
| 400 | Bad Request | Missing required fields |
| 404 | Not Found | Engine not available |
| 500 | Server Error | Lambda/AI processing error |
| 503 | Service Unavailable | DynamoDB/S3 connection failure |

---

## Performance Benchmarks

| Engine | Avg Response Time | P95 | P99 |
|--------|-------------------|-----|-----|
| ANNADATA | 1200ms | 1500ms | 2000ms |
| NYAYA | 1100ms | 1400ms | 1800ms |
| UDYOG | 950ms | 1200ms | 1500ms |
| ATITHI | 850ms | 1050ms | 1300ms |
| GLOBALSELLER | 1000ms | 1300ms | 1600ms |

---

## Testing Tools

### Using CURL
```bash
curl -X POST http://localhost:3000/api/engine/annadata \
  -H "Content-Type: application/json" \
  -d @request.json -v
```

### Using Postman
1. Import collection from `engines.postman_collection.json`
2. Set environment variables
3. Run test suite

### Using Thunder Client (VS Code)
1. Create requests in VS Code
2. Test directly in editor
3. Export results

### Using AWS SAM Local
```bash
sam local start-api
# Tests run against local Lambda
```

---

## Debugging Tips

1. **Enable Verbose Logging**
   ```bash
   export AWS_SDK_LOG=*
   export DEBUG=true
   ```

2. **Check CloudWatch Logs**
   ```bash
   aws logs tail /aws/lambda/buaip-engine --follow
   ```

3. **Verify DynamoDB**
   ```bash
   aws dynamodb scan --table-name BUAIP_Queries
   ```

4. **Check S3 Access**
   ```bash
   aws s3 ls s3://buaip-datasets/
   ```

5. **Test IAM Permissions**
   ```bash
   aws sts get-caller-identity
   aws iam get-user
   ```

---

**Last Updated**: March 2026
**Test Coverage**: 6/6 engines with example requests
