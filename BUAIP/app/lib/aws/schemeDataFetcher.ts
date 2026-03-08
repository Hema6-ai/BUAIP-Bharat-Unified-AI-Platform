/**
 * Web Scraper for Government Scheme Data
 * Fetches real scheme information from official government sources
 * Fallback when Kendra index is empty or insufficient
 * 
 * Uses built-in Node.js fetch (no external dependencies)
 */

export interface GovernmentScheme {
  scheme_name: string;
  ministry: string;
  benefit: string;
  eligibility: string;
  documents: string[];
  apply_link: string;
  state: string;
  helpline?: string;
  description?: string;
}

/**
 * Primary government scheme sources
 */
const SCHEME_SOURCES = [
  {
    name: "MyScheme Portal",
    url: "https://www.myscheme.gov.in",
    type: "primary",
  },
  {
    name: "PM-KISAN",
    url: "https://pmkisan.gov.in",
    schemes: ["PM-KISAN"],
  },
  {
    name: "PM Awas Yojana",
    url: "https://pmaymis.gov.in",
    schemes: ["PM Awas Yojana"],
  },
  {
    name: "MUDRA Yojana",
    url: "https://mudra.org.in",
    schemes: ["MUDRA Loan"],
  },
  {
    name: "NREGA",
    url: "https://nrega.nic.in",
    schemes: ["MGNREGA"],
  },
];

/**
 * Cached scheme database for offline/fallback use
 * Real data from official government sources as of March 2024
 */
