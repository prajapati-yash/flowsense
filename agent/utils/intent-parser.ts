/**
 * Intent Parser Utility
 * Converts tool results and LLM responses to ParsedIntent format
 */

import {
  ParsedIntent,
  TransactionType,
  ToolResult,
  BalanceResult,
  PriceResult,
  PortfolioResult,
} from '../types';

/**
 * Parse tool result to ParsedIntent
 * @param toolName - Name of the tool that was executed
 * @param toolResult - Result from tool execution
 * @param rawInput - Original user input
 * @returns ParsedIntent object
 */
export function parseToolResultToIntent(
  toolName: string,
  toolResult: ToolResult,
  rawInput: string
): ParsedIntent {
  // If tool failed, return unknown intent
  if (!toolResult.success) {
    return {
      type: 'unknown',
      params: { error: toolResult.error },
      confidence: 0,
      rawInput,
    };
  }

  // Parse based on tool name
  switch (toolName) {
    case 'check_balance':
      return parseBalanceResult(toolResult.data, rawInput);

    case 'get_price':
      return parsePriceResult(toolResult.data, rawInput);

    case 'view_portfolio':
      return parsePortfolioResult(toolResult.data, rawInput);

    case 'build_swap_transaction':
    case 'build_transfer_transaction':
      // These tools already return ParsedIntent
      return toolResult.data as ParsedIntent;

    default:
      return {
        type: 'unknown',
        params: { result: toolResult.data },
        confidence: 0.5,
        rawInput,
      };
  }
}

/**
 * Parse balance check result to intent
 * @param data - Balance result data
 * @param rawInput - Original user input
 * @returns ParsedIntent
 */
function parseBalanceResult(data: unknown, rawInput: string): ParsedIntent {
  // Handle single balance result
  if (isSingleBalanceResult(data)) {
    return {
      type: 'balance',
      params: {
        token: data.token,
        balance: data.balance,
        symbol: data.symbol,
        name: data.name,
      },
      confidence: 1.0,
      rawInput,
    };
  }

  // Handle multiple balance results
  if (Array.isArray(data)) {
    return {
      type: 'balance',
      params: {
        balances: data,
        totalTokens: data.length,
      },
      confidence: 1.0,
      rawInput,
    };
  }

  return {
    type: 'unknown',
    params: { data },
    confidence: 0,
    rawInput,
  };
}

/**
 * Parse price query result to intent
 * @param data - Price result data
 * @param rawInput - Original user input
 * @returns ParsedIntent
 */
function parsePriceResult(data: unknown, rawInput: string): ParsedIntent {
  if (isPriceResult(data)) {
    return {
      type: 'price',
      params: {
        tokenFrom: data.tokenFrom,
        tokenTo: data.tokenTo,
        amountIn: data.amountIn,
        amountOut: data.amountOut,
        price: data.price,
      },
      confidence: 1.0,
      rawInput,
    };
  }

  return {
    type: 'unknown',
    params: { data },
    confidence: 0,
    rawInput,
  };
}

/**
 * Parse portfolio result to intent
 * @param data - Portfolio result data
 * @param rawInput - Original user input
 * @returns ParsedIntent
 */
function parsePortfolioResult(data: unknown, rawInput: string): ParsedIntent {
  if (isPortfolioResult(data)) {
    return {
      type: 'portfolio',
      params: {
        balances: data.balances,
        totalTokens: data.totalTokens,
        totalValueUSD: data.totalValueUSD,
      },
      confidence: 1.0,
      rawInput,
    };
  }

  return {
    type: 'unknown',
    params: { data },
    confidence: 0,
    rawInput,
  };
}

/**
 * Type guard for BalanceResult
 * @param data - Data to check
 * @returns True if data is BalanceResult
 */
function isSingleBalanceResult(data: unknown): data is BalanceResult {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const result = data as BalanceResult;

  return (
    typeof result.token === 'string' &&
    typeof result.balance === 'number' &&
    typeof result.symbol === 'string'
  );
}

/**
 * Type guard for PriceResult
 * @param data - Data to check
 * @returns True if data is PriceResult
 */
function isPriceResult(data: unknown): data is PriceResult {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const result = data as PriceResult;

  return (
    typeof result.tokenFrom === 'string' &&
    typeof result.tokenTo === 'string' &&
    typeof result.amountIn === 'number' &&
    typeof result.amountOut === 'number' &&
    typeof result.price === 'number'
  );
}

