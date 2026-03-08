import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { getBedrockClient } from './bedrockAI';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * ANNADATA Engine input structure
 */
export interface AnnadataInput {
  crop: string;
  location: string;
  question: string;
  additionalContext?: Record<string, unknown>;
}

/**
 * Mandi price information
 */
export interface MandiPrice {
  crop: string;
  location: string;
  price: number;
  unit: string;
  lastUpdated: string;
  trend: 'up' | 'down' | 'stable';
}

/**
 * Weather alert information
 */
export interface WeatherAlert {
  severity: 'low' | 'medium' | 'high' | 'critical';
  alert: string;
  recommendation: string;
}

/**
 * Government agriculture scheme
 */
export interface AgriculturalScheme {
  name: string;
  description: string;
  eligibility: string;
  benefits: string;
  applicationUrl?: string;
}

/**
 * ANNADATA Engine response structure
 */
export interface AnnadataResponse {
  cropPrice: MandiPrice | null;
  weatherAlert: WeatherAlert | null;
  advice: string;
  schemes: AgriculturalScheme[];
  timestamp: number;
  crop: string;
  location: string;
}

/**
 * Error response structure
 */
export interface AnnadataError {
  error: string;
  message: string;
  timestamp: number;
}

// ============================================================================
// MANDI PRICE DATABASE
// ============================================================================

/**
 * Simulated mandi price database
 * In production, this would connect to a real mandi price API or database
 */
const MANDI_PRICES: Record<string, Record<string, MandiPrice>> = {
  wheat: {
    punjab: {
      crop: 'wheat',
      location: 'Punjab',
      price: 2250,
      unit: 'per quintal',
      lastUpdated: new Date().toISOString(),
      trend: 'stable',
    },
    haryana: {
      crop: 'wheat',
      location: 'Haryana',
      price: 2240,
      unit: 'per quintal',
      lastUpdated: new Date().toISOString(),
      trend: 'up',
    },
    uttarpradesh: {
      crop: 'wheat',
      location: 'Uttar Pradesh',
      price: 2200,
      unit: 'per quintal',
      lastUpdated: new Date().toISOString(),
      trend: 'down',
    },
  },
  rice: {
    punjab: {
      crop: 'rice',
      location: 'Punjab',
      price: 2100,
      unit: 'per quintal',
      lastUpdated: new Date().toISOString(),
      trend: 'up',
    },
    karnataka: {
      crop: 'rice',
      location: 'Karnataka',
      price: 2050,
      unit: 'per quintal',
      lastUpdated: new Date().toISOString(),
      trend: 'stable',
    },
    westbengal: {
      crop: 'rice',
      location: 'West Bengal',
      price: 2080,
      unit: 'per quintal',
      lastUpdated: new Date().toISOString(),
      trend: 'down',
    },
  },
  sugarcane: {
    maharashtra: {
      crop: 'sugarcane',
      location: 'Maharashtra',
      price: 315,
      unit: 'per quintal',
      lastUpdated: new Date().toISOString(),
      trend: 'stable',
    },
    uttarpradesh: {
      crop: 'sugarcane',
      location: 'Uttar Pradesh',
      price: 320,
      unit: 'per quintal',
      lastUpdated: new Date().toISOString(),
      trend: 'up',
    },
    karnataka: {
      crop: 'sugarcane',
      location: 'Karnataka',
      price: 310,
      unit: 'per quintal',
      lastUpdated: new Date().toISOString(),
      trend: 'down',
    },
  },
  cotton: {
    andhra: {
      crop: 'cotton',
      location: 'Andhra Pradesh',
      price: 5800,
      unit: 'per quintal',
      lastUpdated: new Date().toISOString(),
      trend: 'up',
    },
    maharashtra: {
      crop: 'cotton',
      location: 'Maharashtra',
      price: 5750,
      unit: 'per quintal',
      lastUpdated: new Date().toISOString(),
      trend: 'stable',
    },
    gujarat: {
      crop: 'cotton',
      location: 'Gujarat',
      price: 5700,
      unit: 'per quintal',
      lastUpdated: new Date().toISOString(),
      trend: 'down',
    },
  },
};

// ============================================================================
// WEATHER ALERTS DATABASE
// ============================================================================

/**
 * Simulated weather alerts by location and season
 * In production, this would integrate with meteorological services
 */
