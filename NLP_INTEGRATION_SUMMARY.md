# NLP Integration Summary

## Overview

FlowSense now includes a complete Natural Language Processing (NLP) system that allows users to interact with the Flow blockchain using natural language commands instead of complex transaction interfaces.

---

## What Was Implemented

### 1. NLP Parser Service (`src/services/nlp-parser.ts`)

**Purpose:** Parse natural language input into structured transaction intents

**Features:**
- ✅ Swap detection: "swap 10 FLOW to USDC"
- ✅ Transfer detection: "send 5 FLOW to 0x..."
- ✅ Balance check: "check my FLOW balance"
- ✅ Multiple pattern matching for flexible input
- ✅ Token validation and normalization

**Supported Tokens:**
- FLOW (FlowToken)
- USDC (FiatToken)
- FUSD
- USDT (TeleportedTetherToken)

**Example Usage:**
```typescript
import { nlpParser } from "@/services/nlp-parser";

const intent = nlpParser.parse("swap 10 FLOW to USDC");
// Returns:
// {
//   type: 'swap',
//   params: {
//     amountIn: '10',
//     tokenIn: 'flow',
//     tokenOut: 'usdc',
//     tokenInInfo: { name: 'FlowToken', address: '0x...', path: '...' },
//     tokenOutInfo: { name: 'FiatToken', address: '0x...', path: '...' }
//   },
//   confidence: 0.9,
//   rawInput: 'swap 10 FLOW to USDC'
// }
```

### 2. Transaction Router Service (`src/services/transaction-router.ts`)

**Purpose:** Convert parsed intents into executable Cadence transactions

**Features:**
- ✅ Swap transaction generation
- ✅ Transfer transaction generation
- ✅ Balance check script generation
- ✅ Transaction result formatting
- ✅ Error message formatting
- ✅ Gas estimation

**Example Transactions:**
- **Swap:** Generic swap transaction (ready for DEX integration)
- **Transfer:** FLOW token transfer between addresses
- **Balance:** Read-only script to check token balances

**Example Usage:**
```typescript
import { transactionRouter } from "@/services/transaction-router";

const intent = nlpParser.parse("swap 10 FLOW to USDC");
const plan = transactionRouter.routeToTransaction(intent, userAddress);
// Returns:
// {
//   cadence: '... transaction code ...',
//   args: [/* FCL formatted args */],
//   description: 'Swap 10 FLOW to USDC',
//   estimatedGas: '0.001 FLOW'
// }
```

### 3. Updated GetStartedMain Chat Interface

**Changes:**
- ✅ Integrated NLP parser for all user messages
- ✅ Smart intent detection with helpful error messages
- ✅ Transaction preview before execution
- ✅ Formatted transaction results
- ✅ Balance check support
- ✅ Updated welcome messages to guide users

**User Flow:**
1. User types: "swap 10 FLOW to USDC"
2. NLP parser identifies swap intent
3. Transaction router creates swap transaction
4. Chat shows transaction preview
5. Wallet popup appears for approval
6. Transaction executes on blockchain
7. Chat shows formatted result with transaction ID and Flowscan link

---

## How to Use

### Example Commands

#### Swap Tokens
```
swap 10 FLOW to USDC
exchange 5 USDC for FLOW
convert 100 FLOW to USDT
trade 20 FLOW for USDC
```

#### Transfer Tokens
```
send 10 FLOW to 0x1234567890abcdef
transfer 5 USDC to 0xabcdef1234567890
pay 1 FLOW to 0x1234567890abcdef
```

#### Check Balance
```
check balance
check my FLOW balance
show my USDC balance
what's my balance
balance of USDC
```

### Unknown Commands

If the NLP parser doesn't understand a command, it will respond with:
- Helpful examples
- List of supported commands
- List of supported tokens

---

## Architecture Flow

```
User Input
    ↓
NLP Parser (nlp-parser.ts)
    ↓
Parsed Intent { type, params, confidence }
    ↓
Transaction Router (transaction-router.ts)
    ↓
Transaction Plan { cadence, args, description }
    ↓
FCL Execution (useFlowTransaction hook)
    ↓
Blockchain Result
    ↓
Formatted Message in Chat
```

---

## Testing the Integration

### 1. Start the Application

```bash
npm run dev
```

### 2. Connect Your Wallet

1. Navigate to http://localhost:3000/chat
2. Click "Connect Wallet" button
3. Approve connection in Flow wallet

### 3. Test Commands

**Test 1: Balance Check (No transaction)**
```
Type: "check my FLOW balance"
Expected: Shows your FLOW balance (no wallet popup needed)
```

**Test 2: Unknown Command**
```
Type: "hello"
Expected: Shows help message with supported commands
```

**Test 3: Swap (Transaction)**
```
Type: "swap 1 FLOW to USDC"
Expected:
1. Shows transaction preview
2. Wallet popup appears
3. After approval, shows transaction result
```

**Test 4: Transfer (Transaction)**
```
Type: "send 0.1 FLOW to 0x1234567890abcdef"
Expected:
1. Shows transaction preview
2. Wallet popup appears
3. After approval, shows transfer confirmation
```

