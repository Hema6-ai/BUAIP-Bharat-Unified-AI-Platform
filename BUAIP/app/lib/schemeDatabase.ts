import { Scheme, SchemeFilter } from './schemeEligibilityTypes';

// Comprehensive Government Schemes Database
// In production, this would connect to myscheme.gov.in API or DynamoDB
// For now, using curated real schemes with accurate eligibility criteria

const SCHEMES_DATABASE: Scheme[] = [
  {
    schemeId: 'pm-kisan',
    schemeName: 'PM-KISAN Samman Nidhi',
    description: 'Direct income support to farmer families',
    state: 'all_india',
    targetGroup: ['Farmers', 'Landowners'],
    minAge: 18,
    incomeLimit: 0, // No upper limit for landholders
    eligibleCategories: ['general', 'obc', 'sc', 'st', 'ews'],
    eligibleOccupations: ['farmer'],
    benefits: ['₹6,000 per year in 3 installments of ₹2,000'],
    filesRequired: ['Aadhaar', 'Bank account details', 'Land ownership proof'],
    applicationLink: 'https://pmkisan.gov.in',
    applicationMode: 'online',
    department: 'Ministry of Agriculture',
    lastUpdated: '2024-01-15',
  },
  {
    schemeId: 'kisan-credit-card',
    schemeName: 'Kisan Credit Card (KCC)',
    description: 'Agricultural loans at concessional rates',
    state: 'all_india',
    targetGroup: ['Farmers', 'Farm laborers'],
    minAge: 18,
    maxAge: 75,
    incomeLimit: 5000000, // 50 lakh
    eligibleCategories: ['general', 'obc', 'sc', 'st', 'ews'],
    eligibleOccupations: ['farmer'],
    benefits: ['Loans up to ₹3 lakh', 'Interest subvention of 2% p.a.', 'Accident insurance coverage'],
    filesRequired: ['Aadhaar', 'Land ownership proof', 'Bank account', 'Income certificate'],
    applicationLink: 'https://www.nabard.org',
    applicationMode: 'offline',
    department: 'NABARD',
    lastUpdated: '2024-02-20',
  },
  {
    schemeId: 'pradhan-mantri-scholarship',
    schemeName: 'Prime Minister\'s Scholarship Scheme for Widows',
    description: 'Educational support for children of military personnel',
    state: 'all_india',
    targetGroup: ['Student', 'Children of soldiers'],
    minAge: 14,
    maxAge: 25,
    incomeLimit: 1000000, // 10 lakh
    eligibleCategories: ['general', 'obc', 'sc', 'st', 'ews'],
    eligibleOccupations: ['student'],
    benefits: ['₹36,000 per annum scholarship', 'Hostel fees covered'],
    filesRequired: ['School/College enrollment proof', 'Death certificate of soldier', 'Bank account', 'Income certificate'],
    applicationLink: 'https://scholarships.gov.in',
    applicationMode: 'online',
    department: 'Ministry of Defence',
    lastUpdated: '2024-03-10',
  },
  {
    schemeId: 'startup-india-loan',
    schemeName: 'Startup India Loan Guarantee Scheme',
    description: 'Collateral-free loans for startups',
    state: 'all_india',
    targetGroup: ['Entrepreneur', 'MSME'],
    minAge: 18,
    incomeLimit: 2500000, // 25 lakh personal income
    eligibleCategories: ['general', 'obc', 'sc', 'st', 'ews'],
    eligibleOccupations: ['entrepreneur', 'self_employed'],
    benefits: ['Loans up to ₹1 crore', '5% interest subsidy', '100% credit guarantee'],
    filesRequired: ['Business plan', 'Aadhaar', 'Bank account', 'GST registration'],
    applicationLink: 'https://www.startupindia.gov.in',
    applicationMode: 'online',
    department: 'DPIIT',
    lastUpdated: '2024-02-28',
  },
  {
    schemeId: 'ujala-scheme',
    schemeName: 'UJALA - Unnat Jyoti by Affordable LEDs for All',
    description: 'Affordable LED bulbs and fixtures for all citizens',
    state: 'all_india',
    targetGroup: ['All citizens'],
    eligibleCategories: ['general', 'obc', 'sc', 'st', 'ews', 'minority'],
    eligibleOccupations: ['farmer', 'student', 'entrepreneur', 'worker', 'self_employed', 'govt_employee', 'unemployed', 'senior_citizen', 'other'],
    benefits: ['LED bulbs at ₹70 per piece', 'LED tubes at ₹120', '3-year warranty'],
    filesRequired: ['None - open to all'],
    applicationLink: 'https://ujala.gov.in',
    applicationMode: 'online',
    department: 'Ministry of Power',
    lastUpdated: '2024-01-20',
  },
  {
    schemeId: 'ayushman-bharat',
    schemeName: 'Ayushman Bharat - PMJAY',
    description: 'Health insurance for vulnerable families',
    state: 'all_india',
    targetGroup: ['Low-income families', 'Vulnerable groups'],
    incomeLimit: 500000, // 5 lakh
    eligibleCategories: ['general', 'obc', 'sc', 'st', 'ews'],
    eligibleOccupations: ['farmer', 'worker', 'self_employed', 'unemployed'],
    benefits: ['₹5 lakh health insurance per family', 'Cashless treatment at hospitals'],
    filesRequired: ['Aadhaar', 'Ration card', 'Income certificate'],
    applicationLink: 'https://pmjay.gov.in',
    applicationMode: 'online',
    department: 'Ministry of Labour',
    lastUpdated: '2024-03-01',
  },
  {
    schemeId: 'mudra-loan',
    schemeName: 'Pradhan Mantri Mudra Yojana',
    description: 'Small loans for non-corporate, non-farm businesses',
    state: 'all_india',
    targetGroup: ['Self-employed', 'Entrepreneur', 'MSME'],
    minAge: 18,
    incomeLimit: 1800000, // 18 lakh
    eligibleCategories: ['general', 'obc', 'sc', 'st', 'ews'],
    eligibleOccupations: ['entrepreneur', 'self_employed'],
    benefits: ['Loans up to ₹10 lakh', 'No collateral required', 'Credit guarantee'],
    filesRequired: ['Business plan', 'Aadhaar', 'PAN', 'Bank account'],
    applicationLink: 'https://www.mudra.org.in',
    applicationMode: 'online',
    department: 'Ministry of MSME',
    lastUpdated: '2024-02-15',
  },
  {
    schemeId: 'atal-pension-yojana',
    schemeName: 'Atal Pension Yojana',
    description: 'Guaranteed pension scheme for unorganized sector',
    state: 'all_india',
    targetGroup: ['Self-employed', 'Unorganized workers'],
    minAge: 18,
    maxAge: 40,
    eligibleCategories: ['general', 'obc', 'sc', 'st', 'ews'],
    eligibleOccupations: ['farmer', 'worker', 'self_employed', 'unemployed'],
    benefits: ['₹1,000 to ₹5,000 monthly pension from age 60', 'Government matching contribution'],
    filesRequired: ['Aadhaar', 'Bank account', 'Mobile number'],
    applicationLink: 'https://atal-apya.gov.in',
    applicationMode: 'online',
    department: 'Ministry of Labour',
    lastUpdated: '2024-01-10',
  },
  {
    schemeId: 'national-scholarship',
    schemeName: 'National Scholarship Portal - Merit Scholarship',
    description: 'Merit-based scholarships for SC/ST/OBC students',
    state: 'all_india',
    targetGroup: ['Student'],
    minAge: 14,
    maxAge: 25,
    incomeLimit: 800000, // 8 lakh
    eligibleCategories: ['obc', 'sc', 'st'],
    eligibleOccupations: ['student'],
    benefits: ['₹10,000 to ₹20,000 annual scholarship', 'Monthly stipend'],
    filesRequired: ['Enrollment certificate', 'Caste certificate', 'Income certificate', 'Bank account'],
    applicationLink: 'https://scholarships.gov.in',
    applicationMode: 'online',
    department: 'Ministry of Education',
    lastUpdated: '2024-03-05',
  },
  {
    schemeId: 'gramin-udyamita',
    schemeName: 'Prime Minister Employment Generation Programme (PMEGP)',
    description: 'Self-employment loan scheme for rural youth',
    state: 'all_india',
    targetGroup: ['Entrepreneur', 'Rural youth'],
    minAge: 18,
    incomeLimit: 1000000, // 10 lakh
    eligibleCategories: ['general', 'obc', 'sc', 'st', 'ews'],
    eligibleOccupations: ['entrepreneur', 'unemployed'],
    benefits: ['Loans up to ₹25 lakh', 'Subsidy of 25-35%', 'Technical support'],
    filesRequired: ['Project report', 'Aadhaar', 'Land/shop ownership proof', 'Bank statement'],
    applicationLink: 'https://www.kvic.org.in',
    applicationMode: 'offline',
    department: 'KVIC',
    lastUpdated: '2024-02-25',
  },
  {
    schemeId: 'bhamashah',
    schemeName: 'Bhamashah Scheme (Rajasthan)',
    description: 'Integrated social assistance program',
    state: 'Rajasthan',
    targetGroup: ['BPL families', 'Women', 'SC/ST'],
    incomeLimit: 1000000, // 10 lakh
    eligibleCategories: ['general', 'obc', 'sc', 'st', 'ews'],
    eligibleOccupations: ['farmer', 'worker', 'unemployed'],
    benefits: ['Health insurance', 'Education support', 'Business loans'],
    filesRequired: ['Ration card', 'Aadhaar', 'Income certificate'],
    applicationLink: 'https://bhamashah.rajasthan.gov.in',
    applicationMode: 'offline',
    department: 'Rajasthan Government',
    lastUpdated: '2024-01-30',
  },
];

