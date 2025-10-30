/**
 * Token Resolver Utility
 * Resolves token symbols to contract information
 */

import { ValidationError } from '../types';

/**
 * Token information interface
 */
export interface TokenInfo {
  name: string;
  address: string;
  storagePath: string;
  receiverPath: string;
  balancePath: string;
  typeIdentifier: string;
}

/**
 * Token map with all supported tokens
 * Centralized source of truth for token information
 */
export const TOKEN_MAP: Record<string, TokenInfo> = {
  flow: {
    name: 'FlowToken',
    address: '0x1654653399040a61',
    storagePath: '/storage/flowTokenVault',
    receiverPath: '/public/flowTokenReceiver',
    balancePath: '/public/flowTokenBalance',
    typeIdentifier: 'A.1654653399040a61.FlowToken.Vault',
  },
  usdc: {
    name: 'stgUSDC',
    address: '0x1e4aa0b87d10b141',
    storagePath: '/storage/EVMVMBridgedToken_f1815bd50389c46847f0bda824ec8da914045d14Vault',
    receiverPath: '/public/EVMVMBridgedToken_f1815bd50389c46847f0bda824ec8da914045d14Receiver',
    balancePath: '/public/EVMVMBridgedToken_f1815bd50389c46847f0bda824ec8da914045d14Balance',
    typeIdentifier: 'A.1e4aa0b87d10b141.EVMVMBridgedToken_f1815bd50389c46847f0bda824ec8da914045d14.Vault',
  },
  usdt: {
    name: 'stgUSDT',
    address: '0x1e4aa0b87d10b141',
    storagePath: '/storage/EVMVMBridgedToken_674843c06ff83502ddb4d37c2e09c01cda38cbc8Vault',
    receiverPath: '/public/EVMVMBridgedToken_674843c06ff83502ddb4d37c2e09c01cda38cbc8Receiver',
    balancePath: '/public/EVMVMBridgedToken_674843c06ff83502ddb4d37c2e09c01cda38cbc8Balance',
    typeIdentifier: 'A.1e4aa0b87d10b141.EVMVMBridgedToken_674843c06ff83502ddb4d37c2e09c01cda38cbc8.Vault',
  },
  fusd: {
    name: 'FUSD',
    address: '0x3c5959b568896393',
    storagePath: '/storage/fusdVault',
    receiverPath: '/public/fusdReceiver',
    balancePath: '/public/fusdBalance',
    typeIdentifier: 'A.3c5959b568896393.FUSD.Vault',
  },
};

/**
 * Token aliases for fuzzy matching
 */
const TOKEN_ALIASES: Record<string, string> = {
  // FLOW aliases
  'flow': 'flow',
  'flowtoken': 'flow',
  '$flow': 'flow',

  // USDC aliases
  'usdc': 'usdc',
  'stgusdc': 'usdc',
  'usd coin': 'usdc',
  'usdcoin': 'usdc',

  // USDT aliases
  'usdt': 'usdt',
  'stgusdt': 'usdt',
  'tether': 'usdt',

  // FUSD aliases
  'fusd': 'fusd',
  'flow usd': 'fusd',
};

/**
 * Resolve token symbol to token information
 * @param symbol - Token symbol (case-insensitive)
 * @returns Token information
 * @throws ValidationError if token is not supported
 */
export function resolveToken(symbol: string): TokenInfo {
  const normalized = normalizeTokenSymbol(symbol);

  const tokenInfo = TOKEN_MAP[normalized];

  if (!tokenInfo) {
    throw new ValidationError(
      `Unsupported token: ${symbol}. Supported tokens: ${getSupportedTokens().join(', ')}`
    );
  }

  return tokenInfo;
}

/**
 * Get token information by symbol
 * @param symbol - Token symbol
 * @returns Token information or undefined if not found
 */
export function getTokenInfo(symbol: string): TokenInfo | undefined {
  try {
    return resolveToken(symbol);
  } catch {
    return undefined;
  }
}

