import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Student profile from Phase 1 intake
 */
export interface StudentProfile {
  academicStream: 'science_pcm' | 'science_pcb' | 'commerce' | 'arts' | 'diploma' | 'in_college' | 'working';
  interests: string[]; // Multi-select from predefined list
  academicSituation: 'top' | 'above_average' | 'average' | 'below_average' | 'marks_dont_define';
  familyIncome: 'below_2_5L' | '2_5L_to_8L' | '8L_to_20L' | 'above_20L';
  location: 'metro' | 'tier2' | 'small_town' | 'rural' | 'willing_to_relocate';
  constraints: string[]; // Multi-select
  careerPriorities: string[]; // Select top 3
  existingAchievements: string[];
}

/**
 * Career match result
 */
export interface CareerMatch {
  name: string;
  matchScore: number;
  matchReason: string;
  salaryYear1: string;
  salaryYear5: string;
  salaryYear10: string;
  timeToJob: string;
  investmentNeeded: string;
  successRate: string;
  biggestChallenge: string;
  bestAdvantage: string;
}

/**
 * Career reality deep dive
 */
export interface CareerReality {
  dayInLife: string;
  whatCompaniesWant: string[];
  skillsInOrder: string[];
  freeResources: Array<{ name: string; url: string; description: string }>;
  projectsToBuild: string[];
  salaryReality: string;
  collegesThatPlace: string[];
  entranceExams: string[];
  realisticTimeline: string;
  commonMistakes: string[];
  successStories: string;
}

/**
 * Personal roadmap timeline
 */
export interface RoadmapPhase {
  phase: string;
  duration: string;
  skillsToLearn: string[];
  resources: string[];
  projects: string[];
  milestones: string[];
  mistakesToAvoid: string[];
}

/**
 * First-gen survival guide
 */
export interface FirstGenGuide {
  collegeApplications: string;
  emailTemplates: Array<{ purpose: string; template: string }>;
  networking: string;
  impostorSyndrome: string;
  moneyManagement: string;
  scholarships: string[];
  studentBankAccount: string;
  educationLoans: string;
  internshipOutreach: string;
}

/**
 * PathAI engine input
 */
export interface PathAIInput {
  phase: 'matching' | 'deepdive' | 'roadmap' | 'firstgen';
  profile?: StudentProfile;
  career?: string;
  query?: string;
}

/**
 * PathAI engine response
 */
export interface PathAIResponse {
  phase: string;
  careers?: CareerMatch[];
  careerReality?: CareerReality;
  roadmap?: RoadmapPhase[];
  firstGenGuide?: FirstGenGuide;
  firstGenFlag?: boolean;
  timestamp: number;
}

// ============================================================================
// AI PROMPTS
// ============================================================================

const CAREER_MATCH_PROMPT = `You are PathAI — India's most honest career guidance system.

You understand:
- Indian job market reality
- Real hiring requirements
- Real salary ranges
- Which degrees matter
- Which certifications are useless
- Paths that work for small-town and low-income students

Given a student profile, analyze and return EXACTLY 3 career matches.

Each career must include:
- NAME: Career title
- MATCH_REASON: Why this suits the student (2-3 sentences)
- SALARY_YEAR1: First year salary range (₹X–YL format)
- SALARY_YEAR5: Fifth year salary range
- SALARY_YEAR10: Tenth year salary range
- TIME_TO_JOB: How long until first paid job (e.g., "2-3 years")
- INVESTMENT_NEEDED: Total education cost (₹X–YL or "Free")
- SUCCESS_RATE: Realistic success rate (e.g., "Medium - 40% placement")
- BIGGEST_CHALLENGE: Main obstacle they'll face
- BEST_ADVANTAGE: What works in their favor

Also determine:
- FIRST_GEN_FLAG: YES if student shows first-gen indicators (low income, small town, constraints)

Return as JSON array of career objects. Be realistic, not aspirational. Focus on achievable paths.`;

