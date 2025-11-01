# FlowSense AI Agent

AI-powered agent for natural language interaction with the Flow blockchain.

## Overview

The FlowSense Agent uses OpenAI GPT-4 to understand user intents and execute blockchain operations. It supports:

- **Balance Checking**: Check token balances (FLOW, USDC, USDT)
- **Price Queries**: Get real-time token prices from IncrementFi DEX via Flow Actions
- **Portfolio View**: View all token holdings with vault status
- **Swap Transactions**: Build swap transactions with price validation
- **Transfer Transactions**: Build transfer transactions with address validation
- **Vault Initialization**: Initialize USDC/USDT vaults for receiving tokens
- **Multi-turn Conversations**: Context loaded from MongoDB for conversation continuity
- **Transaction Preview**: User review and approval before execution

## Architecture

```
agent/
├── core/           # Core agent logic
│   ├── agent.ts          # Main FlowSenseAgent class
│   ├── factory.ts        # Agent factory functions
│   ├── llm-provider.ts   # LLM provider base class
│   ├── providers/        # LLM provider implementations
│   └── context-manager.ts # Conversation context management
├── tools/          # Tool system
│   ├── base-tool.ts      # Base tool class
│   ├── registry.ts       # Tool registry
│   ├── balance-checker.ts
│   ├── price-fetcher.ts
│   ├── portfolio-viewer.ts
│   ├── swap-builder.ts
│   ├── transfer-builder.ts
│   └── vault-initializer.ts  # Vault initialization tool
├── utils/          # Utility functions
│   ├── token-resolver.ts # Token information lookup
│   ├── validation.ts     # Input validation
│   ├── intent-parser.ts  # Tool result parsing
│   ├── cache-manager.ts  # Response caching
│   └── fcl-config.ts     # FCL server-side configuration
├── prompts/        # System prompts
│   ├── system-prompt.ts  # Main system prompt
│   ├── tool-guidelines.ts # Tool usage guidelines
│   └── templates.ts      # Response templates
└── types/          # TypeScript types

```

## Setup

### 1. Install Dependencies

```bash
yarn install
```

### 2. Configure Environment

Add your OpenAI API key to `.env.local`:

```bash
# OpenAI Configuration (for AI Agent)
OPENAI_API_KEY=sk-your-api-key-here
```

Get your API key from: https://platform.openai.com/api-keys

### 3. Build the Project

```bash
yarn build
```

## Usage

### Server-Side (API Routes)

```typescript
import { createAgentFromEnv } from '@/agent';

// Create agent instance
const agent = createAgentFromEnv();

// Process user message
const result = await agent.processMessage(
  'What is my FLOW balance?',
  userWalletAddress,
  undefined, // conversationId (legacy, optional)
  previousMessages // Messages from DB for context (recommended)
);

console.log(result.intent);      // Parsed intent
console.log(result.response);    // Agent's response
console.log(result.conversationId); // For internal tracking
```

### Client-Side (Using API)

```typescript
import { chatAPI } from '@/services/chat-api';

// Process message with agent (context loaded from MongoDB automatically)
const result = await chatAPI.processMessage(
  walletAddress,
  'Swap 5 FLOW for USDC',
  chatId // MongoDB chat ID for conversation context
);

console.log(result.intent);      // { type: 'swap', params: {...}, ... }
console.log(result.response);    // Agent's natural language response
console.log(result.toolCalls);   // Tools that were called

// Transaction preview will be saved with type: 'transaction_preview'
// User can click "Sign Transaction" button to execute
```

## API Endpoint

**POST** `/api/agent/process`

Request:
```json
{
  "message": "What is my FLOW balance?",
  "chatId": "mongodb-object-id" // optional, for conversation context
}
```

Response:
```json
{
  "success": true,
  "data": {
    "intent": {
      "type": "balance",
      "params": { "token": "flow", "balance": 42.5, "symbol": "FLOW" },
      "confidence": 1.0,
      "rawInput": "What is my FLOW balance?"
    },
    "response": "You have 42.5 FLOW in your wallet.",
    "conversationId": "uuid-v4",
    "toolCalls": [
      {
        "tool": "check_balance",
        "params": { "token": "flow" },
        "result": { "token": "flow", "balance": 42.5, "symbol": "FLOW" }
      }
    ]
  }
}
```

## Supported Intents

### Balance Check
```typescript
{
  type: 'balance',
  params: {
    token: 'flow',
    balance: 42.5,
    symbol: 'FLOW',
    name: 'FlowToken'
  }
}
```

