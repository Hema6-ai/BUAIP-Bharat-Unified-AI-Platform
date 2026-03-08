import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
} from '@aws-sdk/client-bedrock-runtime';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * AI model configuration
 */
export interface ModelConfig {
  modelId: string;
  maxTokens: number;
  temperature: number;
}

/**
 * Engine-specific configuration
 */
export interface EngineConfig {
  systemPrompt: string;
  modelConfig: ModelConfig;
  outputFormat?: string;
}

/**
 * AI response structure
 */
export interface AIResponse {
  engineName: string;
  generatedText: string;
  tokensUsed?: number;
  model: string;
}

/**
 * Bedrock client options
 */
export interface BedrockOptions {
  region?: string;
  modelId?: string;
}

// ============================================================================
// MODEL CONFIGURATIONS
// ============================================================================

/**
 * Default model configurations for Bedrock models
 * Using Claude 3.5 Sonnet as the primary model
 */
const DEFAULT_MODEL_CONFIG: ModelConfig = {
  modelId: 'anthropic.claude-3-5-sonnet-20241022',
  maxTokens: 1024,
  temperature: 0.7,
};

/**
 * Engine-specific configurations with custom prompts
 */
const ENGINE_CONFIGS: Record<string, EngineConfig> = {
  // ========================================================================
  // ANNADATA - Farmer Advisory Engine
  // ========================================================================
  ANNADATA: {
    systemPrompt: `You are an expert agricultural advisor for BUAIP's ANNADATA engine. 
Your role is to provide practical, actionable farming advice to Indian farmers.
Consider local climate, soil conditions, seasonal patterns, and government schemes.
Provide advice in simple language that farmers can easily understand.
Include relevant government schemes and subsidies when applicable.
Format responses to be clear and actionable.`,
    modelConfig: {
      modelId: 'anthropic.claude-3-5-sonnet-20241022',
      maxTokens: 1024,
      temperature: 0.6,
    },
    outputFormat: 'structured_advice',
  },

  // ========================================================================
  // NYAYA - Legal Assistance Engine
  // ========================================================================
  NYAYA: {
    systemPrompt: `You are a legal information assistant for BUAIP's NYAYA engine.
You provide accessible legal information and guidance based on Indian laws.
Clearly state that you provide information, not legal advice.
Reference relevant Indian laws, acts, and legal provisions when applicable.
Help users understand their rights and legal options.
Encourage users to consult qualified lawyers for specific cases.
Be clear about limitations and when professional legal help is needed.`,
    modelConfig: {
      modelId: 'anthropic.claude-3-5-sonnet-20241022',
      maxTokens: 1024,
      temperature: 0.5,
    },
    outputFormat: 'legal_information',
  },

  // ========================================================================
  // DEFAULT - Generic AI Engine
  // ========================================================================
  DEFAULT: {
    systemPrompt: `You are an expert AI assistant for the BUAIP platform.
Provide helpful, accurate, and relevant information.
Be clear, concise, and user-friendly.
Consider the Indian context and user needs.`,
    modelConfig: DEFAULT_MODEL_CONFIG,
    outputFormat: 'text',
  },
};

// ============================================================================
// BEDROCK AI CLIENT
// ============================================================================

export class BedrockAIClient {
  private client: BedrockRuntimeClient;
  private defaultModelId: string;

  /**
   * Initialize the Bedrock AI client
   * @param options Bedrock configuration options
   */
  constructor(options: BedrockOptions = {}) {
    const region = options.region || process.env.AWS_REGION || 'ap-south-1';
    this.defaultModelId =
      options.modelId || DEFAULT_MODEL_CONFIG.modelId;

    this.client = new BedrockRuntimeClient({ region });

    console.log(`Bedrock AI Client initialized with model: ${this.defaultModelId}`);
  }

