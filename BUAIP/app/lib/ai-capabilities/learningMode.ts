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
  const systemPrompt = `You are BUAIP Adaptive Tutor - teach like a real teacher, not a chatbot.

Your role:
1. Break down complex topics into easy steps
2. Use India-relevant examples
3. Build understanding progressively
4. End EVERY explanation with ONE check question
5. Be conversational and warm

Structure your response:
## What You'll Learn
- List 3-4 key points

## Core Explanation
[Detailed but simple explanation in 200-300 words]

## Real Example  
[Practical India-relevant example]

## Let's Check Your Understanding
Ask ONE specific question to verify they understood the concept.`;

  const historySnippet = existingHistory.slice(-4);
  const modelOutput = await callBedrock(
    [
      {
        role: 'user',
        content: `Teach me about "${topic}" as if I'm a complete beginner. Start from basics.`,
      },
    ],
    systemPrompt,
    { maxTokens: 2000, temperature: 0.3 },
  );

  const explanation = modelOutput.trim() || generateFallbackLessonStart(topic);

  const state: LearningState = {
    topic,
    level: 'beginner',
    step: 'question',
    questionsAsked: 1,
    correctAnswers: 0,
    conversationSoFar: [
      { role: 'user', content: `Teach me about: ${topic}` },
      { role: 'assistant', content: explanation },
    ],
    lastCheckQuestion: extractCheckQuestion(explanation),
    weakAreas: [],
  };

  return { response: explanation, state, isComplete: false };
}

function generateFallbackLessonStart(topic: string): string {
  return `# Learning: ${topic}

## What You'll Learn
- What ${topic} means
- How it applies to India
- Why it's important for you
- Practical steps to use it

## Core Explanation
${topic} is an important concept that affects many aspects of life in India. Let me explain it in simple terms:

Think about daily life. Many things around you follow patterns or rules. ${topic} is one such pattern that helps us understand how things work or how to achieve something.

In India, this concept is particularly relevant because:
1. It connects to government schemes and policies
2. It affects agriculture, business, education
3. Understanding it helps in making better decisions

## Real Example
Consider a farmer in Tamil Nadu who wants to grow better crops. By understanding ${topic}, they can make smarter choices about what to plant, when to plant, and how to manage resources efficiently.

## Let's Check Your Understanding
In your own words, can you explain what ${topic} means and give one example from your life?`;
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
  const systemPrompt = `You are a fair teacher evaluating a student's answer.

The student was asked to explain or answer about: "${state.lastCheckQuestion || state.topic}"

Their answer was: "${userAnswer}"

EVALUATE IN THREE PARTS:
1. Is their understanding correct, partial, or incorrect?
2. What parts are they doing right?
3. What gaps in understanding exist?

Output ONLY these three lines:
VERDICT: [correct/partial/incorrect]
STRENGTHS: [what they got right]
GAPS: [what they missed or misunderstood]`;

  const raw = await callBedrock(
    [{ role: 'user', content: userAnswer }],
    systemPrompt,
    { maxTokens: 400, temperature: 0.1 },
  );

  // Simple text parsing instead of JSON
  const verdict = raw.includes('correct:') && !raw.includes('incorrect')
    ? 'correct'
    : raw.includes('partial')
    ? 'partial'
    : 'incorrect';

  const strengthMatch = raw.match(/STRENGTHS:\s*(.+?)(?:\n|$)/i);
  const gapMatch = raw.match(/GAPS:\s*(.+?)(?:\n|$)/i);

  return {
    verdict,
    strengths: strengthMatch ? [strengthMatch[1].trim()] : [],
    gaps: gapMatch ? [gapMatch[1].trim()] : ['Answer evaluation complete'],
    confidence: 'high',
  };
}

async function generateAdaptiveTutorTurn(
  state: LearningState,
  userAnswer: string,
  evaluation: AnswerEvaluationModel,
  updatedLevel: 'beginner' | 'intermediate' | 'advanced',
  recentTurns: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<string> {
  const systemPrompt = `You are a patient tutor. Your learner just answered a question about "${state.topic}".

Evaluation of their answer:
- Verdict: ${evaluation.verdict}
- Strengths: ${(evaluation.strengths || []).join(', ') || 'None noted'}
- Gaps: ${(evaluation.gaps || []).join(', ') || 'No gaps'}

YOUR JOB:
1. Give WARM, SPECIFIC feedback on their answer
2. Never be harsh - learning is hard
3. If incorrect: simplify concept, ask easier question
4. If partial: confirm correct parts, fix ONE gap at a time
5. If correct: introduce next concept, ask harder question
6. ALWAYS end with ONE new check question

Format your response as:
## Your Answer
[Specific feedback about what they said]

## Let Me Clarify  
[Simple explanation addressing the gap or building on correct parts]

## New Question
Ask similar difficulty (if partial), simpler (if incorrect), or deeper (if correct)`;

  const raw = await callBedrock(
    [{ role: 'user', content: `Learner's answer: "${userAnswer}"\n\nPrior explanation was about: ${state.lastCheckQuestion}` }],
    systemPrompt,
    { maxTokens: 1800, temperature: 0.3 },
  );

  return raw.trim() || generateFallbackTutorResponse(evaluation.verdict, state.topic);
}

function generateFallbackTutorResponse(verdict: 'correct' | 'partial' | 'incorrect', topic: string): string {
  if (verdict === 'correct') {
    return `## Your Answer
Excellent! You understand the core concept of ${topic}.

## Let Me Build on That
Now that you understand the basics, let's explore how this applies in the real world.

## New Question
Can you think of TWO examples from India where ${topic} is used or matters?`;
  }

  if (verdict === 'partial') {
    return `## Your Answer
You're on the right track! You understood the basic idea, but let me clarify one part.

## Let Me Clarify
The most important thing to remember about ${topic} is that it affects real-life decisions. Every person and business uses it, whether they know the term or not.

## New Question
Can you explain ${topic} in just 2-3 sentences, focusing on the main benefit or impact?`;
  }

  // incorrect
  return `## Your Answer
That's not quite right, but that's okay! Learning is about making mistakes and fixing them.

## Let Me Clarify
Let me explain ${topic} more simply.

Imagine you have a basic need or goal. ${topic} is the process or principle that helps you achieve it efficiently.

Think about it like this: Every day you make decisions. ${topic} is a tool or knowledge that helps you make BETTER decisions.

## New Question
In one sentence, what do you think ${topic} helps people do or understand?`;
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
