import { callBedrock } from '@/app/lib/bedrock';
import { getCityContext, getAllCities } from '@/lib/locationHelper';
import {
  detectCityInQuestion,
  isEmergencyQuery,
  isNearbyQuery,
  isTransportQuery
} from '@/lib/atithiLocation';
import tourismData from '@/data/indiaTourism.json';
import scamAlerts from '@/data/scamAlerts.json';
import indiaServices from '@/data/indiaServices.json';

interface AtithiRequest {
  module: string;
  question: string;
  language: string;
}

interface AtithiResponse {
  explanation: string;
  steps?: string[];
  safetyTips?: string[];
  voiceReadyText: string;
  destinations?: Array<{
    name: string;
    description: string;
    bestTime?: string;
    highlights?: string[];
  }>;
  placesToVisit?: string[];
  itinerary?: Array<{
    day: string;
    location: string;
    activities: string[];
  }>;
  nearbyServices?: {
    serviceType: string;
    city: string;
    results: Array<{
      name: string;
      address?: string;
      phone?: string;
      type?: string;
      details?: string;
    }>;
    instructions: string;
    emergencyNumber?: string;
  };
  cityContext?: any;
}

// Detect specific intent from user question
function detectIntent(module: string, question: string): string {
  const q = question.toLowerCase();
  
  // Module-specific intent detection
  switch (module) {
    case 'arrival':
      if (q.includes('airport') || q.includes('customs')) return 'arrival';
      if (q.includes('sim') || q.includes('card')) return 'sim';
      if (q.includes('currency') || q.includes('exchange')) return 'currency';
      if (q.includes('visa')) return 'visa';
      return 'arrival';
      
    case 'explainer':
      if (q.includes('upi') || q.includes('payment') || q.includes('money')) return 'payment';
      if (q.includes('train') || q.includes('rail')) return 'train';
      if (q.includes('bus') || q.includes('transport')) return 'transport';
      return 'general';
      
    case 'language':
      if (q.includes('translate') || q.includes('say')) return 'translation';
      if (q.includes('phrase') || q.includes('word')) return 'phrases';
      return 'language';
      
    case 'scam':
      if (q.includes('taxi') || q.includes('rickshaw')) return 'taxi';
      if (q.includes('shop') || q.includes('price')) return 'shopping';
      if (q.includes('guide') || q.includes('tour')) return 'tour';
      return 'scam';
      
    case 'emergency':
      if (q.includes('hospital') || q.includes('doctor')) return 'hospital';
      if (q.includes('police')) return 'police';
      if (q.includes('embassy') || q.includes('consulate')) return 'embassy';
      if (q.includes('lost') || q.includes('stolen')) return 'lost';
      return 'emergency';
      
    case 'culture':
      if (q.includes('temple') || q.includes('mosque') || q.includes('church')) return 'religion';
      if (q.includes('dress') || q.includes('clothes')) return 'dress';
      if (q.includes('etiquette') || q.includes('behavior')) return 'etiquette';
      return 'culture';
      
    case 'food':
      if (q.includes('street food')) return 'street';
      if (q.includes('water') || q.includes('drink')) return 'water';
      if (q.includes('vegetarian') || q.includes('vegan')) return 'dietary';
      if (q.includes('safe') || q.includes('hygiene')) return 'safety';
      return 'food';
      
    case 'expat':
      if (q.includes('frro') || q.includes('registration')) return 'frro';
      if (q.includes('visa') || q.includes('extension')) return 'visa';
      if (q.includes('bank') || q.includes('account')) return 'bank';
      if (q.includes('rent') || q.includes('flat')) return 'rental';
      return 'expat';
      
    case 'tourism':
      if (q.includes('delhi')) return 'delhi';
      if (q.includes('agra') || q.includes('taj')) return 'agra';
      if (q.includes('jaipur') || q.includes('rajasthan')) return 'jaipur';
      if (q.includes('goa')) return 'goa';
      if (q.includes('kerala')) return 'kerala';
      if (q.includes('mumbai')) return 'mumbai';
      if (q.includes('bangalore') || q.includes('bengaluru')) return 'bangalore';
      return 'tourism';
      
    default:
      return 'general';
  }
}

// Detect cities mentioned in the question
function detectCities(question: string): string[] {
  const allCities = getAllCities();
  const detectedCities: string[] = [];
  const lowerQuestion = question.toLowerCase();
  
  for (const city of allCities) {
    if (lowerQuestion.includes(city.toLowerCase())) {
      detectedCities.push(city);
    }
  }
  
  return detectedCities;
}

