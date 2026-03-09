import { continueLearning } from '@/app/lib/ai-capabilities/learningMode';
import { getLearningState } from '@/app/lib/ai-capabilities/sessionMemory';
import type { CapabilityHandlerResult } from '@/capabilities/types';

export async function handleLearningCapability(
  userMessage: string,
  sessionId: string,
): Promise<CapabilityHandlerResult> {
  const learningState = getLearningState(sessionId);
  if (!learningState) {
    return { handled: false, capability: 'learning_ai' };
  }

  try {
    const result = await continueLearning(userMessage, learningState);
    return {
      handled: true,
      capability: 'learning_ai',
      response: result.response,
      meta: {
        topic: learningState.topic,
        level: result.state.level,
        questionsAsked: result.state.questionsAsked,
        isComplete: result.isComplete,
      },
    };
  } catch (error) {
    console.error('[LearningCapability] Error:', error);
    return { handled: false, capability: 'learning_ai' };
  }
}
