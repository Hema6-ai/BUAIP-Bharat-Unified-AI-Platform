import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { getBedrockClient } from './bedrockAI';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface NyayaInput {
  problem: string;
  location: string;
}

export interface LegalRight {
  right: string;
  description: string;
  applicableLaws: string[];
}

export interface LegalStep {
  step: number;
  action: string;
  description: string;
  timeframe: string;
}

export interface NyayaResponse {
  problem: string;
  location: string;
  rights: LegalRight[];
  steps: LegalStep[];
  rtiDraft: string;
  complaintDraft: string;
  timestamp: number;
}

// ============================================================================
// LEGAL RIGHTS DATABASE
// ============================================================================

const LEGAL_RIGHTS_BY_CATEGORY: Record<string, LegalRight[]> = {
  labor: [
    {
      right: 'Right to Fair Wages',
      description: 'Employers must pay at least minimum wage as per state labor laws',
      applicableLaws: ['Minimum Wages Act, 1948', 'Wages Act, 1936'],
    },
    {
      right: 'Right to Safe Working Conditions',
      description: 'Employers must provide a safe and healthy work environment',
      applicableLaws: ['Occupational Safety Health Code, 2020'],
    },
    {
      right: 'Right to Social Security',
      description: 'Workers are entitled to benefits like PF, ESI, health insurance',
      applicableLaws: ['Employee Provident Fund Act', 'Employee State Insurance Act'],
    },
    {
      right: 'Right to Non-Discrimination',
      description: 'No discrimination based on caste, religion, gender, or disability',
      applicableLaws: ['Equal Remuneration Act, 1976', 'Code on Social Security, 2020'],
    },
  ],
  consumer: [
    {
      right: 'Right to Know Quality',
      description: 'Right to get accurate information about product quality',
      applicableLaws: ['Consumer Protection Act, 2019'],
    },
    {
      right: 'Right to Choose',
      description: 'Freedom to choose products and services at competitive prices',
      applicableLaws: ['Consumer Protection Act, 2019', 'Competition Act, 2002'],
    },
    {
      right: 'Right to Compensation',
      description: 'Right to get compensation for defective products',
      applicableLaws: ['Consumer Protection Act, 2019'],
    },
    {
      right: 'Right to Redressal',
      description: 'Right to lodge complaints with consumer courts',
      applicableLaws: ['Consumer Protection Act, 2019'],
    },
  ],
  housing: [
    {
      right: 'Right to Property',
      description: 'Right to own, buy, and sell property',
      applicableLaws: ['Indian Penal Code', 'Registration Act, 1908'],
    },
    {
      right: 'Tenant Rights',
      description: 'Tenants have rights regarding rent, eviction, and maintenance',
      applicableLaws: ['State Rent Control Acts'],
    },
    {
      right: 'Right to Information',
      description: 'Right to get property documents and history',
      applicableLaws: ['Registration Act, 1908', 'RTI Act, 2005'],
    },
  ],
  family: [
    {
      right: 'Right to Maintenance',
      description: 'Spouse and children have right to maintenance',
      applicableLaws: ['Hindu Marriage Act, Criminal Procedure Code Section 125'],
    },
    {
      right: 'Right to Inheritance',
      description: 'Equal rights for men and women in succession',
      applicableLaws: ['Hindu Succession Act, Indian Succession Act'],
    },
    {
      right: 'Right to Marriage Registration',
      description: 'Right to register marriage for legal protection',
      applicableLaws: ['Registration of Births and Deaths Act'],
    },
  ],
};

// ============================================================================
// TEMPLATE FUNCTIONS
// ============================================================================

function generateRTITemplate(problem: string, location: string): string {
  const today = new Date();
  const date = today.toLocaleDateString('en-IN');

  return `RIGHT TO INFORMATION (RTI) APPLICATION
Date: ${date}

TO: The Public Information Officer,
[Relevant Department/Ministry],
${location}

SUBJECT: RTI Application - Information Request

Dear Sir/Madam,

Under the Right to Information Act, 2005, I hereby request the following information:

QUERY/PROBLEM: 
${problem}

INFORMATION REQUESTED:
1. [Specify the information you need]
2. [Dates relevant to your query]
3. [Any specific documents required]

I request the information to be provided in [specify format - hard copy/email/CD].

I am willing to pay the applicable fees as per RTI rules.

Yours faithfully,

[Your Name]
[Your Address]
[Mobile Number]
[Email Address]
[Aadhar/ID Number]

RECEIPT ACKNOWLEDGMENT:
Date of Application: _________
Reference Number: _________
Expected Date of Reply: _________
`;
}