// Detect if user is asking for itinerary
function isItineraryRequest(question: string): boolean {
  const q = question.toLowerCase();
  return (
    q.includes('itinerary') ||
    q.includes('day trip') ||
    q.includes('days in') ||
    (q.match(/\d+\s*day/i) !== null) ||
    q.includes('tour plan') ||
    q.includes('travel plan')
  );
}

// Extract number of days from question
function extractDays(question: string): number | null {
  const match = question.match(/(\d+)\s*day/i);
  return match ? parseInt(match[1]) : null;
}

// Get tourism data for a city
function getTourismData(city: string) {
  return tourismData.find(
    (data: any) => data.city.toLowerCase() === city.toLowerCase()
  );
}

// Get scam alerts for a city
function getScamAlerts(city: string) {
  return scamAlerts.find(
    (data: any) => data.city.toLowerCase() === city.toLowerCase()
  );
}

// Get nearby services for a city
function getNearbyServices(city: string, serviceType: string = 'all') {
  const serviceData = indiaServices.find(
    (data: any) => data.city.toLowerCase() === city.toLowerCase()
  );

  if (!serviceData) {
    return null;
  }

  const results: any[] = [];
  let instructions = '';
  let emergencyNumber = '';

  switch (serviceType.toLowerCase()) {
    case 'hospital':
    case 'emergency':
      results.push(...(serviceData.hospitals || []));
      instructions = 'Call 108 for emergency ambulance. Major hospitals listed above accept international insurance.';
      break;

    case 'police':
    case 'lost':
      results.push(...(serviceData.policeStations || []));
      emergencyNumber = '100';
      instructions = 'Call 100 for police emergencies. Tourist police stations provide English support.';
      break;

    case 'atm':
    case 'bank':
      results.push(...(serviceData.atms || []));
      instructions = 'Most ATMs accept international cards. Withdraw during business hours for support. Keep backup payment methods.';
      break;

    case 'tourist':
    case 'tourism':
      results.push(...(serviceData.touristPlaces || []));
      instructions = 'These are major tourist attractions. Guide services available at most locations. Check opening hours before visiting.';
      break;

    case 'transport':
      results.push(...(serviceData.transport || []));
      instructions = 'Recommended transport options in ' + city + '. Use official/booked options for safety.';
      break;

    default:
      // Return all services
      results.push(...(serviceData.hospitals || []));
      results.push(...(serviceData.policeStations || []));
      results.push(...(serviceData.atms || []));
      results.push(...(serviceData.touristPlaces || []));
      results.push(...(serviceData.transport || []));
      instructions = 'Various services available in ' + city + '.';
  }

  return {
    serviceType,
    city,
    results,
    instructions,
    emergencyNumber
  };
}

