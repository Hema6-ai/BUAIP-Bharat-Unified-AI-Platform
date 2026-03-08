import { callBedrock } from '@/app/lib/bedrock';

interface NyayaRequest {
  state: string;
  issueType: string;
  description: string;
  language: string;
}

interface NyayaResponse {
  explanation: string;
  steps: string[];
  draftDocument?: string;
  voiceReadyText: string;
  intent: string;
  officesToApproach: string[];
  timelineExpected: string;
  reasoning: {
    analysis: string;
    keyPoints: string[];
  };
}

// Intent detection - simple keyword matching
function detectIntent(issueType: string, description: string): string {
  const desc = description.toLowerCase();
  
  if (issueType === 'police') return 'complaint';
  if (issueType === 'consumer') return 'consumer';
  if (issueType === 'civil') return 'civil';
  if (issueType === 'workplace') return 'workplace';
  if (issueType === 'government') return 'government';
  if (issueType === 'rti') return 'rti';
  
  // Fallback keyword detection
  if (desc.includes('complaint') || desc.includes('fir') || desc.includes('police')) return 'complaint';
  if (desc.includes('fraud') || desc.includes('money') || desc.includes('service')) return 'consumer';
  if (desc.includes('land') || desc.includes('property')) return 'civil';
  if (desc.includes('harassment') || desc.includes('company')) return 'workplace';
  if (desc.includes('information') || desc.includes('rti') || desc.includes('why')) return 'rti';
  
  return 'guidance';
}

// Determine which offices to approach based on issue type
function getOfficesToApproach(issueType: string, state: string): string[] {
  const officeMap: Record<string, string[]> = {
    police: [
      `Police Station in ${state}`,
      'Cybercrime Cell (if online fraud)',
      'District Police Headquarters'
    ],
    consumer: [
      'District Consumer Redressal Commission',
      'Online Consumer Court (ODR portal)',
      'State Consumer Authority'
    ],
    civil: [
      'District Land Records Office',
      'District Civil Court',
      'Revenue Divisional Officer (RDO)'
    ],
    workplace: [
      'District Labour Office',
      'Police (if criminal harassment)',
      'National Commission for Women (if gender-based)',
      'Company HR / Internal Complaints Committee'
    ],
    government: [
      'District Grievance Redressal Officer',
      'Department Ombudsman',
      'Chief Minister Office (serious delays)'
    ],
    rti: [
      'District Public Information Officer',
      'State Information Commission',
      'Central Information Commission'
    ],
    other: [
      'District Legal Services Authority',
      'State Human Rights Commission'
    ]
  };
  
  return officeMap[issueType] || officeMap['other'];
}

// Get expected timeline based on issue type
function getTimelineExpected(issueType: string): string {
  const timelineMap: Record<string, string> = {
    police: '7-14 days for FIR registration, investigation takes weeks/months',
    consumer: '1-3 months for district court, appeals can take 2+ years',
    civil: '2-5 years depending on court queue',
    workplace: '3-6 months for investigation, action varies',
    government: '30-90 days for escalation resolution',
    rti: '30 days for government response (rarely met)',
    other: '30-90 days depending on authority'
  };
  
  return timelineMap[issueType] || 'Varies by authority and complexity';
}

