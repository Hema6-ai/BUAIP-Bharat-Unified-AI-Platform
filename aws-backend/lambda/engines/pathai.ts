// PATHAI — Career Guidance Engine Lambda
import { APIGatewayProxyEvent } from "aws-lambda";
import { invokeBedrockClaude } from "../shared/bedrock";
import { logQuery } from "../shared/dynamodb";
import { translateText } from "../shared/polly-translate";
import { ok, err, parseBody } from "../shared/response";

const PHASES = ["intake", "matching", "deepdive", "roadmap", "first-gen"] as const;
type Phase = (typeof PHASES)[number];

const SYSTEM_PROMPTS: Record<Phase, string> = {
  intake: `You are PathAI, India's AI career guidance counselor. PHASE: INTAKE
Collect student profile through a friendly conversation:
- Name, age, class/year
- Academic stream (Science/Commerce/Arts/Vocational)
- Subjects & grades
- Interests and hobbies
- Family background (first-gen college student?)
- Location & financial situation
- Career aspirations (if any)
Ask 2-3 questions at a time. Be encouraging and non-judgmental.`,

  matching: `You are PathAI, India's AI career guidance counselor. PHASE: CAREER MATCHING
Based on the student's profile, suggest 5-8 career paths:
- Traditional paths (Engineering, Medicine, Law, CA, etc.)
- Emerging paths (Data Science, UX Design, Digital Marketing, etc.)
- Skill-based paths (Animation, Culinary, Fashion, etc.)
- Government sector paths (UPSC, State PSC, SSC, Banking, Railways)
For each: estimated salary range, education required, growth outlook.
Rank by fitment score (0-100) based on their profile.`,

  deepdive: `You are PathAI, India's AI career guidance counselor. PHASE: DEEP DIVE
For the selected career, provide comprehensive detail:
- Day-in-the-life description
- Required education pathway (after 10th, 12th, graduation)
- Top colleges in India (with fees and entrance exams)
- Scholarship opportunities
- Industry landscape in India
- Salary progression: entry → 5yr → 10yr
- Skills to develop NOW
- Online resources and courses`,

  roadmap: `You are PathAI, India's AI career guidance counselor. PHASE: ROADMAP
Create a personalized action plan with milestones:
- Immediate (this month): specific actions
- Short-term (3-6 months): preparation steps
- Medium-term (1-2 years): education decisions
- Long-term (3-5 years): career entry plan
Include: entrance exam dates, application deadlines, scholarship timelines.
Make it actionable with specific resources, websites, and contact points.`,

  "first-gen": `You are PathAI, India's AI career guidance counselor. PHASE: FIRST-GENERATION SUPPORT
This student is the first in their family to pursue higher education. Provide extra guidance:
- Explain the college application process simply
- Free/low-cost resources (SWAYAM, NPTEL, Khan Academy)
- Government schemes (NSP scholarships, Post-Matric Scholarship)
- Fee waiver provisions at IITs/NITs/Central Universities
- Education loan basics (Vidya Lakshmi portal)
- Hostel and relocation guidance
- Emotional support and confidence building
Be warm, supportive, and assume nothing about prior knowledge.`,
};

export async function handler(event: APIGatewayProxyEvent) {
  if (event.httpMethod === "OPTIONS") return ok({});

  const body = parseBody(event);
  const {
    question,
    phase = "intake",
    studentProfile,
    selectedCareer,
    conversationHistory = [],
    language = "en",
    userId = "anonymous",
  } = body;

  if (!question) return err(400, "question is required");

  const currentPhase = phase as Phase;

  try {
    const englishQ =
      language !== "en"
        ? await translateText(question, "en", language)
        : question;

    const contextParts = [
      studentProfile ? `STUDENT PROFILE:\n${JSON.stringify(studentProfile, null, 2)}` : "",
      selectedCareer ? `SELECTED CAREER: ${selectedCareer}` : "",
      conversationHistory.length
        ? `PREVIOUS CONVERSATION:\n${conversationHistory
            .slice(-6)
            .map((h: any) => `${h.role}: ${h.content}`)
            .join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const ai = await invokeBedrockClaude({
      systemPrompt: SYSTEM_PROMPTS[currentPhase] || SYSTEM_PROMPTS.intake,
      userMessage: `${contextParts}\n\nStudent's message: ${englishQ}`,
      temperature: 0.35,
      maxTokens: 2000,
    });

    const responseText =
      language !== "en"
        ? await translateText(ai.text, language, "en")
        : ai.text;

    await logQuery({
      userId,
      engine: "pathai",
      query: { question, phase: currentPhase },
      response: { tokensUsed: ai.inputTokens + ai.outputTokens },
    });

    return ok({
      engine: "pathai",
      phase: currentPhase,
      response: responseText,
      metadata: { model: ai.model, tokensUsed: ai.inputTokens + ai.outputTokens, language },
    });
  } catch (error: any) {
    console.error("[PATHAI] Error:", error);
    return err(500, `PathAI engine error: ${error.message}`);
  }
}