const CAREER_DEEPDIVE_PROMPT = `You are PathAI — India's most honest career guidance system.

Provide a comprehensive career reality map for the given career. Be brutally honest about challenges and opportunities.

Include:

1. DAY_IN_LIFE: What a typical workday looks like (3-4 paragraphs)

2. WHAT_COMPANIES_WANT: List specific skills, tools, and experience employers actually hire for (not what college teaches)

3. SKILLS_IN_ORDER: Priority-ordered list of skills to learn

4. FREE_RESOURCES: 5-7 genuinely free, high-quality learning resources with URLs

5. PROJECTS_TO_BUILD: 3-5 portfolio projects that get you noticed

6. SALARY_REALITY: Honest breakdown of salary progression, location factors, and market conditions

7. COLLEGES_THAT_PLACE: Which colleges actually place students in this career (tier-1, tier-2, tier-3 reality)

8. ENTRANCE_EXAMS: Required entrance exams (if any) with difficulty ratings

9. REALISTIC_TIMELINE: Month-by-month achievable timeline

10. COMMON_MISTAKES: What students do wrong that kills their chances

11. SUCCESS_STORIES: 2-3 brief real anonymized examples of students who made it

Return as structured JSON object. No fluff, only actionable truth.`;

const ROADMAP_PROMPT = `You are PathAI — India's most honest career guidance system.

Create a detailed, month-by-month personal roadmap for breaking into this career.

Structure the roadmap in 5 phases:
1. THIS_MONTH (Month 0-1)
2. MONTHS_2_TO_6
3. MONTHS_7_TO_12
4. MONTHS_13_TO_18
5. MONTHS_19_TO_24

For each phase include:
- SKILLS_TO_LEARN: Specific skills with priority
- RESOURCES: Exact courses, books, tutorials (with URLs when possible)
- PROJECTS: What to build in this phase
- MILESTONES: Measurable achievements to hit
- MISTAKES_TO_AVOID: Common pitfalls in this phase

Be specific. Say "Learn React fundamentals from freeCodeCamp" not "Learn web development."

Return as JSON array of phase objects. Make it actionable from day one.`;

const FIRSTGEN_PROMPT = `You are PathAI — India's most honest career guidance system.

This student is a first-generation college aspirant with limited resources and guidance.

Create a comprehensive survival guide covering:

1. COLLEGE_APPLICATIONS: Step-by-step process, fee waivers, what documents needed

2. EMAIL_TEMPLATES: Professional email templates for:
   - Scholarship applications
   - Professor outreach
   - Internship requests
   - Networking messages

3. NETWORKING: How to build connections from zero, LinkedIn strategy, finding mentors

4. IMPOSTOR_SYNDROME: How to handle feeling out of place, building confidence

5. MONEY_MANAGEMENT: Budgeting as a student, avoiding common financial mistakes

6. SCHOLARSHIPS: List of actually accessible scholarships (not just merit-based)

7. STUDENT_BANK_ACCOUNT: Which banks offer zero-balance accounts, required documents

8. EDUCATION_LOANS: When loans make sense, government schemes, repayment reality

9. INTERNSHIP_OUTREACH: How to get your first internship without connections

Be practical. Assume they have no "inside knowledge" about how professional world works.

Return as structured JSON object with each section as a detailed string or array.`;

// ============================================================================
// CAREER MATCHING ENGINE
// ============================================================================

/**
 * Analyzes student profile and returns career matches
 */
