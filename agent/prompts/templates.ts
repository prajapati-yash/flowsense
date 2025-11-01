/**
 * Prompt Templates
 * Reusable response templates for common scenarios
 */

/**
 * Template for insufficient balance errors
 */
export const insufficientBalanceTemplate = (
  token: string,
  required: number,
  available: number
): string => {
  return `You don't have enough ${token.toUpperCase()} for this transaction. You need ${required} ${token.toUpperCase()} but only have ${available} ${token.toUpperCase()}.`;
};

/**
 * Template for successful balance check
 */
export const balanceResponseTemplate = (
  token: string,
  balance: number
): string => {
  return `You have ${balance} ${token.toUpperCase()} in your wallet.`;
};

/**
 * Template for multiple balances
 */
export const multiBalanceResponseTemplate = (
  balances: Array<{ symbol: string; balance: number }>
): string => {
  const lines = balances.map(b => `- ${b.symbol.toUpperCase()}: ${b.balance}`);
  return `Here are your balances:\n${lines.join('\n')}`;
};

/**
 * Template for price information
 */
export const priceResponseTemplate = (
  amountIn: number,
  tokenFrom: string,
  amountOut: number,
  tokenTo: string,
  price: number
): string => {
  return `${amountIn} ${tokenFrom.toUpperCase()} = ${amountOut.toFixed(4)} ${tokenTo.toUpperCase()} (Rate: 1 ${tokenFrom.toUpperCase()} = ${price.toFixed(4)} ${tokenTo.toUpperCase()})`;
};

/**
 * Template for swap confirmation
 */
export const swapConfirmationTemplate = (
  amountIn: number,
  tokenIn: string,
  amountOut: number,
  tokenOut: string,
  slippage: number
): string => {
  return `I've prepared your swap transaction:
- You'll swap: ${amountIn} ${tokenIn.toUpperCase()}
- You'll receive: ~${amountOut.toFixed(4)} ${tokenOut.toUpperCase()}
- Slippage tolerance: ${slippage}%

Please review and confirm to execute the transaction.`;
};

/**
 * Template for transfer confirmation
 */
export const transferConfirmationTemplate = (
  amount: number,
  token: string,
  recipient: string
): string => {
  return `I've prepared your transfer:
- Amount: ${amount} ${token.toUpperCase()}
- To: ${recipient}

Please review and confirm to execute the transaction.`;
};

/**
 * Template for portfolio overview
 */
export const portfolioTemplate = (
  balances: Array<{ symbol: string; balance: number; name: string }>,
  totalTokens: number
): string => {
  const lines = balances.map(b => `- ${b.symbol.toUpperCase()}: ${b.balance} (${b.name})`);
  return `Your Portfolio (${totalTokens} token${totalTokens !== 1 ? 's' : ''}):\n${lines.join('\n')}`;
};

/**
 * Template for unsupported token error
 */
export const unsupportedTokenTemplate = (
  token: string,
  supportedTokens: string[]
): string => {
  return `${token} is not supported. Supported tokens are: ${supportedTokens.map(t => t.toUpperCase()).join(', ')}.`;
};

/**
 * Template for invalid address error
 */
export const invalidAddressTemplate = (address: string): string => {
  return `"${address}" is not a valid Flow address. Flow addresses must:
- Start with "0x"
- Be exactly 18 characters long
- Contain only hexadecimal characters (0-9, a-f)

Example: 0x1654653399040a61`;
};

/**
 * Template for same token swap error
 */
export const sameTokenSwapTemplate = (token: string): string => {
  return `You cannot swap ${token.toUpperCase()} for ${token.toUpperCase()}. Please choose a different output token.`;
};

/**
 * Template for transaction requires confirmation
 */
export const confirmationRequiredTemplate = (): string => {
  return `This transaction requires your confirmation. Once confirmed, it will be executed on the Flow blockchain and cannot be undone.`;
};

/**
 * Template for tool execution error
 */
export const toolErrorTemplate = (toolName: string, error: string): string => {
  return `I encountered an error while trying to ${toolName.replace('_', ' ')}: ${error}. Please try again or contact support if the issue persists.`;
};

/**
 * Template for asking for missing information
 */
export const missingInfoTemplate = (field: string): string => {
  return `I need to know the ${field} to proceed. Could you please provide it?`;
};

/**
 * Template for clarification request
 */
export const clarificationTemplate = (options: string[]): string => {
  return `I can help you with that. Did you mean:\n${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}`;
};

/**
 * Template for greeting
 */
export const greetingTemplate = (): string => {
  return `Hello! I'm FlowSense Agent, your assistant for managing assets on the Flow blockchain. I can help you:
- Check token balances
- Get price information
- View your portfolio
- Build swap transactions
- Build transfer transactions

How can I help you today?`;
};

/**
 * Template for help message
 */
export const helpTemplate = (): string => {
  return `I can help you with the following:

**Balance & Portfolio**
- "What's my FLOW balance?"
- "Show me my portfolio"
- "Check my USDC balance"

**Prices**
- "What's the price of FLOW in USDC?"
- "How much USDC can I get for 10 FLOW?"

**Swaps**
- "Swap 5 FLOW for USDC"
- "Trade 10 USDC to FLOW"

**Transfers**
- "Send 10 FLOW to 0x1234567890abcdef"
- "Transfer 5 USDC to 0xabcdef1234567890"

What would you like to do?`;
};

/**
 * Template for unknown intent
 */
export const unknownIntentTemplate = (): string => {
  return `I'm not sure I understood that. I can help you check balances, get prices, view your portfolio, or build swap/transfer transactions. Could you please rephrase or type "help" to see what I can do?`;
};

/**
 * Build a custom error message
 */
export function buildErrorMessage(context: string, error: string, suggestion?: string): string {
  let message = `I encountered an issue while ${context}: ${error}`;
  if (suggestion) {
    message += `\n\n${suggestion}`;
  }
  return message;
}

/**
 * Build a success message
 */
export function buildSuccessMessage(action: string, details?: string): string {
  let message = `Successfully ${action}`;
  if (details) {
    message += `\n\n${details}`;
  }
  return message;
}

/**
 * Format token amount for display
 */
export function formatTokenAmount(amount: number, symbol: string, decimals: number = 4): string {
  return `${amount.toFixed(decimals)} ${symbol.toUpperCase()}`;
}

/**
 * Format Flow address for display (shorten if needed)
 */
export function formatAddress(address: string, shorten: boolean = false): string {
  if (!shorten || address.length <= 18) {
    return address;
  }
  return `${address.substring(0, 10)}...${address.substring(address.length - 6)}`;
}

/**
 * Get contextual response based on user's previous interaction
 */
export function getContextualResponse(
  previousAction?: string,
  currentAction?: string
): string | null {
  if (!previousAction || !currentAction) {
    return null;
  }

  // If user just checked balance and now wants to swap
  if (previousAction === 'check_balance' && currentAction === 'swap') {
    return `Great! I see you checked your balance. Let me help you build that swap transaction.`;
  }

  // If user just got a price and now wants to swap
  if (previousAction === 'get_price' && currentAction === 'swap') {
    return `Perfect! Now let me build that swap transaction for you.`;
  }

  // If user just checked balance and now wants to transfer
  if (previousAction === 'check_balance' && currentAction === 'transfer') {
    return `I see you have the balance. Let me prepare that transfer for you.`;
  }

  return null;
}

export default {
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
};
