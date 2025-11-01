/**
 * Price Fetcher Tool
 * Gets real-time token prices from IncrementFi DEX via Flow Actions
 */

import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';
import { BaseTool } from './base-tool';
import {
  ToolDefinition,
  ToolResult,
  ToolContext,
  PriceResult,
  ToolError,
} from '../types';
import { configureFCL } from '../utils/fcl-config';

/**
 * Flow script for getting prices via Flow Actions Swapper
 */
const GET_PRICE_SCRIPT = `
import FlowActionsInterfaces from 0xa9c238d801df5106
import IncrementFiConnector from 0xa9c238d801df5106

access(all) fun main(
    swapperAddress: Address,
    tokenFromType: String,
    tokenToType: String,
    amount: UFix64
): UFix64 {
    // Parse token types
    let tokenFrom = CompositeType(tokenFromType)
        ?? panic("Invalid token type: ".concat(tokenFromType))

    let tokenTo = CompositeType(tokenToType)
        ?? panic("Invalid token type: ".concat(tokenToType))

    // Borrow swapper capability
    let account = getAccount(swapperAddress)
    let swapper = account.capabilities.borrow<&{FlowActionsInterfaces.Swapper}>(
        IncrementFiConnector.SwapperPublicPath
    ) ?? panic("Could not borrow Swapper from address ".concat(swapperAddress.toString()))

    // Get quote
    return swapper.getQuote(
        tokenInType: tokenFrom,
        tokenOutType: tokenTo,
        amountIn: amount
    )
}
`;

/**
 * Token type identifiers for Flow Actions
 */
const TOKEN_TYPES: Record<string, string> = {
  flow: 'A.1654653399040a61.FlowToken.Vault',
  usdc: 'A.1e4aa0b87d10b141.EVMVMBridgedToken_f1815bd50389c46847f0bda824ec8da914045d14.Vault',
  usdt: 'A.1e4aa0b87d10b141.EVMVMBridgedToken_674843c06ff83502ddb4d37c2e09c01cda38cbc8.Vault',
};

/**
 * Price Fetcher Tool
 * Gets current price of one token in terms of another
 */
export class PriceFetcherTool extends BaseTool {
  definition: ToolDefinition = {
    name: 'get_price',
    description:
      'Get the current price of a token in terms of another token from IncrementFi DEX. Returns the amount of tokenTo you would receive for a given amount of tokenFrom.',
    parameters: [
      {
        name: 'tokenFrom',
        type: 'string',
        description: 'Source token symbol (flow, usdc, usdt)',
        required: true,
        enum: ['flow', 'usdc', 'usdt'],
      },
      {
        name: 'tokenTo',
        type: 'string',
        description: 'Target token symbol (flow, usdc, usdt)',
        required: true,
        enum: ['flow', 'usdc', 'usdt'],
      },
      {
        name: 'amount',
        type: 'number',
        description: 'Amount of source token to get price for',
        required: false,
        default: 1,
      },
    ],
    examples: [
      {
        input: "What's the price of FLOW in USDC?",
        parameters: { tokenFrom: 'flow', tokenTo: 'usdc', amount: 1 },
        expectedResult: 'Returns current FLOW/USDC price',
      },
      {
        input: 'How much USDC would I get for 10 FLOW?',
        parameters: { tokenFrom: 'flow', tokenTo: 'usdc', amount: 10 },
        expectedResult: 'Returns USDC amount for 10 FLOW',
      },
    ],
  };

  /**
   * Execute price fetch
   */
  async execute(
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> {
    try {
      // Configure FCL for server-side use
      configureFCL();

      const tokenFrom = this.getParam<string>(params, 'tokenFrom').toLowerCase();
      const tokenTo = this.getParam<string>(params, 'tokenTo').toLowerCase();
      const amount = this.getParam<number>(params, 'amount', 1);

      // Validate tokens are supported
      if (!TOKEN_TYPES[tokenFrom]) {
        return this.createErrorResult(
          `Unsupported tokenFrom: ${tokenFrom}. Supported: ${Object.keys(TOKEN_TYPES).join(', ')}`
        );
      }

      if (!TOKEN_TYPES[tokenTo]) {
        return this.createErrorResult(
          `Unsupported tokenTo: ${tokenTo}. Supported: ${Object.keys(TOKEN_TYPES).join(', ')}`
        );
      }

      // Validate amount is positive
      if (amount <= 0) {
        return this.createErrorResult('Amount must be positive');
      }

      // Cannot swap same token
      if (tokenFrom === tokenTo) {
        return this.createErrorResult('Cannot get price for same token');
      }

      // Get price from IncrementFi via Flow Actions
      const amountOut = await this.getPrice(
        context.userAddress,
        tokenFrom,
        tokenTo,
        amount
      );

      const result: PriceResult = {
        tokenFrom,
        tokenTo,
        amountIn: amount,
        amountOut,
        price: amountOut / amount,
        timestamp: Date.now(),
      };

      return this.createSuccessResult(result);
    } catch (error) {
      throw new ToolError(
        `Failed to fetch price: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error }
      );
    }
  }

  /**
   * Get price from IncrementFi via Flow Actions
   */
  private async getPrice(
    swapperAddress: string,
    tokenFrom: string,
    tokenTo: string,
    amount: number
  ): Promise<number> {
    try {
      const amountOut = await fcl.query({
        cadence: GET_PRICE_SCRIPT,
        args: (arg: any, _t: any) => [
          arg(swapperAddress, t.Address),
          arg(TOKEN_TYPES[tokenFrom], t.String),
          arg(TOKEN_TYPES[tokenTo], t.String),
          arg(amount.toFixed(8), t.UFix64),
        ],
      });

      return parseFloat(amountOut.toString());
    } catch (error) {
      // Check for common errors
      if (error instanceof Error) {
        if (error.message.includes('Could not borrow Swapper')) {
          throw new Error(
            'Swapper not initialized for this address. Please perform a swap first to initialize.'
          );
        }

        if (error.message.includes('Swap pair does not exist')) {
          throw new Error(
            `Trading pair ${tokenFrom.toUpperCase()}/${tokenTo.toUpperCase()} is not available on IncrementFi`
          );
        }
      }

      throw error;
    }
  }
}