export async function matchCareers(profile: StudentProfile): Promise<CareerMatch[]> {
  // In production, this would call Claude API
  // For now, return mock data based on profile analysis
  
  const mockMatches: CareerMatch[] = [];
  
  // Logic to determine career matches based on profile
  // This is simplified - in production would use AI
  
  if (profile.academicStream === 'science_pcm' && profile.interests.includes('technology')) {
    mockMatches.push({
      name: 'Data Scientist',
      matchScore: 87,
      matchReason: 'Strong math background and tech interest. Growing field in India with remote opportunities.',
      salaryYear1: '₹6–12L',
      salaryYear5: '₹25–50L',
      salaryYear10: '₹60L–1.5Cr',
      timeToJob: '2–3 years',
      investmentNeeded: '₹0–2L',
      successRate: 'Medium - 45% placement rate',
      biggestChallenge: 'Learning curve is steep, need strong programming skills',
      bestAdvantage: 'Can learn everything free online, no expensive degree required'
    });
  }
  
  if (profile.interests.includes('design')) {
    mockMatches.push({
      name: 'UI/UX Designer',
      matchScore: 82,
      matchReason: 'Creative field with good demand. Can start freelancing while learning.',
      salaryYear1: '₹4–8L',
      salaryYear5: '₹15–30L',
      salaryYear10: '₹35L–80L',
      timeToJob: '1–2 years',
      investmentNeeded: '₹0–50K',
      successRate: 'High - 60% employment rate',
      biggestChallenge: 'Building strong portfolio takes time',
      bestAdvantage: 'Can start with free tools and online courses'
    });
  }
  
  if (profile.academicStream === 'commerce' || profile.interests.includes('business')) {
    mockMatches.push({
      name: 'Digital Marketing Manager',
      matchScore: 85,
      matchReason: 'Business understanding helps. Every company needs digital marketing.',
      salaryYear1: '₹3–6L',
      salaryYear5: '₹12–25L',
      salaryYear10: '₹30L–60L',
      timeToJob: '6 months–1 year',
      investmentNeeded: '₹0–30K',
      successRate: 'Very High - 70% employment',
      biggestChallenge: 'Field changes fast, constant learning needed',
      bestAdvantage: 'Can start freelancing immediately, low entry barrier'
    });
  }
  
  // Ensure we return exactly 3 careers
  while (mockMatches.length < 3) {
    mockMatches.push({
      name: 'Software Developer',
      matchScore: 80,
      matchReason: 'Universal career option. High demand across India.',
      salaryYear1: '₹4–10L',
      salaryYear5: '₹15–35L',
      salaryYear10: '₹40L–1Cr',
      timeToJob: '2–3 years',
      investmentNeeded: '₹0–3L',
      successRate: 'High - 55% placement',
      biggestChallenge: 'Competitive field, need to stand out',
      bestAdvantage: 'Many free resources, can learn coding from anywhere'
    });
  }
  
  return mockMatches.slice(0, 3);
}

/**
 * Determines if student needs first-gen guidance
 */
export function needsFirstGenGuide(profile: StudentProfile): boolean {
  const lowincome = profile.familyIncome === 'below_2_5L' || profile.familyIncome === '2_5L_to_8L';
  const smallLocation = profile.location === 'small_town' || profile.location === 'rural';
  const firstGenConstraint = profile.constraints.includes('first_generation_student');
  
  return lowincome || smallLocation || firstGenConstraint;
}

// ============================================================================
// LAMBDA HANDLER
// ============================================================================