/**
 * Check if a token is supported
 * @param symbol - Token symbol
 * @returns True if token is supported
 */
export function isTokenSupported(symbol: string): boolean {
  const normalized = normalizeTokenSymbol(symbol);
  return normalized in TOKEN_MAP;
}

/**
 * Get all supported token symbols
 * @returns Array of supported token symbols
 */
export function getSupportedTokens(): string[] {
  return Object.keys(TOKEN_MAP);
}

/**
 * Get all supported token symbols with their display names
 * @returns Array of objects with symbol and name
 */
export function getSupportedTokensWithNames(): Array<{ symbol: string; name: string }> {
  return Object.entries(TOKEN_MAP).map(([symbol, info]) => ({
    symbol: symbol.toUpperCase(),
    name: info.name,
  }));
}

/**
 * Normalize token symbol for consistent lookup
 * Handles case-insensitivity and aliases
 * @param symbol - Raw token symbol
 * @returns Normalized token symbol
 */
export function normalizeTokenSymbol(symbol: string): string {
  // Convert to lowercase and trim
  const cleaned = symbol.toLowerCase().trim();

  // Remove common prefixes
  const withoutPrefix = cleaned.replace(/^(\$|#)/, '');

  // Check aliases first
  if (withoutPrefix in TOKEN_ALIASES) {
    return TOKEN_ALIASES[withoutPrefix];
  }

  // Check direct match
  if (withoutPrefix in TOKEN_MAP) {
    return withoutPrefix;
  }

  // Return as-is (will fail in resolveToken)
  return withoutPrefix;
}

/**
 * Get token display name
 * @param symbol - Token symbol
 * @returns Display name (e.g., "FLOW", "USDC")
 */
export function getTokenDisplayName(symbol: string): string {
  const normalized = normalizeTokenSymbol(symbol);
  return normalized.toUpperCase();
}

/**
 * Compare two token symbols for equality
 * @param symbol1 - First token symbol
 * @param symbol2 - Second token symbol
 * @returns True if tokens are the same
 */
export function isSameToken(symbol1: string, symbol2: string): boolean {
  try {
    const normalized1 = normalizeTokenSymbol(symbol1);
    const normalized2 = normalizeTokenSymbol(symbol2);
    return normalized1 === normalized2;
  } catch {
    return false;
  }
}

/**
 * Validate token pair for swaps
 * @param tokenIn - Input token symbol
 * @param tokenOut - Output token symbol
 * @returns Error message or null if valid
 */
export function validateTokenPair(tokenIn: string, tokenOut: string): string | null {
  // Check both tokens are supported
  if (!isTokenSupported(tokenIn)) {
    return `Unsupported input token: ${tokenIn}`;
  }

  if (!isTokenSupported(tokenOut)) {
    return `Unsupported output token: ${tokenOut}`;
  }

  // Check not swapping same token
  if (isSameToken(tokenIn, tokenOut)) {
    return 'Cannot swap the same token';
  }

  return null;
}

/**
 * Get token type identifier for Flow scripts
 * @param symbol - Token symbol
 * @returns Type identifier string
 */
export function getTokenTypeIdentifier(symbol: string): string {
  const info = resolveToken(symbol);
  return info.typeIdentifier;
}

/**
 * Get token storage path
 * @param symbol - Token symbol
 * @returns Storage path string
 */
export function getTokenStoragePath(symbol: string): string {
  const info = resolveToken(symbol);
  return info.storagePath;
}

/**
 * Get token receiver path
 * @param symbol - Token symbol
 * @returns Receiver path string
 */
export function getTokenReceiverPath(symbol: string): string {
  const info = resolveToken(symbol);
  return info.receiverPath;
}

/**
 * Get token balance path
 * @param symbol - Token symbol
 * @returns Balance path string
 */
export function getTokenBalancePath(symbol: string): string {
  const info = resolveToken(symbol);
  return info.balancePath;
}