const WEATHER_ALERTS: Record<string, WeatherAlert[]> = {
  punjab: [
    {
      severity: 'medium',
      alert: 'Heavy rainfall expected in next 48 hours',
      recommendation: 'Ensure proper drainage in fields. Avoid pesticide applications.',
    },
    {
      severity: 'low',
      alert: 'Temperature will drop to 8°C next week',
      recommendation: 'Monitor wheat crop for frost damage, especially in early morning hours.',
    },
  ],
  haryana: [
    {
      severity: 'low',
      alert: 'Fog expected during early morning hours',
      recommendation: 'Use caution during harvest operations. Ensure proper visibility.',
    },
  ],
  maharashtra: [
    {
      severity: 'high',
      alert: 'Heatwave warning: Temperatures may reach 42°C',
      recommendation: 'Increase irrigation frequency. Use mulching to retain soil moisture.',
    },
  ],
  karnataka: [
    {
      severity: 'medium',
      alert: 'Moderate winds with dust storms possible',
      recommendation: 'Secure loose items. Water crops before storms to prevent wilting.',
    },
  ],
};

// ============================================================================
// AGRICULTURE SCHEMES DATABASE
// ============================================================================

/**
 * Government agriculture schemes information
 */
const AGRICULTURAL_SCHEMES: AgriculturalScheme[] = [
  {
    name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
    description:
      'Comprehensive crop insurance scheme to protect farmers from crop losses',
    eligibility:
      'All farmers growing notified crops in notified areas with loanable land',
    benefits: 'Coverage against crop failure due to natural calamities',
    applicationUrl: 'https://pmfby.gov.in',
  },
  {
    name: 'Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)',
    description:
      'Irrigation efficiency program to ensure water availability for farming',
    eligibility: 'Farmers in drought-prone or water-scarce areas',
    benefits: 'Subsidized irrigation equipment and water conservation techniques',
    applicationUrl: 'https://aib.gov.in/pmksy',
  },
  {
    name: 'Soil Health Card Scheme',
    description: 'Provides farmers with soil testing and personalized nutrient recommendations',
    eligibility: 'All farmers in participating districts',
    benefits: 'Free soil testing and customized fertilizer recommendations',
    applicationUrl: 'https://soilhealth.dac.gov.in',
  },
  {
    name: 'e-NAM (National Agricultural Market)',
    description:
      'Online trading platform for agricultural commodities across mandis',
    eligibility: 'All farmers and agricultural traders',
    benefits: 'Direct market access, transparent pricing, reduced transaction costs',
    applicationUrl: 'https://www.enam.gov.in',
  },
  {
    name: 'Paramparagat Krishi Vikas Yojana (PKVY)',
    description:
      'Organic farming promotion scheme with incentives and technical support',
    eligibility: 'Farmers interested in organic farming',
    benefits: 'Subsidies for organic certification and biocompost production',
    applicationUrl: 'https://pkvy.dac.gov.in',
  },
  {
    name: 'Kisan Credit Card (KCC)',
    description: 'Credit facility for farmers to meet cultivation and investment needs',
    eligibility: 'Farming-dependent individuals with cultivable land',
    benefits: 'Low-interest agricultural loans with flexible repayment terms',
    applicationUrl: 'https://www.rbi.org.in',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch mandi price for a crop and location
 * @param crop Crop name
 * @param location Location/state name
 * @returns MandiPrice if found, null otherwise
 */
function fetchMandiPrice(crop: string, location: string): MandiPrice | null {
  try {
    const cropLower = crop.toLowerCase().trim();
    const locationLower = location.toLowerCase().trim().replace(/\s+/g, '');

    const cropPrices = MANDI_PRICES[cropLower];
    if (!cropPrices) {
      console.log(`No mandi data found for crop: ${crop}`);
      return null;
    }

    const price = cropPrices[locationLower];
    if (!price) {
      console.log(`No mandi price found for ${crop} in ${location}`);
      return null;
    }

    return price;
  } catch (error) {
    console.error('Error fetching mandi price:', error);
    return null;
  }
}

/**
 * Get weather alerts for a location
 * @param location Location/state name
 * @returns Array of weather alerts
 */
function getWeatherAlerts(location: string): WeatherAlert | null {
  try {
    const locationLower = location.toLowerCase().trim();
    const alerts = WEATHER_ALERTS[locationLower];

    if (!alerts || alerts.length === 0) {
      console.log(`No weather alerts found for location: ${location}`);
      return null;
    }

    // Return the most severe alert
    return alerts.reduce((prev, current) =>
      getSeverityLevel(current.severity) > getSeverityLevel(prev.severity)
        ? current
        : prev
    );
  } catch (error) {
    console.error('Error getting weather alerts:', error);
    return null;
  }
}

/**
 * Get severity level as a number for comparison
 * @param severity Severity string
 * @returns Numeric severity level
 */
function getSeverityLevel(severity: string): number {
  const levels: Record<string, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };
  return levels[severity] || 0;
}

/**
 * Get relevant agriculture schemes
 * @param crop Crop being cultivated
 * @returns Array of relevant schemes
 */
function getRelevantSchemes(crop: string): AgriculturalScheme[] {
  // Return all schemes as they're generally applicable
  // In production, you could filter based on crop type and farmer location
  return AGRICULTURAL_SCHEMES.slice(0, 3);
}

/**
 * Generate crop advice using Bedrock AI
 * @param crop Crop name
 * @param location Location
 * @param question Farmer's specific question
 * @param mandiPrice Current mandi price (if available)
 * @returns AI-generated advice
 */
async function generateCropAdvice(
  crop: string,
  location: string,
  question: string,
  mandiPrice: MandiPrice | null
): Promise<string> {
  try {
    const bedrockClient = getBedrockClient();

    let enhancedPrompt = `The farmer is asking about ${crop} in ${location}.\n`;

    if (mandiPrice) {
      enhancedPrompt += `Current mandi price for ${crop}: ₹${mandiPrice.price} ${mandiPrice.unit} (trend: ${mandiPrice.trend})\n`;
    }

    enhancedPrompt += `\nFarmer's question: ${question}`;

    const response = await bedrockClient.generateAIResponse(
      enhancedPrompt,
      'ANNADATA'
    );

    return response.generatedText;
  } catch (error) {
    console.error('Error generating crop advice:', error);
    throw error;
  }
}

// ============================================================================
// MAIN ENGINE HANDLER
// ============================================================================

/**
 * Parse input from API Gateway event
 * @param event API Gateway proxy event
 * @returns Parsed ANNADATA input
 */
function parseInput(event: APIGatewayProxyEvent): AnnadataInput {
  try {
    let body: any = {};

    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    }

    // Also check query parameters as fallback
    const queryParams = event.queryStringParameters || {};

    return {
      crop: body.crop || queryParams.crop || '',
      location: body.location || queryParams.location || '',
      question: body.question || queryParams.question || '',
      additionalContext: body.additionalContext,
    };
  } catch (error) {
    console.error('Error parsing input:', error);
    throw new Error('Invalid input format');
  }
}