/**
 * PathAI Engine Lambda Handler
 * Routes requests to appropriate career guidance phase
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('PathAI Engine received event:', JSON.stringify(event, null, 2));

  try {
    const body: PathAIInput = JSON.parse(event.body || '{}');
    const { phase, profile, career, query } = body;

    if (!phase) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          engine: 'PathAI',
          error: 'phase is required (matching, deepdive, roadmap, firstgen)',
        }),
      };
    }

    const timestamp = Date.now();

    // Phase 1: Career Matching
    if (phase === 'matching') {
      if (!profile) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            engine: 'PathAI',
            error: 'profile is required for matching phase',
          }),
        };
      }

      const careers = await matchCareers(profile);
      const firstGenFlag = needsFirstGenGuide(profile);

      return {
        statusCode: 200,
        body: JSON.stringify({
          engine: 'PathAI',
          phase: 'matching',
          careers,
          firstGenFlag,
          timestamp,
        }),
      };
    }

    // Phase 2: Career Deep Dive
    if (phase === 'deepdive') {
      if (!career) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            engine: 'PathAI',
            error: 'career is required for deepdive phase',
          }),
        };
      }

      // In production, this would call Claude API with CAREER_DEEPDIVE_PROMPT
      const careerReality: CareerReality = {
        dayInLife: `As a ${career}, your day typically involves...`,
        whatCompaniesWant: [
          'Practical project experience',
          'Problem-solving skills',
          'Specific technical skills',
          'Communication abilities',
        ],
        skillsInOrder: [
          'Core fundamentals',
          'Industry tools',
          'Soft skills',
          'Advanced specialization',
        ],
        freeResources: [
          {
            name: 'freeCodeCamp',
            url: 'https://freecodecamp.org',
            description: 'Comprehensive free coding curriculum',
          },
        ],
        projectsToBuild: [
          'Portfolio project 1',
          'Portfolio project 2',
          'Portfolio project 3',
        ],
        salaryReality: 'Salary ranges from ₹X in tier-3 cities to ₹Y in metros...',
        collegesThatPlace: ['Tier-1 IITs/NITs', 'Good state colleges', 'Private colleges with placement'],
        entranceExams: ['JEE Main', 'State entrance exams'],
        realisticTimeline: 'Month-by-month breakdown of journey...',
        commonMistakes: [
          'Focusing only on theory',
          'Not building projects',
          'Ignoring soft skills',
        ],
        successStories: 'Student from small town in Bihar learned online, built projects, got job at startup...',
      };

      return {
        statusCode: 200,
        body: JSON.stringify({
          engine: 'PathAI',
          phase: 'deepdive',
          career,
          careerReality,
          timestamp,
        }),
      };
    }

    // Phase 3: Personal Roadmap
    if (phase === 'roadmap') {
      if (!career) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            engine: 'PathAI',
            error: 'career is required for roadmap phase',
          }),
        };
      }

      // In production, this would call Claude API with ROADMAP_PROMPT
      const roadmap: RoadmapPhase[] = [
        {
          phase: 'THIS_MONTH',
          duration: 'Month 0-1',
          skillsToLearn: ['Fundamentals', 'Basic tools'],
          resources: ['Course 1', 'Tutorial 2'],
          projects: ['Simple starter project'],
          milestones: ['Complete basics', 'Build first project'],
          mistakesToAvoid: ['Skipping fundamentals', 'Tutorial hell'],
        },
        {
          phase: 'MONTHS_2_TO_6',
          duration: 'Months 2-6',
          skillsToLearn: ['Intermediate skills', 'Industry tools'],
          resources: ['Advanced course', 'Documentation'],
          projects: ['Portfolio project'],
          milestones: ['Complete intermediate level', 'Start applying'],
          mistakesToAvoid: ['Not practicing enough', 'Perfectionism'],
        },
      ];

      return {
        statusCode: 200,
        body: JSON.stringify({
          engine: 'PathAI',
          phase: 'roadmap',
          career,
          roadmap,
          timestamp,
        }),
      };
    }

    // Phase 4: First-Gen Survival Guide
    if (phase === 'firstgen') {
      if (!profile) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            engine: 'PathAI',
            error: 'profile is required for firstgen phase',
          }),
        };
      }

      // In production, this would call Claude API with FIRSTGEN_PROMPT
      const firstGenGuide: FirstGenGuide = {
        collegeApplications: 'Step-by-step guide to applying to colleges...',
        emailTemplates: [
          {
            purpose: 'Scholarship request',
            template: 'Dear Sir/Madam,\n\nI am writing to inquire about...',
          },
        ],
        networking: 'How to build professional network from scratch...',
        impostorSyndrome: 'Strategies to handle feeling out of place...',
        moneyManagement: 'Student budgeting tips and strategies...',
        scholarships: ['National Scholarship Portal', 'State scholarships', 'Private scholarships'],
        studentBankAccount: 'Banks offering zero-balance accounts: SBI, HDFC...',
        educationLoans: 'Government education loan schemes and how to apply...',
        internshipOutreach: 'Cold email templates and strategies for getting internships...',
      };

      return {
        statusCode: 200,
        body: JSON.stringify({
          engine: 'PathAI',
          phase: 'firstgen',
          firstGenGuide,
          timestamp,
        }),
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({
        engine: 'PathAI',
        error: 'Invalid phase. Must be: matching, deepdive, roadmap, or firstgen',
      }),
    };
  } catch (error) {
    console.error('PathAI Engine error:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        engine: 'PathAI',
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
