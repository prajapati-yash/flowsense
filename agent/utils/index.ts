/**
 * Agent Utilities
 * Centralized exports for all utility functions
 */

// Token Resolver
export {
  resolveToken,
  getTokenInfo,
  isTokenSupported,
  getSupportedTokens,
  getSupportedTokensWithNames,
  normalizeTokenSymbol,
  getTokenDisplayName,
  isSameToken,
  validateTokenPair,
  getTokenTypeIdentifier,
  getTokenStoragePath,
  getTokenReceiverPath,
  getTokenBalancePath,
  TOKEN_MAP,
} from './token-resolver';

export type { TokenInfo } from './token-resolver';

// Validation
export {
  validateFlowAddress,
  isValidFlowAddress,
  validateAmount,
  isValidAmount,
  validateSlippage,
  validateTokenSymbol,
  validateNonEmptyString,
  validateRange,
  validateEnum,
  sanitizeInput,
  validateConversationId,
  formatFlowAddress,
  formatAmount,
  parseAmount,
  validateRequiredFields,
  validateTimeout,
  validateTemperature,
} from './validation';

// Intent Parser
export {
  parseToolResultToIntent,
  createUnknownIntent,
  mergeIntents,
  validateParsedIntent,
  parseIntentType,
} from './intent-parser';

// Cache Manager
export {
  CacheManager,
  balanceCache,
  priceCache,
  llmCache,
  portfolioCache,
  createCacheKey,
  cleanupAllCaches,
  destroyAllCaches,
} from './cache-manager';

export type { CacheOptions, CacheStats } from './cache-manager';

// FCL Configuration
export { configureFCL } from './fcl-config';
