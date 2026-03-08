import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { getBedrockClient } from './bedrockAI';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface AtithiInput {
  destination?: string;
  duration?: number;
  interests: string[];
}

export interface Destination {
  name: string;
  state: string;
  description: string;
  bestTime: string;
  attractions: string[];
  averageCost: string;
}

export interface SafetyTip {
  category: string;
  tip: string;
  priority: 'high' | 'medium' | 'low';
}

export interface CulturalTip {
  aspect: string;
  tip: string;
  location?: string;
}

export interface PaymentGuide {
  method: string;
  safetyLevel: string;
  tipDescription: string;
}

export interface AtithiResponse {
  interests: string[];
  suggestions: Destination[];
  safetyGuidance: SafetyTip[];
  culturalTips: CulturalTip[];
  paymentGuide: PaymentGuide[];
  timestamp: number;
}

// ============================================================================
// DESTINATIONS DATABASE
// ============================================================================

const INDIAN_DESTINATIONS: Destination[] = [
  {
    name: 'Taj Mahal',
    state: 'Uttar Pradesh',
    description: 'One of the Seven Wonders of the World, a monument to love',
    bestTime: 'October to March',
    attractions: ['Taj Mahal', 'Agra Fort', 'Fatehpur Sikri'],
    averageCost: '₹5,000-15,000 per day',
  },
  {
    name: 'Kerala Backwaters',
    state: 'Kerala',
    description: 'Serene backwaters with houseboat cruises and lush greenery',
    bestTime: 'August to May',
    attractions: [
      'Houseboat cruises',
      'Kumarakom',
      'Munnar hill station',
    ],
    averageCost: '₹8,000-20,000 per day',
  },
  {
    name: 'Goa Beaches',
    state: 'Goa',
    description: 'Beautiful beaches, water sports, and vibrant nightlife',
    bestTime: 'November to February',
    attractions: [
      'Baga Beach',
      'Vagator Beach',
      'Fort Aguada',
    ],
    averageCost: '₹6,000-25,000 per day',
  },
  {
    name: 'Himalayan Trekking',
    state: 'Himachal Pradesh',
    description: 'Mountain adventures, trekking, and stunning landscapes',
    bestTime: 'May to October',
    attractions: [
      'Shimla',
      'Manali',
      'Triund Trek',
    ],
    averageCost: '₹4,000-12,000 per day',
  },
  {
    name: 'Jaipur Pink City',
    state: 'Rajasthan',
    description: 'Historic pink city with palaces, forts, and vibrant culture',
    bestTime: 'September to March',
    attractions: [
      'City Palace',
      'Hawa Mahal',
      'Jantar Mantar',
    ],
    averageCost: '₹3,000-10,000 per day',
  },
  {
    name: 'Mysore Palace',
    state: 'Karnataka',
    description: 'Grand palace of the erstwhile Mysore kingdom',
    bestTime: 'October to March',
    attractions: [
      'Mysore Palace',
      'Chamundeshwari Temple',
      'Brindavan Gardens',
    ],
    averageCost: '₹3,000-8,000 per day',
  },
  {
    name: 'Varanasi Spiritual Journey',
    state: 'Uttar Pradesh',
    description: 'Sacred city on the Ganges with spiritual significance',
    bestTime: 'October to March',
    attractions: [
      'Ghat walks',
      'Kashi Vishwanath Temple',
      'Ganges Aarti',
    ],
    averageCost: '₹2,000-6,000 per day',
  },
];

// ============================================================================
// SAFETY GUIDANCE
// ============================================================================

const SAFETY_TIPS: SafetyTip[] = [
  {
    category: 'Money & Valuables',
    tip: 'Keep most cash in your hotel safe. Use ATMs in busy, well-lit areas.',
    priority: 'high',
  },
  {
    category: 'Travel Documents',
    tip: 'Keep photocopies of passport and visa separate from originals.',
    priority: 'high',
  },
  {
    category: 'Water & Food',
    tip: 'Drink only bottled water and avoid street food from unhygienic vendors.',
    priority: 'high',
  },
  {
    category: 'Transportation',
    tip: 'Use registered taxis, Uber, or Ola. Avoid traveling alone at night.',
    priority: 'high',
  },
  {
    category: 'Health Precautions',
    tip: 'Get vaccinations before travel. Carry basic medicines and first-aid kit.',
    priority: 'medium',
  },
  {
    category: 'Emergency Contacts',
    tip: 'Save emergency numbers: Police (100), Ambulance (102), Tourist Helpline.',
    priority: 'high',
  },
  {
    category: 'Scam Awareness',
    tip: 'Avoid unsolicited offers for tours, gems, or deals. Use government guides.',
    priority: 'medium',
  },
  {
    category: 'Women Safety',
    tip: 'Travel in groups, especially at night. Avoid revealing clothing in conservative areas.',
    priority: 'medium',
  },
];

// ============================================================================
// CULTURAL TIPS
// ============================================================================