/**
 * Validate ANNADATA input
 * @param input ANNADATA input to validate
 * @throws Error if validation fails
 */
function validateInput(input: AnnadataInput): void {
  if (!input.crop || input.crop.trim().length === 0) {
    throw new Error('Crop name is required');
  }

  if (!input.location || input.location.trim().length === 0) {
    throw new Error('Location is required');
  }

  if (!input.question || input.question.trim().length === 0) {
    throw new Error('Question is required');
  }
}

/**
 * Main ANNADATA engine handler
 * Processes farmer queries and returns comprehensive agricultural guidance
 */
async function processAnnadataRequest(
  input: AnnadataInput
): Promise<AnnadataResponse> {
  const response: AnnadataResponse = {
    crop: input.crop,
    location: input.location,
    cropPrice: null,
    weatherAlert: null,
    advice: '',
    schemes: [],
    timestamp: Date.now(),
  };

  try {
    // Fetch real-time mandi price
    console.log(`Fetching mandi price for ${input.crop} in ${input.location}`);
    response.cropPrice = fetchMandiPrice(input.crop, input.location);

    // Get weather alerts
    console.log(`Getting weather alerts for ${input.location}`);
    response.weatherAlert = getWeatherAlerts(input.location);

    // Generate crop advice using Bedrock AI
    console.log(`Generating crop advice for ${input.crop}`);
    response.advice = await generateCropAdvice(
      input.crop,
      input.location,
      input.question,
      response.cropPrice
    );

    // Get relevant agriculture schemes
    console.log(`Fetching agriculture schemes for ${input.crop}`);
    response.schemes = getRelevantSchemes(input.crop);

    console.log('ANNADATA processing completed successfully');

    return response;
  } catch (error) {
    console.error('Error processing ANNADATA request:', error);
    throw error;
  }
}

// ============================================================================
// AWS LAMBDA HANDLER
// ============================================================================

/**
 * Lambda handler for ANNADATA engine
 * Entry point for API Gateway events
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('ANNADATA Engine - Received event:', JSON.stringify(event, null, 2));

  try {
    // Parse input
    const input = parseInput(event);

    // Validate input
    validateInput(input);

    // Process request
    const response = await processAnnadataRequest(input);

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: response,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  } catch (error) {
    console.error('ANNADATA Engine Error:', error);

    const errorResponse: AnnadataError = {
      error: 'AnnadataEngineError',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: Date.now(),
    };

    return {
      statusCode: error instanceof Error && error.message.includes('required') ? 400 : 500,
      body: JSON.stringify({
        success: false,
        error: errorResponse,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
  fetchMandiPrice,
  getWeatherAlerts,
  getRelevantSchemes,
  generateCropAdvice,
  processAnnadataRequest,
  parseInput,
  validateInput,
};
