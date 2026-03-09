/**
 * Adaptive Learning Mode Engine
 * Input -> learner context extraction -> knowledge map -> tutor reasoning -> adaptive explanation
 *
 * Uses Bedrock Claude for all reasoning.
 */

import { callBedrock } from '@/app/lib/bedrock';

// ── Types ──

export interface LearningState {
  topic: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  step: 'explain' | 'question' | 'evaluate' | 'deepen';
  questionsAsked: number;
  correctAnswers: number;
  conversationSoFar: Array<{ role: 'user' | 'assistant'; content: string }>;
  lastCheckQuestion?: string;
  weakAreas?: string[];
}

export interface LearningResponse {
  response: string;
  state: LearningState;
  isComplete: boolean;
}

interface StartLessonModel {
  conceptMap: string[];
  explanation: string;
  practicalExample: string;
  checkQuestion: string;
}

interface AnswerEvaluationModel {
  verdict: 'correct' | 'partial' | 'incorrect';
  strengths: string[];
  gaps: string[];
  confidence: 'high' | 'medium' | 'low';
}

interface AdaptedTutorTurnModel {
  feedback: string;
  bridgeExplanation: string;
  nextQuestion: string;
  studyTip: string;
}

// ── Initial explanation ──

export async function startLearning(
  topic: string,
  existingHistory: Array<{ role: string; content: string }>,
): Promise<LearningResponse> {
  const systemPrompt = `You are BUAIP Adaptive Tutor.

Create a first-turn lesson from topic input.
You must return valid JSON only.

Rules:
- Teach in simple language for beginners.
- Build a mini concept map before explanation.
- Use one practical India-relevant example.
- End with exactly one check question.
- Avoid generic motivational filler.

JSON schema:
{
  "conceptMap": ["string"],
  "explanation": "string",
  "practicalExample": "string",
  "checkQuestion": "string"
}`;

  const historySnippet = existingHistory.slice(-6);
  const modelOutput = await callBedrock(
    [
      {
        role: 'user',
        content: `Topic: ${topic}\nPrior conversation context: ${JSON.stringify(historySnippet)}`,
      },
    ],
    systemPrompt,
    { maxTokens: 1600, temperature: 0.2 },
  );

  const structured = parseJsonFromModel<StartLessonModel>(modelOutput);

  const explanation = structured
    ? [
        `Topic: ${topic}`,
        '',
        'Learning Map',
        ...(structured.conceptMap || []).map((point, index) => `${index + 1}. ${point}`),
        '',
        'Core Explanation',
        structured.explanation,
        '',
        'Practical Example',
        structured.practicalExample,
        '',
        `Quick Check: ${structured.checkQuestion}`,
      ].join('\n')
    : [
        `Topic: ${topic}`,
        '',
        'Core Explanation',
        modelOutput,
        '',
        'Quick Check: In one or two lines, what is the main idea you learned?',
      ].join('\n');

  const state: LearningState = {
    topic,
    level: 'beginner',
    step: 'question',
    questionsAsked: 1,
    correctAnswers: 0,
    conversationSoFar: [
      ...historySnippet
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .map((message) => ({
          role: message.role as 'user' | 'assistant',
          content: message.content,
        })),
      { role: 'user', content: `Teach me about: ${topic}` },
      { role: 'assistant', content: explanation },
    ],
    lastCheckQuestion: structured?.checkQuestion || extractCheckQuestion(explanation),
    weakAreas: [],
  };

  return { response: explanation, state, isComplete: false };
}

// ── Evaluate user's answer and adapt ──

export async function continueLearning(
  userAnswer: string,
  state: LearningState,
): Promise<LearningResponse> {
  const recentTurns = state.conversationSoFar.slice(-8);
  const evaluation = await evaluateLearnerAnswer(state, userAnswer, recentTurns);
  const updatedLevel = adaptDifficultyLevel(state.level, evaluation.verdict, state);

  const tutorResponse = await generateAdaptiveTutorTurn(
    state,
    userAnswer,
    evaluation,
    updatedLevel,
    recentTurns,
  );

  const isCorrect = evaluation.verdict === 'correct';
  const mergedWeakAreas = Array.from(
    new Set([...(state.weakAreas || []), ...(evaluation.gaps || [])]),
  ).slice(0, 6);

  const newState: LearningState = {
    ...state,
    step: 'question',
    questionsAsked: state.questionsAsked + 1,
    correctAnswers: state.correctAnswers + (isCorrect ? 1 : 0),
    level: updatedLevel,
    conversationSoFar: [
      ...state.conversationSoFar,
      { role: 'user', content: userAnswer },
      { role: 'assistant', content: tutorResponse },
    ],
    lastCheckQuestion: extractCheckQuestion(tutorResponse),
    weakAreas: mergedWeakAreas,
  };

  const accuracy = newState.correctAnswers / newState.questionsAsked;
  const isComplete =
    newState.questionsAsked >= 6 &&
    accuracy >= 0.75 &&
    (newState.level === 'intermediate' || newState.level === 'advanced');

  return { response: tutorResponse, state: newState, isComplete };
}