function generateComplaintTemplate(
  problem: string,
  location: string,
  category: string
): string {
  const today = new Date();
  const date = today.toLocaleDateString('en-IN');

  return `LEGAL COMPLAINT TEMPLATE
Date: ${date}

TO: Whom It May Concern / [Specify Authority],
${location}

SUBJECT: ${category.toUpperCase()} COMPLAINT - URGENT ACTION REQUIRED

Dear Sir/Madam,

I am writing to lodge a formal complaint regarding the following matter:

BRIEF DESCRIPTION:
${problem}

DETAILED FACTS:
1. Background of the issue
2. When the issue occurred
3. Parties involved
4. Previous attempts to resolve (if any)

RELIEF SOUGHT:
1. Action to be taken
2. Compensation/Restitution (if applicable)
3. Future prevention measures

EVIDENCE/DOCUMENTS ENCLOSED:
- [ ] Written correspondence
- [ ] Photographs/Videos
- [ ] Payment receipts
- [ ] Witnesses' statements
- [ ] Other documents: _______

I request immediate investigation and appropriate action as per applicable laws.

Yours faithfully,

[Your Name]
[Your Full Address]
[Mobile Number]
[Email Address]
[Signature]

ENCLOSURES:
[List all attached documents]

AFFIDAVIT:
I, [Your Name], solemnly affirm that the above facts are true to the best of my knowledge.
`;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function detectProblemCategory(problem: string): string {
  const lower = problem.toLowerCase();

  if (
    lower.includes('wage') ||
    lower.includes('salary') ||
    lower.includes('employment') ||
    lower.includes('workplace')
  ) {
    return 'labor';
  }
  if (
    lower.includes('product') ||
    lower.includes('defect') ||
    lower.includes('seller') ||
    lower.includes('quality')
  ) {
    return 'consumer';
  }
  if (
    lower.includes('property') ||
    lower.includes('rent') ||
    lower.includes('tenant') ||
    lower.includes('house')
  ) {
    return 'housing';
  }
  if (
    lower.includes('marriage') ||
    lower.includes('divorce') ||
    lower.includes('maintenance') ||
    lower.includes('child')
  ) {
    return 'family';
  }

  return 'general';
}

function getRightsForCategory(category: string): LegalRight[] {
  return LEGAL_RIGHTS_BY_CATEGORY[category] || LEGAL_RIGHTS_BY_CATEGORY.labor;
}

async function generateLegalSteps(
  problem: string,
  category: string
): Promise<LegalStep[]> {
  try {
    const bedrockClient = getBedrockClient();

    const prompt = `Generate a simple step-by-step action plan for someone facing this legal issue: ${problem}
    Category: ${category}
    Provide 4-5 clear, actionable steps with timeframes.`;

    await bedrockClient.generateAIResponse(prompt, 'NYAYA');

    // Return structured steps
    return [
      {
        step: 1,
        action: 'Document Everything',
        description: 'Collect all relevant documents, emails, and evidence',
        timeframe: 'Immediate',
      },
      {
        step: 2,
        action: 'Seek Legal Advice',
        description: 'Consult with a lawyer or legal aid center',
        timeframe: 'Within 1 week',
      },
      {
        step: 3,
        action: 'Send Formal Notice',
        description: 'Send a legal notice to the other party',
        timeframe: 'Within 2 weeks',
      },
      {
        step: 4,
        action: 'File Complaint',
        description: 'File complaint with appropriate authority',
        timeframe: 'Within 1 month',
      },
      {
        step: 5,
        action: 'Follow Up',
        description: 'Track the case and respond to notices',
        timeframe: 'Ongoing',
      },
    ];
  } catch (error) {
    console.error('Error generating legal steps:', error);
    throw error;
  }
}

// ============================================================================
// MAIN ENGINE
// ============================================================================

async function processNyayaRequest(input: NyayaInput): Promise<NyayaResponse> {
  const response: NyayaResponse = {
    problem: input.problem,
    location: input.location,
    rights: [],
    steps: [],
    rtiDraft: '',
    complaintDraft: '',
    timestamp: Date.now(),
  };

  try {
    const category = detectProblemCategory(input.problem);
    console.log(`Detected problem category: ${category}`);

    response.rights = getRightsForCategory(category);
    response.steps = await generateLegalSteps(input.problem, category);
    response.rtiDraft = generateRTITemplate(input.problem, input.location);
    response.complaintDraft = generateComplaintTemplate(
      input.problem,
      input.location,
      category
    );

    return response;
  } catch (error) {
    console.error('Error processing NYAYA request:', error);
    throw error;
  }
}

function parseInput(event: APIGatewayProxyEvent): NyayaInput {
  const body = event.body ? JSON.parse(event.body) : {};
  return {
    problem: body.problem || '',
    location: body.location || 'India',
  };
}

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('NYAYA Engine - Received event:', JSON.stringify(event, null, 2));

  try {
    const input = parseInput(event);

    if (!input.problem) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Problem description is required',
        }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    const response = await processNyayaRequest(input);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: response,
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (error) {
    console.error('NYAYA Engine Error:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};

export {
  processNyayaRequest,
  generateRTITemplate,
  generateComplaintTemplate,
  detectProblemCategory,
};
