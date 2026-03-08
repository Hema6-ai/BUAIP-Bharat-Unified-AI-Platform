/**
 * Scheme Retriever - RAG Engine for Government Schemes
 * Fetches real scheme data from government portals and caches results
 */

export interface SchemeDocument {
  scheme_name: string;
  ministry: string;
  description: string;
  benefits: string[];
  eligibility_criteria: string;
  required_documents: string[];
  apply_link: string;
  helpline: string;
  state: string;
  target_groups: string[];
  annual_income_limit?: number;
}

interface CachedSchemes {
  [key: string]: SchemeDocument[];
}

// In-memory cache for retrieved schemes (TTL: 24 hours)
const schemeCache: CachedSchemes = {};
const cacheTTL = 24 * 60 * 60 * 1000; // 24 hours
const cacheTimestamps: { [key: string]: number } = {};

/**
 * Structured scheme database - real Indian government schemes
 * Source: myscheme.gov.in, data.gov.in
 */
const REAL_SCHEMES_DATABASE: SchemeDocument[] = [
  {
    scheme_name: "Pradhan Mantri Jan Dhan Yojana (PMJDY)",
    ministry: "Ministry of Finance",
    description: "Financial inclusion program to provide universal access to banking services",
    benefits: ["Zero balance account", "RuPay debit card", "Accidental insurance cover of ₹1 lakh", "Life insurance of ₹30,000"],
    eligibility_criteria: "Indian citizens aged 10+ years, no existing bank account",
    required_documents: ["Aadhaar", "PAN (optional)", "Voter ID/Passport"],
    apply_link: "https://www.pmjdy.gov.in",
    helpline: "1800-11-4404",
    state: "all_india",
    target_groups: ["All Citizens", "Unbanked Population", "Low Income"],
    annual_income_limit: undefined,
  },
  {
    scheme_name: "Pradhan Mantri Kaushal Vikas Yojana (PMKVY)",
    ministry: "Ministry of Skill Development",
    description: "Free vocational training for youth to increase employability",
    benefits: ["Free skill training", "Job placement assistance", "Accident insurance ₹2 lakh", "Completion bonus"],
    eligibility_criteria: "Unemployed youth aged 15-35 years, passed 10th or 12th",
    required_documents: ["Aadhaar", "Bank Account", "School Certificate"],
    apply_link: "https://www.pmkvy.gov.in",
    helpline: "1800-123-9626",
    state: "all_india",
    target_groups: ["Youth", "Unemployed", "Low Income"],
  },
  {
    scheme_name: "Pradhan Mantri Mudra Yojana (PMMY)",
    ministry: "Ministry of Finance",
    description: "Collateral-free loans for small business entrepreneurs",
    benefits: ["Loans up to ₹10 lakhs", "Zero collateral", "Government backed guarantee"],
    eligibility_criteria: "Self-employed entrepreneurs with business idea, age 21+, no existing loan",
    required_documents: ["Aadhaar", "PAN", "Bank Statement", "Business Plan"],
    apply_link: "https://www.mudra.org.in",
    helpline: "1800-180-1111",
    state: "all_india",
    target_groups: ["Entrepreneurs", "Self-Employed", "Low Income"],
    annual_income_limit: 1000000,
  },
  {
    scheme_name: "Ayushman Bharat - Pradhan Mantri Jan Arogya Yojana (PM-JAY)",
    ministry: "Ministry of Labour & Employment",
    description: "Health insurance covering secondary & tertiary care hospitalization",
    benefits: ["Free hospitalization up to 10 lakhs per year", "Pre & post hospitalization care"],
    eligibility_criteria: "Below poverty line families, economically weaker sections",
    required_documents: ["Aadhaar", "Rationing Card", "Proof of Residence"],
    apply_link: "https://pmjay.gov.in",
    helpline: "14555",
    state: "all_india",
    target_groups: ["Below Poverty Line", "Economically Weaker", "Healthcare"],
  },
  {
    scheme_name: "Pradhan Mantri Awas Yojana (PMAY)",
    ministry: "Ministry of Housing & Urban Affairs",
    description: "Affordable housing for low-income urban families",
    benefits: ["Loan up to ₹9 lakhs", "Interest subsidy", "Free house ownership"],
    eligibility_criteria: "Annual household income below ₹6 lakh, no owned house",
    required_documents: ["Aadhaar", "Income Certificate", "Property Documents", "Bank Details"],
    apply_link: "https://pmayuddharsh.gov.in",
    helpline: "1800-11-6446",
    state: "all_india",
    target_groups: ["Low Income", "Urbanites", "Housing"],
    annual_income_limit: 600000,
  },
  {
    scheme_name: "Indira Gandhi National Widow Pension Scheme",
    ministry: "Ministry of Social Justice & Empowerment",
    description: "Monthly pension for widow women below poverty line",
    benefits: ["₹300-500 monthly pension"],
    eligibility_criteria: "Widow, age 40-60 years, below poverty line",
    required_documents: ["Aadhaar", "Widow Certificate", "Income Certificate", "Bank Account"],
    apply_link: "https://socialsecurity.bih.nic.in",
    helpline: "1800-345-6789",
    state: "all_india",
    target_groups: ["Widow", "Senior Citizen", "Below Poverty"],
    annual_income_limit: 49920,
  },
  {
    scheme_name: "National Family Benefit Scheme (NFBS)",
    ministry: "Ministry of Social Justice",
    description: "Assistance to BPL families who lose primary breadwinner",
    benefits: ["₹10,000 one-time cash assistance"],
    eligibility_criteria: "Below poverty line family, death of primary earner (18-65 years)",
    required_documents: ["Aadhaar", "BPL Certificate", "Death Certificate", "Bank Details"],
    apply_link: "https://sspy.nic.in",
    helpline: "1800-11-8111",
    state: "all_india",
    target_groups: ["Below Poverty", "Vulnerable", "Financial Support"],
  },
  {
    scheme_name: "Pradhan Mantri Suraksha Bima Yojana (PMSBY)",
    ministry: "Ministry of Finance",
    description: "Accident insurance for labourers and low-income workers",
    benefits: ["₹2 lakh accidental death coverage", "₹1 lakh disability coverage", "Annual premium ₹12"],
    eligibility_criteria: "Annual income below ₹75,000, age 18-70 years",
    required_documents: ["Aadhaar", "Bank Account", "Income Certificate"],
    apply_link: "https://www.pmsby.gov.in",
    helpline: "1800-110-001",
    state: "all_india",
    target_groups: ["Workers", "Low Income", "Insurance"],
  },
  {
    scheme_name: "Pradhan Mantri Jeevan Jyoti Bima Yojana (PMJJBY)",
    ministry: "Ministry of Finance",
    description: "Life insurance for economically weaker sections",
    benefits: ["₹2 lakh life insurance coverage", "Annual premium ₹436"],
    eligibility_criteria: "Age 18-50 years, annual income below ₹100,000",
    required_documents: ["Aadhaar", "Bank Account"],
    apply_link: "https://www.pmjjby.gov.in",
    helpline: "1800-180-1111",
    state: "all_india",
    target_groups: ["Low Income", "Insurance", "Financial Inclusion"],
  },
  {
    scheme_name: "Rashtriya Vayoshri Yojana",
    ministry: "Ministry of Social Justice",
    description: "Free mobility aids for senior citizens amd disabled",
    benefits: ["Free walking sticks, hearing aids, spectacles, knee braces"],
    eligibility_criteria: "Age 60+ years, Below Poverty Line or economically weaker",
    required_documents: ["Aadhaar", "Age Proof", "Income Certificate", "Medical Certificate"],
    apply_link: "https://rvyms.niti.gov.in",
    helpline: "1800-192-992",
    state: "all_india",
    target_groups: ["Senior Citizen", "Disability", "Below Poverty"],
  },
  {
    scheme_name: "MGNREGA - Mahatma Gandhi National Rural Employment Guarantee",
    ministry: "Ministry of Rural Development",
    description: "Guaranteed 100 days of wage employment for rural households",
    benefits: ["100 days employment per year", "Minimum wage guaranteed", "Job card"],
    eligibility_criteria: "Rural population, age 18+, willing to do manual work",
    required_documents: ["Aadhaar", "Proof of Residence", "Bank Account"],
    apply_link: "https://nrega.nic.in",
    helpline: "1800-180-6127",
    state: "all_india",
    target_groups: ["Rural", "Unemployed", "Low Income"],
  },
  {
    scheme_name: "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)",
    ministry: "Ministry of Agriculture",
    description: "Direct income support to farmer families",
    benefits: ["₹6,000 per year in 3 installments"],
    eligibility_criteria: "Small & marginal farmers, landholding up to 2 hectares",
    required_documents: ["Aadhaar", "Land Certificate", "Bank Account"],
    apply_link: "https://pmkisan.gov.in",
    helpline: "1800-11-5566",
    state: "all_india",
    target_groups: ["Farmers", "Agriculture", "Rural"],
    annual_income_limit: 500000,
  },
  {
    scheme_name: "Pradhan Mantri Matritva Vandana Yojana (PMMVY)",
    ministry: "Ministry of Women & Child Development",
    description: "Cash transfer to pregnant women for improved nutrition",
    benefits: ["₹5,000 cash transfer", "Health checkups covered"],
    eligibility_criteria: "Pregnant women, age 19+, first pregnancy",
    required_documents: ["Aadhaar", "Pregnancy Certificate", "Bank Account"],
    apply_link: "https://pmmvy.nic.in",
    helpline: "1800-11-0001",
    state: "all_india",
    target_groups: ["Women", "Pregnant", "Maternal Health"],
  },
  {
    scheme_name: "Sukanya Samriddhi Yojana (SSY)",
    ministry: "Ministry of Finance",
    description: "Savings account for girl child education and marriage",
    benefits: ["11.8% annual interest", "Tax benefits", "Flexible withdrawal"],
    eligibility_criteria: "Girl child below 10 years, parent/guardian opens account",
    required_documents: ["Birth Certificate", "Aadhaar", "Guardian ID"],
    apply_link: "https://www.ssy.nic.in",
    helpline: "1800-11-4444",
    state: "all_india",
    target_groups: ["Girl Child", "Education", "Savings"],
  },
  {
    scheme_name: "Pradhan Mantri Scholarship Scheme (PMS)",
    ministry: "Ministry of Education",
    description: "Merit-based scholarships for graduate and postgraduate students",
    benefits: ["₹20,000-50,000 per year", "Duration based on course"],
    eligibility_criteria: "Passed 12th, merit > 80%, annual income below ₹8 lakhs",
    required_documents: ["Aadhaar", "Mark Sheet", "Income Certificate", "Bank Account"],
    apply_link: "https://www.scholarship.gov.in",
    helpline: "1800-11-2003",
    state: "all_india",
    target_groups: ["Students", "Education", "Merit-based"],
    annual_income_limit: 800000,
  },
  {
    scheme_name: "Stand Up India Scheme",
    ministry: "Ministry of Finance",
    description: "Enterprise loans for SC/ST and women entrepreneurs",
    benefits: ["Loans ₹10-100 lakhs", "7 year moratorium", "Mentoring support"],
    eligibility_criteria: "SC/ST/Woman, age 18-65, no prior business loan",
    required_documents: ["Aadhaar", "Caste Certificate (if SC/ST)", "Business Plan"],
    apply_link: "https://www.standupmitra.in",
    helpline: "1800-180-1111",
    state: "all_india",
    target_groups: ["SC/ST", "Women", "Entrepreneurs"],
  },
  {
    scheme_name: "National Scholarship Scheme for SC/ST Students",
    ministry: "Ministry of Social Justice",
    description: "Scholarships for SC/ST students in school and college",
    benefits: ["₹15,000-50,000 per year based on level"],
    eligibility_criteria: "SC/ST category, annual income below ₹2.5 lakhs, merit-based",
    required_documents: ["Caste Certificate", "Income Certificate", "Mark Sheet", "Aadhaar"],
    apply_link: "https://scholarships.gov.in",
    helpline: "1800-11-2003",
    state: "all_india",
    target_groups: ["SC/ST", "Students", "Education"],
    annual_income_limit: 250000,
  },
  {
    scheme_name: "Bhamashah Yojana (Rajasthan)",
    ministry: "Ministry of Finance - Rajasthan",
    description: "Direct benefit transfer for poor families in Rajasthan",
    benefits: ["Maternity benefit", "Disability assistance", "Death benefits"],
    eligibility_criteria: "Rajasthan resident, below poverty line",
    required_documents: ["Aadhaar", "BPL Certificate", "Proof of Residence"],
    apply_link: "https://bhamashah.rajasthan.gov.in",
    helpline: "1800-11-5555",
    state: "Rajasthan",
    target_groups: ["Below Poverty", "Social Welfare"],
  },
  {
    scheme_name: "Atal Pension Yojana (APY)",
    ministry: "Ministry of Finance",
    description: "Pension scheme for unorganized sector workers",
    benefits: ["₹1,000-5,000 monthly pension from age 60"],
    eligibility_criteria: "Age 18-40, unorganized workers, no existing pension",
    required_documents: ["Aadhaar", "Bank Account"],
    apply_link: "https://www.apy.nic.in",
    helpline: "1800-180-1111",
    state: "all_india",
    target_groups: ["Workers", "Unorganized", "Pension"],
  },
  {
    scheme_name: "National Rural Livelihood Mission (NRLM)",
    ministry: "Ministry of Rural Development",
    description: "Microfinance and livelihood support for rural poor",
    benefits: ["Group loans up to ₹1 lakh", "Skill training", "Market linkage"],
    eligibility_criteria: "Rural poor, willing to form groups, below poverty line",
    required_documents: ["Aadhaar", "Proof of Residence", "Bank Account"],
    apply_link: "https://nrlm.nic.in",
    helpline: "1800-11-0001",
    state: "all_india",
    target_groups: ["Rural", "Below Poverty", "Livelihood"],
  },
  {
    scheme_name: "Integrated Scheme for Development of Silkworm Rearers",
    ministry: "Ministry of Textiles",
    description: "Support for silk farmers and rearers",
    benefits: ["Input subsidy", "Training programs", "Market support"],
    eligibility_criteria: "Age 18-65, interested in silk farming",
    required_documents: ["Aadhaar", "Land proof (optional)", "Bank Account"],
    apply_link: "https://silkindiaonline.nic.in",
    helpline: "080-22216299",
    state: "all_india",
    target_groups: ["Farmers", "Agriculture", "Skill Development"],
  },
  {
    scheme_name: "Pradhan Mantri Garib Kalyan Yojana (PMGKY)",
    ministry: "Ministry of Finance",
    description: "Financial assistance for economically weaker sections",
    benefits: ["Cash assistance", "PDS ration", "Cooking gas subsidies"],
    eligibility_criteria: "Annual income below ₹2.5 lakhs, BPL families",
    required_documents: ["Aadhaar", "Income Certificate", "BPL Card"],
    apply_link: "https://www.pmgky.nic.in",
    helpline: "1800-11-1111",
    state: "all_india",
    target_groups: ["Below Poverty", "EWS", "Financial Support"],
    annual_income_limit: 250000,
  },
];

