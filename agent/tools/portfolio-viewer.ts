/**
 * Portfolio Viewer Tool
 * Gets complete overview of all token balances
 */

import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';
import { BaseTool } from './base-tool';
import {
  ToolDefinition,
  ToolResult,
  ToolContext,
  PortfolioResult,
  BalanceResult,
  ToolError,
} from '../types';
import { configureFCL } from '../utils/fcl-config';

/**
 * Flow script for getting all token balances (portfolio)
 */
const GET_PORTFOLIO_SCRIPT = `
import FungibleToken from 0xf233dcee88fe0abe
import FlowToken from 0x1654653399040a61

access(all) struct TokenBalance {
    access(all) let symbol: String
    access(all) let balance: UFix64
    access(all) let name: String
    access(all) let typeIdentifier: String

    init(symbol: String, balance: UFix64, name: String, typeIdentifier: String) {
        self.symbol = symbol
        self.balance = balance
        self.name = name
        self.typeIdentifier = typeIdentifier
    }
}

access(all) fun main(address: Address): [TokenBalance] {
    let account = getAccount(address)
    var balances: [TokenBalance] = []

    // Helper to try borrowing a token vault and add to balances if it exists
    fun tryAddToken(path: PublicPath, symbol: String, name: String): Bool {
        if let vaultRef = account.capabilities.borrow<&{FungibleToken.Balance}>(path) {
            if vaultRef.balance > 0.0 {
                balances.append(TokenBalance(
                    symbol: symbol,
                    balance: vaultRef.balance,
                    name: name,
                    typeIdentifier: vaultRef.getType().identifier
                ))
                return true
            }
        }
        return false
    }

    // Helper to try borrowing from Receiver path
    fun tryAddTokenFromReceiver(path: PublicPath, symbol: String, name: String): Bool {
        if let receiverRef = account.capabilities.borrow<&{FungibleToken.Receiver}>(path) {
            if let balanceRef = receiverRef as? &{FungibleToken.Balance} {
                if balanceRef.balance > 0.0 {
                    balances.append(TokenBalance(
                        symbol: symbol,
                        balance: balanceRef.balance,
                        name: name,
                        typeIdentifier: balanceRef.getType().identifier
                    ))
                    return true
                }
            }
        }
        return false
    }

    // Check FLOW
    tryAddToken(
        path: /public/flowTokenBalance,
        symbol: "FLOW",
        name: "FlowToken"
    )

    // Check USDC
    tryAddToken(
        path: /public/USDCVaultBalance,
        symbol: "USDC",
        name: "FiatToken"
    )

    // Check stgUSDC (Stargate bridged from EVM)
    tryAddTokenFromReceiver(
        path: /public/EVMVMBridgedToken_f1815bd50389c46847f0bda824ec8da914045d14Receiver,
        symbol: "USDC",
        name: "stgUSDC"
    )

    // Check stgUSDT (Stargate bridged from EVM)
    tryAddTokenFromReceiver(
        path: /public/EVMVMBridgedToken_674843c06ff83502ddb4d37c2e09c01cda38cbc8Receiver,
        symbol: "USDT",
        name: "stgUSDT"
    )

    // Check FUSD (deprecated but may exist)
    tryAddToken(
        path: /public/fusdBalance,
        symbol: "FUSD",
        name: "FUSD"
    )

    // Check USDT (Teleported Tether)
    tryAddToken(
        path: /public/teleportedTetherTokenBalance,
        symbol: "USDT",
        name: "TeleportedTetherToken"
    )

    // Check BloctoToken
    tryAddToken(
        path: /public/bloctoTokenBalance,
        symbol: "BLT",
        name: "BloctoToken"
    )

    // Check tUSDT
    tryAddToken(
        path: /public/tUSDTVaultBalance,
        symbol: "USDT",
        name: "tUSDT"
    )

    // Check stFLOW
    tryAddToken(
        path: /public/stFlowTokenBalance,
        symbol: "stFLOW",
        name: "stFlowToken"
    )

    return balances
}
`;

/**
 * Portfolio Viewer Tool
 * Gets complete overview of all token balances in user's wallet
 */
export class PortfolioViewerTool extends BaseTool {
  definition: ToolDefinition = {
    name: 'view_portfolio',
    description:
      'Get a complete overview of all token balances in the user\'s Flow wallet. Returns all tokens with non-zero balances.',
    parameters: [],
    examples: [
      {
        input: 'Show my portfolio',
        parameters: {},
        expectedResult: 'Returns all token balances',
      },
      {
        input: 'What tokens do I have?',
        parameters: {},
        expectedResult: 'Returns list of all tokens with balances',
      },
    ],
  };

  /**
   * Execute portfolio view
   */
  async execute(
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> {
    try {
      // Configure FCL for server-side use
      configureFCL();

      const balances = await this.getPortfolio(context.userAddress);

      const portfolioResult: PortfolioResult = {
        totalTokens: balances.length,
        balances,
      };

      return this.createSuccessResult(portfolioResult);
    } catch (error) {
      throw new ToolError(
        `Failed to fetch portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error }
      );
    }
  }

  /**
   * Get portfolio from Flow blockchain
   */
  private async getPortfolio(userAddress: string): Promise<BalanceResult[]> {
    try {
      const rawBalances = await fcl.query({
        cadence: GET_PORTFOLIO_SCRIPT,
        args: (arg: any, _t: any) => [arg(userAddress, t.Address)],
      });

      // Convert raw balances to BalanceResult format
      const balances: BalanceResult[] = rawBalances.map((item: any) => ({
        token: item.symbol.toLowerCase(),
        balance: parseFloat(item.balance.toString()),
        symbol: item.symbol,
        name: item.name,
        typeIdentifier: item.typeIdentifier,
      }));

      return balances;
    } catch (error) {
      if (error instanceof Error) {
        // Handle common errors
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
          // Account might not have any tokens, return empty array
          return [];
        }
      }

      throw error;
    }
  }
}
