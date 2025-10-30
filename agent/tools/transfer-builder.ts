/**
 * Transfer Transaction Builder Tool
 * Builds transfer transaction intents
 */

import { BaseTool } from './base-tool';
import {
  ToolDefinition,
  ToolResult,
  ToolContext,
  ParsedIntent,
  ValidationError,
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
 * Transfer Transaction Builder Tool
 * Creates transfer transaction intents for the transaction router
 */
export class TransferTransactionBuilderTool extends BaseTool {
  definition: ToolDefinition = {
    name: 'build_transfer_transaction',
    description:
      'Build a token transfer transaction. Creates a structured transaction intent that will transfer tokens from the user to a recipient address on Flow blockchain.',
    parameters: [
      {
        name: 'amount',
        type: 'number',
        description: 'Amount of tokens to transfer',
        required: true,
      },
      {
        name: 'token',
        type: 'string',
        description: 'Token symbol to transfer (flow, usdc, usdt)',
        required: true,
        enum: ['flow', 'usdc', 'usdt'],
      },
      {
        name: 'recipient',
        type: 'string',
        description: 'Recipient Flow address (must start with 0x and be 18 characters)',
        required: true,
      },
    ],
    examples: [
      {
        input: 'Send 5 FLOW to 0x123456789abcdef0',
        parameters: {
          amount: 5,
          token: 'flow',
          recipient: '0x123456789abcdef0',
        },
        expectedResult: 'Returns ParsedIntent for transfer transaction',
      },
      {
        input: 'Transfer 10 USDC to 0xabcdef0123456789',
        parameters: {
          amount: 10,
          token: 'usdc',
          recipient: '0xabcdef0123456789',
        },
        expectedResult: 'Returns ParsedIntent for transfer transaction',
      },
    ],
  };

  /**
   * Execute transfer transaction builder
   */
  async execute(
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> {
    try {
      const amount = this.getParam<number>(params, 'amount');
      const token = this.getParam<string>(params, 'token').toLowerCase();
      const recipient = this.getParam<string>(params, 'recipient');

      // Validate amount is positive
      if (amount <= 0) {
        return this.createErrorResult('Amount must be positive');
      }

      // Validate token is supported
      if (!TOKEN_MAP[token]) {
        return this.createErrorResult(
          `Unsupported token: ${token}. Supported: ${Object.keys(TOKEN_MAP).join(', ')}`
        );
      }

      // Validate Flow address format
      const addressValidation = this.validateFlowAddress(recipient);
      if (addressValidation !== true) {
        return this.createErrorResult(addressValidation);
      }

      // Check user is not sending to themselves
      if (recipient.toLowerCase() === context.userAddress.toLowerCase()) {
        return this.createErrorResult('Cannot transfer to yourself');
      }

      // Build ParsedIntent
      const intent: ParsedIntent = {
        type: 'transfer',
        params: {
          amount: amount.toString(),
          token,
          recipient,
          tokenInfo: TOKEN_MAP[token],
        },
        confidence: 1.0, // Agent-built intents have high confidence
        rawInput: (context.metadata?.rawInput as string) || `send ${amount} ${token} to ${recipient}`,
      };

      return this.createSuccessResult(intent);
    } catch (error) {
      throw new ToolError(
        `Failed to build transfer transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error }
      );
    }
  }

  /**
   * Validate Flow address format
   * @param address - Address to validate
   * @returns True if valid, error message if invalid
   */
  private validateFlowAddress(address: string): true | string {
    // Must start with 0x
    if (!address.startsWith('0x')) {
      return 'Flow address must start with 0x';
    }

    // Must be 18 characters (0x + 16 hex)
    if (address.length !== 18) {
      return 'Flow address must be 18 characters (0x followed by 16 hex characters)';
    }

    // Must be valid hex
    if (!/^0x[a-f0-9]{16}$/i.test(address)) {
      return 'Flow address must contain only hex characters (0-9, a-f)';
    }

    return true;
  }
}