  /**
   * Format the prompt based on the engine type
   * @param engineName Name of the engine
   * @param userPrompt The user's input prompt
   * @returns Formatted prompt with system context
   */
  private formatPromptForEngine(engineName: string, userPrompt: string): string {
    const config = ENGINE_CONFIGS[engineName.toUpperCase()] || ENGINE_CONFIGS.DEFAULT;
    
    return `${config.systemPrompt}

User Query:
${userPrompt}

Please provide a helpful response:`;
  }

  /**
   * Get engine-specific configuration
   * @param engineName Name of the engine
   * @returns Engine configuration
   */
  private getEngineConfig(engineName: string): EngineConfig {
    return ENGINE_CONFIGS[engineName.toUpperCase()] || ENGINE_CONFIGS.DEFAULT;
  }

  /**
   * Generate an AI response using Bedrock
   * @param prompt User's input prompt
   * @param engineName Name of the AI engine
   * @returns AI-generated response
   */
  async generateAIResponse(
    prompt: string,
    engineName: string = 'DEFAULT'
  ): Promise<AIResponse> {
    try {
      if (!prompt || prompt.trim().length === 0) {
        throw new Error('Prompt cannot be empty');
      }

      const engineConfig = this.getEngineConfig(engineName);
      const formattedPrompt = this.formatPromptForEngine(engineName, prompt);

      console.log(
        `Generating response for engine: ${engineName}, model: ${engineConfig.modelConfig.modelId}`
      );

      // Prepare request payload for Claude 3.5 Sonnet
      const payload = {
        anthropic_version: 'bedrock-2023-06-01',
        max_tokens: engineConfig.modelConfig.maxTokens,
        temperature: engineConfig.modelConfig.temperature,
        messages: [
          {
            role: 'user',
            content: formattedPrompt,
          },
        ],
      };

      const params: InvokeModelCommandInput = {
        modelId: engineConfig.modelConfig.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      };

      const command = new InvokeModelCommand(params);
      const response = await this.client.send(command);

      // Parse the response
      if (!response.body) {
        throw new Error('No response body from Bedrock');
      }

      const responseBody = JSON.parse(
        response.body.transformToString()
      );

      // Extract generated text from Claude's response
      const generatedText =
        responseBody.content?.[0]?.text || 
        responseBody.text ||
        '';

      if (!generatedText) {
        throw new Error('No generated text in response');
      }

      const result: AIResponse = {
        engineName,
        generatedText,
        model: engineConfig.modelConfig.modelId,
        tokensUsed: responseBody.usage?.output_tokens,
      };

      console.log(
        `Response generated for ${engineName}, tokens: ${result.tokensUsed}`
      );

      return result;
    } catch (error) {
      console.error(`Error generating AI response for ${engineName}:`, error);
      throw new Error(
        `Failed to generate AI response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate responses from multiple engines in parallel
   * @param prompt User's input prompt
   * @param engineNames Array of engine names
   * @returns Array of AI responses
   */
  async generateMultiEngineResponses(
    prompt: string,
    engineNames: string[]
  ): Promise<AIResponse[]> {
    const promises = engineNames.map((engineName) =>
      this.generateAIResponse(prompt, engineName).catch((error) => {
        console.error(`Failed to generate response for ${engineName}:`, error);
        return {
          engineName,
          generatedText: `Error generating response: ${error instanceof Error ? error.message : 'Unknown error'}`,
          model: this.defaultModelId,
        };
      })
    );

    return Promise.all(promises);
  }

  /**
   * Stream AI response (for real-time response generation)
   * @param prompt User's input prompt
   * @param engineName Name of the AI engine
   * @param onChunk Callback function for each chunk of text
   */
  async streamAIResponse(
    prompt: string,
    engineName: string = 'DEFAULT',
    onChunk: (chunk: string) => void
  ): Promise<AIResponse> {
    try {
      if (!prompt || prompt.trim().length === 0) {
        throw new Error('Prompt cannot be empty');
      }

      const engineConfig = this.getEngineConfig(engineName);
      const formattedPrompt = this.formatPromptForEngine(engineName, prompt);

      console.log(`Streaming response for engine: ${engineName}`);

      // Note: AWS SDK v3 BedrockRuntime doesn't have native streaming in the standard invoke
      // For streaming, you would typically use the InvokeModelWithResponseStream command
      // This is a placeholder showing how you might implement it
      // For now, we'll fall back to regular generation

      const result = await this.generateAIResponse(prompt, engineName);
      
      // Simulate streaming by calling onChunk with the full response
      onChunk(result.generatedText);

      return result;
    } catch (error) {
      console.error(`Error streaming AI response for ${engineName}:`, error);
      throw new Error(
        `Failed to stream AI response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate a structured response with JSON output
   * @param prompt User's input prompt
   * @param engineName Name of the AI engine
   * @param structure JSON schema for the output structure
   * @returns Parsed JSON response
   */
  async generateStructuredResponse(
    prompt: string,
    engineName: string = 'DEFAULT',
    structure: Record<string, string>
  ): Promise<Record<string, unknown>> {
    try {
      const structureJson = JSON.stringify(structure, null, 2);
      const enhancedPrompt = `${prompt}

Please format your response as JSON matching this structure:
${structureJson}

Respond with only valid JSON, no additional text.`;

      const response = await this.generateAIResponse(
        enhancedPrompt,
        engineName
      );

      // Extract JSON from response
      const jsonMatch = response.generatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not extract JSON from response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      console.log(
        `Structured response generated for ${engineName}: ${JSON.stringify(parsed)}`
      );

      return parsed;
    } catch (error) {
      console.error(`Error generating structured response for ${engineName}:`, error);
      throw new Error(
        `Failed to generate structured response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let bedrockInstance: BedrockAIClient | null = null;

/**
 * Get or create a singleton instance of the Bedrock AI client
 * @param options Bedrock configuration options
 * @returns BedrockAIClient instance
 */
export function getBedrockClient(options?: BedrockOptions): BedrockAIClient {
  if (!bedrockInstance) {
    bedrockInstance = new BedrockAIClient(options);
  }
  return bedrockInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetBedrockClient(): void {
  bedrockInstance = null;
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example usage of Bedrock AI client
 * (Uncomment to use in your application)
 */
/*
async function examples() {
  const client = getBedrockClient();

  // Example 1: ANNADATA - Farmer Advice
  try {
    const farmerResponse = await client.generateAIResponse(
      "I'm growing rice in Punjab during monsoon season. What are the best practices for water management?",
      "ANNADATA"
    );
    console.log("Farmer Advice:", farmerResponse.generatedText);
  } catch (error) {
    console.error("Error:", error);
  }

  // Example 2: NYAYA - Legal Help
  try {
    const legalResponse = await client.generateAIResponse(
      "What are my rights if my employer is not paying me minimum wage?",
      "NYAYA"
    );
    console.log("Legal Information:", legalResponse.generatedText);
  } catch (error) {
    console.error("Error:", error);
  }

  // Example 3: UDYOG - Business Mentoring
  try {
    const businessResponse = await client.generateAIResponse(
      "I want to start a retail business with ₹5 lakhs. What loans are available and what should be my first steps?",
      "UDYOG"
    );
    console.log("Business Guidance:", businessResponse.generatedText);
  } catch (error) {
    console.error("Error:", error);
  }

  // Example 4: GLOBALSELLER - E-Commerce Export
  try {
    const exportResponse = await client.generateAIResponse(
      "I want to export textiles to the USA. What compliance do I need?",
      "GLOBALSELLER"
    );
    console.log("Export Guidance:", exportResponse.generatedText);
  } catch (error) {
    console.error("Error:", error);
  }

  // Example 5: Multiple engines in parallel
  try {
    const multiResponses = await client.generateMultiEngineResponses(
      "What are government schemes and opportunities available?",
      ["ANNADATA", "NYAYA", "UDYOG"]
    );
    multiResponses.forEach((response) => {
      console.log(`${response.engineName}:`, response.generatedText);
    });
  } catch (error) {
    console.error("Error:", error);
  }
}
*/