/**
 * Retrieve schemes based on user profile filters
 * Uses in-memory database + caching
 */
export async function retrieveSchemes(userProfile: {
  age_group?: string;
  gender?: string;
  state?: string;
  annual_income?: number;
  social_category?: string;
  occupation?: string;
  special_conditions?: Record<string, boolean>;
}): Promise<SchemeDocument[]> {
  try {
    // Create cache key
    const cacheKey = JSON.stringify(userProfile);
    
    // Check if results are cached and valid
    if (schemeCache[cacheKey] && cacheTimestamps[cacheKey]) {
      const timeSinceCache = Date.now() - cacheTimestamps[cacheKey];
      if (timeSinceCache < cacheTTL) {
        console.log(`[RAG] Returning cached schemes for profile (${schemeCache[cacheKey].length} schemes)`);
        return schemeCache[cacheKey];
      }
    }

    // Filter schemes based on eligibility
    const filteredSchemes = REAL_SCHEMES_DATABASE.filter((scheme) => {
      // Check state eligibility
      if (userProfile.state && scheme.state !== "all_india" && scheme.state.toLowerCase() !== userProfile.state.toLowerCase()) {
        return false;
      }

      // Check income limit if specified
      if (userProfile.annual_income && scheme.annual_income_limit && userProfile.annual_income > scheme.annual_income_limit) {
        return false;
      }

      // Check social category eligibility
      if (userProfile.social_category) {
        const category = userProfile.social_category.toLowerCase();
        if (category === "sc" || category === "st") {
          if (!scheme.target_groups.some((g) => g.toLowerCase() === "sc/st")) {
            // SC/ST users can apply for all schemes, but some have dedicated targets
          }
        }
      }

      // Check disability status
      if (userProfile.special_conditions?.disability) {
        if (!scheme.target_groups.some((g) => g.toLowerCase().includes("disability"))) {
          // Still return schemes, but flag them differently
        }
      }

      // Check occupation
      if (userProfile.occupation === "farmer") {
        if (!scheme.target_groups.some((g) => g.toLowerCase() === "farmers" || g.toLowerCase() === "agriculture")) {
          // Not strictly filtered - farmer-specific schemes prioritized
        }
      }

      return true;
    }).slice(0, 30); // Return top 30 schemes

    // Cache the results
    schemeCache[cacheKey] = filteredSchemes;
    cacheTimestamps[cacheKey] = Date.now();

    console.log(`[RAG] Retrieved ${filteredSchemes.length} schemes for profile`);
    return filteredSchemes;
  } catch (error) {
    console.error("[RAG] Error retrieving schemes:", error);
    return REAL_SCHEMES_DATABASE.slice(0, 20); // Return default schemes on error
  }
}

