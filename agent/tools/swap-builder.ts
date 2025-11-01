/**
 * Swap Transaction Builder Tool
 * Builds swap transaction intents using Flow Actions
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
 * Token information map
 */
const TOKEN_MAP: Record<string, {
  name: string;
  address: string;
  storagePath: string;
  receiverPath: string;
  balancePath: string;
  typeIdentifier: string;
}> = {
  'flow': {
    name: 'FlowToken',
    address: '0x1654653399040a61',
    storagePath: '/storage/flowTokenVault',
    receiverPath: '/public/flowTokenReceiver',
    balancePath: '/public/flowTokenBalance',
    typeIdentifier: 'A.1654653399040a61.FlowToken.Vault'
  },
  'usdc': {
    name: 'stgUSDC',
    address: '0x1e4aa0b87d10b141',
    storagePath: '/storage/EVMVMBridgedToken_f1815bd50389c46847f0bda824ec8da914045d14Vault',
    receiverPath: '/public/EVMVMBridgedToken_f1815bd50389c46847f0bda824ec8da914045d14Receiver',
    balancePath: '/public/EVMVMBridgedToken_f1815bd50389c46847f0bda824ec8da914045d14Balance',
    typeIdentifier: 'A.1e4aa0b87d10b141.EVMVMBridgedToken_f1815bd50389c46847f0bda824ec8da914045d14.Vault'
  },
  'usdt': {
    name: 'stgUSDT',
    address: '0x1e4aa0b87d10b141',
    storagePath: '/storage/EVMVMBridgedToken_674843c06ff83502ddb4d37c2e09c01cda38cbc8Vault',
    receiverPath: '/public/EVMVMBridgedToken_674843c06ff83502ddb4d37c2e09c01cda38cbc8Receiver',
    balancePath: '/public/EVMVMBridgedToken_674843c06ff83502ddb4d37c2e09c01cda38cbc8Balance',
    typeIdentifier: 'A.1e4aa0b87d10b141.EVMVMBridgedToken_674843c06ff83502ddb4d37c2e09c01cda38cbc8.Vault'
  },
};

/**
 * Swap Transaction Builder Tool
 * Creates swap transaction intents for the transaction router
 */
export class SwapTransactionBuilderTool extends BaseTool {
  definition: ToolDefinition = {
    name: 'build_swap_transaction',
    description:
      'Build a token swap transaction using Flow Actions. Creates a structured transaction intent that will swap tokenIn to tokenOut via IncrementFi DEX.',
    parameters: [
      {
        name: 'amountIn',
        type: 'number',
        description: 'Amount of input token to swap',
        required: true,
      },
      {
        name: 'tokenIn',
        type: 'string',
        description: 'Input token symbol (flow, usdc, usdt)',
        required: true,
        enum: ['flow', 'usdc', 'usdt'],
      },
      {
        name: 'tokenOut',
        type: 'string',
        description: 'Output token symbol (flow, usdc, usdt)',
        required: true,
        enum: ['flow', 'usdc', 'usdt'],
      },
      {
        name: 'slippage',
        type: 'number',
        description: 'Slippage tolerance in percentage (default: 1)',
        required: false,
        default: 1,
      },
    ],
    examples: [
      {
        input: 'Swap 10 FLOW to USDC',
        parameters: { amountIn: 10, tokenIn: 'flow', tokenOut: 'usdc' },
        expectedResult: 'Returns ParsedIntent for swap transaction',
      },
      {
        input: 'Exchange 50 USDC for FLOW',
        parameters: { amountIn: 50, tokenIn: 'usdc', tokenOut: 'flow' },
        expectedResult: 'Returns ParsedIntent for swap transaction',
      },
    ],
  };

  /**
   * Execute swap transaction builder
   */
  async execute(
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> {
    try {
      const amountIn = this.getParam<number>(params, 'amountIn');
      const tokenIn = this.getParam<string>(params, 'tokenIn').toLowerCase();
      const tokenOut = this.getParam<string>(params, 'tokenOut').toLowerCase();
      const slippage = this.getParam<number>(params, 'slippage', 1);

      // Validate amount is positive
      if (amountIn <= 0) {
        return this.createErrorResult('Amount must be positive');
      }

      // Validate slippage is reasonable
      if (slippage < 0 || slippage > 50) {
        return this.createErrorResult('Slippage must be between 0 and 50%');
      }

      // Validate tokens are supported
      if (!TOKEN_MAP[tokenIn]) {
        return this.createErrorResult(
          `Unsupported tokenIn: ${tokenIn}. Supported: ${Object.keys(TOKEN_MAP).join(', ')}`
        );
      }

      if (!TOKEN_MAP[tokenOut]) {
        return this.createErrorResult(
          `Unsupported tokenOut: ${tokenOut}. Supported: ${Object.keys(TOKEN_MAP).join(', ')}`
        );
      }

      // Cannot swap same token
      if (tokenIn === tokenOut) {
        return this.createErrorResult('Cannot swap same token');
      }

      // Build ParsedIntent
      const intent: ParsedIntent = {
        type: 'swap',
        params: {
          amountIn: amountIn.toString(),
          tokenIn,
          tokenOut,
          tokenInInfo: TOKEN_MAP[tokenIn],
          tokenOutInfo: TOKEN_MAP[tokenOut],
          slippage,
        },
        confidence: 1.0, // Agent-built intents have high confidence
        rawInput: (context.metadata?.rawInput as string) || `swap ${amountIn} ${tokenIn} to ${tokenOut}`,
      };

      return this.createSuccessResult(intent);
    } catch (error) {
      throw new ToolError(
        `Failed to build swap transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error }
      );
    }
  }
}
