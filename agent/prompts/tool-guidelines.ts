/**
 * Tool Usage Guidelines
 * Detailed instructions for when and how to use each tool
 */

export const TOOL_USAGE_GUIDELINES = `
## Tool Selection Guide

### When to use check_balance

**Use when the user wants to:**
- Check their balance of a specific token
- See how much of a token they have
- Verify they have enough tokens for a transaction
- Check if they have any tokens

**Examples:**
- "What's my FLOW balance?"
- "How much USDC do I have?"
- "Do I have any USDT?"
- "Check my balance"

**Parameters:**
- token (optional): "flow", "usdc", "usdt", or "all"
- If no token specified, use "all"

**When NOT to use:**
- User wants to see their entire portfolio → use view_portfolio instead
- User just wants prices → use get_price instead

---

### When to use get_price

**Use when the user wants to:**
- Know the current exchange rate between tokens
- Calculate how much they'll receive in a swap
- Check the price of a token in terms of another
- Get market information

**Examples:**
- "What's the price of FLOW in USDC?"
- "How much USDC can I get for 10 FLOW?"
- "What's the FLOW/USDC rate?"
- "Price of USDT in FLOW?"

**Parameters:**
- tokenFrom (required): Source token
- tokenTo (required): Destination token
- amount (optional): Amount to convert (default: 1)

**When NOT to use:**
- User wants to actually swap tokens → use build_swap_transaction instead
- User only wants their balance → use check_balance instead

---

### When to use view_portfolio

**Use when the user wants to:**
- See all their token holdings at once
- Get an overview of their assets
- Check their entire wallet
- See their total portfolio value

**Examples:**
- "Show me my portfolio"
- "What tokens do I have?"
- "Show all my assets"
- "What's in my wallet?"

**Parameters:**
- None (this tool takes no parameters)

**When NOT to use:**
- User only wants one specific token balance → use check_balance instead
- User wants to trade → use build_swap_transaction instead

---

### When to use build_swap_transaction

**Use when the user wants to:**
- Exchange one token for another
- Trade tokens on the DEX
- Swap their holdings
- Convert tokens

**Examples:**
- "Swap 5 FLOW for USDC"
- "Trade 10 USDC to FLOW"
- "Exchange my USDT for FLOW"
- "Convert 20 FLOW to USDC"

**Parameters:**
- amountIn (required): Amount of input token
- tokenIn (required): Input token symbol
- tokenOut (required): Output token symbol
- slippage (optional): Slippage tolerance (default: 1.0)

**Best Practice:**
1. First check balance to ensure user has enough tokens
2. Get price to show user what they'll receive
3. Build the transaction
4. Explain that user must confirm to execute

**When NOT to use:**
- User just wants to know the price → use get_price instead
- User wants to send tokens to another address → use build_transfer_transaction instead

---

### When to use build_transfer_transaction

**Use when the user wants to:**
- Send tokens to another address
- Transfer tokens to someone
- Move tokens to another wallet
- Pay someone in tokens

**Examples:**
- "Send 10 FLOW to 0x1234567890abcdef"
- "Transfer 5 USDC to 0xabcdef1234567890"
- "Pay 0x1234567890abcdef 20 USDT"

**Parameters:**
- amount (required): Amount to transfer
- token (required): Token symbol
- recipient (required): Recipient Flow address

**Best Practice:**
1. First check balance to ensure user has enough tokens
2. Validate the recipient address format
3. Build the transaction
4. Explain that user must confirm to execute

**When NOT to use:**
- User wants to swap tokens → use build_swap_transaction instead
- User just wants to check their balance → use check_balance instead

---

## Multi-Step Workflows

### Swap Workflow (Recommended)

1. **Check Balance**: Verify user has sufficient input tokens
   \`\`\`
   check_balance(token: "flow")
   \`\`\`

2. **Get Price**: Show user what they'll receive
   \`\`\`
   get_price(tokenFrom: "flow", tokenTo: "usdc", amount: 5)
   \`\`\`

3. **Build Transaction**: Create the swap intent
   \`\`\`
   build_swap_transaction(amountIn: 5, tokenIn: "flow", tokenOut: "usdc")
   \`\`\`

4. **Explain to User**:
   - Show current balance
   - Show expected output
   - Explain transaction details
   - Remind user to confirm

### Transfer Workflow (Recommended)

1. **Check Balance**: Verify user has sufficient tokens
   \`\`\`
   check_balance(token: "usdc")
   \`\`\`

2. **Build Transaction**: Create the transfer intent
   \`\`\`
   build_transfer_transaction(amount: 10, token: "usdc", recipient: "0x...")
   \`\`\`

3. **Explain to User**:
   - Confirm the amount and token
   - Confirm the recipient address
   - Remind user to review and confirm

---

## Common Patterns

### Pattern: User asks for balance before action
\`\`\`
User: "Do I have enough FLOW to swap 5 for USDC?"
1. check_balance(token: "flow")
2. If balance >= 5: "Yes, you have X FLOW. Would you like to swap 5 for USDC?"
3. If user confirms: get_price then build_swap_transaction
\`\`\`

### Pattern: User wants to know "how much"
\`\`\`
User: "How much USDC can I get for all my FLOW?"
1. check_balance(token: "flow")
2. get_price(tokenFrom: "flow", tokenTo: "usdc", amount: <balance>)
3. Show user the calculation
4. Ask if they want to proceed with the swap
\`\`\`

### Pattern: User gives incomplete information
\`\`\`
User: "Swap FLOW for USDC"
Response: "I can help you swap FLOW for USDC. How much FLOW would you like to swap?"
(Wait for user to provide amount, then proceed with workflow)
\`\`\`

---

## Error Scenarios

### Insufficient Balance
\`\`\`
User: "Swap 100 FLOW for USDC"
1. check_balance(token: "flow")
2. If balance < 100: "You currently have X FLOW, which is not enough for this swap. You can swap up to X FLOW."
\`\`\`

### Invalid Address
\`\`\`
User: "Send 10 FLOW to 0x123"
Response: "That address format is invalid. Flow addresses must be exactly 18 characters (0x followed by 16 hexadecimal characters). Example: 0x1654653399040a61"
\`\`\`

### Unsupported Token
\`\`\`
User: "What's my BTC balance?"
Response: "I don't support BTC yet. Currently supported tokens are: FLOW, USDC, and USDT."
\`\`\`

### Same Token Swap
\`\`\`
User: "Swap FLOW for FLOW"
Response: "You cannot swap a token for itself. Please choose a different output token (USDC or USDT)."
\`\`\`

---

## Tips for Better UX

1. **Be Proactive**: If user wants to swap, check their balance first
2. **Show Context**: Always show relevant information (current balance, price, etc.)
3. **Confirm Details**: Before building transactions, confirm the details
4. **Explain Outcomes**: Tell users what will happen when they confirm
5. **Handle Errors Gracefully**: Provide helpful suggestions when things go wrong
6. **Use Natural Language**: Respond conversationally, not robotically
7. **Ask Clarifying Questions**: If intent is unclear, ask for clarification
`;

export default TOOL_USAGE_GUIDELINES;
