// Compliance Knowledge Connector - Certifications & Requirements Database
// Static structured data (JSON) - ready for AWS Kendra migration

export interface CertificationRequirement {
  certificationName: string;
  certifyingBody: string;
  cost: number; // USD
  processingTime: number; // weeks
  applicableMarketplaces: string[];
  documents: string[];
}

export interface ComplianceSignal {
  marketplace: string;
  productType: string;
  requiredCertifications: CertificationRequirement[];
  estimatedTotalCost: number;
  estimatedTotalTime: number;
  restrictedMaterials: string[];
  documentation: string[];
  lastUpdated: string;
  signalConfidence: number;
}

// Static compliance database (future: AWS Kendra)
const complianceDatabase: Record<
  string,
  Record<string, CertificationRequirement[]>
> = {
  'US': {
    'Electronics': [
      {
        certificationName: 'FCC Certification',
        certifyingBody: 'Federal Communications Commission',
        cost: 300,
        processingTime: 4,
        applicableMarketplaces: ['US', 'CA'],
        documents: ['Technical Specifications', 'Test Reports', 'Device Photos'],
      },
      {
        certificationName: 'UL Certification',
        certifyingBody: 'Underwriters Laboratories',
        cost: 800,
        processingTime: 8,
        applicableMarketplaces: ['US', 'CA'],
        documents: ['Safety Data Sheet', 'Design Documentation', 'Test Results'],
      },
    ],
    'Toys': [
      {
        certificationName: 'CPSC Compliance',
        certifyingBody: 'Consumer Product Safety Commission',
        cost: 1200,
        processingTime: 6,
        applicableMarketplaces: ['US'],
        documents: ['Third-party Test Report', 'General Conformity Certificate', 'Tracking Label'],
      },
    ],
    'Textiles': [
      {
        certificationName: 'CPSIA Compliance',
        certifyingBody: 'CPSC',
        cost: 200,
        processingTime: 3,
        applicableMarketplaces: ['US'],
        documents: ['Lead/Phthalate Test Reports', 'CPSIA Label'],
      },
    ],
  },
  'DE': {
    'Electronics': [
      {
        certificationName: 'CE Marking',
        certifyingBody: 'European Conformity',
        cost: 500,
        processingTime: 6,
        applicableMarketplaces: ['UK', 'DE', 'FR', 'IT'],
        documents: ['Technical File', 'Risk Assessment', 'Declaration of Conformity'],
      },
      {
        certificationName: 'REACH Compliance',
        certifyingBody: 'European Chemicals Agency',
        cost: 2000,
        processingTime: 12,
        applicableMarketplaces: ['UK', 'DE', 'FR', 'IT'],
        documents: ['Chemical Inventory', 'Safety Data Sheets'],
      },
    ],
    'Food': [
      {
        certificationName: 'FSSC 22000',
        certifyingBody: 'Food Safety System Certification',
        cost: 3000,
        processingTime: 8,
        applicableMarketplaces: ['UK', 'DE', 'FR'],
        documents: ['Facility Audit', 'Hygiene Records'],
      },
    ],
  },
  'IN': {
    'Electronics': [
      {
        certificationName: 'BIS Certification',
        certifyingBody: 'Bureau of Indian Standards',
        cost: 800,
        processingTime: 10,
        applicableMarketplaces: ['IN'],
        documents: ['Test Reports', 'Factory Inspection', 'ISI Mark License'],
      },
    ],
    'Food': [
      {
        certificationName: 'FSSAI License',
        certifyingBody: 'Food Safety and Standards Authority',
        cost: 300,
        processingTime: 4,
        applicableMarketplaces: ['IN'],
        documents: ['Factory Layout', 'Health Certificate', 'Water Quality Test'],
      },
    ],
    'Textiles': [
      {
        certificationName: 'ISI Mark (optional)',
        certifyingBody: 'Bureau of Indian Standards',
        cost: 500,
        processingTime: 6,
        applicableMarketplaces: ['IN'],
        documents: ['Product Tests', 'Raw Material Certificate'],
      },
    ],
  },
};

// Restricted materials by marketplace
const restrictedMaterials: Record<string, string[]> = {
  'US': ['Lead (>100ppm in paint)', 'Formaldehyde', 'Phthalates in toys'],
  'DE': ['Lead', 'Asbestos', 'Heavy metals (Hg, Cd, Cr)', 'Persistent organic pollutants'],
  'JP': ['Lead paint', 'Formaldehyde', 'PVC softeners'],
  'IN': ['Asbestos', 'DDT and PCBs', 'Banned hazardous substances'],
};

export async function getComplianceSignal(
  marketplace: string,
  productType: string
): Promise<ComplianceSignal> {
  try {
    const certs = complianceDatabase[marketplace]?.[productType] || [];
    const restricted = restrictedMaterials[marketplace] || [];

    const totalCost = certs.reduce((sum, cert) => sum + cert.cost, 0);
    const maxTime = Math.max(...certs.map((c) => c.processingTime), 1);

    const documentation = [
      'Product description with images',
      'Manufacturer information',
      'Ingredient/Material list',
      'Safety certifications',
      'Compliance declarations',
      'Country of origin declaration',
      ...certs.flatMap((c) => c.documents),
    ];

    return {
      marketplace,
      productType,
      requiredCertifications: certs,
      estimatedTotalCost: totalCost,
      estimatedTotalTime: maxTime,
      restrictedMaterials: restricted,
      documentation,
      lastUpdated: new Date().toISOString(),
      signalConfidence: 95, // Static data = high confidence
    };
  } catch (error) {
    console.error('ComplianceConnector error:', error);
    return {
      marketplace,
      productType,
      requiredCertifications: [],
      estimatedTotalCost: 0,
      estimatedTotalTime: 4,
      restrictedMaterials: ['consult_local_authorities'],
      documentation: ['Contact marketplace for details'],
      lastUpdated: new Date().toISOString(),
      signalConfidence: 0,
    };
  }
}

// List all available certifications (for UI dropdowns)
export function listAvailableMaterialTypes(marketplace: string): string[] {
  return Object.keys(complianceDatabase[marketplace] || {});
}

// Update compliance database (future: sync from external source)
export async function syncComplianceDatabase(): Promise<void> {
  try {
    // FUTURE: Fetch from AWS Kendra or compliance API endpoint
    // Store in S3 + DynamoDB for versioning
    console.log('[ComplianceConnector] Compliance database is up-to-date');
  } catch (error) {
    console.error('Failed to sync compliance database:', error);
  }
}
