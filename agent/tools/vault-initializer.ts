/**
 * Vault Initializer Tool
 * Builds vault initialization transaction intents
 */

import { BaseTool } from './base-tool';
import {
  ToolDefinition,
  ToolResult,
  ToolContext,
  ParsedIntent,
  ToolError,
} from '../types';

/**
 * Vault Initializer Tool
 * Creates transaction intents to initialize token vaults
 */
export class VaultInitializerTool extends BaseTool {
  definition: ToolDefinition = {
    name: 'initialize_vault',
    description:
      'Initialize a token vault for USDC or USDT. ONLY use this when the user EXPLICITLY asks to "initialize vault", "setup vault", or "create vault". DO NOT use this for swaps or transfers - use build_swap_transaction or build_transfer_transaction instead.',
    parameters: [
      {
        name: 'token',
        type: 'string',
        description: 'Token symbol to initialize vault for (usdc, usdt)',
        required: true,
        enum: ['usdc', 'usdt'],
      },
    ],
    examples: [
      {
        input: 'Initialize USDC vault',
        parameters: { token: 'usdc' },
        expectedResult: 'Returns ParsedIntent for vault initialization',
      },
      {
        input: 'Set up my USDT wallet',
        parameters: { token: 'usdt' },
        expectedResult: 'Returns ParsedIntent for vault initialization',
      },
    ],
  };

  /**
   * Execute vault initialization
   */
  async execute(
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> {
    try {
      const token = this.getParam<string>(params, 'token').toLowerCase();

      // Validate token
      if (!['usdc', 'usdt'].includes(token)) {
        return this.createErrorResult(
          `Unsupported token: ${token}. Only USDC and USDT vaults can be initialized.`
        );
      }

      // Create ParsedIntent for vault initialization
      const intent: ParsedIntent = {
        type: 'vault_init',
        params: {
          token: token.toLowerCase(),
        },
        confidence: 1.0,
        rawInput: `Initialize ${token.toUpperCase()} vault`,
      };

      return this.createSuccessResult(intent);
    } catch (error) {
      throw new ToolError(
        `Failed to build vault initialization: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error }
      );
    }
  }
}