// Build dynamic prompt based on module and intent
function buildAtithiPrompt(request: AtithiRequest, intent: string, additionalData?: {
  isEmergency?: boolean;
  isNearby?: boolean;
  isTransport?: boolean;
  emergencyCity?: string;
  nearbyServices?: any;
}): string {
  // Detect cities and gather context
  const detectedCities = detectCities(request.question);
  const isItinerary = isItineraryRequest(request.question);
  const days = extractDays(request.question);
  
  // Load city-specific data
  let cityContextData = null;
  let tourismInfo = null;
  let scamInfo = null;
  let nearbyServicesData = null;
  
  if (detectedCities.length > 0) {
    const primaryCity = detectedCities[0];
    cityContextData = getCityContext(primaryCity);
    tourismInfo = getTourismData(primaryCity);
    scamInfo = getScamAlerts(primaryCity);
    
    // Get emergency services if needed
    if (additionalData?.isEmergency || additionalData?.isNearby) {
      let serviceType = 'all';
      if (request.question.toLowerCase().includes('hospital') || request.question.toLowerCase().includes('doctor')) {
        serviceType = 'hospital';
      } else if (request.question.toLowerCase().includes('police')) {
        serviceType = 'police';
      } else if (request.question.toLowerCase().includes('atm')) {
        serviceType = 'atm';
      } else if (request.question.toLowerCase().includes('transport') || additionalData.isTransport) {
        serviceType = 'transport';
      }
      
      nearbyServicesData = getNearbyServices(primaryCity, serviceType);
    }
  }
  
  // Build city context injection
  let cityContextSection = '';
  if (cityContextData) {
    cityContextSection = `
CITY CONTEXT FOR ${cityContextData.city}:
- State: ${cityContextData.state}
- Safety Level: ${cityContextData.safetyLevel}
- Transport: ${cityContextData.transportOptions.join(', ')}
- Popular Areas: ${cityContextData.popularAreas.join(', ')}
- Emergency Police: ${cityContextData.emergencyNumbers.police}
- Emergency Ambulance: ${cityContextData.emergencyNumbers.ambulance}
${cityContextData.emergencyNumbers.touristHelpline ? `- Tourist Helpline: ${cityContextData.emergencyNumbers.touristHelpline}` : ''}
- Best Time to Visit: ${cityContextData.bestTimeToVisit}
`;
  }
  
  // Build tourism data injection
  let tourismSection = '';
  if (tourismInfo) {
    tourismSection = `
TOURISM DATA FOR ${tourismInfo.city}:
Attractions: ${tourismInfo.attractions.join(', ')}
Best Season: ${tourismInfo.bestSeason}
Recommended Days: ${tourismInfo.daysRecommended}
Travel Tips: ${tourismInfo.travelTips.join('; ')}
Must Try: ${tourismInfo.mustTry.join('; ')}
Nearby: ${tourismInfo.nearbyDestinations.join(', ')}
`;
  }
  
  // Build scam alerts injection
  let scamSection = '';
  if (scamInfo && scamInfo.scams) {
    scamSection = `
SCAM ALERTS FOR ${scamInfo.city}:
${scamInfo.scams.map((s: any) => `
- ${s.type}: ${s.description}
  How to Avoid: ${s.howToAvoid}
  ${s.fairPrice ? `Fair Price: ${s.fairPrice}` : ''}
`).join('\n')}
`;
  }
  
  // Build nearby services injection
  let nearbyServicesSection = '';
  if (nearbyServicesData) {
    nearbyServicesSection = `
NEARBY SERVICES IN ${nearbyServicesData.city}:
Type: ${nearbyServicesData.serviceType}
${nearbyServicesData.results.slice(0, 5).map((service: any) => {
      if (service.name) {
        return `- ${service.name}${service.address ? ' (' + service.address + ')' : ''}${service.phone ? ' - ' + service.phone : ''}`;
      } else if (service.type && service.note) {
        return `- ${service.type}: ${service.note}`;
      }
      return '';
    }).filter((s: string) => s).join('\n')}
Emergency Contact: ${nearbyServicesData.emergencyNumber || 'N/A'}
Instructions: ${nearbyServicesData.instructions}
`;
  }
  
  // Build itinerary-specific instruction
  let itineraryInstruction = '';
  if (isItinerary && days) {
    itineraryInstruction = `
ITINERARY REQUEST DETECTED:
The traveler wants a ${days}-day travel plan. Generate a day-by-day itinerary with:
- Day 1-X: Location
- Morning/Afternoon/Evening activities
- Where to stay
- How to travel between locations
- Practical tips for each day

Use the tourism data provided to recommend actual attractions.
`;
  }

  const moduleInstructions: Record<string, string> = {
    arrival: `You are an AIRPORT ARRIVAL ASSISTANT at an Indian international airport.

TRAVELER QUESTION: ${request.question}
${cityContextSection}

Help with:
- Immigration and customs procedures
- SIM card purchase (where, which carriers, documents needed)
- Currency exchange (rates, locations, safety)
- Visa on arrival procedures
- First steps after landing
- Airport facilities

Be specific about:
✓ Exact locations (Terminal, Floor, Area)
✓ Documents required
✓ Expected costs in INR
✓ Step-by-step process
✓ Safety warnings`,

    explainer: `You are an INDIA SYSTEM EXPLAINER helping foreigners understand Indian systems.

TRAVELER QUESTION: ${request.question}

Explain clearly:
- UPI payment system (how to set up, use, which apps)
- Train booking (IRCTC, Tatkal, classes)
- Bus systems (KSRTC, MSRTC, etc.)
- Indian bureaucracy basics
- Common systems foreigners find confusing

Use:
✓ Simple step-by-step instructions
✓ Specific app names and links
✓ Common problems and fixes
✓ Safety tips for digital payments`,

    language: `You are a LANGUAGE SURVIVAL KIT for India.

TRAVELER QUESTION: ${request.question}

Provide:
- Essential Hindi/local phrases with pronunciation
- Translation help
- Cultural context for phrases
- Emergency phrases
- Common signs and their meanings

Format phrases as:
English → Hindi (pronunciation) → When to use`,

    scam: `You are a SCAM WARNING ADVISOR for India.

TRAVELER QUESTION: ${request.question}
${cityContextSection}
${scamSection}

Alert about:
- Common taxi/rickshaw scams (fake meters, long routes)
- Fake tour guides
- Overcharging tactics
- Credit card fraud
- Fake gemstone/carpet scams
- Commission schemes

For each scam:
✓ How it works
✓ How to recognize it
✓ How to avoid it
✓ What to do if it happens
✓ Fair prices/rates

USE THE SCAM ALERTS DATA PROVIDED ABOVE to give accurate, city-specific warnings.`,

    emergency: `You are an EMERGENCY ASSISTANCE COORDINATOR for India.

TRAVELER QUESTION: ${request.question}
${cityContextSection}
${nearbyServicesSection}

Provide:
- Emergency numbers (100-Police, 108-Ambulance, 101-Fire)
- Nearest hospital locations
- Embassy contact information
- What to do in emergencies
- How to communicate in crisis

Be specific about:
✓ Exact phone numbers
✓ Addresses
✓ 24/7 availability
✓ English-speaking services
✓ Insurance procedures

USE THE CITY CONTEXT DATA AND NEARBY SERVICES PROVIDED to give accurate emergency contacts and locations.`,

    culture: `You are a CULTURAL GUIDE for India.

TRAVELER QUESTION: ${request.question}

Explain:
- Temple/religious site etiquette
- Dress code requirements
- Photography restrictions
- Shoes removal customs
- Gender-specific rules
- Dietary customs
- Gift-giving etiquette

Always mention:
✓ What is respectful
✓ What might offend
✓ Regional variations
✓ Modern vs traditional practices`,

    food: `You are a FOOD SAFETY GUIDE for India.

TRAVELER QUESTION: ${request.question}
${tourismSection}

Advise on:
- Safe street food choices
- Water safety (bottled brands, filtering)
- Vegetarian/vegan options (India is great for this!)
- Hygiene indicators
- Common stomach issues and prevention
- Which foods to avoid initially

For each recommendation:
✓ Safety level
✓ Where to find it
✓ Price range
✓ Health tips

USE THE TOURISM DATA "Must Try" section if available.`,

    expat: `You are a LONG-STAY ASSISTANT for India.

TRAVELER QUESTION: ${request.question}
${cityContextSection}

Guide on:
- FRRO registration (mandatory for stays >180 days)
- Visa extensions (process, documents, offices)
- Opening bank accounts (which banks, documents needed)
- Renting accommodation (deposits, agreements)
- Long-term mobile plans
- Healthcare registration

Provide:
✓ Official office addresses
✓ Required documents
✓ Processing times
✓ Fees in INR
✓ Online vs offline process`,

    tourism: `You are a TOURIST DESTINATION EXPERT for India.

TRAVELER QUESTION: ${request.question}
${cityContextSection}
${tourismSection}
${itineraryInstruction}

Recommend destinations based on:
- Traveler interests
- Season/weather
- Budget
- Time available
- Accessibility

For each destination provide:
✓ Key attractions from the TOURISM DATA
✓ Best time to visit
✓ How many days needed
✓ Getting there
✓ Where to stay (budget range)
✓ Local specialties (use "Must Try" data)
✓ Safety tips
✓ Hidden gems

Popular circuits:
- Golden Triangle: Delhi → Agra → Jaipur (5-7 days)
- South India: Kerala, Karnataka, Tamil Nadu (10-14 days)
- Rajasthan: Udaipur, Jodhpur, Jaisalmer (7-10 days)
- Northeast: Sikkim, Meghalaya, Assam (10-12 days)
- Goa beaches (4-7 days)
- Himalayas: Manali, Leh, Rishikesh (7-10 days)

USE THE TOURISM DATA PROVIDED. Include actual attraction names, not generic descriptions.`
  };

  const baseInstruction = moduleInstructions[request.module] || moduleInstructions['explainer'];

  return `${baseInstruction}

${request.language !== 'en' ? `CRITICAL: Respond ENTIRELY in ${getLanguageName(request.language)}. Every word must be in ${getLanguageName(request.language)}.` : ''}

TONE AND STYLE:
- Be a friendly local guide
- Use simple, clear language
- Be practical, not academic
- Focus on what the traveler should DO
- Anticipate follow-up questions
- Be encouraging and welcoming

RESPONSE FORMAT (STRICT JSON):
{
  "explanation": "Clear 2-3 sentence answer to the question",
  "steps": ["Step 1: specific action", "Step 2: ...", ...] (if applicable),
  "safetyTips": ["Tip 1", "Tip 2", ...] (if relevant),
  "voiceReadyText": "Simplified spoken version in 2-3 short sentences",
  "placesToVisit": ["Place 1", "Place 2", ...] (ONLY if relevant),
  "destinations": [{"name": "Place", "description": "...", "bestTime": "...", "highlights": ["..."]}] (ONLY for tourism module),
  "itinerary": [{"day": "Day 1", "location": "City", "activities": ["Activity 1", "Activity 2"]}] (ONLY if itinerary requested)
}

SAFETY FIRST:
Always include safety warnings where relevant:
- Scam alerts (use provided data)
- Health precautions
- Cultural sensitivity
- Legal requirements
- Emergency contacts (use provided data)

Respond ONLY with JSON, no markdown or explanation.

Now answer the traveler's question:`;
}