/**
 * Type guard for PortfolioResult
 * @param data - Data to check
 * @returns True if data is PortfolioResult
 */
function isPortfolioResult(data: unknown): data is PortfolioResult {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const result = data as PortfolioResult;

  return (
    typeof result.totalTokens === 'number' &&
    Array.isArray(result.balances)
  );
}

/**
 * Create an unknown intent
 * @param rawInput - Original user input
 * @param reason - Reason for unknown intent
 * @returns ParsedIntent with type 'unknown'
 */
export function createUnknownIntent(rawInput: string, reason?: string): ParsedIntent {
  return {
    type: 'unknown',
    params: reason ? { reason } : {},
    confidence: 0,
    rawInput,
  };
}

/**
 * Merge multiple parsed intents (for multi-step workflows)
 * @param intents - Array of ParsedIntent objects
 * @param rawInput - Original user input
 * @returns Combined ParsedIntent
 */
export function mergeIntents(intents: ParsedIntent[], rawInput: string): ParsedIntent {
  if (intents.length === 0) {
    return createUnknownIntent(rawInput, 'No intents to merge');
  }

  if (intents.length === 1) {
    return intents[0];
  }

  // For multi-step workflows, create a composite intent
  return {
    type: 'unknown', // Multi-step not yet supported
    params: {
      steps: intents,
      multiStep: true,
    },
    confidence: Math.min(...intents.map(i => i.confidence)),
    rawInput,
  };
}

/**
 * Validate ParsedIntent structure
 * @param intent - Intent to validate
 * @returns True if valid, error message if invalid
 */
export function validateParsedIntent(intent: ParsedIntent): true | string {
  // Check required fields
  if (!intent.type) {
    return 'Intent must have a type';
  }

  if (typeof intent.confidence !== 'number') {
    return 'Intent must have a confidence score';
  }

  if (intent.confidence < 0 || intent.confidence > 1) {
    return 'Confidence must be between 0 and 1';
  }

  if (!intent.params || typeof intent.params !== 'object') {
    return 'Intent must have params object';
  }

  if (!intent.rawInput || typeof intent.rawInput !== 'string') {
    return 'Intent must have rawInput string';
  }

  // Validate type-specific params
  switch (intent.type) {
    case 'swap':
      return validateSwapParams(intent.params);

    case 'transfer':
      return validateTransferParams(intent.params);

    case 'balance':
    case 'price':
    case 'portfolio':
    case 'unknown':
      return true;

    default:
      return `Unknown intent type: ${intent.type}`;
  }
}

/**
 * Validate swap intent params
 * @param params - Params to validate
 * @returns True if valid, error message if invalid
 */
function validateSwapParams(params: Record<string, unknown>): true | string {
  if (!params.amountIn) {
    return 'Swap intent must have amountIn';
  }

  if (!params.tokenIn) {
    return 'Swap intent must have tokenIn';
  }

  if (!params.tokenOut) {
    return 'Swap intent must have tokenOut';
  }

  if (!params.tokenInInfo) {
    return 'Swap intent must have tokenInInfo';
  }

  if (!params.tokenOutInfo) {
    return 'Swap intent must have tokenOutInfo';
  }

  return true;
}

/**
 * Validate transfer intent params
 * @param params - Params to validate
 * @returns True if valid, error message if invalid
 */
function validateTransferParams(params: Record<string, unknown>): true | string {
  if (!params.amount) {
    return 'Transfer intent must have amount';
  }

  if (!params.token) {
    return 'Transfer intent must have token';
  }

  if (!params.recipient) {
    return 'Transfer intent must have recipient';
  }

  if (!params.tokenInfo) {
    return 'Transfer intent must have tokenInfo';
  }

  return true;
}

/**
 * Get intent type from string
 * @param typeStr - Type string
 * @returns TransactionType or 'unknown'
 */
export function parseIntentType(typeStr: string): TransactionType {
  const validTypes: TransactionType[] = [
    'swap',
    'transfer',
    'balance',
    'price',
    'portfolio',
    'unknown',
  ];

  const normalized = typeStr.toLowerCase().trim();

  if (validTypes.includes(normalized as TransactionType)) {
    return normalized as TransactionType;
  }

  return 'unknown';
}
