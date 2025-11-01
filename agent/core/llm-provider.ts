/**
 * LLM Provider Base Class
 * Abstract base class for all LLM providers (OpenAI, Anthropic, etc.)
 */

import {
  ILLMProvider,
  Message,
  CompletionResponse,
  ToolDefinition,
  ResponseChunk,
  LLMError,
} from '../types';

// Re-export ILLMProvider for convenience
export type { ILLMProvider };

/**
 * Base configuration for all LLM providers
 */
export interface BaseLLMConfig {
  /** API key for the provider */
  apiKey: string;

  /** Model name */
  model: string;

  /** Temperature (0.0 - 1.0) */
  temperature: number;

  /** Maximum tokens to generate */
  maxTokens: number;

  /** Request timeout in milliseconds */
  timeout: number;
}

/**
 * Type alias for LLM configuration
 */
export type LLMConfig = BaseLLMConfig;

/**
 * Abstract base class for LLM providers
 * All providers must extend this class
 */
export abstract class BaseLLMProvider implements ILLMProvider {
  protected config: BaseLLMConfig;

  constructor(config: BaseLLMConfig) {
    this.validateConfig(config);
    this.config = config;
  }

  /**
   * Validate provider configuration
   * @param config - Configuration to validate
   * @throws LLMError if configuration is invalid
   */
  protected validateConfig(config: BaseLLMConfig): void {
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new LLMError('API key is required');
    }

    if (!config.model || config.model.trim() === '') {
      throw new LLMError('Model name is required');
    }

    if (config.temperature < 0 || config.temperature > 1) {
      throw new LLMError('Temperature must be between 0 and 1');
    }

    if (config.maxTokens <= 0) {
      throw new LLMError('Max tokens must be positive');
    }

    if (config.timeout <= 0) {
      throw new LLMError('Timeout must be positive');
    }
  }

  /**
   * Validate API key format
   * @param apiKey - API key to validate
   * @param prefix - Expected prefix (e.g., 'sk-')
   * @throws LLMError if API key format is invalid
   */
  protected validateApiKey(apiKey: string, prefix: string): void {
    if (!apiKey.startsWith(prefix)) {
      throw new LLMError(`Invalid API key format. Expected key starting with '${prefix}'`);
    }
  }

  /**
   * Handle errors from LLM API calls
   * @param error - Error from API
   * @throws LLMError with appropriate message
   */
  protected handleError(error: unknown): never {
    if (error instanceof LLMError) {
      throw error;
    }

    if (error instanceof Error) {
      // Check for common error types
      if (error.message.includes('timeout')) {
        throw new LLMError('Request timed out', { originalError: error });
      }

      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        throw new LLMError('Invalid API key', { originalError: error });
      }

      if (error.message.includes('429') || error.message.includes('rate limit')) {
        throw new LLMError('Rate limit exceeded', { originalError: error });
      }

      if (error.message.includes('500') || error.message.includes('503')) {
        throw new LLMError('LLM service unavailable', { originalError: error });
      }

      throw new LLMError(error.message, { originalError: error });
    }

    throw new LLMError('Unknown error occurred', { originalError: error });
  }

  /**
   * Retry logic for API calls
   * @param fn - Function to retry
   * @param maxRetries - Maximum number of retries
   * @param delayMs - Delay between retries in milliseconds
   * @returns Result of the function
   */
  protected async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry on certain errors
        if (error instanceof LLMError) {
          if (
            error.message.includes('Invalid API key') ||
            error.message.includes('rate limit')
          ) {
            throw error;
          }
        }

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
        }
      }
    }

    // All retries failed
    this.handleError(lastError);
  }

  /**
   * Abstract method: Generate completion without tools
   * Must be implemented by concrete providers
   */
  abstract generateCompletion(
    messages: Message[],
    systemPrompt: string
  ): Promise<CompletionResponse>;

  /**
   * Abstract method: Generate completion with tool calling
   * Must be implemented by concrete providers
   */
  abstract generateWithTools(
    messages: Message[],
    systemPrompt: string,
    tools: ToolDefinition[]
  ): Promise<CompletionResponse>;

  /**
   * Optional: Stream completion response
   * Can be overridden by concrete providers
   */
  async *streamCompletion(
    messages: Message[],
    systemPrompt: string
  ): AsyncGenerator<ResponseChunk> {
    // Default implementation: just return complete response
    const response = await this.generateCompletion(messages, systemPrompt);

    yield {
      type: 'content',
      content: response.content,
      final: true,
    };
  }
}
