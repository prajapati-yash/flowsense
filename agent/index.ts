/**
 * FlowSense Agent
 * Main entry point for the FlowSense AI Agent
 */

// Core
export {
  FlowSenseAgent,
  createFlowSenseAgent,
  createOpenAIAgent,
  createAgentFromEnv,
  createTestAgent,
  BaseLLMProvider,
  OpenAIProvider,
  ContextManager,
} from './core';

export type {
  AgentResult,
  AgentConfig,
  FactoryConfig,
  ILLMProvider,
  LLMConfig,
} from './core';

// Tools
export {
  BaseTool,
  ToolRegistry,
  BalanceCheckerTool,
  PriceFetcherTool,
  PortfolioViewerTool,
  SwapTransactionBuilderTool,
  TransferTransactionBuilderTool,
} from './tools';

export type {
  Tool,
  ToolDefinition,
  ToolParameter,
  ToolResult,
  ToolContext,
  BalanceResult,
  PriceResult,
  PortfolioResult,
} from './types/tool-types';

export type { IToolRegistry } from './tools/registry';

// Types
export type {
  Message,
  ConversationContext,
  CompletionResponse,
  ToolCall,
  ParsedIntent,
  TransactionType,
} from './types/agent-types';

export {
  LLMProvider,
  AgentError,
  LLMError,
  ToolError,
  ValidationError,
} from './types/agent-types';

// Utils
export {
  resolveToken,
  getTokenInfo,
  isTokenSupported,
  getSupportedTokens,
  validateFlowAddress,
  validateAmount,
  parseToolResultToIntent,
  createUnknownIntent,
  CacheManager,
  balanceCache,
  priceCache,
  llmCache,
  portfolioCache,
} from './utils';

export type {
  TokenInfo,
  CacheOptions,
  CacheStats,
} from './utils';

// Prompts
export {
  SYSTEM_PROMPT,
  TOOL_USAGE_GUIDELINES,
  greetingTemplate,
  helpTemplate,
  swapConfirmationTemplate,
  transferConfirmationTemplate,
  portfolioTemplate,
} from './prompts';