// ── Helpers ──

function advanceLevel(
  level: 'beginner' | 'intermediate' | 'advanced',
): 'beginner' | 'intermediate' | 'advanced' {
  if (level === 'beginner') return 'intermediate';
  return 'advanced';
}

function retreatLevel(
  level: 'beginner' | 'intermediate' | 'advanced',
): 'beginner' | 'intermediate' | 'advanced' {
  if (level === 'advanced') return 'intermediate';
  return 'beginner';
}

function extractCheckQuestion(text: string): string | undefined {
  const match = text.match(/Quick Check:\s*(.+?)(?:\n|$)/i);
  if (match) return match[1].trim();

  const sentences = text.split(/[.!]\s+/);
  const questions = sentences.filter((s) => s.includes('?'));
  return questions.length > 0
    ? questions[questions.length - 1].trim()
    : undefined;
}

function adaptDifficultyLevel(
  current: 'beginner' | 'intermediate' | 'advanced',
  verdict: 'correct' | 'partial' | 'incorrect',
  state: LearningState,
): 'beginner' | 'intermediate' | 'advanced' {
  if (verdict === 'correct') {
    const projectedAccuracy = (state.correctAnswers + 1) / (state.questionsAsked + 1);
    if (projectedAccuracy >= 0.7) {
      return advanceLevel(current);
    }
    return current;
  }

  if (verdict === 'incorrect') {
    return retreatLevel(current);
  }

  return current;
}

async function evaluateLearnerAnswer(
  state: LearningState,
  userAnswer: string,
  recentTurns: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<AnswerEvaluationModel> {
  const systemPrompt = `You are a strict learning evaluator.
Given the tutor's previous explanation and check question, evaluate the learner answer.

Return valid JSON only:
{
  "verdict": "correct|partial|incorrect",
  "strengths": ["string"],
  "gaps": ["string"],
  "confidence": "high|medium|low"
}`;

  const payload = {
    topic: state.topic,
    learnerLevel: state.level,
    lastCheckQuestion: state.lastCheckQuestion || null,
    recentTurns,
    learnerAnswer: userAnswer,
  };

  const raw = await callBedrock(
    [{ role: 'user', content: JSON.stringify(payload, null, 2) }],
    systemPrompt,
    { maxTokens: 900, temperature: 0.05 },
  );

  const parsed = parseJsonFromModel<AnswerEvaluationModel>(raw);
  if (parsed?.verdict) {
    return parsed;
  }

  return {
    verdict: 'partial',
    strengths: [],
    gaps: ['Could not reliably evaluate answer quality.'],
    confidence: 'low',
  };
}

async function generateAdaptiveTutorTurn(
  state: LearningState,
  userAnswer: string,
  evaluation: AnswerEvaluationModel,
  updatedLevel: 'beginner' | 'intermediate' | 'advanced',
  recentTurns: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<string> {
  const systemPrompt = `You are BUAIP Adaptive Tutor.

Use the evaluation result to produce the next tutor turn.
You must return valid JSON only.

Rules:
- If verdict is incorrect: simplify concept and ask easier next question.
- If verdict is partial: confirm correct parts, close one key gap, then ask similar-level question.
- If verdict is correct: deepen to next concept and ask slightly harder question.
- Keep tone warm but concise.
- End with exactly one next question.

JSON schema:
{
  "feedback": "string",
  "bridgeExplanation": "string",
  "nextQuestion": "string",
  "studyTip": "string"
}`;

  const payload = {
    topic: state.topic,
    previousLevel: state.level,
    updatedLevel,
    evaluation,
    learnerAnswer: userAnswer,
    weakAreas: state.weakAreas || [],
    recentTurns,
  };

  const raw = await callBedrock(
    [{ role: 'user', content: JSON.stringify(payload, null, 2) }],
    systemPrompt,
    { maxTokens: 1400, temperature: 0.2 },
  );

  const structured = parseJsonFromModel<AdaptedTutorTurnModel>(raw);
  if (!structured) {
    return [
      'Feedback',
      `Your answer is ${evaluation.verdict}. Let's tighten the idea with one short revision.`,
      '',
      'Mini Lesson',
      `Topic focus: ${state.topic}. Keep your explanation to one core principle and one practical example.`,
      '',
      'Study Tip',
      'Use the pattern definition -> example -> why it matters before answering.',
      '',
      'Quick Check: Can you now explain this concept in two lines with one example?',
    ].join('\n');
  }

  return [
    'Feedback',
    structured.feedback,
    '',
    'Mini Lesson',
    structured.bridgeExplanation,
    '',
    'Study Tip',
    structured.studyTip,
    '',
    `Quick Check: ${structured.nextQuestion}`,
  ].join('\n');
}

function parseJsonFromModel<T>(text: string): T | null {
  const direct = tryJsonParse<T>(text);
  if (direct) return direct;

  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    const parsed = tryJsonParse<T>(fenced[1]);
    if (parsed) return parsed;
  }

  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch?.[0]) {
    return tryJsonParse<T>(objectMatch[0]);
  }

  return null;
}

function tryJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