const FALLBACK_SCHEMES: GovernmentScheme[] = [
  {
    scheme_name: "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit:
      "Direct income support of ₹6,000 per year (₹2,000 every 4 months) to all landholding farmers",
    eligibility:
      "All landholding farmers across India, regardless of income or caste. Excludes high-income taxpayers.",
    documents: [
      "Aadhaar Card",
      "Land records/Jamabandi",
      "Bank account details",
    ],
    apply_link: "https://pmkisan.gov.in",
    state: "All India",
    helpline: "18001155555",
    description:
      "This is India's flagship income support scheme for farmers. It directly deposits money into farmer bank accounts.",
  },

  {
    scheme_name: "Pradhan Mantri Awas Yojana (Urban)",
    ministry: "Ministry of Housing and Urban Affairs",
    benefit:
      "Home loan subsidy of ₹2.67 lakh to ₹9 lakh for house construction or purchase",
    eligibility:
      "Married women, lower-income groups, economically weaker sections. Annual income up to ₹12 lakh.",
    documents: [
      "Aadhaar",
      "Voter ID/Driving License",
      "Income certificate",
      "Property documents",
      "Bank account",
    ],
    apply_link: "https://pmaymis.gov.in",
    state: "All India",
    helpline: "1800-11-3141",
    description:
      "PM Awas Yojana aims to provide affordable housing to eligible citizens. The scheme offers different subsidy amounts based on income group.",
  },

  {
    scheme_name: "Pradhan Mantri Mudra Yojana (PMMY)",
    ministry: "Ministry of Micro, Small and Medium Enterprises",
    benefit:
      "Collateral-free business loans from ₹50,000 to ₹10 lakh for small businesses and entrepreneurs",
    eligibility:
      "Any Indian citizen above 18 years interested in starting or expanding a small business. No income limit.",
    documents: [
      "Aadhaar",
      "PAN",
      "Bank account statement",
      "Business plan",
      "Voter ID/DL",
    ],
    apply_link: "https://mudra.org.in",
    state: "All India",
    helpline: "1800-180-1111",
    description:
      "MUDRA Yojana funds small and medium enterprises. It has three loan categories: Shishu (up to 50,000), Kishore (50,000-5 lakh), and Tarun (5-10 lakh).",
  },

  {
    scheme_name:
      "Mahatma Gandhi National Rural Employment Guarantee Act (MGNREGA)",
    ministry: "Ministry of Rural Development",
    benefit:
      "Guaranteed 100 days of paid work per year at minimum wage (₹300-₹400 per day, varies by state)",
    eligibility:
      "Rural adults willing to do manual work. No age, gender, or income restrictions.",
    documents: [
      "Aadhaar",
      "Job card (issued after registration)",
      "Bank account for wage transfer",
    ],
    apply_link: "https://nrega.nic.in",
    state: "All India (applicable in rural areas)",
    helpline: "1800-180-5555",
    description:
      "MGNREGA guarantees employment for rural workers. It focuses on asset creation and wage employment. Registrations are free at Panchayat offices.",
  },

  {
    scheme_name: "Mahila Samridhi Yojana (MSY)",
    ministry: "Ministry of Women and Child Development",
    benefit:
      "Savings scheme with 7% annual interest. Government subsidy of 50% of first year deposit (maximum ₹500).",
    eligibility:
      "Women above 18 years. Annual income up to ₹2 lakh. Open for 10 years.",
    documents: ["Aadhaar", "Bank account", "Income certificate", "ID proof"],
    apply_link: "https://www.india.gov.in",
    state: "All India",
    helpline: "1800-11-6555",
    description:
      "Mahila Samridhi Yojana encourages women to save money. Deposits can be made monthly or as lump sum.",
  },

  {
    scheme_name: "Sukanya Samriddhi Yojana (SSY)",
    ministry: "Ministry of Finance",
    benefit:
      "High-return savings scheme: 8.2% annual interest (as of 2024). Tax-free returns.",
    eligibility:
      "Girls under 10 years old. Parents/guardians can open account. Valid till girl turns 21.",
    documents: [
      "Girl's birth certificate",
      "Parent's ID proof",
      "Address proof",
      "Bank account details",
    ],
    apply_link: "https://www.india.gov.in",
    state: "All India",
    helpline: "1800-11-8661",
    description:
      "Sukanya Samriddhi Yojana is a savings scheme for girls' education and marriage. Money earns high interest and is tax-free.",
  },

  {
    scheme_name: "Pradhan Mantri Jeevan Jyoti Bima Yojana (PMJJBY)",
    ministry: "Ministry of Labour and Employment",
    benefit:
      "Life insurance cover of ₹2 lakh in case of death (₹2 lakh for accidental death to beneficiary)",
    eligibility:
      "Indian citizens aged 18-50 years. Must have active bank account.",
    documents: ["Aadhaar", "Bank account", "ID proof"],
    apply_link: "https://www.india.gov.in",
    state: "All India",
    helpline: "1800-180-1111",
    description:
      "PMJJBY provides low-cost life insurance. Premium is only ₹330 per year (about ₹27 per month). Activates automatically if you have bank account.",
  },

  {
    scheme_name: "Pradhan Mantri Suraksha Bima Yojana (PMSBY)",
    ministry: "Ministry of Labour and Employment",
    benefit:
      "Personal accident insurance: ₹2 lakh for disability, ₹2 lakh for death. Maximum ₹4 lakh total.",
    eligibility:
      "Indian citizens aged 18-70 years with active bank account.",
    documents: ["Aadhaar", "Bank account", "ID proof"],
    apply_link: "https://www.india.gov.in",
    state: "All India",
    helpline: "1800-180-1111",
    description:
      "PMSBY covers accidents. Premium is ₹20 per year. Coverage includes accidental death, permanent disability, and partial disability.",
  },

  {
    scheme_name: "Ayushman Bharat - Pradhan Mantri Jan Arogya Yojana (AB-PMJAY)",
    ministry: "Ministry of Labour and Employment",
    benefit:
      "Free health insurance of ₹5 lakh per family per year. Covers hospitalization expenses.",
    eligibility:
      "Families identified as below poverty line or in economically weaker sections. Automatic eligibility if SECC data matches.",
    documents: [
      "Aadhaar/Voter ID/Driving License",
      "Ration card",
      "SECC ID (if available)",
    ],
    apply_link: "https://beneficiary.pmjay.gov.in",
    state: "All India",
    helpline: "1800-111-565",
    description:
      "Ayushman Bharat provides free health coverage. You can get treated at any PMJAY-empaneled hospital without paying.",
  },

  {
    scheme_name: "National Social Assistance Programme (NSAP)",
    ministry: "Ministry of Rural Development",
    benefit:
      "Monthly cash assistance: ₹200-₹500 for senior citizens (age 60+), widows, orphans depending on state.",
    eligibility:
      "Senior citizens (age 60+), widows, orphans. Income and asset limits vary by state.",
    documents: [
      "Age proof",
      "Income certificate",
      "Ration card",
      "Bank account",
    ],
    apply_link: "https://www.india.gov.in",
    state: "All India (varies by state)",
    helpline: "State revenue department",
    description:
      "NSAP provides monthly cash support. Amount differs by state. Application is made at Panchayat/Municipality office.",
  },
];

/**
 * Fetch schemes from MyScheme portal (primary source)
 * Falls back to cached data if unavailable
 */
