/**
 * NLP Parser Service
 * Parses natural language commands into structured transaction intents
 */

export type TransactionType =
  | 'swap'
  | 'transfer'
  | 'balance'
  | 'unknown';

export interface ParsedIntent {
  type: TransactionType;
  params: Record<string, any>;
  confidence: number;
  rawInput: string;
}

// Token symbols and their contract addresses
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
  'fusd': {
    name: 'FUSD',
    address: '0x3c5959b568896393',
    storagePath: '/storage/fusdVault',
    receiverPath: '/public/fusdReceiver',
    balancePath: '/public/fusdBalance',
    typeIdentifier: 'A.3c5959b568896393.FUSD.Vault'
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

class NLPParser {
  /**
   * Parse user input into transaction intent
   */
  parse(input: string): ParsedIntent {
    const normalizedInput = input.toLowerCase().trim();

    // Try to parse as swap
    const swapIntent = this.parseSwap(normalizedInput);
    if (swapIntent) {
      return { ...swapIntent, rawInput: input };
    }

    // Try to parse as transfer
    const transferIntent = this.parseTransfer(normalizedInput);
    if (transferIntent) {
      return { ...transferIntent, rawInput: input };
    }

    // Try to parse as balance check
    const balanceIntent = this.parseBalance(normalizedInput);
    if (balanceIntent) {
      return { ...balanceIntent, rawInput: input };
    }

    // Unknown intent
    return {
      type: 'unknown',
      params: {},
      confidence: 0,
      rawInput: input,
    };
  }

  /**
   * Parse swap command
   * Examples:
   * - "swap 10 FLOW to USDC"
   * - "swap 5 USDC for FLOW"
   * - "exchange 100 FLOW to USDC"
   */
  private parseSwap(input: string): ParsedIntent | null {
    // Patterns for swap commands
    const patterns = [
      // "swap 10 FLOW to USDC"
      /swap\s+(\d+\.?\d*)\s+(\w+)\s+(?:to|for|into)\s+(\w+)/i,
      // "exchange 10 FLOW to USDC"
      /exchange\s+(\d+\.?\d*)\s+(\w+)\s+(?:to|for|into)\s+(\w+)/i,
      // "trade 10 FLOW for USDC"
      /trade\s+(\d+\.?\d*)\s+(\w+)\s+(?:to|for|into)\s+(\w+)/i,
      // "convert 10 FLOW to USDC"
      /convert\s+(\d+\.?\d*)\s+(\w+)\s+(?:to|for|into)\s+(\w+)/i,
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        const [, amount, tokenIn, tokenOut] = match;
        const tokenInNormalized = tokenIn.toLowerCase();
        const tokenOutNormalized = tokenOut.toLowerCase();

        // Validate tokens
        if (!TOKEN_MAP[tokenInNormalized] || !TOKEN_MAP[tokenOutNormalized]) {
          continue;
        }

        return {
          type: 'swap',
          params: {
            amountIn: amount,
            tokenIn: tokenInNormalized,
            tokenOut: tokenOutNormalized,
            tokenInInfo: TOKEN_MAP[tokenInNormalized],
            tokenOutInfo: TOKEN_MAP[tokenOutNormalized],
          },
          confidence: 0.9,
          rawInput: input,
        };
      }
    }

    return null;
  }

  /**
   * Parse transfer command
   * Examples:
   * - "send 10 FLOW to 0x1234567890abcdef"
   * - "transfer 5 USDC to 0xabcdef1234567890"
   */
  private parseTransfer(input: string): ParsedIntent | null {
    const patterns = [
      // "send 10 FLOW to 0x..."
      /(?:send|transfer|pay)\s+(\d+\.?\d*)\s+(\w+)\s+to\s+(0x[a-f0-9]+)/i,
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        const [, amount, token, recipient] = match;
        const tokenNormalized = token.toLowerCase();

        // Validate token
        if (!TOKEN_MAP[tokenNormalized]) {
          continue;
        }

        return {
          type: 'transfer',
          params: {
            amount,
            token: tokenNormalized,
            recipient,
            tokenInfo: TOKEN_MAP[tokenNormalized],
          },
          confidence: 0.9,
          rawInput: input,
        };
      }
    }

    return null;
  }

  /**
   * Parse balance check command
   * Examples:
   * - "check balance"
   * - "show my FLOW balance"
   * - "what's my USDC balance"
   */
  private parseBalance(input: string): ParsedIntent | null {
    const patterns = [
      // "check balance" or "show balance"
      /(?:check|show|get|what'?s)\s+(?:my\s+)?balance/i,
      // "check FLOW balance"
      /(?:check|show|get|what'?s)\s+(?:my\s+)?(\w+)\s+balance/i,
      // "balance of FLOW"
      /balance\s+(?:of\s+)?(\w+)?/i,
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        const token = match[1] ? match[1].toLowerCase() : 'flow';

        // Validate token
        if (token && !TOKEN_MAP[token]) {
          continue;
        }

        return {
          type: 'balance',
          params: {
            token,
            tokenInfo: TOKEN_MAP[token],
          },
          confidence: 0.85,
          rawInput: input,
        };
      }
    }

    return null;
  }

  /**
   * Get token info by symbol
   */
  getTokenInfo(symbol: string) {
    return TOKEN_MAP[symbol.toLowerCase()];
  }

  /**
   * Get all supported tokens
   */
  getSupportedTokens() {
    return Object.keys(TOKEN_MAP);
  }
}

// Export singleton instance
export const nlpParser = new NLPParser();
