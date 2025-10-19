/**
 * FlowSense Agent
 * Main agent class that orchestrates LLM, tools, and context
 */

import {
  Message,
  ParsedIntent,
  ConversationContext,
  CompletionResponse,
  AgentError,
  ToolError,
} from '../types';
import { ILLMProvider } from './llm-provider';
import { IToolRegistry } from '../tools/registry';
import { ContextManager } from './context-manager';
import { SYSTEM_PROMPT } from '../prompts/system-prompt';
import { parseToolResultToIntent, createUnknownIntent } from '../utils/intent-parser';
import { sanitizeInput, validateConversationId } from '../utils/validation';

/**
 * Agent runtime configuration (user-provided)
 */
export interface AgentConfig {
  /** Maximum iterations for agent loop */
  maxIterations?: number;

  /** Temperature for LLM (0-1) */
  temperature?: number;

  /** Maximum tokens to generate */
  maxTokens?: number;

  /** Enable streaming responses */
  streamResponse?: boolean;

  /** Enable response caching */
  enableCache?: boolean;

  /** Cache TTL in milliseconds */
  cacheTTL?: number;
}

/**
 * Internal agent configuration (with defaults applied)
 */
interface InternalAgentConfig {
  maxIterations: number;
  temperature: number;
  maxTokens: number;
  streamResponse: boolean;
  enableCache: boolean;
  cacheTTL: number;
}

/**
 * Agent execution result
 */
export interface AgentResult {
  /**
   * Parsed intent from agent's decision
   */
  intent: ParsedIntent;

  /**
   * Agent's response message
   */
  response: string;

  /**
   * Conversation ID for multi-turn interactions
   */
  conversationId: string;

  /**
   * Tool calls made during execution
   */
  toolCalls?: Array<{
    tool: string;
    params: Record<string, unknown>;
    result: unknown;
  }>;
}

/**
 * FlowSense Agent
 * Orchestrates LLM provider, tools, and context to process user requests
 */
export class FlowSenseAgent {
  private llmProvider: ILLMProvider;
  private toolRegistry: IToolRegistry;
  private contextManager: ContextManager;
  private config: InternalAgentConfig;
  private systemPrompt: string;

  constructor(
    llmProvider: ILLMProvider,
    toolRegistry: IToolRegistry,
    contextManager: ContextManager,
    config: Partial<AgentConfig> = {}
  ) {
    this.llmProvider = llmProvider;
    this.toolRegistry = toolRegistry;
    this.contextManager = contextManager;

    // Merge with defaults
    this.config = {
      maxIterations: config.maxIterations ?? 5,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 1000,
      streamResponse: config.streamResponse ?? false,
      enableCache: config.enableCache ?? true,
      cacheTTL: config.cacheTTL ?? 300000, // 5 minutes
    };

    this.systemPrompt = SYSTEM_PROMPT;
  }

