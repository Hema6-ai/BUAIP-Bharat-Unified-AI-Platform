/**
 * Adaptive Learning Mode Engine
 * Teaches concepts interactively like a tutor/mentor.
 * Runs a learning loop: explain → check → evaluate → adapt.
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
}

export interface LearningResponse {
  response: string;
  state: LearningState;
  isComplete: boolean;
}

// ── Initial explanation ──

export async function startLearning(
  topic: string,
  existingHistory: Array<{ role: string; content: string }>,
): Promise<LearningResponse> {
  const systemPrompt = `You are BUAIP Learning Mode — an adaptive AI tutor.

Your teaching style:
- Explain concepts in very simple language
- Use real-life analogies and Indian context examples
- Break complex topics into digestible pieces
- At the end of your explanation, ALWAYS ask ONE check question to test understanding
- Mark the check question clearly with "🤔 **Quick Check:**"

Current task: Explain the topic requested. Then ask one simple question to check if the student understood.

Format your response:
1. Simple explanation with bullet points / numbered steps
2. Real-world example
3. If it's a career/skill topic, include: roadmap, required skills, resources
4. End with exactly ONE check question

Keep it conversational and encouraging.`;

  const explanation = await callBedrock(
    [{ role: 'user', content: `Teach me about: ${topic}` }],
    systemPrompt,
    { maxTokens: 2500, temperature: 0.4 },
  );

  const state: LearningState = {
    topic,
    level: 'beginner',
    step: 'question', // After explaining, we're waiting for the answer
    questionsAsked: 1,
    correctAnswers: 0,
    conversationSoFar: [
      { role: 'user', content: `Teach me about: ${topic}` },
      { role: 'assistant', content: explanation },
    ],
    lastCheckQuestion: extractCheckQuestion(explanation),
  };

  return { response: explanation, state, isComplete: false };
}

// ── Evaluate user's answer and adapt ──

export async function continueLearning(
  userAnswer: string,
  state: LearningState,
): Promise<LearningResponse> {
  const systemPrompt = `You are BUAIP Learning Mode — an adaptive AI tutor in a learning loop.

Topic: ${state.topic}
Student Level: ${state.level}
Questions asked so far: ${state.questionsAsked}
Correct answers: ${state.correctAnswers}

Your task:
1. First, evaluate whether the student's answer is correct, partially correct, or wrong.
2. Give encouraging feedback.
3. If WRONG → Re-explain the concept more simply with a different analogy. Then ask an easier question.
4. If PARTIALLY CORRECT → Acknowledge what they got right, clarify what they missed. Ask a similar-level question.
5. If CORRECT → Praise them! Move to a deeper/harder concept. Ask a harder question.

Always end with ONE new check question marked with "🤔 **Quick Check:**"

Keep it conversational. Be encouraging. Use simple language.
Adapt your language complexity to the student's level.`;

  const messages = [
    ...state.conversationSoFar.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: userAnswer },
  ];

  const response = await callBedrock(messages, systemPrompt, {
    maxTokens: 2000,
    temperature: 0.4,
  });

  // Determine if answer was correct based on AI response
  const lowerResp = response.toLowerCase();
  const isCorrect =
    lowerResp.includes('correct') ||
    lowerResp.includes('right') ||
    lowerResp.includes('exactly') ||
    lowerResp.includes('well done') ||
    lowerResp.includes('great job') ||
    lowerResp.includes('that\'s right');

  const isPartial =
    lowerResp.includes('partially') ||
    lowerResp.includes('almost') ||
    lowerResp.includes('close');

  // Update state
  const newState: LearningState = {
    ...state,
    step: 'question',
    questionsAsked: state.questionsAsked + 1,
    correctAnswers: state.correctAnswers + (isCorrect && !isPartial ? 1 : 0),
    level: isCorrect && !isPartial
      ? advanceLevel(state.level)
      : (!isCorrect && !isPartial ? retreatLevel(state.level) : state.level),
    conversationSoFar: [
      ...state.conversationSoFar,
      { role: 'user', content: userAnswer },
      { role: 'assistant', content: response },
    ],
    lastCheckQuestion: extractCheckQuestion(response),
  };

  // Learning is "complete" after 5+ questions with 80%+ accuracy
  const isComplete =
    newState.questionsAsked >= 6 &&
    newState.correctAnswers / newState.questionsAsked >= 0.8;

  return { response, state: newState, isComplete };
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
  // Look for the check question marker
  const match = text.match(/🤔\s*\*?\*?Quick Check:?\*?\*?\s*(.+?)(?:\n|$)/i);
  if (match) return match[1].trim();

  // Fallback: last question mark sentence
  const sentences = text.split(/[.!]\s+/);
  const questions = sentences.filter((s) => s.includes('?'));
  return questions.length > 0
    ? questions[questions.length - 1].trim()
    : undefined;
}
