import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';

// Lazy import of the new JS engine to keep existing handlers untouched.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const globalSellerRuntime = require('../engines/global_seller_engine.js');

// Import PathAI engine
import { handler as pathaiEngineHandler } from './pathaiEngine';

// Engine handler type
type EngineHandler = (
  event: APIGatewayProxyEvent,
  context: Context
) => Promise<APIGatewayProxyResult>;

// ============================================================================
// ENGINE HANDLERS
// ============================================================================

/**
 * Scheme Eligibility Engine
 * Determines user eligibility for various government schemes
 */
const schemeEligibilityHandler: EngineHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
) => {
  try {
    const body = JSON.parse(event.body || '{}');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        engine: 'schemeEligibility',
        message: 'Scheme eligibility analysis completed',
        data: {
          eligible_schemes: [],
          analysis: body,
        },
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        engine: 'schemeEligibility',
        error: 'Failed to process request',
      }),
    };
  }
};

/**
 * Annadata Farmer Engine
 * Provides agricultural guidance and support
 */
const annadataFarmerHandler: EngineHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
) => {
  try {
    const body = JSON.parse(event.body || '{}');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        engine: 'annadataFarmer',
        message: 'Agricultural guidance provided',
        data: {
          crop_recommendations: [],
          market_info: [],
          analysis: body,
        },
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        engine: 'annadataFarmer',
        error: 'Failed to process request',
      }),
    };
  }
};

/**
 * Nyaya Legal Engine
 * Provides legal assistance and guidance
 */
const nyayaLegalHandler: EngineHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
) => {
  try {
    const body = JSON.parse(event.body || '{}');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        engine: 'nyayaLegal',
        message: 'Legal analysis completed',
        data: {
          legal_advice: [],
          applicable_laws: [],
          analysis: body,
        },
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        engine: 'nyayaLegal',
        error: 'Failed to process request',
      }),
    };
  }
};

/**
 * Udyog Business Engine
 * Provides business planning and entrepreneurship support
 */
const udyogBusinessHandler: EngineHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
) => {
  try {
    const body = JSON.parse(event.body || '{}');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        engine: 'udyogBusiness',
        message: 'Business plan generated',
        data: {
          business_recommendations: [],
          funding_options: [],
          analysis: body,
        },
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        engine: 'udyogBusiness',
        error: 'Failed to process request',
      }),
    };
  }
};

/**
 * Globalseller Commerce Engine
 * Provides e-commerce and export support
 */
const globalsellerCommerceHandler: EngineHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
) => {
  try {
    const body = JSON.parse(event.body || '{}');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        engine: 'globalsellerCommerce',
        message: 'Commerce strategy generated',
        data: {
          market_analysis: [],
          export_opportunities: [],
          analysis: body,
        },
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        engine: 'globalsellerCommerce',
        error: 'Failed to process request',
      }),
    };
  }
};

/**
 * Atithi Travel Engine
 * Provides tourism and travel guidance
 */
const atithiTravelHandler: EngineHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
) => {
  try {
    const body = JSON.parse(event.body || '{}');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        engine: 'atithiTravel',
        message: 'Travel recommendations provided',
        data: {
          destinations: [],
          itineraries: [],
          analysis: body,
        },
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        engine: 'atithiTravel',
        error: 'Failed to process request',
      }),
    };
  }
};

/**
 * PathAI Career Engine
 * Provides career guidance and planning intelligence
 */
const pathaiCareerHandler: EngineHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
) => {
  try {
    // Delegate to the dedicated PathAI engine handler
    return await pathaiEngineHandler(event, context);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        engine: 'PathAI',
        error: 'Failed to process PathAI request',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

/**
 * GlobalSellerEngine (Load-bearing AI)
 * New extension engine for marketplace, supply chain, compliance and logistics intelligence
 */
const globalSellerEngineHandler: EngineHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const query = body.query || body.userMessage || '';

    if (!query) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          engine: 'GlobalSellerEngine',
          error: 'query is required',
        }),
      };
    }

    const result = await globalSellerRuntime.analyzeGlobalSellerQuery({
      query,
      mode: body.mode,
      language: body.language,
      reviewText: body.reviewText,
      voiceS3Uri: body.voiceS3Uri,
      voiceResponse: body.voiceResponse,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        engine: 'GlobalSellerEngine',
        ...result,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        engine: 'GlobalSellerEngine',
  pathaiCareer: pathaiCareerHandler,
  pathai: pathaiCareerHandler,
        error: 'Failed to process GlobalSellerEngine request',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

// ============================================================================
// ENGINE ROUTER
// ============================================================================

/**
 * Engine registry mapping engine names to their handlers
 */
const engineRegistry: Record<string, EngineHandler> = {
  schemeEligibility: schemeEligibilityHandler,
  annadataFarmer: annadataFarmerHandler,
  nyayaLegal: nyayaLegalHandler,
  udyogBusiness: udyogBusinessHandler,
  globalsellerCommerce: globalsellerCommerceHandler,
  globalSellerEngine: globalSellerEngineHandler,
  globalseller: globalSellerEngineHandler,
  atithiTravel: atithiTravelHandler,
};

/**
 * Parses the engine name from the request path
 * Expected path format: /engine/{engineName}
 */
function parseEngineName(path: string): string | null {
  const match = path.match(/\/engine\/([a-zA-Z0-9]+)/i);
  return match ? match[1] : null;
}

/**
 * Main Lambda handler that routes requests to the appropriate engine
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  try {
    // Parse the engine name from the path
    const engineName = parseEngineName(event.path || event.requestContext?.resourcePath || '');

    if (!engineName) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid path',
          message: 'Expected path format: /engine/{engineName}',
          availableEngines: Object.keys(engineRegistry),
        }),
      };
    }

    // Get the handler for the requested engine
    const handler = engineRegistry[engineName];

    if (!handler) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: 'Engine not found',
          requestedEngine: engineName,
          availableEngines: Object.keys(engineRegistry),
        }),
      };
    }

    // Call the engine handler and return the result
    const result = await handler(event, context);
    return result;
  } catch (error) {
    console.error('Error processing request:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

// Export individual handlers for direct invocation if needed
export {
  schemeEligibilityHandler,
  annadataFarmerHandler,
  nyayaLegalHandler,
  udyogBusinessHandler,
  globalsellerCommerceHandler,
  pathaiCareerHandler,
  globalSellerEngineHandler,
  atithiTravelHandler,
};