  /**
   * Process user message and return intent
   * @param userMessage - User's input message
   * @param userAddress - User's Flow address
   * @param conversationId - Optional conversation ID for multi-turn (legacy, use previousMessages instead)
   * @param previousMessages - Optional previous messages from database for context
   * @returns Agent result with parsed intent
   */
  async processMessage(
    userMessage: string,
    userAddress: string,
    conversationId?: string,
    previousMessages?: Message[]
  ): Promise<AgentResult> {
    try {
      // Sanitize input
      const sanitizedMessage = sanitizeInput(userMessage);

      if (!sanitizedMessage) {
        const tempContext = this.contextManager.createContext(userAddress);
        return {
          intent: createUnknownIntent(userMessage, 'Empty message'),
          response: 'I didn\'t receive any message. How can I help you?',
          conversationId: tempContext.id,
        };
      }

      // Create conversation context
      let context: ConversationContext;

      // If previousMessages provided, reconstruct context from database
      if (previousMessages && previousMessages.length > 0) {
        context = this.contextManager.createContext(userAddress);
        // Add previous messages to context
        for (const msg of previousMessages) {
          this.contextManager.updateContext(context.id, msg);
        }
      }
      // Legacy: try to use conversationId if provided
      else if (conversationId) {
        validateConversationId(conversationId);
        const existingContext = this.contextManager.getContext(conversationId);
        if (!existingContext) {
          // Context expired, create new one
          context = this.contextManager.createContext(userAddress);
        } else {
          context = existingContext;
        }
      }
      // New conversation
      else {
        context = this.contextManager.createContext(userAddress);
      }

      // Add user message to context
      const userMsg: Message = {
        role: 'user',
        content: sanitizedMessage,
      };
      this.contextManager.updateContext(context.id, userMsg);

      // Execute agent loop
      const result = await this.executeAgentLoop(context, sanitizedMessage);

      return result;
    } catch (error) {
      throw new AgentError(
        `Failed to process message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROCESS_MESSAGE_ERROR',
        { error, userMessage, userAddress }
      );
    }
  }

  /**
   * Execute agent loop with tool calling
   * @param context - Conversation context
   * @param rawInput - Original user input
   * @returns Agent result
   */
  private async executeAgentLoop(
    context: ConversationContext,
    rawInput: string
  ): Promise<AgentResult> {
    const toolCalls: Array<{ tool: string; params: Record<string, unknown>; result: unknown }> = [];
    let iterations = 0;
    let finalResponse = '';
    let finalIntent: ParsedIntent | null = null;

    while (iterations < this.config.maxIterations) {
      iterations++;

      // Get messages from context (excluding system message as it's passed separately)
      const messages: Message[] = context.messages;

      // Call LLM with tools
      const completion = await this.llmProvider.generateWithTools(
        messages,
        this.systemPrompt,
        this.toolRegistry.getDefinitions()
      );

      // Add assistant message to context (include tool_calls if present)
      const assistantMsg: Message = {
        role: 'assistant',
        content: completion.content,
        toolCalls: completion.toolCalls,
      };
      this.contextManager.updateContext(context.id, assistantMsg);

      // Check if LLM wants to use tools
      if (completion.toolCalls && completion.toolCalls.length > 0) {
        // Execute tool calls
        for (const toolCall of completion.toolCalls) {
          try {
            const toolResult = await this.executeTool(
              toolCall.name,
              JSON.parse(toolCall.arguments),
              context
            );

            toolCalls.push({
              tool: toolCall.name,
              params: JSON.parse(toolCall.arguments),
              result: toolResult.data,
            });

            // Add tool result to context
            const toolMsg: Message = {
              role: 'tool',
              content: JSON.stringify(toolResult),
              toolCallId: toolCall.id,
              toolName: toolCall.name,
            };
            this.contextManager.updateContext(context.id, toolMsg);

            // Check if tool returned a ParsedIntent (transaction builders)
            if (
              toolCall.name === 'build_swap_transaction' ||
              toolCall.name === 'build_transfer_transaction' ||
              toolCall.name === 'initialize_vault'
            ) {
              if (toolResult.success) {
                finalIntent = toolResult.data as ParsedIntent;
              }
            }
          } catch (toolError) {
            // Tool execution failed - add error message to context
            console.error(`[Agent] Tool ${toolCall.name} failed:`, toolError);

            const errorResult = {
              success: false,
              error: toolError instanceof Error ? toolError.message : 'Tool execution failed',
            };

            toolCalls.push({
              tool: toolCall.name,
              params: JSON.parse(toolCall.arguments),
              result: errorResult,
            });

            // Add error result as tool message
            const toolMsg: Message = {
              role: 'tool',
              content: JSON.stringify(errorResult),
              toolCallId: toolCall.id,
              toolName: toolCall.name,
            };
            this.contextManager.updateContext(context.id, toolMsg);
          }
        }

        // Continue loop to get LLM's response after tool execution
        continue;
      }

      // No more tool calls, LLM has final response
      finalResponse = completion.content;
      break;
    }

    // If we hit max iterations without a final response
    if (!finalResponse) {
      finalResponse = 'I apologize, but I encountered an issue processing your request. Please try again.';
    }

    // Determine final intent
    if (!finalIntent) {
      // If no transaction was built, try to parse intent from tool results
      if (toolCalls.length > 0) {
        const lastToolCall = toolCalls[toolCalls.length - 1];
        finalIntent = parseToolResultToIntent(
          lastToolCall.tool,
          { success: true, data: lastToolCall.result },
          rawInput
        );
      } else {
        // No tools were called, return unknown intent
        finalIntent = createUnknownIntent(rawInput, 'No actionable intent detected');
      }
    }

    return {
      intent: finalIntent,
      response: finalResponse,
      conversationId: context.id,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }

  /**
   * Execute a tool
   * @param toolName - Name of the tool
   * @param params - Tool parameters
   * @param context - Conversation context
   * @returns Tool result
   */
  private async executeTool(
    toolName: string,
    params: Record<string, unknown>,
    context: ConversationContext
  ) {
    const tool = this.toolRegistry.get(toolName);

    if (!tool) {
      throw new ToolError(`Tool not found: ${toolName}`);
    }

    // Validate parameters
    const validation = tool.validateParams(params);
    if (validation !== true) {
      throw new ToolError(`Invalid parameters for ${toolName}: ${validation}`);
    }

    // Execute tool
    const toolContext = {
      userAddress: context.userAddress,
      conversationId: context.id,
      metadata: context.metadata,
    };

    return await tool.execute(params, toolContext);
  }

  /**
   * Get conversation context
   * @param conversationId - Conversation ID
   * @returns Conversation context or undefined
   */
  getContext(conversationId: string): ConversationContext | undefined {
    return this.contextManager.getContext(conversationId);
  }

  /**
   * Clear conversation context
   * @param conversationId - Conversation ID
   */
  clearContext(conversationId: string): void {
    this.contextManager.clearContext(conversationId);
  }

  /**
   * Update agent configuration
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   * @returns Current agent configuration
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }

  /**
   * Update system prompt
   * @param prompt - New system prompt
   */
  updateSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }

  /**
   * Get current system prompt
   * @returns Current system prompt
   */
  getSystemPrompt(): string {
    return this.systemPrompt;
  }
}