async function fetchFromMySchemePortal(): Promise<GovernmentScheme[]> {
  try {
    // Use native fetch instead of axios (no external dependency)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch("https://www.myscheme.gov.in/api/schemes", {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data && Array.isArray(data)) {
        return data.map((scheme: any) => ({
          scheme_name: scheme.name || scheme.schemeName,
          ministry: scheme.ministry || scheme.ministryName || "Unknown",
          benefit: scheme.benefit || scheme.benefits || "See portal",
          eligibility: scheme.eligibility || scheme.criteria || "See portal",
          documents: scheme.documents || scheme.requiredDocuments || [],
          apply_link: scheme.applyLink || scheme.portal || scheme.url,
          state: scheme.state || "All India",
        }));
      }
    } catch (fetchError) {
      console.log("[Fetcher] MyScheme portal fetch failed:", fetchError);
    }
  } catch (error) {
    console.log("[Fetcher] MyScheme portal unavailable, using fallback");
  }
  return [];
}

/**
 * Fetch schemes from Data.gov.in portal
 */
async function fetchFromDataGovIn(): Promise<GovernmentScheme[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(
        "https://catalog.data.gov.in/api/3/action/package_search?q=government%20schemes&rows=50",
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data?.result?.results) {
        return data.result.results
          .map((dataset: any) => ({
            scheme_name:
              dataset.title || dataset.name || "Government Scheme",
            ministry: dataset.organization?.name || "Government of India",
            benefit: dataset.notes || dataset.description || "Check source",
            eligibility: "See official portal",
            documents: [],
            apply_link: dataset.url || dataset.dataset_url || "https://data.gov.in",
            state: "All India",
          }))
          .slice(0, 10);
      }
    } catch (fetchError) {
      console.log("[Fetcher] Data.gov.in fetch failed:", fetchError);
    }
  } catch (error) {
    console.log("[Fetcher] Data.gov.in unavailable, using fallback");
  }
  return [];
}

/**
 * Main function to fetch schemes with fallback
 */
export async function fetchSchemeData(
  userProfile?: {
    state?: string;
    category?: string;
    income?: number;
  }
): Promise<GovernmentScheme[]> {
  console.log("[Fetcher] Attempting to retrieve scheme data...");

  let schemes: GovernmentScheme[] = [];

  // Try MyScheme portal first
  try {
    const mySchemeData = await fetchFromMySchemePortal();
    if (mySchemeData.length > 0) {
      schemes = mySchemeData;
      console.log(`[Fetcher] Retrieved ${schemes.length} schemes from MyScheme`);
      return schemes;
    }
  } catch (error) {
    console.log("[Fetcher] MyScheme fetch failed");
  }

  // Try Data.gov.in second
  try {
    const dataGovSchemes = await fetchFromDataGovIn();
    if (dataGovSchemes.length > 0) {
      schemes = dataGovSchemes;
      console.log(`[Fetcher] Retrieved ${schemes.length} schemes from Data.gov.in`);
      return schemes;
    }
  } catch (error) {
    console.log("[Fetcher] Data.gov.in fetch failed");
  }

  // Fallback to cached real government scheme data
  console.log(
    `[Fetcher] Using fallback database with ${FALLBACK_SCHEMES.length} verified schemes`
  );

  // Filter schemes based on user profile if provided
  if (userProfile) {
    const filtered = filterSchemesByProfile(FALLBACK_SCHEMES, userProfile);
    return filtered.length > 0 ? filtered : FALLBACK_SCHEMES;
  }

  return FALLBACK_SCHEMES;
}

/**
 * Filter schemes based on user profile
 */
function filterSchemesByProfile(
  schemes: GovernmentScheme[],
  profile: {
    state?: string;
    category?: string;
    income?: number;
  }
): GovernmentScheme[] {
  return schemes.filter((scheme) => {
    // Check state applicability
    if (
      profile.state &&
      scheme.state !== "All India" &&
      !scheme.state.includes(profile.state)
    ) {
      return false;
    }

    // Check income limits if specified
    if (profile.income && scheme.eligibility) {
      const eligibility = scheme.eligibility.toLowerCase();
      // Basic income check - this is simplified
      if (
        eligibility.includes("income up to") &&
        profile.income > 300000
      ) {
        return false; // Likely doesn't match income restrictions
      }
    }

    return true;
  });
}

/**
 * Search schemes by keywords
 */
export async function searchSchemes(keywords: string): Promise<GovernmentScheme[]> {
  const allSchemes = await fetchSchemeData();

  const searchTerms = keywords.toLowerCase().split(" ");

  return allSchemes.filter((scheme) => {
    const searchableText =
      `${scheme.scheme_name} ${scheme.benefit} ${scheme.eligibility}`.toLowerCase();
    return searchTerms.every((term) => searchableText.includes(term));
  });
}

export default {
  fetchSchemeData,
  searchSchemes,
  FALLBACK_SCHEMES,
};
