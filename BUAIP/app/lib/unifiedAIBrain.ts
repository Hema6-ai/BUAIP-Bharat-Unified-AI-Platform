/**
 * BUAIP Unified AI Brain
 * 
 * Single intelligent AI assistant that routes internally using Claude.
 * Users see only a chat interface - no engine selectors.
 * Claude decides which capability to use internally.
 */

import { callBedrock } from './bedrock';

interface AIBrainRequest {
  userMessage: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  userId?: string;
}

interface AIBrainResponse {
  response: string;
  capability?: 'scheme' | 'agriculture' | 'legal' | 'entrepreneurship' | 'exports' | 'travel' | 'general';
  reasoning?: string;
}

/**
 * Main system prompt for the unified AI brain
 * This is the core instruction that makes Claude intelligent about routing
 */
const SYSTEM_PROMPT = `You are BUAIP - an intelligent AI assistant for government services in India.

Your capabilities:
1. **Government Schemes** - Help citizens find and understand eligibility for government schemes
2. **Agriculture (ANNADATA)** - Provide farming advice, mandi prices, weather alerts, agricultural schemes
3. **Legal (NYAYA)** - Provide legal guidance, rights information, complaint procedures
4. **Entrepreneurship (UDYOG)** - Help with business registration, loans, skill development, incubation
5. **Export (GlobalSeller)** - Guide on export procedures, international trade, compliance, tariffs
6. **Travel (ATITHI)** - Suggest travel destinations, logistics, cultural tips, safety guidelines
7. **General Conversation** - Friendly assistant for any other queries

YOU MUST:
- Understand user intent naturally without asking them to select an engine
- Route internally to the appropriate capability based on context
- Respond conversationally and helpfully
- Never mention "engines" or "selectors" to the user
- Never ask the user to choose between capabilities
- Provide clear, actionable advice in the language they use
- Be friendly and helpful like a personal AI assistant

BEHAVIOR:
- If unsure which capability fits, use your best judgment
- For scheme queries, ask clarifying questions about their profile (income, state, category, etc.) one at a time
- For agriculture, provide current advice based on text (you may not have real-time market data)
- For legal, always suggest consulting qualified lawyers for specific legal advice
- For entrepreneurship, provide step-by-step guidance
- For exports, explain procedures clearly
- For travel, give personalized recommendations
- For general questions, respond naturally

Start by understanding the user, not by asking which engine they want to use.
Respond naturally, as if you're a knowledgeable assistant who knows how to help with many things.`;

/**
 * Process a user message and generate an AI response using the unified brain
 */
export async function processMessageWithUnifiedBrain(
  request: AIBrainRequest
): Promise<AIBrainResponse> {
  const { userMessage, conversationHistory = [] } = request;

  if (!userMessage.trim()) {
    return {
      response: "Please share your question or what you need help with.",
      capability: 'general',
    };
  }

  try {
    // Build the conversation context
    let conversationContext = '';
    if (conversationHistory.length > 0) {
      conversationContext = '\n\nPrevious conversation:\n';
      conversationHistory.forEach((msg) => {
        conversationContext += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
    }

    // First, use Claude to determine which capability is most relevant and generate response
    const routingPrompt = `${SYSTEM_PROMPT}${conversationContext}

User's message: "${userMessage}"

Respond naturally and helpfully. Route to the appropriate capability internally without mentioning it.`;

    const response = await callBedrock(routingPrompt, {
      maxTokens: 1500,
      temperature: 0.7,
    });

    // Detect which capability was used based on response content
    const capability = detectCapability(userMessage, response);

    return {
      response: response.trim(),
      capability,
    };
  } catch (error) {
    console.error('Error in unified AI brain:', error);
    throw error;
  }
}

/**
 * Detect which capability was most likely used based on user message and response
 */
function detectCapability(
  userMessage: string,
  response: string
): 'scheme' | 'agriculture' | 'legal' | 'entrepreneurship' | 'exports' | 'travel' | 'general' {
  const lowerMessage = userMessage.toLowerCase();
  const lowerResponse = response.toLowerCase();

  // Scheme detection
  if (
    lowerMessage.includes('scheme') ||
    lowerMessage.includes('eligible') ||
    lowerMessage.includes('government benefit') ||
    lowerMessage.includes('subsidy') ||
    lowerResponse.includes('scheme') ||
    lowerResponse.includes('eligibility')
  ) {
    return 'scheme';
  }

  // Agriculture detection
  if (
    lowerMessage.includes('farm') ||
    lowerMessage.includes('crop') ||
    lowerMessage.includes('agricultural') ||
    lowerMessage.includes('mandi') ||
    lowerMessage.includes('agriculture') ||
    lowerResponse.includes('agriculture') ||
    lowerResponse.includes('farming')
  ) {
    return 'agriculture';
  }

  // Legal detection
  if (
    lowerMessage.includes('legal') ||
    lowerMessage.includes('law') ||
    lowerMessage.includes('complaint') ||
    lowerMessage.includes('court') ||
    lowerMessage.includes('right') ||
    lowerResponse.includes('legal') ||
    lowerResponse.includes('law')
  ) {
    return 'legal';
  }

  // Entrepreneurship detection
  if (
    lowerMessage.includes('business') ||
    lowerMessage.includes('entrepreneurship') ||
    lowerMessage.includes('startup') ||
    lowerMessage.includes('udyog') ||
    lowerMessage.includes('loan') ||
    lowerMessage.includes('registration') ||
    lowerResponse.includes('business') ||
    lowerResponse.includes('startup')
  ) {
    return 'entrepreneurship';
  }

  // Export/Trade detection
  if (
    lowerMessage.includes('export') ||
    lowerMessage.includes('trade') ||
    lowerMessage.includes('amazon seller') ||
    lowerMessage.includes('marketplace') ||
    lowerMessage.includes('sourcing manufacturer') ||
    lowerMessage.includes('supply chain') ||
    lowerMessage.includes('pricing strategy') ||
    lowerMessage.includes('seller policy') ||
    lowerMessage.includes('logistics') ||
    lowerMessage.includes('flipkart') ||
    lowerMessage.includes('meesho') ||
    lowerMessage.includes('jiomart') ||
    lowerMessage.includes('gst') ||
    lowerMessage.includes('festival demand') ||
    lowerMessage.includes('international') ||
    lowerMessage.includes('globalseller') ||
    lowerResponse.includes('export') ||
    lowerResponse.includes('trade')
  ) {
    return 'exports';
  }

  // Travel detection
  if (
    lowerMessage.includes('travel') ||
    lowerMessage.includes('trip') ||
    lowerMessage.includes('destination') ||
    lowerMessage.includes('visit') ||
    lowerMessage.includes('tourism') ||
    lowerResponse.includes('travel') ||
    lowerResponse.includes('destination')
  ) {
    return 'travel';
  }

  return 'general';
}

/**
 * Test the unified brain
 */
export async function testUnifiedBrain() {
  const testMessages = [
    'Hello',
    'What schemes can I get with 3 lakh income?',
    'I have 2 acres of land and grow rice',
    'What are my legal rights as a tenant?',
    'I want to start a business',
    'How to export my products to the USA?',
    'Suggest good places to visit in Kerala',
  ];

  console.log('Testing Unified AI Brain...\n');

  for (const message of testMessages) {
    const result = await processMessageWithUnifiedBrain({
      userMessage: message,
    });
    console.log(`User: "${message}"`);
    console.log(`Capability: ${result.capability}`);
    console.log(`Response: ${result.response}\n`);
  }
}
