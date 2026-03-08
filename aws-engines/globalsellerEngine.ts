import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { getBedrockClient } from './bedrockAI';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface GlobalsellerInput {
  productCategory: string;
  targetMarkets: string[];
  budget?: number;
}

export interface ProductSuggestion {
  product: string;
  description: string;
  marketDemand: string;
  estimatedMargin: string;
  targetCountries: string[];
}

export interface ComplianceGuidance {
  aspect: string;
  requirement: string;
  country: string;
  documents: string[];
}

export interface PricingStrategy {
  strategy: string;
  description: string;
  margin: string;
  considerations: string[];
}

export interface SupplierInfo {
  type: string;
  location: string;
  advantages: string[];
  considerations: string[];
  estimatedMOQ: string;
}

export interface GlobalsellerResponse {
  productCategory: string;
  targetMarkets: string[];
  products: ProductSuggestion[];
  compliance: ComplianceGuidance[];
  pricing: PricingStrategy[];
  suppliers: SupplierInfo[];
  timestamp: number;
}

// ============================================================================
// PRODUCT CATALOG
// ============================================================================

const PRODUCT_CATALOG: Record<string, ProductSuggestion[]> = {
  textiles: [
    {
      product: 'Cotton T-shirts',
      description: 'Basic cotton apparel with customization options',
      marketDemand: 'High (Year-round)',
      estimatedMargin: '40-60%',
      targetCountries: ['USA', 'UK', 'Canada', 'Australia'],
    },
    {
      product: 'Saree & Ethnic Wear',
      description: 'Traditional Indian textiles and clothing',
      marketDemand: 'High (Seasonal)',
      estimatedMargin: '50-70%',
      targetCountries: ['USA', 'UK', 'Canada', 'Singapore'],
    },
    {
      product: 'Home Furnishings',
      description: 'Bed sheets, curtains, and decorative textiles',
      marketDemand: 'Medium-High',
      estimatedMargin: '45-65%',
      targetCountries: ['USA', 'Europe', 'Australia'],
    },
  ],
  handicrafts: [
    {
      product: 'Wooden Handicrafts',
      description: 'Hand-carved furniture and decorative items',
      marketDemand: 'Medium',
      estimatedMargin: '60-80%',
      targetCountries: ['USA', 'Europe', 'Japan'],
    },
    {
      product: 'Pottery & Ceramics',
      description: 'Handmade clay products and ceramic ware',
      marketDemand: 'Medium',
      estimatedMargin: '50-70%',
      targetCountries: ['Europe', 'USA', 'Canada'],
    },
    {
      product: 'Brass & Metal Crafts',
      description: 'Hand-forged metal items and decorations',
      marketDemand: 'Medium-High',
      estimatedMargin: '55-75%',
      targetCountries: ['USA', 'Europe', 'Australia'],
    },
  ],
  spices: [
    {
      product: 'Organic Spices',
      description: 'Certified organic Indian spices and masalas',
      marketDemand: 'Very High',
      estimatedMargin: '100-150%',
      targetCountries: ['USA', 'Europe', 'Canada', 'Singapore'],
    },
    {
      product: 'Specialty Tea',
      description: 'Assam, Darjeeling, and specialty Indian teas',
      marketDemand: 'High',
      estimatedMargin: '80-120%',
      targetCountries: ['USA', 'Europe', 'Japan', 'Australia'],
    },
  ],
  electronics: [
    {
      product: 'Electronics Components',
      description: 'Sourcing and exporting electronics parts',
      marketDemand: 'High',
      estimatedMargin: '15-25%',
      targetCountries: ['USA', 'Europe', 'China', 'Japan'],
    },
    {
      product: 'Phone Accessories',
      description: 'Chargers, cables, protective items',
      marketDemand: 'Very High',
      estimatedMargin: '40-60%',
      targetCountries: ['USA', 'Europe', 'Global'],
    },
  ],
  beauty: [
    {
      product: 'Ayurvedic Products',
      description: 'Natural Ayurvedic cosmetics and wellness products',
      marketDemand: 'Very High',
      estimatedMargin: '100-200%',
      targetCountries: ['USA', 'Europe', 'Canada', 'UAE'],
    },
    {
      product: 'Organic Cosmetics',
      description: 'Natural and organic beauty and skincare',
      marketDemand: 'High',
      estimatedMargin: '80-150%',
      targetCountries: ['USA', 'Europe', 'Australia'],
    },
  ],
};

// ============================================================================
// COMPLIANCE REQUIREMENTS
// ============================================================================

const COMPLIANCE_REQUIREMENTS: ComplianceGuidance[] = [
  {
    aspect: 'Export Registration',
    requirement: 'RCMC (Rubber and Commerce Certificate) from Chambers',
    country: 'India (Export)',
    documents: ['PAN', 'GST Certificate', 'Business Registration'],
  },
  {
    aspect: 'Import License',
    requirement: 'Importer code from customs authority',
    country: 'USA',
    documents: ['IEC Code equivalent', 'Business License'],
  },
  {
    aspect: 'Product Certification',
    requirement: 'CE mark for European goods',
    country: 'Europe',
    documents: ['Testing certificate', 'Technical specifications'],
  },
  {
    aspect: 'Food Safety',
    requirement: 'FSMA compliance for food products',
    country: 'USA',
    documents: ['Food safety audit', 'Supplier verification'],
  },
  {
    aspect: 'Labeling Requirements',
    requirement: 'Country-specific labeling and language',
    country: 'All countries',
    documents: ['Product labels', 'Material information'],
  },
  {
    aspect: 'Tariff Classification',
    requirement: 'HS Code classification for goods',
    country: 'All countries',
    documents: ['Commercial invoice', 'Product specifications'],
  },
];

