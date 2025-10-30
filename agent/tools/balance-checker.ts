/**
 * Balance Checker Tool
 * Checks token balances for a user's Flow wallet
 */

import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';
import { BaseTool } from './base-tool';
import {
  ToolDefinition,
  ToolResult,
  ToolContext,
  BalanceResult,
  ToolError,
} from '../types';
import { configureFCL } from '../utils/fcl-config';

/**
 * Flow scripts for checking balances
 */
const GET_FLOW_BALANCE_SCRIPT = `
import FungibleToken from 0xf233dcee88fe0abe
import FlowToken from 0x1654653399040a61

access(all) fun main(address: Address): UFix64 {
    let account = getAccount(address)

    let vaultRef = account.capabilities.get<&{FungibleToken.Balance}>(
        /public/flowTokenBalance
    ).borrow() ?? panic("Could not borrow Balance reference to the Vault")

    return vaultRef.balance
}
`;

const GET_TOKEN_BALANCE_SCRIPT = `
import FungibleToken from 0xf233dcee88fe0abe

access(all) fun main(address: Address, storagePath: String): UFix64 {
    let account = getAccount(address)

    let publicPath = PublicPath(identifier: storagePath.concat("Balance"))!

    let vaultRef = account.capabilities.get<&{FungibleToken.Balance}>(publicPath)
        .borrow() ?? panic("Could not borrow Balance reference to the Vault")

    return vaultRef.balance
}
`;

/**
 * Token information map
 */
const TOKEN_MAP: Record<string, { name: string; storagePath: string; symbol: string }> = {
  flow: {
    name: 'FlowToken',
    storagePath: 'flowTokenVault',
    symbol: 'FLOW',
  },
  usdc: {
    name: 'stgUSDC',
    storagePath: 'EVMVMBridgedToken_f1815bd50389c46847f0bda824ec8da914045d14Vault',
    symbol: 'USDC',
  },
  usdt: {
    name: 'stgUSDT',
    storagePath: 'EVMVMBridgedToken_674843c06ff83502ddb4d37c2e09c01cda38cbc8Vault',
    symbol: 'USDT',
  },
};

/**
 * Balance Checker Tool
 * Allows checking balance of a specific token or all tokens
 */
export class BalanceCheckerTool extends BaseTool {
  definition: ToolDefinition = {
    name: 'check_balance',
    description:
      'Check the balance of a specific token in the user\'s Flow wallet. Can check FLOW, USDC, or USDT balances.',
    parameters: [
      {
        name: 'token',
        type: 'string',
        description: 'Token symbol to check balance for (flow, usdc, usdt). Leave empty or use "all" to check all tokens.',
        required: false,
        enum: ['flow', 'usdc', 'usdt', 'all'],
      },
    ],
    examples: [
      {
        input: "What's my FLOW balance?",
        parameters: { token: 'flow' },
        expectedResult: 'Returns FLOW balance',
      },
      {
        input: "What's my balance?",
        parameters: {},
        expectedResult: 'Returns all token balances',
      },
    ],
  };

  /**
   * Execute balance check
   */
  async execute(
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> {
    try {
      // Configure FCL for server-side use
      configureFCL();

      const token = this.getOptionalParam<string>(params, 'token')?.toLowerCase();

      // If no token specified or "all", check all balances
      if (!token || token === 'all') {
        return await this.checkAllBalances(context.userAddress);
      }

      // Check specific token
      return await this.checkTokenBalance(token, context.userAddress);
    } catch (error) {
      throw new ToolError(
        `Failed to check balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error }
      );
    }
  }

  /**
   * Check balance for a specific token
   */
  private async checkTokenBalance(
    token: string,
    userAddress: string
  ): Promise<ToolResult> {
    const tokenInfo = TOKEN_MAP[token];

    if (!tokenInfo) {
      return this.createErrorResult(
        `Unsupported token: ${token}. Supported tokens: ${Object.keys(TOKEN_MAP).join(', ')}`
      );
    }

    try {
      let balance: number;

      if (token === 'flow') {
        // Use FLOW-specific script
        balance = await fcl.query({
          cadence: GET_FLOW_BALANCE_SCRIPT,
          args: (arg: any, _t: any) => [arg(userAddress, t.Address)],
        });
      } else {
        // Use generic token script
        balance = await fcl.query({
          cadence: GET_TOKEN_BALANCE_SCRIPT,
          args: (arg: any, _t: any) => [
            arg(userAddress, t.Address),
            arg(tokenInfo.storagePath, t.String),
          ],
        });
      }

      const result: BalanceResult = {
        token,
        balance: parseFloat(balance.toString()),
        symbol: tokenInfo.symbol,
        name: tokenInfo.name,
      };

      return this.createSuccessResult(result);
    } catch (error) {
      // User might not have this token initialized
      if (
        error instanceof Error &&
        (error.message.includes('Could not borrow') ||
          error.message.includes('panic'))
      ) {
        const result: BalanceResult = {
          token,
          balance: 0,
          symbol: tokenInfo.symbol,
          name: tokenInfo.name,
        };

        return this.createSuccessResult(result, {
          warnings: [`${tokenInfo.symbol} vault not initialized, balance is 0`],
        });
      }

      throw error;
    }
  }

  /**
   * Check balances for all supported tokens
   */
  private async checkAllBalances(userAddress: string): Promise<ToolResult> {
    const balances: BalanceResult[] = [];
    const warnings: string[] = [];

    for (const token of Object.keys(TOKEN_MAP)) {
      try {
        const result = await this.checkTokenBalance(token, userAddress);

        if (result.success && result.data) {
          balances.push(result.data as BalanceResult);

          if (result.metadata?.warnings) {
            warnings.push(...result.metadata.warnings);
          }
        }
      } catch (error) {
        // Skip tokens that error, but add warning
        warnings.push(
          `Failed to check ${TOKEN_MAP[token].symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return this.createSuccessResult(balances, {
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  }
}
