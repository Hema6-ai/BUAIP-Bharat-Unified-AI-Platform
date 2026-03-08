/**
 * NYAY AI - LEGAL INTELLIGENCE ENGINE
 * 
 * Legal Rights Assistant for Indian Citizens
 * Provides legal guidance, complaint drafting, and rights education
 * 
 * Modes:
 * - KNOW_YOUR_RIGHTS: Explain legal protections and rights
 * - COURTROOM_COACH: Prepare users for court proceedings
 */

import { callBedrock } from '@/app/lib/bedrock';
import { KendraClient, QueryCommand } from '@aws-sdk/client-kendra';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { DynamoDBClient, ScanCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { ComprehendClient, DetectSentimentCommand } from '@aws-sdk/client-comprehend';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';

export type NyayMode = 'KNOW_YOUR_RIGHTS' | 'COURTROOM_COACH';
export type LegalCategory = 
  | 'TENANT_RIGHTS'
  | 'LABOUR_RIGHTS'
  | 'LAND_DISPUTE'
  | 'CRIMINAL_RIGHTS'
  | 'DOMESTIC_VIOLENCE'
  | 'CONSUMER_RIGHTS'
  | 'RTI_RIGHTS'
  | 'GENERAL_LEGAL';

export interface NyayRequest {
  query: string;
  situation: string;
  mode?: NyayMode;
  legalCategory?: LegalCategory;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  userGoal?: string;
  documentLanguage?: string;
  location?: string;
}

export interface NyayResponse {
  engine: 'NyayAI';
  mode: NyayMode;
  legalCategory: LegalCategory;
  response: string;
  structuredOutput?: {
    rights: string[];
    relevantLaws: string[];
    actionSteps: string[];
    prohibited: string[];
    complaintLetter?: string;
    legalAid: string[];
    evidenceChecklist: string[];
    confidenceScore: number;
  };
  emergencyContacts?: {
    nationalLegalServices: string;
    police: string;
    womenHelpline?: string;
    emergencyMessage?: string;
  };
  dataContext: {
    assumptions: string[];
    kendraFindings: Array<{ title: string; uri: string; score: string }>;
    localLegalAid: Array<{ name: string; contact: string; address: string }>;
    comprehendSentiment: Record<string, unknown> | null;
  };
  timestamp: string;
}

const REGION = process.env.AWS_REGION || 'ap-south-1';

const clients = {
  kendra: new KendraClient({ region: REGION }),
  s3: new S3Client({ region: REGION }),
  dynamodb: new DynamoDBClient({ region: REGION }),
  comprehend: new ComprehendClient({ region: REGION }),
  translate: new TranslateClient({ region: REGION })
};

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

const KNOW_YOUR_RIGHTS_PROMPT = `You are Nyay AI, India's Legal Rights Assistant.

Your mission: Help Indian citizens understand their legal rights in simple, actionable language.

You have expert knowledge of:
- Indian Penal Code (IPC)
- Code of Criminal Procedure (CrPC)
- Tenant Protection Laws (Rent Control Acts)
- Labour Laws (Industrial Disputes Act, Payment of Wages Act, Gratuity Act)
- Consumer Protection Act 2019
- Right to Information Act 2005
- Domestic Violence Act 2005
- Indian Contract Act
- Legal Services Authorities Act
- Indian Constitution (Fundamental Rights)

Your response MUST contain these sections:

## ⚖️ LEGAL CATEGORY
Identify the category: Tenant Rights, Labour Rights, Consumer Rights, etc.

## 🛡️ YOUR RIGHTS
List 3-5 specific rights the person has. Be crystal clear.

## 📜 RELEVANT LAW
Name the exact law/act that protects them.

## 👣 WHAT YOU SHOULD DO NOW
Step-by-step action plan. Be specific and practical.

## 🚫 WHAT THEY CANNOT DO TO YOU
List illegal actions the other party cannot take.

## ⚠️ DO NOT DO THIS
Common mistakes people make in this situation.

## 📝 COMPLAINT LETTER
Generate a complete, professional complaint/legal notice they can use.
Include proper legal format with date, addresses, subject, body, signature block.

## 📍 FREE LEGAL HELP
Mention District Legal Services Authority (DLSA) and how to access free legal aid.
Phone: 15100 (National Legal Services Authority Helpline)

## 📂 EVIDENCE TO COLLECT
List specific documents, photos, recordings, witnesses they should gather.

Use simple language. No legal jargon unless you immediately explain it.
Be empowering and action-oriented.`;

const COURTROOM_COACH_PROMPT = `You are Nyay AI in Courtroom Coach mode.

Your mission: Prepare people for court hearings by acting like a tough but fair judge.

Your approach:
1. Ask probing questions a real judge would ask
2. Challenge weak arguments respectfully
3. Help them anticipate opposing party's arguments
4. Strengthen their case with evidence suggestions
5. Build their confidence

Generate a CASE BRIEF with:

## 📋 CASE SUMMARY
- Facts of the case (chronological)
- Parties involved
- Legal violations alleged

## ⚖️ LEGAL BASIS
- Laws that support their case
- Precedents if any
- Constitutional provisions if applicable

## 📂 EVIDENCE AVAILABLE
- Documents they have
- Witnesses they can call
- Physical evidence

## 🎯 RELIEF REQUESTED
What exactly are they asking the court for?

## 🛡️ DEFENSE STRATEGY
How to respond to opposing arguments

## ⚠️ WEAKNESSES TO ADDRESS
Gaps in their case and how to handle them

## 💬 WHAT TO EXPECT IN COURT
Court procedures, what judge might ask, how to present themselves

Be firm but supportive. Help them build the strongest case possible.`;

const NYAY_WELCOME_BANNER = `⚖️ Nyay AI — Legal Rights Assistant

Describe your situation in your own words.
I will explain your rights, draft your complaint,
and help you prepare for legal action if needed.`;

function buildIntakeFlowPrompt(): string {
  return `
STEP 1 — Situation Intake

Question 1 — User Goal
What do you want right now?
- Understand my legal rights
- Draft a complaint / legal notice
- Prepare for court
- Find legal help near me
- Everything

Question 2 — Urgency
- Emergency
- Urgent this week
- Not urgent

Question 3 — Document Language
- English
- Hindi
- Telugu
- Tamil
- Bengali
- Marathi
- Kannada
- Gujarati
- Malayalam

Actions: Copy | Print | Share`;
}

async function callNyayAI(situation: string, mode: NyayMode, systemPrompt: string): Promise<string> {
  const response = await callBedrock(
    [{ role: 'user', content: situation }],
    systemPrompt,
    { maxTokens: 3000, temperature: mode === 'COURTROOM_COACH' ? 0.5 : 0.7 }
  );

  return response || '';
}

// ============================================================================
// EMERGENCY CONTACTS
// ============================================================================

const EMERGENCY_CONTACTS = {
  nationalLegalServices: '15100',
  police: '100',
  womenHelpline: '181',
  childHelpline: '1098',
  elderlyHelpline: '14567',
  ambulance: '102'
};

function getEmergencyResponse(category: LegalCategory, urgency?: string): {
  contacts: NyayResponse['emergencyContacts'];
  message: string;
} | null {
  if (urgency !== 'critical') return null;

  const baseContacts = {
    nationalLegalServices: EMERGENCY_CONTACTS.nationalLegalServices,
    police: EMERGENCY_CONTACTS.police
  };

  let message = '🚨 EMERGENCY LEGAL HELP NEEDED\n\n';

  if (category === 'DOMESTIC_VIOLENCE') {
    message += 'For immediate help with domestic violence:\n';
    message += `- Women Helpline: ${EMERGENCY_CONTACTS.womenHelpline}\n`;
    message += `- Police: ${EMERGENCY_CONTACTS.police}\n`;
    message += `- National Legal Services: ${EMERGENCY_CONTACTS.nationalLegalServices}\n\n`;
    message += 'You can file an FIR at the nearest police station. Women police officers are available.';
    
    return {
      contacts: {
        ...baseContacts,
        womenHelpline: EMERGENCY_CONTACTS.womenHelpline,
        emergencyMessage: message
      },
      message
    };
  }

  if (category === 'CRIMINAL_RIGHTS') {
    message += 'For immediate legal assistance:\n';
    message += `- Police: ${EMERGENCY_CONTACTS.police}\n`;
    message += `- Legal Aid: ${EMERGENCY_CONTACTS.nationalLegalServices}\n\n`;
    message += 'If arrested, you have the right to:\n';
    message += '1. Know the reason for arrest\n';
    message += '2. Inform a family member\n';
    message += '3. Free legal aid\n';
    message += '4. Medical examination\n';
    message += '5. Bail (in most cases)';

    return {
      contacts: {
        ...baseContacts,
        emergencyMessage: message
      },
      message
    };
  }

  return null;
}

// ============================================================================
// AWS DATA LAYER
// ============================================================================

async function queryLegalKnowledge(situation: string, category: LegalCategory): Promise<Array<{ title: string; uri: string; score: string }>> {
  const KENDRA_INDEX_ID = process.env.KENDRA_INDEX_ID;
  
  if (!KENDRA_INDEX_ID) {
    console.log('[Nyay AI] No Kendra index configured');
    return [];
  }

  try {
    const command = new QueryCommand({
      IndexId: KENDRA_INDEX_ID,
      QueryText: `Indian law ${category.toLowerCase().replace('_', ' ')} ${situation}`,
      PageSize: 5
    });

    const response = await clients.kendra.send(command);
    const findings = response.ResultItems?.map(item => ({
      title: item.DocumentTitle?.Text || 'Legal Document',
      uri: item.DocumentURI || '',
      score: item.ScoreAttributes?.ScoreConfidence || 'MEDIUM'
    })) || [];

    console.log(`[Nyay AI] Kendra found ${findings.length} legal documents`);
    return findings;
  } catch (error) {
    console.error('[Nyay AI] Kendra query error:', error);
    return [];
  }
}

async function getLegalAidCenters(location?: string): Promise<Array<{ name: string; contact: string; address: string }>> {
  try {
    // Query DynamoDB for legal aid centers
    // In production, this would query a table with DLSA information
    const defaultCenters = [
      {
        name: 'National Legal Services Authority',
        contact: '15100',
        address: 'Accessible nationwide via helpline'
      },
      {
        name: 'District Legal Services Authority',
        contact: 'Visit nearest district court',
        address: location ? `Check ${location} district court complex` : 'Visit your local district court'
      },
      {
        name: 'Tele-Law Services',
        contact: '1-800-103-8957',
        address: 'Free legal advice via phone/video call'
      }
    ];

    return defaultCenters;
  } catch (error) {
    console.error('[Nyay AI] Error fetching legal aid centers:', error);
    return [];
  }
}

async function analyzeSentiment(situation: string): Promise<Record<string, unknown> | null> {
  try {
    const command = new DetectSentimentCommand({
      Text: situation.slice(0, 5000), // Comprehend limit
      LanguageCode: 'en'
    });

    const response = await clients.comprehend.send(command);
    return {
      sentiment: response.Sentiment,
      scores: response.SentimentScore
    };
  } catch (error) {
    console.error('[Nyay AI] Sentiment analysis error:', error);
    return null;
  }
}

// ============================================================================
// SYSTEM PROMPT BUILDER
// ============================================================================

function buildNyaySystemPrompt(
  mode: NyayMode,
  category: LegalCategory,
  urgency?: string,
  userGoal?: string,
  kendraFindings?: Array<{ title: string; uri: string }>,
  legalAid?: Array<{ name: string; contact: string }>
): string {
  const basePrompt = mode === 'COURTROOM_COACH' ? COURTROOM_COACH_PROMPT : KNOW_YOUR_RIGHTS_PROMPT;
  
  let enhancedPrompt = basePrompt + '\n\n';
  
  enhancedPrompt += `## CONTEXT\n`;
  enhancedPrompt += `Legal Category: ${category.replace('_', ' ')}\n`;
  
  if (urgency) {
    enhancedPrompt += `Urgency Level: ${urgency.toUpperCase()}\n`;
  }
  
  if (userGoal) {
    enhancedPrompt += `User's Goal: ${userGoal}\n`;
  }
  
  if (kendraFindings && kendraFindings.length > 0) {
    enhancedPrompt += `\n## AVAILABLE LEGAL REFERENCES\n`;
    kendraFindings.forEach((finding, idx) => {
      enhancedPrompt += `${idx + 1}. ${finding.title}\n`;
    });
  }
  
  if (legalAid && legalAid.length > 0) {
    enhancedPrompt += `\n## FREE LEGAL AID AVAILABLE\n`;
    legalAid.forEach(center => {
      enhancedPrompt += `- ${center.name}: ${center.contact}\n`;
    });
  }
  
  enhancedPrompt += `\nNow provide comprehensive legal guidance based on the situation described.`;
  
  return enhancedPrompt;
}

// ============================================================================
// MAIN ENGINE FUNCTION
// ============================================================================

export async function runNyayEngine(input: NyayRequest): Promise<NyayResponse> {
  console.log('[Nyay AI] Processing legal query');
  console.log('[Nyay AI] Category:', input.legalCategory);
  console.log('[Nyay AI] Mode:', input.mode || 'KNOW_YOUR_RIGHTS');
  console.log('[Nyay AI] Urgency:', input.urgency || 'medium');

  const mode = input.mode || 'KNOW_YOUR_RIGHTS';
  const category = input.legalCategory || 'GENERAL_LEGAL';
  const situation = input.situation || input.query;
  const needsIntake = !input.userGoal || !input.documentLanguage || !input.urgency;

  // -------------------------------------------------------------------------
  // DATA COLLECTION PHASE
  // -------------------------------------------------------------------------
  
  const [kendraFindings, legalAid, sentiment] = await Promise.all([
    queryLegalKnowledge(situation, category),
    getLegalAidCenters(input.location),
    analyzeSentiment(situation)
  ]);

  // -------------------------------------------------------------------------
  // EMERGENCY HANDLING
  // -------------------------------------------------------------------------
  
  const emergencyResponse = getEmergencyResponse(category, input.urgency);
  let emergencyPrepend = '';
  
  if (emergencyResponse) {
    emergencyPrepend = emergencyResponse.message + '\n\n---\n\n';
  }

  // -------------------------------------------------------------------------
  // AI REASONING PHASE
  // -------------------------------------------------------------------------
  
  const systemPrompt = buildNyaySystemPrompt(
    mode,
    category,
    input.urgency,
    input.userGoal,
    kendraFindings,
    legalAid
  );

  const aiResponse = await callNyayAI(situation, mode, systemPrompt);

  // -------------------------------------------------------------------------
  // RESPONSE ASSEMBLY
  // -------------------------------------------------------------------------
  
  const intakePrompt = needsIntake ? `${buildIntakeFlowPrompt()}\n\n---\n\n` : '';
  const finalResponse = `${NYAY_WELCOME_BANNER}\n\n${intakePrompt}${emergencyPrepend}${aiResponse}`;

  const nyayResponse: NyayResponse = {
    engine: 'NyayAI',
    mode,
    legalCategory: category,
    response: finalResponse,
    emergencyContacts: emergencyResponse?.contacts,
    dataContext: {
      assumptions: [
        'Legal guidance based on Indian law',
        'Not a substitute for professional legal counsel',
        'Laws vary by state - verify with local authorities',
        'Free legal aid available through DLSA'
      ],
      kendraFindings,
      localLegalAid: legalAid,
      comprehendSentiment: sentiment
    },
    timestamp: new Date().toISOString()
  };

  // -------------------------------------------------------------------------
  // MULTILINGUAL SUPPORT (if requested)
  // -------------------------------------------------------------------------
  
  if (input.documentLanguage && input.documentLanguage !== 'English' && input.documentLanguage !== 'en') {
    try {
      const languageCodeMap: Record<string, string> = {
        'Hindi': 'hi',
        'Telugu': 'te',
        'Tamil': 'ta',
        'Bengali': 'bn',
        'Marathi': 'mr',
        'Kannada': 'kn',
        'Gujarati': 'gu',
        'Malayalam': 'ml'
      };
      
      const targetLang = languageCodeMap[input.documentLanguage] || 'hi';
      
      const translateCommand = new TranslateTextCommand({
        Text: finalResponse,
        SourceLanguageCode: 'en',
        TargetLanguageCode: targetLang
      });
      
      const translatedResult = await clients.translate.send(translateCommand);
      if (translatedResult.TranslatedText) {
        nyayResponse.response = translatedResult.TranslatedText;
      }
    } catch (error) {
      console.error('[Nyay AI] Translation error:', error);
      // Continue with English response
    }
  }

  console.log('[Nyay AI] Response generated successfully');
  return nyayResponse;
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  runNyayEngine
};
