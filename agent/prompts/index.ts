/**
 * Agent Prompts
 * Centralized exports for all prompts and templates
 */

export { SYSTEM_PROMPT } from './system-prompt';
export { TOOL_USAGE_GUIDELINES } from './tool-guidelines';
export {
  insufficientBalanceTemplate,
  balanceResponseTemplate,
  multiBalanceResponseTemplate,
  priceResponseTemplate,
  swapConfirmationTemplate,
  transferConfirmationTemplate,
  portfolioTemplate,
  unsupportedTokenTemplate,
  invalidAddressTemplate,
  sameTokenSwapTemplate,
  confirmationRequiredTemplate,
  toolErrorTemplate,
  missingInfoTemplate,
  clarificationTemplate,
  greetingTemplate,
  helpTemplate,
  unknownIntentTemplate,
  buildErrorMessage,
  buildSuccessMessage,
  formatTokenAmount,
  formatAddress,
  getContextualResponse,
} from './templates';
