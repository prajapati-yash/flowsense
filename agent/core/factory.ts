/**
 * Agent Factory
 * Factory functions to create configured agent instances
 */

import { FlowSenseAgent, AgentConfig } from './agent';
import { OpenAIProvider } from './providers/openai-provider';
import { ToolRegistry } from '../tools/registry';
import { ContextManager } from './context-manager';
import { BalanceCheckerTool } from '../tools/balance-checker';
import { PriceFetcherTool } from '../tools/price-fetcher';
import { PortfolioViewerTool } from '../tools/portfolio-viewer';
import { SwapTransactionBuilderTool } from '../tools/swap-builder';
import { TransferTransactionBuilderTool } from '../tools/transfer-builder';
import { VaultInitializerTool } from '../tools/vault-initializer';
import { LLMProvider } from '../types';

/**
 * Factory configuration options
 */
export interface FactoryConfig {
  /**
   * OpenAI API key (required if using OpenAI provider)
   */
  openaiApiKey?: string;

  /**
   * LLM provider to use
   * @default 'openai'
   */
  provider?: LLMProvider;

  /**
   * Model name to use
   * @default 'gpt-4'
   */
  model?: string;

  /**
   * Agent configuration
   */
  agentConfig?: Partial<AgentConfig>;

  /**
   * Enable all default tools
   * @default true
   */
  enableDefaultTools?: boolean;
}

/**
 * Create a fully configured FlowSense Agent
 * @param config - Factory configuration
 * @returns Configured FlowSenseAgent instance
 */
export function createFlowSenseAgent(config: FactoryConfig): FlowSenseAgent {
  // Validate configuration
  if (config.provider === LLMProvider.OPENAI && !config.openaiApiKey) {
    throw new Error('OpenAI API key is required when using OpenAI provider');
  }

  // Create LLM provider
  const llmProvider = createLLMProvider(config);

  // Create tool registry
  const toolRegistry = createToolRegistry(config);

  // Create context manager
  const contextManager = new ContextManager();

  // Create agent
  const agent = new FlowSenseAgent(
    llmProvider,
    toolRegistry,
    contextManager,
    config.agentConfig
  );

  return agent;
}

/**
 * Create LLM provider based on configuration
 * @param config - Factory configuration
 * @returns LLM provider instance
 */
function createLLMProvider(config: FactoryConfig) {
  const provider = config.provider ?? LLMProvider.OPENAI;

  switch (provider) {
    case LLMProvider.OPENAI:
      return new OpenAIProvider({
        apiKey: config.openaiApiKey!,
        model: config.model ?? 'gpt-4',
        temperature: config.agentConfig?.temperature ?? 0.7,
        maxTokens: config.agentConfig?.maxTokens ?? 1000,
        timeout: 30000,
      });

    case LLMProvider.ANTHROPIC:
      throw new Error('Anthropic provider not yet implemented');

    case LLMProvider.OLLAMA:
      throw new Error('Ollama provider not yet implemented');

    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

/**
 * Create tool registry with default tools
 * @param config - Factory configuration
 * @returns Tool registry instance
 */
function createToolRegistry(config: FactoryConfig): ToolRegistry {
  const registry = new ToolRegistry();

  // Add default tools if enabled
  if (config.enableDefaultTools !== false) {
    registry.register(new BalanceCheckerTool());
    registry.register(new PriceFetcherTool());
    registry.register(new PortfolioViewerTool());
    registry.register(new SwapTransactionBuilderTool());
    registry.register(new TransferTransactionBuilderTool());
    registry.register(new VaultInitializerTool());
  }

  return registry;
}

/**
 * Create agent with OpenAI provider (convenience function)
 * @param apiKey - OpenAI API key
 * @param config - Optional agent configuration
 * @returns Configured FlowSenseAgent instance
 */
export function createOpenAIAgent(
  apiKey: string,
  config?: Partial<AgentConfig>
): FlowSenseAgent {
  return createFlowSenseAgent({
    openaiApiKey: apiKey,
    provider: LLMProvider.OPENAI,
    model: 'gpt-4',
    agentConfig: config,
  });
}

/**
 * Create agent from environment variables
 * Looks for OPENAI_API_KEY in environment
 * @param config - Optional agent configuration
 * @returns Configured FlowSenseAgent instance
 */
export function createAgentFromEnv(config?: Partial<AgentConfig>): FlowSenseAgent {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  return createOpenAIAgent(apiKey, config);
}

/**
 * Create a minimal agent for testing
 * @param apiKey - OpenAI API key
 * @returns Configured FlowSenseAgent instance with minimal settings
 */
export function createTestAgent(apiKey: string): FlowSenseAgent {
  return createFlowSenseAgent({
    openaiApiKey: apiKey,
    provider: LLMProvider.OPENAI,
    model: 'gpt-4',
    agentConfig: {
      maxIterations: 3,
      temperature: 0.5,
      maxTokens: 500,
      enableCache: false,
    },
  });
}

export default {
  createFlowSenseAgent,
  createOpenAIAgent,
  createAgentFromEnv,
  createTestAgent,
};
