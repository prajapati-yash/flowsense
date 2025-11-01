/**
 * OpenAI Provider
 * Implementation of LLM provider for OpenAI's GPT models
 */

import OpenAI from 'openai';
import { BaseLLMProvider, BaseLLMConfig } from '../llm-provider';
import {
  Message,
  CompletionResponse,
  ToolDefinition,
  ToolCall,
  LLMError,
} from '../../types';

/**
 * OpenAI Provider for GPT-4 and GPT-3.5 models
 */
export class OpenAIProvider extends BaseLLMProvider {
  private client: OpenAI;

  constructor(config: BaseLLMConfig) {
    super(config);

    // Validate OpenAI API key format
    this.validateApiKey(config.apiKey, 'sk-');

    // Initialize OpenAI client
    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeout,
    });
  }

  /**
   * Convert our Message format to OpenAI's format
   */
  private convertMessages(
    messages: Message[],
    systemPrompt: string
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ];

    for (const msg of messages) {
      if (msg.role === 'user') {
        openaiMessages.push({
          role: 'user',
          content: msg.content,
        });
      } else if (msg.role === 'assistant') {
        const assistantMessage: OpenAI.Chat.ChatCompletionAssistantMessageParam = {
          role: 'assistant',
          content: msg.content,
        };

        // Include tool_calls if present (required by OpenAI when followed by tool messages)
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          assistantMessage.tool_calls = msg.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: tc.arguments,
            },
          }));
        }

        openaiMessages.push(assistantMessage);
      } else if (msg.role === 'tool') {
        openaiMessages.push({
          role: 'tool',
          content: msg.content,
          tool_call_id: msg.toolCallId!,
        });
      }
    }

    return openaiMessages;
  }

  /**
   * Convert our ToolDefinition to OpenAI's function format
   */
  private convertTools(tools: ToolDefinition[]): OpenAI.Chat.ChatCompletionTool[] {
    return tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: tool.parameters.reduce((acc, param) => {
            acc[param.name] = {
              type: param.type,
              description: param.description,
              ...(param.enum && { enum: param.enum }),
            };
            return acc;
          }, {} as Record<string, any>),
          required: tool.parameters
            .filter(p => p.required)
            .map(p => p.name),
        },
      },
    }));
  }

  /**
   * Generate completion without tools
   */
  async generateCompletion(
    messages: Message[],
    systemPrompt: string
  ): Promise<CompletionResponse> {
    return this.retry(async () => {
      try {
        const response = await this.client.chat.completions.create({
          model: this.config.model,
          messages: this.convertMessages(messages, systemPrompt),
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
        });

        const choice = response.choices[0];
        if (!choice) {
          throw new LLMError('No response from OpenAI');
        }

        return {
          content: choice.message.content || '',
          finished: choice.finish_reason === 'stop',
          finishReason: this.mapFinishReason(choice.finish_reason),
          usage: response.usage
            ? {
                promptTokens: response.usage.prompt_tokens,
                completionTokens: response.usage.completion_tokens,
                totalTokens: response.usage.total_tokens,
              }
            : undefined,
        };
      } catch (error) {
        this.handleError(error);
      }
    });
  }

  /**
   * Generate completion with tool calling
   */
  async generateWithTools(
    messages: Message[],
    systemPrompt: string,
    tools: ToolDefinition[]
  ): Promise<CompletionResponse> {
    return this.retry(async () => {
      try {
        const response = await this.client.chat.completions.create({
          model: this.config.model,
          messages: this.convertMessages(messages, systemPrompt),
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          tools: this.convertTools(tools),
          tool_choice: 'auto',
        });

        const choice = response.choices[0];
        if (!choice) {
          throw new LLMError('No response from OpenAI');
        }

        // Extract tool calls if present
        const toolCalls: ToolCall[] | undefined = choice.message.tool_calls
          ?.filter(tc => tc.type === 'function')
          .map(tc => ({
            id: tc.id,
            name: tc.function.name,
            arguments: tc.function.arguments,
          }));

        return {
          content: choice.message.content || '',
          toolCalls,
          finished: choice.finish_reason === 'stop' || choice.finish_reason === 'tool_calls',
          finishReason: this.mapFinishReason(choice.finish_reason),
          usage: response.usage
            ? {
                promptTokens: response.usage.prompt_tokens,
                completionTokens: response.usage.completion_tokens,
                totalTokens: response.usage.total_tokens,
              }
            : undefined,
        };
      } catch (error) {
        this.handleError(error);
      }
    });
  }

  /**
   * Map OpenAI finish reason to our format
   */
  private mapFinishReason(
    reason: string | null
  ): 'stop' | 'length' | 'tool_calls' | 'content_filter' | undefined {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'tool_calls':
        return 'tool_calls';
      case 'content_filter':
        return 'content_filter';
      default:
        return undefined;
    }
  }

  /**
   * Override error handling for OpenAI-specific errors
   */
  protected handleError(error: unknown): never {
    if (error instanceof OpenAI.APIError) {
      const status = error.status;
      const message = error.message;

      if (status === 401) {
        throw new LLMError('Invalid OpenAI API key', { status, message });
      }

      if (status === 429) {
        throw new LLMError('OpenAI rate limit exceeded. Please try again later.', {
          status,
          message,
        });
      }

      if (status === 500 || status === 503) {
        throw new LLMError('OpenAI service is currently unavailable', {
          status,
          message,
        });
      }

      if (status === 400) {
        throw new LLMError(`Invalid request to OpenAI: ${message}`, {
          status,
          message,
        });
      }

      throw new LLMError(`OpenAI API error: ${message}`, { status, message });
    }

    // Fall back to base error handling
    super.handleError(error);
  }
}