### Price Query
```typescript
{
  type: 'price',
  params: {
    tokenFrom: 'flow',
    tokenTo: 'usdc',
    amountIn: 10,
    amountOut: 15.3,
    price: 1.53
  }
}
```

### Portfolio View
```typescript
{
  type: 'portfolio',
  params: {
    balances: [...],
    totalTokens: 3,
    totalValueUSD: 150.0
  }
}
```

### Swap Transaction
```typescript
{
  type: 'swap',
  params: {
    amountIn: '5.0',
    tokenIn: 'flow',
    tokenOut: 'usdc',
    tokenInInfo: {...},
    tokenOutInfo: {...},
    slippage: 1.0
  }
}
```

### Transfer Transaction
```typescript
{
  type: 'transfer',
  params: {
    amount: '10.0',
    token: 'usdc',
    recipient: '0x1234567890abcdef',
    tokenInfo: {...}
  }
}
```

### Vault Initialization
```typescript
{
  type: 'vault_init',
  params: {
    token: 'usdc' // or 'usdt'
  }
}
```

## Supported Tokens

- **FLOW**: Native Flow token
- **USDC**: Stargate-bridged USDC from EVM (stgUSDC)
- **USDT**: Stargate-bridged USDT from EVM (stgUSDT)

All swaps are executed via **Flow Actions** using the IncrementFi DEX connector.

## Configuration

### Agent Configuration

```typescript
import { createFlowSenseAgent } from '@/agent';

const agent = createFlowSenseAgent({
  openaiApiKey: process.env.OPENAI_API_KEY,
  agentConfig: {
    maxIterations: 5,      // Max tool calling loops
    temperature: 0.7,      // LLM temperature
    maxTokens: 1000,       // Max response tokens
    enableCache: true,     // Enable response caching
    cacheTTL: 300000,      // Cache TTL (5 minutes)
  }
});
```

### Custom Tools

```typescript
import { BaseTool, ToolRegistry } from '@/agent';

class CustomTool extends BaseTool {
  definition = {
    name: 'my_custom_tool',
    description: 'Does something custom',
    parameters: [...]
  };

  async execute(params, context) {
    // Your tool logic
    return this.createSuccessResult(data);
  }
}

// Register custom tool
const registry = new ToolRegistry();
registry.register(new CustomTool());
```

## Error Handling

The agent throws specific error types:

- `AgentError`: General agent errors
- `LLMError`: LLM provider errors (API issues, rate limits)
- `ToolError`: Tool execution errors
- `ValidationError`: Input validation errors

```typescript
try {
  const result = await agent.processMessage(message, userAddress);
} catch (error) {
  if (error instanceof LLMError) {
    console.error('LLM error:', error.message);
  } else if (error instanceof ToolError) {
    console.error('Tool error:', error.message);
  }
}
```

## Caching

The agent includes built-in caching for:

- **Balance queries**: 30 seconds TTL
- **Price queries**: 60 seconds TTL
- **LLM responses**: 5 minutes TTL
- **Portfolio data**: 60 seconds TTL

**Note**: Conversation context is loaded from MongoDB, not cached in memory.

```typescript
import { balanceCache, priceCache } from '@/agent';

// Clear specific cache
balanceCache.clear();

// Get cache stats
const stats = priceCache.getStats();
console.log(stats.hitRate); // Cache hit rate percentage
```

## Development

### Adding New Tools

1. Create tool class extending `BaseTool`
2. Define tool definition (name, description, parameters)
3. Implement `execute()` method
4. Register in factory or manually

### Testing

```bash
# Run tests (Phase 6)
yarn test

# Type checking
yarn type-check

# Build
yarn build
```

## Limitations

1. **Network**: Currently configured for Flow Mainnet
2. **Supported Tokens**: Only FLOW, USDC (stgUSDC), USDT (stgUSDT)
3. **DEX**: Only IncrementFi swaps via Flow Actions
4. **Rate Limits**: Subject to OpenAI API rate limits
5. **Serverless Timeout**: Subject to platform timeout limits
6. **Vault Setup**: USDC/USDT require vault initialization before first use

## Features

### ✅ Implemented
- [x] Multi-turn conversations with MongoDB persistence
- [x] Transaction preview with user approval
- [x] Vault initialization for EVM-bridged tokens
- [x] Flow Actions integration (IncrementFi connector)
- [x] Balance, price, and portfolio queries
- [x] Swap and transfer transaction building
- [x] Server-side FCL configuration
- [x] Transaction state management (ready/processing/success/failed/expired)
- [x] Error handling and graceful retries
- [x] Response caching

## License

MIT
