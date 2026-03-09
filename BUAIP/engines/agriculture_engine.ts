import { AGRICULTURE_ENGINE_PROMPT } from '@/prompts/agriculture_prompt';
import { invokeReasoningLLM } from '@/llm/llm_client';
import type { EngineOutput, EngineRunContext } from '@/engines/types';
import { getWeatherData, formatWeatherForLLM } from '@/app/lib/weatherService';

/**
 * Extract location from user message or entities
 */
function extractLocation(context: EngineRunContext): string | null {
  // Check extracted entities first
  if (context.extractedEntities?.location) {
    return context.extractedEntities.location;
  }
  if (context.extractedEntities?.state) {
    return context.extractedEntities.state;
  }
  if (context.extractedEntities?.district) {
    return context.extractedEntities.district;
  }

  // Check profile summary
  if (context.profileSummary) {
    const locationMatch = context.profileSummary.match(/location[:\s]+([a-zA-Z\s]+)/i);
    if (locationMatch) {
      return locationMatch[1].trim();
    }
  }

  // Try to extract from user message (common patterns)
  const message = context.userMessage.toLowerCase();
  const indianStates = [
    'punjab', 'haryana', 'uttar pradesh', 'up', 'madhya pradesh', 'mp',
    'maharashtra', 'rajasthan', 'gujarat', 'karnataka', 'andhra pradesh', 'ap',
    'telangana', 'tamil nadu', 'tn', 'west bengal', 'wb', 'bihar', 'odisha',
    'assam', 'kerala', 'himachal pradesh', 'hp', 'uttarakhand'
  ];

  for (const state of indianStates) {
    if (message.includes(state)) {
      return state;
    }
  }

  return null;
}

export async function runAgricultureEngine(context: EngineRunContext): Promise<EngineOutput> {
  const entityContext = context.extractedEntities
    ? Object.entries(context.extractedEntities)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
    : '';

  // Try to get real-time weather data
  let weatherContext = '';
  const location = extractLocation(context);
  
  if (location) {
    try {
      console.log(`Fetching weather data for location: ${location}`);
      const weatherData = await getWeatherData(location);
      if (weatherData) {
        weatherContext = formatWeatherForLLM(weatherData, location);
        console.log('Successfully fetched weather data');
      } else {
        console.log('Weather API not configured or location not found');
      }
    } catch (error) {
      console.error('Error fetching weather data:', error);
    }
  }

  const supportingContext = [
    context.profileSummary || '',
    entityContext ? `Extracted entities: ${entityContext}` : '',
    weatherContext || 'Weather data: Not available for this location. Provide general seasonal advice.',
  ].filter(Boolean).join('\n\n') || 'No additional farming context available. Infer region, season, and crop from the question when possible.';

  const reasoningText = await invokeReasoningLLM({
    domainPrompt: AGRICULTURE_ENGINE_PROMPT,
    userMessage: context.userMessage,
    conversationHistory: context.conversationHistory,
    supportingContext,
    languageContext: context.languageContext,
  });

  return {
    engineId: 'agriculture',
    domainSummary: 'Farming analysis and actionable crop/soil/irrigation guidance',
    reasoningText,
  };
}