const CULTURAL_TIPS: CulturalTip[] = [
  {
    aspect: 'Greetings',
    tip: 'Use "Namaste" or "Namaskar" as a respectful greeting.',
  },
  {
    aspect: 'Temples & Religious Sites',
    tip: 'Remove shoes before entering temples. Don\'t point at deities.',
    location: 'All religious sites',
  },
  {
    aspect: 'Food Culture',
    tip: 'Eat with right hand. Avoid beef in Hindu communities and pork with Muslims.',
  },
  {
    aspect: 'Dress Code',
    tip: 'Dress modestly in religious areas. Cover shoulders and knees.',
  },
  {
    aspect: 'Photography',
    tip: 'Ask permission before photographing people or sacred rituals.',
  },
  {
    aspect: 'Festivals',
    tip: 'Participate respectfully in Holi, Diwali, and other festivals if invited.',
  },
  {
    aspect: 'Business Culture',
    tip: 'Exchange business cards with right hand. Avoid firm handshakes unless initiated.',
  },
  {
    aspect: 'Gift Giving',
    tip: 'Avoid leather items, flowers, or knives as gifts. Use both hands to give/receive.',
  },
];

// ============================================================================
// PAYMENT GUIDANCE
// ============================================================================

const PAYMENT_GUIDES: PaymentGuide[] = [
  {
    method: 'Cash',
    safetyLevel: 'Medium',
    tipDescription:
      'Indian Rupees widely accepted. Small denominations useful for local vendors.',
  },
  {
    method: 'Credit Cards',
    safetyLevel: 'High',
    tipDescription:
      'Accepted in cities and hotels. Inform bank of travel dates.',
  },
  {
    method: 'Debit Cards',
    safetyLevel: 'High',
    tipDescription:
      'ATMs widely available in cities. Check for skimming devices.',
  },
  {
    method: 'UPI (Google Pay, PhonePe)',
    safetyLevel: 'High',
    tipDescription:
      'Modern payment method in urban areas. Secure and widely accepted.',
  },
  {
    method: 'Traveler\'s Checks',
    safetyLevel: 'Medium',
    tipDescription:
      'Useful backup. Exchange at banks (high fees) rather than streets.',
  },
  {
    method: 'Wire Transfer',
    safetyLevel: 'High',
    tipDescription: 'Secure but slow. Arrange in advance.',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getDestinationSuggestions(interests: string[]): Destination[] {
  const suggestions: Destination[] = [];
  const interestMap: Record<string, Destination[]> = {
    adventure: [
      INDIAN_DESTINATIONS[3], // Himalayan Trekking
    ],
    culture: [
      INDIAN_DESTINATIONS[2], // Jaipur
      INDIAN_DESTINATIONS[6], // Varanasi
    ],
    nature: [
      INDIAN_DESTINATIONS[1], // Kerala
      INDIAN_DESTINATIONS[4], // Mysore
    ],
    history: [
      INDIAN_DESTINATIONS[0], // Taj Mahal
      INDIAN_DESTINATIONS[4], // Jaipur
    ],
    beach: [
      INDIAN_DESTINATIONS[2], // Goa
    ],
    spiritual: [
      INDIAN_DESTINATIONS[6], // Varanasi
    ],
  };

  for (const interest of interests) {
    const key = interest.toLowerCase();
    if (interestMap[key]) {
      suggestions.push(...interestMap[key]);
    }
  }

  // Remove duplicates and return
  const unique = Array.from(
    new Map(suggestions.map((item) => [item.name, item])).values()
  );
  return unique.length > 0 ? unique : INDIAN_DESTINATIONS.slice(0, 3);
}

async function generateTravelItinerary(
  destination: string,
  duration: number
): Promise<string> {
  try {
    const bedrockClient = getBedrockClient();

    const prompt = `Create a ${duration}-day travel itinerary for ${destination} in India.
    Include must-see attractions, local food to try, estimated costs, and travel tips.`;

    const response = await bedrockClient.generateAIResponse(prompt, 'DEFAULT');
    return response.generatedText;
  } catch (error) {
    console.error('Error generating itinerary:', error);
    return 'Unable to generate detailed itinerary at this time.';
  }
}

// ============================================================================
// MAIN ENGINE
// ============================================================================

async function processAtithiRequest(
  input: AtithiInput
): Promise<AtithiResponse> {
  const response: AtithiResponse = {
    interests: input.interests,
    suggestions: [],
    safetyGuidance: [],
    culturalTips: [],
    paymentGuide: [],
    timestamp: Date.now(),
  };

  try {
    console.log('Processing ATITHI travel request');

    response.suggestions = getDestinationSuggestions(input.interests);
    response.safetyGuidance = SAFETY_TIPS;
    response.culturalTips = CULTURAL_TIPS;
    response.paymentGuide = PAYMENT_GUIDES;

    return response;
  } catch (error) {
    console.error('Error processing ATITHI request:', error);
    throw error;
  }
}

function parseInput(event: APIGatewayProxyEvent): AtithiInput {
  const body = event.body ? JSON.parse(event.body) : {};
  return {
    destination: body.destination,
    duration: body.duration || 7,
    interests: body.interests || ['culture', 'nature'],
  };
}

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('ATITHI Engine - Received event:', JSON.stringify(event, null, 2));

  try {
    const input = parseInput(event);

    if (!input.interests || input.interests.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Interests array is required',
        }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    const response = await processAtithiRequest(input);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: response,
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (error) {
    console.error('ATITHI Engine Error:', error);

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

export { processAtithiRequest, getDestinationSuggestions, generateTravelItinerary };