---

## Current Limitations

### 1. Swap Implementation
- Currently uses a **generic swap transaction** placeholder
- Ready for DEX integration (IncrementFi, BloctoSwap, etc.)
- Requires actual DEX contract addresses and swap logic

### 2. Token Support
- Limited to 4 tokens: FLOW, USDC, FUSD, USDT
- Easy to add more tokens in `nlpParser` TOKEN_MAP

### 3. Transfer Support
- Currently only supports FLOW token transfers
- Other token transfers need specific transaction code

### 4. Network Support
- Configured for testnet by default
- Contract addresses may need updating for mainnet

---

## Next Steps to Complete Integration

### Phase 1: Real DEX Integration

Update `transaction-router.ts` with real swap transaction:

```typescript
// Replace GENERIC_SWAP_TRANSACTION with IncrementFi integration
const SWAP_TRANSACTION = `
import SwapRouter from 0xb063c16cac85dbd1
// ... real swap logic
`;
```

**Resources:**
- IncrementFi Docs: https://docs.increment.fi/
- BloctoSwap Docs: https://docs.blocto.app/blocto-sdk/flow/swap

### Phase 2: Add More Tokens

Update `TOKEN_MAP` in `nlp-parser.ts`:

```typescript
const TOKEN_MAP = {
  // ... existing tokens
  'btc': {
    name: 'tBTC',
    address: '0x...',
    path: '/storage/tBTCVault'
  },
  // Add more tokens
};
```

### Phase 3: Enhanced NLP Patterns

Add more sophisticated pattern matching:
- Amount ranges: "swap between 10 and 20 FLOW"
- Slippage tolerance: "swap 10 FLOW to USDC with 1% slippage"
- Deadline: "swap 10 FLOW to USDC within 10 minutes"

### Phase 4: Transaction History

Add transaction history viewing:
- "show my transaction history"
- "show last 10 transactions"
- "show all swaps"

---

## File Structure

```
flowsense/
├── src/
│   ├── services/
│   │   ├── nlp-parser.ts           ✅ NEW - NLP parsing logic
│   │   ├── transaction-router.ts   ✅ NEW - Transaction routing
│   │   ├── flow-transactions.ts    ✅ EXISTS - Transaction helpers
│   │   └── chat-api.ts             ✅ UPDATED - Wallet address support
│   ├── hooks/
│   │   ├── useWallet.ts            ✅ NEW - Wallet connection
│   │   └── useFlowTransaction.ts   ✅ NEW - Transaction execution
│   ├── Components/
│   │   ├── GetStarted/
│   │   │   └── GetStartedMain.tsx  ✅ UPDATED - NLP integration
│   │   ├── WalletConnection/
│   │   │   └── WalletButton.tsx    ✅ NEW - Wallet button
│   │   └── NetworkSwitcher/
│   │       └── NetworkSwitcher.tsx ✅ NEW - Network display
│   └── lib/
│       └── flow-config.ts          ✅ NEW - FCL configuration
└── docs/
    ├── FLOW_WALLET_INTEGRATION_ROADMAP.md  ✅ Complete integration guide
    └── NLP_INTEGRATION_SUMMARY.md          ✅ THIS FILE
```

---

## Key Technical Decisions

### 1. User Gesture Chain Preservation
- All wallet operations called directly from user interactions
- No state updates between user click and FCL call
- Prevents popup blocking issues

### 2. Database-First Architecture
- All messages saved to MongoDB first
- Reduces in-memory state complexity
- Enables chat history and multi-device support

### 3. Intelligent Error Handling
- Non-blocking toast notifications
- Helpful error messages
- Transaction-specific troubleshooting

### 4. Extensible Design
- Easy to add new transaction types
- Easy to add new tokens
- Easy to add new NLP patterns

---

## Troubleshooting

### Issue: NLP not parsing command

**Check:**
1. Is the command format correct? (see examples above)
2. Is the token supported? (check TOKEN_MAP)
3. Is the amount a valid number?

**Solution:** Type "help" to see supported commands

### Issue: Transaction fails

**Check:**
1. Is wallet connected?
2. Is balance sufficient?
3. Is correct network selected? (testnet/mainnet)
4. Are contract addresses correct for network?

**Solution:** Check error message in chat for specific issue

### Issue: Wallet popup not appearing

**Check:**
1. Is popup blocker disabled?
2. Is action triggered directly from user click?
3. Is FCL properly configured?

**Solution:** Check browser console for errors

---

## Summary

✅ **Completed:**
- NLP parser with swap, transfer, and balance support
- Transaction router with Cadence transaction generation
- Chat interface with intelligent command processing
- Wallet integration with proper gesture chain handling
- Comprehensive error handling and user feedback

🔨 **Next Steps:**
- Integrate with real DEX (IncrementFi/BloctoSwap)
- Add more token support
- Enhance NLP patterns
- Add transaction history viewing

📖 **Documentation:**
- Complete roadmap: `FLOW_WALLET_INTEGRATION_ROADMAP.md`
- This summary: `NLP_INTEGRATION_SUMMARY.md`

---

**Created:** 2025-10-08
**Version:** 1.0
