# Citizen Dashboard - Implementation Guide

## Overview

The Citizen Dashboard has been rebuilt to provide a fully functional government schemes explorer that:
- Loads real schemes from `india_schemes_7domains.csv`
- Displays schemes organized by 7 categories (domains)
- Shows scheme details in a modal with full information
- Is prepared for Bedrock AI integration for intelligent assistance

## Architecture

### API Routes

#### `/api/categories` (GET)
- **Purpose**: Fetch all unique scheme categories/domains from the CSV
- **Returns**: Array of category strings
- **Example Response**:
  ```json
  [
    "Agriculture & Allied Activities",
    "Disability Support (Divyang Schemes)",
    "Education & Scholarships",
    "Health & Public Health",
    "SC/ST/OBC Welfare",
    "Senior Citizen Welfare",
    "Women Empowerment & Child Welfare"
  ]
  ```

#### `/api/schemes` (GET)
- **Purpose**: Fetch schemes, optionally filtered by category
- **Query Params**:
  - `category` (optional): Filter by domain name
- **Returns**: Array of Scheme objects with all CSV fields
- **Example**:
  ```
  GET /api/schemes?category=Agriculture%20&%20Allied%20Activities
  ```

#### `/api/scheme-assistance` (POST)
- **Purpose**: Get AI-powered assistance for schemes using Bedrock
- **Request Body**:
  ```json
  {
    "scheme_name": "string",
    "query_type": "eligibility" | "requirements" | "application" | "general",
    "user_inputs": {
      "age": number (optional),
      "income_band": "Low" | "Middle" | "High" (optional),
      "state": "string (optional)",
      "category": "string"
    }
  }
  ```
- **Returns**:
  ```json
  {
    "scheme_name": "string",
    "response": "string",
    "timestamp": "ISO 8601 date"
  }
  ```

### Components

#### `citizen-dashboard/page.tsx`
- Main dashboard page with client-side state management
- Loads categories and schemes dynamically
- Manages scheme selection and detail modal visibility
- Uses React hooks: `useState`, `useEffect`

#### `SchemeDetailModal.tsx`
- Modal component displaying full scheme information
- Shows all CSV fields in organized sections
- "Get AI Assistance" button integration
- Links to official scheme websites

#### `SchemeAssistancePanel.tsx`
- Sliding panel for AI-powered assistance
- Query type selection (eligibility, requirements, application, general)
- User input fields (age, income band, state)
- Calls `/api/scheme-assistance` for Bedrock responses
- Error handling and response display

## Data Flow

```
User Interface
    ↓
citizen-dashboard/page.tsx
    ├─→ /api/categories (on mount)
    │   └─→ Parse CSV, extract unique domains
    │
    ├─→ /api/schemes?category=X (on category select)
    │   └─→ Parse CSV, filter by domain
    │
    └─→ SchemeDetailModal
        └─→ SchemeAssistancePanel
            └─→ /api/scheme-assistance (on submit)
                └─→ callBedrock() → Claude Model
```

## CSV Source

**File**: `public/india_schemes_7domains.csv`

**Fields** (all mapped in Scheme interface):
- scheme_name
- domain (7 categories)
- ministry
- description
- target_beneficiaries
- eligibility_criteria
- age_limit
- income_limit
- required_documents
- benefits
- application_mode
- official_apply_link
- state_applicability
- timeline

**Current Data**: 70 schemes across 7 domains

## Bedrock AI Integration

### Current State
- API route ready: `/api/scheme-assistance`
- Prompt construction with context-aware queries
- Support for multiple query types
- User profile integration (age, income, state)

### How It Works

The `scheme-assistance` route builds intelligent prompts based on:

1. **Query Type** (determines context):
   - `eligibility`: Focuses on user profile matching
   - `requirements`: Lists documents and prerequisites
   - `application`: Explains step-by-step process
   - `general`: Comprehensive overview

2. **User Context** (optional):
   - Age group
   - Income band
   - State/location
   - Category

3. **Model**: Uses Bedrock Claude via `callBedrock()` utility

### Example Usage

```typescript
// From SchemeAssistancePanel
const requestBody = {
  scheme_name: "Ayushman Bharat PM-JAY",
  query_type: "eligibility",
  user_inputs: {
    age: 35,
    income_band: "Low",
    state: "Maharashtra",
    category: "Health & Public Health"
  }
};

const response = await fetch("/api/scheme-assistance", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(requestBody)
});
```

## Environment Setup

Required for Bedrock Integration:
```
AWS_REGION=us-east-1 (or your Bedrock region)
AWS_ACCESS_KEY_ID=your-key-id
AWS_SECRET_ACCESS_KEY=your-secret-key
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0 (or your model)
```

## Future Enhancements

### Planned Features
1. **User Profile Persistence**
   - Cache user's age, state, income for quick eligibility checks
   - Store search history

2. **Eligibility Checker**
   - Quick assessment tool before viewing scheme details
   - Yes/No questions for rapid filtering

3. **Scheme Comparison**
   - Select multiple schemes
   - Compare benefits, eligibility, timelines

4. **Application Tracking**
   - Connect to government APIs (future)
   - Track applications submitted through the platform

5. **Personalized Recommendations**
   - ML-based scheme suggestions based on user profile
   - Bedrock-powered matching logic

6. **Multi-language Support**
   - Render schemes in regional languages
   - Bedrock translation capability

## Testing

### Manual Testing Checklist
- [ ] Categories load correctly
- [ ] Clicking category shows related schemes
- [ ] Scheme cards display without errors
- [ ] Clicking scheme opens detail modal
- [ ] Modal displays all available fields
- [ ] "Get AI Assistance" panel opens
- [ ] User can enter age/income/state
- [ ] AI response displays (requires AWS credentials)
- [ ] Close buttons work (modal and panel)

### Running Development Server
```bash
npm run dev
```
Visit: `http://localhost:3000/citizen-dashboard`

## File Structure

```
app/
├── api/
│   ├── categories/
│   │   └── route.ts          # Fetch unique domains
│   ├── schemes/
│   │   └── route.ts          # Fetch schemes, optionally filtered
│   └── scheme-assistance/
│       └── route.ts          # Bedrock AI integration
├── components/
│   ├── SchemeDetailModal.tsx # Full scheme details view
│   └── SchemeAssistancePanel.tsx # AI assistance panel
├── citizen-dashboard/
│   └── page.tsx              # Main dashboard page
└── lib/
    └── bedrock.ts            # Bedrock client (existing)
```

## Notes

- ✅ No mock data - all schemes from CSV
- ✅ CSV parsing on server-side (API routes)
- ✅ Real-time filtering based on user selection
- ✅ Bedrock ready with context-aware prompts
- ✅ TypeScript throughout for type safety
- ✅ Responsive design (mobile-friendly)
- ✅ Accessibility features included