export class SchemeDatabase {
  /**
   * Fetch all schemes or filter by criteria
   */
  static async getSchemes(filter?: SchemeFilter): Promise<Scheme[]> {
    let results = [...SCHEMES_DATABASE];

    if (filter) {
      if (filter.state) {
        results = results.filter(
          (s) => s.state === 'all_india' || s.state === filter.state
        );
      }

      if (filter.occupation) {
        results = results.filter((s) =>
          s.eligibleOccupations.includes(filter.occupation!)
        );
      }

      if (filter.category) {
        results = results.filter((s) =>
          s.eligibleCategories.includes(filter.category!)
        );
      }

      if (filter.minAge !== undefined) {
        results = results.filter(
          (s) => !s.minAge || s.minAge <= filter.minAge!
        );
      }

      if (filter.maxAge !== undefined) {
        results = results.filter(
          (s) => !s.maxAge || s.maxAge >= filter.maxAge!
        );
      }

      if (filter.maxIncome !== undefined) {
        results = results.filter(
          (s) => !s.incomeLimit || s.incomeLimit >= filter.maxIncome!
        );
      }

      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        results = results.filter(
          (s) =>
            s.schemeName.toLowerCase().includes(query) ||
            s.description.toLowerCase().includes(query)
        );
      }
    }

    return results;
  }

  /**
   * Get a specific scheme by ID
   */
  static async getSchemeById(schemeId: string): Promise<Scheme | undefined> {
    return SCHEMES_DATABASE.find((s) => s.schemeId === schemeId);
  }

  /**
   * Get all available states from schemes
   */
  static getAllStates(): string[] {
    const states = new Set<string>();
    SCHEMES_DATABASE.forEach((scheme) => {
      if (scheme.state !== 'all_india') {
        states.add(scheme.state);
      }
    });
    return Array.from(states).sort();
  }

  /**
   * Search schemes by keyword
   */
  static async searchSchemes(keyword: string): Promise<Scheme[]> {
    return this.getSchemes({ searchQuery: keyword });
  }

  /**
   * Get schemes by occupation
   */
  static async getSchemesByOccupation(occupation: string): Promise<Scheme[]> {
    return this.getSchemes({ occupation });
  }

  /**
   * Get schemes by category
   */
  static async getSchemesByCategory(category: string): Promise<Scheme[]> {
    return this.getSchemes({ category });
  }
}