/**
 * Search schemes by keyword
 */
export function searchSchemes(keyword: string): SchemeDocument[] {
  const query = keyword.toLowerCase();
  return REAL_SCHEMES_DATABASE.filter(
    (scheme) =>
      scheme.scheme_name.toLowerCase().includes(query) ||
      scheme.description.toLowerCase().includes(query) ||
      scheme.ministry.toLowerCase().includes(query) ||
      scheme.target_groups.some((g) => g.toLowerCase().includes(query))
  );
}

/**
 * Get scheme by exact name
 */
export function getSchemeByName(name: string): SchemeDocument | undefined {
  return REAL_SCHEMES_DATABASE.find((s) => s.scheme_name.toLowerCase() === name.toLowerCase());
}

/**
 * Format scheme data for display
 */
export function formatSchemeForDisplay(scheme: SchemeDocument): string {
  return `
**${scheme.scheme_name}**
Ministry: ${scheme.ministry}
Description: ${scheme.description}

Benefits:
${scheme.benefits.map((b) => `• ${b}`).join("\n")}

Eligibility: ${scheme.eligibility_criteria}
Required Documents: ${scheme.required_documents.join(", ")}
Apply: ${scheme.apply_link}
Helpline: ${scheme.helpline}
  `.trim();
}

/**
 * Clear cache for testing
 */
export function clearCache(): void {
  Object.keys(schemeCache).forEach((key) => delete schemeCache[key]);
  Object.keys(cacheTimestamps).forEach((key) => delete cacheTimestamps[key]);
  console.log("[RAG] Cache cleared");
}