// Build dynamic prompt for Claude
function buildNyayaPrompt(request: NyayaRequest, intent: string): string {
  const offices = getOfficesToApproach(request.issueType, request.state);
  const timeline = getTimelineExpected(request.issueType);
  
  const docGenerationInstructions = 
    (intent === 'complaint' || intent === 'rti' || intent === 'consumer')
      ? `
DOCUMENT GENERATION:
You MUST generate a formal draft document that this citizen can copy-paste and submit.
- Use [DATE: DD/MM/YYYY] for placeholders
- Use [AUTHORITY NAME] for office name
- Use [CITIZEN NAME] for person filling
- Use [REFERENCE/CASE NUMBER] if applicable
- Format as formal letter (no bullets)
- Keep language simple but formal
- Include all required details
- Make it ready-to-print and submission-ready

Document must have:
1. Date and addressee details (as placeholders)
2. Clear complaint/request statement
3. Facts in chronological order
4. Relief/action sought
5. Attachments list (if any)
6. Signature line

This document is the "draftDocument" in JSON output.
`
      : '';

  return `You are a Legal Services Officer at a District Government Helpdesk in ${request.state}, India.
Your role is to help ordinary citizens who don't know the legal system.

CITIZEN SITUATION:
State: ${request.state}
Issue Type: ${request.issueType}
Description: ${request.description}

YOUR TASK:
Explain this citizen's rights and practical next steps in simple language.
${request.language !== 'en' ? `Respond ENTIRELY in ${getLanguageName(request.language)}.` : ''}

CRITICAL INSTRUCTIONS:
✓ Explain what this situation means in ordinary language (no legal jargon)
✓ Tell citizen what rights they have (as common sense, not case law)
✓ Give clear ACTION STEPS the citizen can do TODAY/TOMORROW
✓ Mention these government offices to approach: ${offices.join(', ')}
✓ Provide process guidance (not theory)
✓ Mention expected timeline: ${timeline}
✓ Be encouraging and practical
✓ Sound like a government helpdesk officer, not a lawyer
✓ Give 5-7 specific actionable steps
${docGenerationInstructions}

WHAT TO AVOID:
✗ Don't predict if citizen will win or lose
✗ Don't cite laws or sections (citizens don't understand)
✗ Don't give courtroom strategy or adversarial advice
✗ Don't suggest hiring a lawyer first (suggest only if truly needed)
✗ Don't use legal jargon (use normal words)
✗ Don't give legal opinions or verdicts
✗ Don't quote precedents

RESPONSE FORMAT (STRICT JSON):
{
  "explanation": "2-3 sentence plain language explanation of what happened and what citizen's rights are",
  "steps": ["Step 1: specific action", "Step 2: ...", "Step 3: ...", ...],
  "draftDocument": "ONLY if intent is complaint/rti/consumer - formal letter ready to submit",
  "voiceReadyText": "simplified spoken version without formatting - 2-4 short sentences",
  "offices": ["Office 1", "Office 2"],
  "timeline": "expected timeline",
  "reasoning": {
    "analysis": "brief analysis of situation",
    "keyPoints": ["point 1", "point 2"]
  }
}

Remember: This citizen needs CLARITY and ACTION, not legal knowledge.
Respond ONLY with JSON, no markdown or explanation.
${request.language !== 'en' ? `Respond in ${getLanguageName(request.language)} only.` : ''}

Now generate the response:`;
}

function getLanguageName(code: string): string {
  const map: Record<string, string> = {
    en: 'English',
    hi: 'Hindi',
    te: 'Telugu',
    ta: 'Tamil'
  };
  return map[code] || 'English';
}

export async function POST(req: Request) {
  try {
    const body: NyayaRequest = await req.json();
    
    // Validate request
    if (!body.state || !body.issueType || !body.description || !body.language) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const intent = detectIntent(body.issueType, body.description);
    const prompt = buildNyayaPrompt(body, intent);
    
    // Call Bedrock
    const rawResponse = await callBedrock(prompt, {
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      maxTokens: 2000,
      temperature: 0.3
    });
    
    // Parse response
    let parsedResponse: NyayaResponse;
    
    try {
      // Extract JSON from response
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const aiResponse = JSON.parse(jsonMatch[0]);
      
      parsedResponse = {
        explanation: aiResponse.explanation || 'Your rights and situation analyzed.',
        steps: Array.isArray(aiResponse.steps) ? aiResponse.steps : [],
        draftDocument: aiResponse.draftDocument,
        voiceReadyText: aiResponse.voiceReadyText || 'Tell us if you need more information.',
        intent,
        officesToApproach: getOfficesToApproach(body.issueType, body.state),
        timelineExpected: getTimelineExpected(body.issueType),
        reasoning: {
          analysis: aiResponse.reasoning?.analysis || 'Situation analyzed based on citizen input.',
          keyPoints: Array.isArray(aiResponse.reasoning?.keyPoints) 
            ? aiResponse.reasoning.keyPoints 
            : ['Rights explained', 'Steps provided', 'Offices identified']
        }
      };
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw response:', rawResponse);
      
      // Fallback response
      parsedResponse = {
        explanation: 'Based on what you described, you have rights to seek remedy. We will guide you through the process.',
        steps: [
          'Gather all documents related to your issue',
          'Visit the nearest government office mentioned below',
          'File a formal complaint in writing',
          'Keep copies of all submissions',
          'Follow up regularly'
        ],
        voiceReadyText: 'You described a situation where you can take action. We will help you with the next steps.',
        intent,
        officesToApproach: getOfficesToApproach(body.issueType, body.state),
        timelineExpected: getTimelineExpected(body.issueType),
        reasoning: {
          analysis: 'Situation analyzed and action path identified.',
          keyPoints: ['Rights identified', 'Action steps ready', 'Government offices listed']
        }
      };
    }
    
    return new Response(JSON.stringify(parsedResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('NYAYA API Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to get guidance',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
