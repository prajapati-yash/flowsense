/**
 * Agent System Type Definitions
 * Defines interfaces for the AI agent and LLM providers
 */

import { ToolDefinition } from './tool-types';

/**
 * Supported LLM providers
 */
export enum LLMProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  OLLAMA = 'ollama',
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  /** LLM provider to use */
  provider: LLMProvider;

  /** Model name (e.g., "gpt-4-turbo", "claude-3-5-sonnet") */
  model: string;

  /** API key for the provider */
  apiKey: string;

  /** Temperature for LLM generation (0.0 - 1.0) */
  temperature: number;

  /** Maximum tokens to generate */
  maxTokens: number;

  /** Request timeout in milliseconds */
  timeout: number;

  /** Whether to enable context memory */
  enableContext: boolean;

  /** Whether to fall back to regex parser on failure */
  fallbackToRegex: boolean;
}

/**
 * Message in a conversation
 */
export interface Message {
  /** Message role */
  role: 'system' | 'user' | 'assistant' | 'tool';

  /** Message content */
  content: string;

  /** Tool calls (for assistant messages that request tool execution) */
  toolCalls?: ToolCall[];

  /** Tool call ID (for tool messages) */
  toolCallId?: string;

  /** Tool name (for tool messages) */
  toolName?: string;

  /** Timestamp */
  timestamp?: number;
}

/**
 * Conversation context for multi-turn interactions
 */
export interface ConversationContext {
  /** Unique conversation ID */
  id: string;

  /** Array of messages in the conversation */
  messages: Message[];

  /** When the conversation was created */
  createdAt: number;

  /** When the conversation was last updated */
  lastUpdatedAt: number;

  /** User's wallet address */
  userAddress: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Tool call request from LLM
 */
export interface ToolCall {
  /** Unique ID for this tool call */
  id: string;

  /** Name of the tool to call */
  name: string;

  /** Arguments for the tool (JSON string) */
  arguments: string;
}

/**
 * LLM completion response
 */
export interface CompletionResponse {
  /** Generated text content */
  content: string;

  /** Tool calls requested by LLM (if any) */
  toolCalls?: ToolCall[];

  /** Whether the response is complete */
  finished: boolean;

  /** Token usage statistics */
  usage?: {
    /** Tokens in the prompt */
    promptTokens: number;

    /** Tokens in the completion */
    completionTokens: number;

    /** Total tokens used */
    totalTokens: number;
  };

  /** Finish reason */
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter';
}

/**
 * Streaming response chunk
 */
export interface ResponseChunk {
  /** Chunk type */
  type: 'thinking' | 'tool_call' | 'tool_result' | 'content' | 'complete';

  /** Chunk content */
  content?: string;

  /** Tool name (for tool_call chunks) */
  toolName?: string;

  /** Tool result (for tool_result chunks) */
  toolResult?: unknown;

  /** Whether this is the final chunk */
  final?: boolean;
}

/**
 * Agent response
 */
export interface AgentResponse {
  /** Parsed intent (backward compatible with NLP parser) */
  intent: ParsedIntent;

  /** Explanation from the agent */
  explanation: string;

  /** Conversation ID (for multi-turn) */
  conversationId?: string;

  /** Confidence score (0-1) */
  confidence: number;

  /** Tools that were called */
  toolsCalled?: string[];

  /** Execution metrics */
  metrics?: {
    /** Total response time (ms) */
    responseTime: number;

    /** LLM call time (ms) */
    llmTime: number;

    /** Tool execution time (ms) */
    toolTime: number;

    /** Number of LLM calls made */
    llmCalls: number;

    /** Total tokens used */
    tokensUsed?: number;
  };
}

/**
 * Parsed intent (backward compatible with existing NLP parser)
 */
export interface ParsedIntent {
  /** Transaction type */
  type: TransactionType;

  /** Parameters for the transaction */
  params: Record<string, unknown>;

  /** Confidence score (0-1) */
  confidence: number;

  /** Raw user input */
  rawInput: string;
}

/**
 * Transaction types
 */
export type TransactionType =
  | 'swap'
  | 'transfer'
  | 'balance'
  | 'price'
  | 'portfolio'
  | 'vault_init'
  | 'unknown';

/**
 * Agent metrics for monitoring
 */
export interface AgentMetrics {
  /** Total number of requests */
  totalRequests: number;

  /** Successful requests */
  successfulRequests: number;

  /** Failed requests */
  failedRequests: number;

  /** Requests that fell back to regex parser */
  fallbackRequests: number;

  /** Average response time (ms) */
  averageResponseTime: number;

  /** Total LLM tokens used */
  totalTokensUsed: number;

  /** Estimated cost (USD) */
  estimatedCost: number;

  /** Requests by transaction type */
  requestsByType: Record<TransactionType, number>;

  /** Requests by tool */
  requestsByTool: Record<string, number>;

  /** Error counts by type */
  errorsByType: Record<string, number>;
}

/**
 * LLM Provider interface
 */
export interface ILLMProvider {
  /**
   * Generate a completion without tools
   * @param messages - Conversation messages
   * @param systemPrompt - System prompt
   * @returns Completion response
   */
  generateCompletion(
    messages: Message[],
    systemPrompt: string
  ): Promise<CompletionResponse>;

  /**
   * Generate a completion with tool calling
   * @param messages - Conversation messages
   * @param systemPrompt - System prompt
   * @param tools - Available tools
   * @returns Completion response with possible tool calls
   */
  generateWithTools(
    messages: Message[],
    systemPrompt: string,
    tools: ToolDefinition[]
  ): Promise<CompletionResponse>;

  /**
   * Stream a completion response
   * @param messages - Conversation messages
   * @param systemPrompt - System prompt
   * @returns Async generator of response chunks
   */
  streamCompletion?(
    messages: Message[],
    systemPrompt: string
  ): AsyncGenerator<ResponseChunk>;
}

/**
 * Error types
 */
export class AgentError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

export class LLMError extends AgentError {
  constructor(message: string, details?: unknown) {
    super(message, 'LLM_ERROR', details);
    this.name = 'LLMError';
  }
}

export class ToolError extends AgentError {
  constructor(message: string, details?: unknown) {
    super(message, 'TOOL_ERROR', details);
    this.name = 'ToolError';
  }
}

export class ValidationError extends AgentError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}