function getLanguageName(code: string): string {
  const map: Record<string, string> = {
    en: 'English',
    hi: 'Hindi (हिंदी)',
    te: 'Telugu (తెలుగు)',
    ta: 'Tamil (தமிழ்)'
  };
  return map[code] || 'English';
}

export async function POST(req: Request) {
  try {
    const body: AtithiRequest = await req.json();
    
    // Validate request
    if (!body.module || !body.question || !body.language) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: module, question, or language' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Detect query type
    const isEmergency = isEmergencyQuery(body.question);
    const isNearby = isNearbyQuery(body.question);
    const isTransport = isTransportQuery(body.question);
    const emergencyCity = detectCityInQuestion(body.question) || 'current city';
    
    const intent = detectIntent(body.module, body.question);
    
    // Get nearby services if needed
    let nearbyServices = null;
    if (isEmergency || isNearby) {
      const detectedCities = detectCities(body.question);
      if (detectedCities.length > 0) {
        let serviceType = 'all';
        if (body.question.toLowerCase().includes('hospital') || body.question.toLowerCase().includes('doctor')) {
          serviceType = 'hospital';
        } else if (body.question.toLowerCase().includes('police') || body.question.toLowerCase().includes('lost')) {
          serviceType = 'police';
        } else if (body.question.toLowerCase().includes('atm')) {
          serviceType = 'atm';
        } else if (isTransport) {
          serviceType = 'transport';
        }
        
        nearbyServices = getNearbyServices(detectedCities[0], serviceType);
      }
    }
    
    const prompt = buildAtithiPrompt(body, intent, {
      isEmergency,
      isNearby,
      isTransport,
      emergencyCity,
      nearbyServices
    });
    
    // Call Bedrock
    const rawResponse = await callBedrock(prompt, {
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      maxTokens: 2000,
      temperature: 0.4 // Slightly more creative for travel recommendations
    });
    
    // Parse response
    let parsedResponse: AtithiResponse;
    
    try {
      // Extract JSON from response
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const aiResponse = JSON.parse(jsonMatch[0]);
      
      parsedResponse = {
        explanation: aiResponse.explanation || 'Here is what you need to know.',
        steps: Array.isArray(aiResponse.steps) ? aiResponse.steps : undefined,
        safetyTips: Array.isArray(aiResponse.safetyTips) ? aiResponse.safetyTips : undefined,
        voiceReadyText: aiResponse.voiceReadyText || aiResponse.explanation || 'Check the detailed response above.',
        destinations: Array.isArray(aiResponse.destinations) ? aiResponse.destinations : undefined,
        placesToVisit: Array.isArray(aiResponse.placesToVisit) ? aiResponse.placesToVisit : undefined,
        itinerary: Array.isArray(aiResponse.itinerary) ? aiResponse.itinerary : undefined,
        nearbyServices: nearbyServices || undefined
      };
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw response:', rawResponse);
      
      // Fallback response
      parsedResponse = {
        explanation: 'I understand your question. Let me help you navigate this aspect of India. The information you need is being prepared.',
        steps: [
          'Take note of the key points I mentioned',
          'Ask me if you need more specific details',
          'Stay safe and enjoy your time in India'
        ],
        voiceReadyText: 'I can help you with that. Please ask me for more specific details if needed.',
        safetyTips: ['Always keep emergency numbers saved', 'Trust official sources', 'Ask locals for confirmation'],
        nearbyServices: nearbyServices || undefined
      };
    }
    
    return new Response(JSON.stringify(parsedResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('ATITHI API Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to get response',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