// ============================================================================
// PRICING STRATEGIES
// ============================================================================

const PRICING_STRATEGIES: PricingStrategy[] = [
  {
    strategy: 'Cost-Plus Pricing',
    description: 'Add markup percentage to production cost',
    margin: '30-50% markup',
    considerations: [
      'Works well for commodities',
      'Simple to implement',
      'May not reflect market rates',
    ],
  },
  {
    strategy: 'Competitive Pricing',
    description: 'Price based on competitor offerings',
    margin: '20-40% margin',
    considerations: [
      'Requires market research',
      'Competitive advantage important',
      'Dynamic pricing possible',
    ],
  },
  {
    strategy: 'Value-Based Pricing',
    description: 'Price based on customer perceived value',
    margin: '40-70% margin',
    considerations: [
      'Works for premium products',
      'Requires brand building',
      'Customers must perceive value',
    ],
  },
  {
    strategy: 'Penetration Pricing',
    description: 'Low prices to gain market share quickly',
    margin: '10-20% margin',
    considerations: [
      'Good for initial market entry',
      'Can increase volume quickly',
      'May not be sustainable long-term',
    ],
  },
];

// ============================================================================
// SUPPLIER INFORMATION
// ============================================================================

const SUPPLIER_INFO: SupplierInfo[] = [
  {
    type: 'Direct Manufacturers',
    location: 'Tiruppur, Surat, Bangalore',
    advantages: [
      'Lowest cost',
      'Direct quality control',
      'Customization possible',
    ],
    considerations: [
      'Minimum order quantities high',
      'Need production expertise',
      'Language barriers',
    ],
    estimatedMOQ: '500-5000 units',
  },
  {
    type: 'Trading Companies',
    location: 'Mumbai, Delhi, Bangalore',
    advantages: [
      'Lower MOQs',
      'Quick delivery',
      'Quality assurance',
    ],
    considerations: [
      'Higher costs than direct',
      'Limited customization',
      'Profit margin impact',
    ],
    estimatedMOQ: '100-1000 units',
  },
  {
    type: 'Online Marketplaces',
    location: 'Pan-India (alibaba.com, Global Sources)',
    advantages: [
      'Wide product range',
      'Pre-vetted suppliers',
      'Sample orders available',
    ],
    considerations: [
      'Quality verification needed',
      'Payment security',
      'Shipping time',
    ],
    estimatedMOQ: '1-500 units',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getProductSuggestions(category: string): ProductSuggestion[] {
  const categoryKey = category.toLowerCase();

  for (const key in PRODUCT_CATALOG) {
    if (key.includes(categoryKey) || categoryKey.includes(key)) {
      return PRODUCT_CATALOG[key as keyof typeof PRODUCT_CATALOG];
    }
  }

  // Return all products if category not found
  return Object.values(PRODUCT_CATALOG).flat().slice(0, 5);
}

function getComplianceFor(countries: string[]): ComplianceGuidance[] {
  const relevant: ComplianceGuidance[] = [];

  for (const country of countries) {
    const countryCompliance = COMPLIANCE_REQUIREMENTS.filter((c) =>
      c.country.toLowerCase().includes(country.toLowerCase())
    );
    relevant.push(...countryCompliance);
  }

  return relevant.length > 0
    ? relevant
    : COMPLIANCE_REQUIREMENTS.slice(0, 3);
}

async function generateMarketAnalysis(
  category: string,
  targetMarkets: string[]
): Promise<string> {
  try {
    const bedrockClient = getBedrockClient();

    const prompt = `Provide market analysis and demand overview for ${category} products 
    in ${targetMarkets.join(', ')}. Include growth trends, competition, and opportunities.`;

    const response = await bedrockClient.generateAIResponse(prompt, 'DEFAULT');
    return response.generatedText;
  } catch (error) {
    console.error('Error generating market analysis:', error);
    return 'Market analysis unavailable at this moment.';
  }
}

// ============================================================================
// MAIN ENGINE
// ============================================================================

async function processGlobalsellerRequest(
  input: GlobalsellerInput
): Promise<GlobalsellerResponse> {
  const response: GlobalsellerResponse = {
    productCategory: input.productCategory,
    targetMarkets: input.targetMarkets,
    products: [],
    compliance: [],
    pricing: [],
    suppliers: [],
    timestamp: Date.now(),
  };

  try {
    console.log(`Processing GLOBALSELLER request for ${input.productCategory}`);

    response.products = getProductSuggestions(input.productCategory);
    response.compliance = getComplianceFor(input.targetMarkets);
    response.pricing = PRICING_STRATEGIES.slice(0, 3);
    response.suppliers = SUPPLIER_INFO;

    return response;
  } catch (error) {
    console.error('Error processing GLOBALSELLER request:', error);
    throw error;
  }
}

function parseInput(event: APIGatewayProxyEvent): GlobalsellerInput {
  const body = event.body ? JSON.parse(event.body) : {};
  return {
    productCategory: body.productCategory || 'textiles',
    targetMarkets: body.targetMarkets || ['USA', 'Europe'],
    budget: body.budget,
  };
}

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log(
    'GLOBALSELLER Engine - Received event:',
    JSON.stringify(event, null, 2)
  );

  try {
    const input = parseInput(event);

    if (!input.productCategory) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Product category is required',
        }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    const response = await processGlobalsellerRequest(input);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: response,
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (error) {
    console.error('GLOBALSELLER Engine Error:', error);

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
  processGlobalsellerRequest,
  getProductSuggestions,
  getComplianceFor,
  generateMarketAnalysis,
};
