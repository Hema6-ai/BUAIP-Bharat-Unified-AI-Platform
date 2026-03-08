/**
 * PATHAI - CAREER INTELLIGENCE ENGINE
 * 
 * API Route for Career Guidance and Planning
 * Handles career matching, deep dives, roadmaps, and first-gen guidance
 */

import { NextRequest, NextResponse } from 'next/server';
import { callBedrock } from '@/app/lib/bedrock';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============================================================================
// TYPES
// ============================================================================

interface StudentProfile {
  academicStream: 'science_pcm' | 'science_pcb' | 'commerce' | 'arts' | 'diploma' | 'in_college' | 'working';
  interests: string[];
  academicSituation: 'top' | 'above_average' | 'average' | 'below_average' | 'marks_dont_define';
  familyIncome: 'below_2_5L' | '2_5L_to_8L' | '8L_to_20L' | 'above_20L';
  location: 'metro' | 'tier2' | 'small_town' | 'rural' | 'willing_to_relocate';
  constraints: string[];
  careerPriorities: string[];
  existingAchievements: string[];
}

interface PathAIRequest {
  phase: 'intake' | 'matching' | 'deepdive' | 'roadmap' | 'firstgen';
  profile?: StudentProfile;
  career?: string;
  query?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

// ============================================================================
// AI PROMPTS
// ============================================================================

const PROMPTS = {
  matching: {
    system: `You are PathAI — India's most honest career guidance system.

You understand:
- Indian job market reality
- Real hiring requirements
- Real salary ranges
- Which degrees matter
- Which certifications are useless
- Paths that work for small-town and low-income students

Given a student profile, analyze and return EXACTLY 3 career matches.

Each career must include:
- name: Career title
- matchScore: 0-100 numerical score
- matchReason: Why this suits the student (2-3 sentences)
- salaryYear1: First year salary range (₹X–YL format)
- salaryYear5: Fifth year salary range
- salaryYear10: Tenth year salary range
- timeToJob: How long until first paid job
- investmentNeeded: Total education cost
- successRate: Realistic success rate description
- biggestChallenge: Main obstacle they'll face
- bestAdvantage: What works in their favor

Also determine:
- firstGenFlag: true if student shows first-gen indicators (low income, small town, constraints)

Return as valid JSON with structure:
{
  "careers": [...],
  "firstGenFlag": true/false
}

Be realistic, not aspirational. Focus on achievable paths for Indian students.`,
  },
  
  deepdive: {
    system: `You are PathAI — India's most honest career guidance system.

Provide a comprehensive career reality map. Be brutally honest about challenges and opportunities.

Return as valid JSON with structure:
{
  "dayInLife": "string description of typical workday",
  "whatCompaniesWant": ["skill 1", "skill 2", ...],
  "skillsInOrder": ["priority 1", "priority 2", ...],
  "freeResources": [
    {"name": "...", "url": "...", "description": "..."}
  ],
  "projectsToBuild": ["project 1", ...],
  "salaryReality": "honest breakdown of salary progression",
  "collegesThatPlace": ["college/tier info", ...],
  "entranceExams": ["exam 1", ...],
  "realisticTimeline": "month-by-month breakdown",
  "commonMistakes": ["mistake 1", ...],
  "successStories": "2-3 brief real anonymized examples"
}

Focus on ground truth, not marketing brochures.`,
  },
  
  roadmap: {
    system: `You are PathAI — India's most honest career guidance system.

Create a detailed, month-by-month personal roadmap for breaking into this career.

Return as valid JSON array with 5 phases:
[
  {
    "phase": "THIS_MONTH",
    "duration": "Month 0-1",
    "skillsToLearn": ["Specific skills with priority"],
    "resources": ["Exact courses, books, tutorials with URLs"],
    "projects": ["What to build in this phase"],
    "milestones": ["Measurable achievements"],
    "mistakesToAvoid": ["Common pitfalls"]
  },
  ... (MONTHS_2_TO_6, MONTHS_7_TO_12, MONTHS_13_TO_18, MONTHS_19_TO_24)
]

Be specific. Say "Learn React from freeCodeCamp" not "Learn web development."
Make it actionable from day one for Indian students.`,
  },
  
  firstgen: {
    system: `You are PathAI — India's most honest career guidance system.

This student is a first-generation college aspirant with limited resources and guidance.

Return as valid JSON with structure:
{
  "collegeApplications": "step-by-step process, fee waivers, documents",
  "emailTemplates": [
    {"purpose": "...", "template": "..."}
  ],
  "networking": "how to build connections from zero",
  "impostorSyndrome": "handling feeling out of place",
  "moneyManagement": "budgeting as student",
  "scholarships": ["accessible scholarship 1", ...],
  "studentBankAccount": "zero-balance accounts info",
  "educationLoans": "when loans make sense, schemes",
  "internshipOutreach": "getting first internship without connections"
}

Be practical. Assume zero "inside knowledge" about professional world.
Focus on actionable advice for Indian first-gen students.`,
  },
};

// ============================================================================
// AI FUNCTION
// ============================================================================

async function callPathAI(phase: string, prompt: string, userContent: string): Promise<any> {
  try {
    // Use callBedrock for AWS Bedrock Claude access (consistent with other BUAIP engines)
    const textContent = await callBedrock(
      [{ role: 'user', content: userContent }],
      prompt,  // system prompt
      {
        maxTokens: 3000,
        temperature: 0.3,
      }
    );

    // Try to parse as JSON
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = textContent.match(/```(?:json)?\s*(\{[\s\S]*\}|\[[\s\S]*\])\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : textContent;
      return JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[PathAI] Failed to parse JSON response:', textContent.substring(0, 200));
      // Return raw text if JSON parsing fails
      return { rawResponse: textContent };
    }
  } catch (error) {
    console.error('[PathAI] AI function error:', error);
    throw error;
  }
}

// ============================================================================
// POST HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as PathAIRequest;
    const { phase, profile, career, query, conversationHistory = [] } = body;

    if (!phase) {
      return NextResponse.json(
        { error: 'phase is required (intake, matching, deepdive, roadmap, firstgen)' },
        { status: 400 }
      );
    }

    console.log('[PathAI API] Processing request:', { phase, hasProfile: !!profile, career, hasQuery: !!query });

    const timestamp = Date.now();

    // Phase 0: Intake - Conversational career guidance
    if (phase === 'intake') {
      if (!query) {
        return NextResponse.json(
          { error: 'query is required for intake phase' },
          { status: 400 }
        );
      }

      // Provide conversational career guidance
      const intakePrompt = `You are PathAI — India's most honest career guidance system.

A student has asked: "${query}"

This is the beginning of a career guidance conversation. Your role:
1. Understand their situation empathetically
2. Ask ONE relevant follow-up question to understand them better
3. Be conversational and supportive (not robotic)
4. Focus on understanding: academic background, interests, constraints, priorities

If they seem completely lost, help them articulate what they enjoy doing.
If they mention specific careers, ask about their reasoning.
If they share personal constraints (money, location), acknowledge them.

Be brief (2-3 sentences max) and ask only ONE question.`;

      const conversationMessages = [
        ...(conversationHistory || []),
        { role: 'user', content: query }
      ];

      const aiResponse = await callPathAI('intake', intakePrompt, JSON.stringify(conversationMessages));

      return NextResponse.json({
        success: true,
        engine: 'PathAI',
        phase: 'intake',
        response: aiResponse.rawResponse || aiResponse,
        timestamp,
      });
    }

    // Phase 1: Career Matching
    if (phase === 'matching') {
      if (!profile) {
        return NextResponse.json(
          { error: 'profile is required for matching phase' },
          { status: 400 }
        );
      }

      const userContent = `Student Profile:
Academic Stream: ${profile.academicStream}
Interests: ${profile.interests.join(', ')}
Academic Situation: ${profile.academicSituation}
Family Income: ${profile.familyIncome}
Location: ${profile.location}
Constraints: ${profile.constraints.join(', ')}
Career Priorities: ${profile.careerPriorities.join(', ')}
Existing Achievements: ${profile.existingAchievements.join(', ')}

Analyze this profile and return 3 best-fit career matches with honest assessments.`;

      const aiResponse = await callPathAI('matching', PROMPTS.matching.system, userContent);

      return NextResponse.json({
        success: true,
        engine: 'PathAI',
        phase: 'matching',
        careers: aiResponse.careers || [],
        firstGenFlag: aiResponse.firstGenFlag || false,
        timestamp,
      });
    }

    // Phase 2: Career Deep Dive
    if (phase === 'deepdive') {
      if (!career) {
        return NextResponse.json(
          { error: 'career is required for deepdive phase' },
          { status: 400 }
        );
      }

      const userContent = `Career: ${career}

Provide a comprehensive reality map for this career in India. Include all aspects: day in life, skills needed, resources, projects, salary reality, colleges, exams, timeline, mistakes, and success stories.`;

      const aiResponse = await callPathAI('deepdive', PROMPTS.deepdive.system, userContent);

      return NextResponse.json({
        success: true,
        engine: 'PathAI',
        phase: 'deepdive',
        career,
        careerReality: aiResponse,
        timestamp,
      });
    }

    // Phase 3: Personal Roadmap
    if (phase === 'roadmap') {
      if (!career) {
        return NextResponse.json(
          { error: 'career is required for roadmap phase' },
          { status: 400 }
        );
      }

      const userContent = `Career Target: ${career}

Create a detailed 24-month roadmap with 5 phases (THIS_MONTH, MONTHS_2_TO_6, MONTHS_7_TO_12, MONTHS_13_TO_18, MONTHS_19_TO_24). Each phase should include specific skills, resources with URLs, projects, milestones, and mistakes to avoid.`;

      const aiResponse = await callPathAI('roadmap', PROMPTS.roadmap.system, userContent);

      return NextResponse.json({
        success: true,
        engine: 'PathAI',
        phase: 'roadmap',
        career,
        roadmap: Array.isArray(aiResponse) ? aiResponse : [aiResponse],
        timestamp,
      });
    }

    // Phase 4: First-Gen Survival Guide
    if (phase === 'firstgen') {
      if (!profile) {
        return NextResponse.json(
          { error: 'profile is required for firstgen phase' },
          { status: 400 }
        );
      }

      const userContent = `First-Generation Student Profile:
Academic Stream: ${profile.academicStream}
Family Income: ${profile.familyIncome}
Location: ${profile.location}
Constraints: ${profile.constraints.join(', ')}

Provide comprehensive survival guide for first-generation college aspirant. Include college applications, email templates, networking, impostor syndrome, money management, scholarships, banking, loans, and internship outreach.`;

      const aiResponse = await callPathAI('firstgen', PROMPTS.firstgen.system, userContent);

      return NextResponse.json({
        success: true,
        engine: 'PathAI',
        phase: 'firstgen',
        firstGenGuide: aiResponse,
        timestamp,
      });
    }

    return NextResponse.json(
      { error: 'Invalid phase. Must be: matching, deepdive, roadmap, or firstgen' },
      { status: 400 }
    );

  } catch (error) {
    console.error('[PathAI API] Error:', error);
    return NextResponse.json(
      {
        error: 'PathAI processing error',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET HANDLER - Return engine info
// ============================================================================

export async function GET(request: NextRequest) {
  return NextResponse.json({
    engine: 'PathAI',
    version: '1.0.0',
    description: 'Career Intelligence Engine - Honest career guidance for Indian students',
    phases: [
      {
        name: 'intake',
        description: 'Conversational career guidance and profile building',
        requires: ['query'],
      },
      {
        name: 'matching',
        description: 'Match student profile to 3 best-fit careers',
        requires: ['profile'],
      },
      {
        name: 'deepdive',
        description: 'Comprehensive career reality map',
        requires: ['career'],
      },
      {
        name: 'roadmap',
        description: '24-month personal roadmap to career',
        requires: ['career'],
      },
      {
        name: 'firstgen',
        description: 'First-generation student survival guide',
        requires: ['profile'],
      },
    ],
    capabilities: [
      'Real salary expectations',
      'Hiring requirements truth',
      'Step-by-step roadmaps',
      'First-gen guidance',
      'Free learning resources',
      'Portfolio project ideas',
      'Common mistakes to avoid',
    ],
  });
}
