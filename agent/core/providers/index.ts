/**
 * LLM Providers Index
 * Exports all providers and factory function
 */

import { BaseLLMProvider, BaseLLMConfig } from '../llm-provider';
import { OpenAIProvider } from './openai-provider';
import { LLMProvider, LLMError } from '../../types';

// Export providers
export { OpenAIProvider } from './openai-provider';
export { BaseLLMProvider } from '../llm-provider';

/**
 * Configuration for provider factory
 */
export interface ProviderFactoryConfig extends BaseLLMConfig {
  provider: LLMProvider;
}

/**
 * Create an LLM provider instance based on configuration
 * @param config - Provider configuration
 * @returns Configured LLM provider instance
 * @throws LLMError if provider is not supported
 */
export function createProvider(config: ProviderFactoryConfig): BaseLLMProvider {
  switch (config.provider) {
    case LLMProvider.OPENAI:
      return new OpenAIProvider(config);

    case LLMProvider.ANTHROPIC:
      // TODO: Implement AnthropicProvider when needed
      throw new LLMError(
        'Anthropic provider not yet implemented. Please use OpenAI for now.'
      );

    case LLMProvider.OLLAMA:
      // TODO: Implement OllamaProvider when needed
      throw new LLMError(
        'Ollama provider not yet implemented. Please use OpenAI for now.'
      );

    default:
      throw new LLMError(
        `Unsupported provider: ${config.provider}. Supported providers: openai`
      );
  }
}

/**
 * Validate provider configuration
 * @param config - Configuration to validate
 * @throws LLMError if configuration is invalid
 */
export function validateProviderConfig(config: ProviderFactoryConfig): void {
  if (!config.provider) {
    throw new LLMError('Provider type is required');
  }

  if (!Object.values(LLMProvider).includes(config.provider)) {
    throw new LLMError(`Invalid provider: ${config.provider}`);
  }

  if (!config.apiKey) {
    throw new LLMError('API key is required');
  }

  if (!config.model) {
    throw new LLMError('Model name is required');
  }
}
