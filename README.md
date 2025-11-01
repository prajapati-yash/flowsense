# FlowSense - AI-Powered Blockchain Automation Platform

🚀 **One Sentence. Atomic Execution.**

**🌐 Live Platform: [https://flowsense-mvp.vercel.app](https://flowsense-mvp.vercel.app)**

FlowSense is an AI-driven blockchain platform built natively for the Flow ecosystem, bridging natural language interaction with automated cryptocurrency operations. Transform complex Flow DeFi workflows into simple human expressions like *"Send 100 FLOW to Alice tomorrow at 10:00 PM"* or *"Use my claimed rewards to buy and stake more tokens"*.

## 🎯 What FlowSense Achieves

FlowSense demonstrates the future of blockchain interaction where AI agents can discover, understand, and execute complex blockchain operations through natural language interfaces.

### ✨ Core Capabilities

- **🔍 Intelligent Discovery**: AI agents can discover available Flow blockchain actions dynamically
- **🧠 Natural Language Processing**: Convert user intents into structured Flow operations
- **⚡ Flexible Execution**: Support both immediate transfers and scheduled operations on Flow
- **💰 Real Asset Movement**: Actual FLOW token transfers with Flow's comprehensive validation
- **🔗 Composable Actions**: Modular framework leveraging Flow's resource-oriented programming
- **📊 Advanced Analytics**: Complete user statistics, intent tracking, and execution history

## 🏗️ Architecture

### Smart Contracts (Cadence)

```
cadence/
├── contracts/
│   └── FlowSenseActionsFinal.cdc     # Main Flow Actions contract
├── scripts/
│   ├── discover_actions_final.cdc    # AI action discovery
│   ├── search_actions.cdc            # Keyword-based action search
│   ├── get_user_stats.cdc           # User analytics
│   └── get_user_intents_final.cdc   # Intent history queries
└── transactions/
    ├── submit_intent_final.cdc      # AI-powered transaction execution
    └── immediate_transfer.cdc       # Direct FLOW transfers
```

### Frontend (Next.js)

```
src/
├── Components/
│   ├── Header/              # Navigation with wallet controls
│   ├── HeroPage/           # Main AI interaction interface
│   ├── NetworkSwitcher/    # Network selection component
│   ├── Providers/          # Flow provider setup
│   └── WalletConnection/   # Multi-wallet support
├── lib/
│   └── flow-config.ts      # Flow network configuration
└── types/
    └── flow.ts            # TypeScript definitions
```

## 🧠 How It Works

### 1. **AI Discovery Phase**
```typescript
// AI agent discovers available actions
const actions = await fcl.query({
  cadence: `${discover_actions_final}`,
  args: [fcl.arg(null, t.Optional(t.String))]
})
// Returns: Available actions like "Smart FLOW Transfer"
```

### 2. **Intent Processing Phase**
```typescript
// User: "Send 100 FLOW to Alice for dinner"
// AI processes natural language and extracts:
{
  intent: "Send 100 FLOW to Alice for dinner",
  action: "transfer",
  amount: 100.0,
  recipient: "0xa1f95a488eb7e202",
  timing: "immediate"
}
```

### 3. **Execution Phase**
```typescript
// AI submits structured transaction
const txId = await fcl.mutate({
  cadence: `${submit_intent_final}`,
  args: [
    fcl.arg("Send 100 FLOW to Alice for dinner", t.String),
    fcl.arg("0xa1f95a488eb7e202", t.Address),
    fcl.arg("100.0", t.UFix64),
    fcl.arg(executeAt, t.UFix64)
  ]
})
```

## ✨ Features

### Core Capabilities
- 🤖 **AI-Powered Intent Recognition** - Natural language to Flow blockchain actions
- ⚡ **Dual Execution Modes** - Immediate (≤5s) vs Scheduled (>5s) execution on Flow
- 🔗 **Action Chaining** - Intelligent workflow composition leveraging Flow's capabilities
- 🛡️ **Comprehensive Validation** - Flow-native balance checks, receiver verification, timing validation
- 🌐 **Flow Ecosystem Native** - Built specifically for Flow blockchain and Cadence smart contracts
- 💎 **No-Code Flow DeFi** - Making Flow DeFi accessible to everyone, no technical knowledge required

### Advanced Features
- 📊 **User Analytics** - Track intents, execution history, and statistics
- 🔍 **Action Discovery** - AI agents can learn available capabilities dynamically
- 🕐 **Flexible Timing** - "now", "5 minutes", "1 hour", "tomorrow" timing support
- 💰 **Real Token Movement** - Actual FLOW transfers with event emission
- 🎯 **Error Handling** - Graceful failure with detailed error messages

## 🎯 Example Use Cases

### Immediate Transfers
```
"Send 50 FLOW to 0x123"
→ Immediate execution via FlowSenseActionsFinal

"Transfer 1000 FLOW to 0x987"
→ Instant FLOW movement with validation
```

### Scheduled Operations
```
"Send 100 FLOW to 0x12 tomorrow"
→ Scheduled execution for future timestamp

"Transfer 50 FLOW on the 1st of next month"
→ Scheduled transfer with specific timing
```

### Future Composable Actions
```
"Claim my staking rewards and swap them for USDC"
→ ClaimRewards → SwapToken (Phase 2)

"Use 100 FLOW to provide liquidity on DEX"
→ SwapToken → AddLiquidity (Phase 2)

"Harvest farming rewards and compound them"
→ HarvestRewards → SwapToken → AddLiquidity (Phase 2)
```

## 🚀 Deployment Status

### Testnet Deployment ✅
- **Contract Address**: `0x9c23faae746705fe`
- **Network**: Flow Testnet
- **Block Explorer**: [View on FlowScan](https://testnet.flowscan.io/account/0x9c23faae746705fe)
- **Status**: Fully deployed and tested
- **Transactions Executed**: 4+ successful test transfers

### Test Results
- ✅ AI action discovery working
- ✅ Natural language intent processing
- ✅ Immediate FLOW transfers (10,000 FLOW test successful)
- ✅ Scheduled transfer creation
- ✅ User analytics and tracking
- ✅ Comprehensive error handling

## 🛠️ Quick Start

### Prerequisites
- Node.js 18+
- Flow CLI
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd flowsense
   ```

2. **Install dependencies:**
   ```bash
   yarn install
   ```

3. **Configure Flow (for contract deployment):**
   ```bash
   # Copy example flow configuration
   cp flow.json.example flow.json
   # Update with your testnet account details
   ```

4. **Configure environment:**
   ```bash
   # Copy environment file
   cp .env.local.example .env.local
   # Update network settings as needed
   ```

5. **Start development server:**
   ```bash
   yarn dev
   ```

### Contract Deployment

```bash
# Deploy to testnet
flow project deploy --network testnet

# Test the deployment
flow scripts execute cadence/scripts/discover_actions_final.cdc --network testnet --args-json '[{"type": "Optional", "value": null}]'
```

## 🧪 Testing the AI System

### 1. Action Discovery
```bash
flow scripts execute cadence/scripts/discover_actions_final.cdc \
  --network testnet \
  --args-json '[{"type": "Optional", "value": {"type": "String", "value": "DeFi"}}]'
```

### 2. Execute Transfer
```bash
flow transactions send cadence/transactions/submit_intent_final.cdc \
  --network testnet \
  --signer testnet-account \
  --args-json '[
    {"type": "String", "value": "Send 1 FLOW to friend"},
    {"type": "Address", "value": "0x7e60df042a9c0868"},
    {"type": "UFix64", "value": "1.0"},
    {"type": "UFix64", "value": "9999999999.0"}
  ]'
```

### 3. Check User Stats
```bash
flow scripts execute cadence/scripts/get_user_stats.cdc \
  --network testnet \
  --args-json '[{"type": "Address", "value": "YOUR_ADDRESS"}]'
```

## 📋 Supported Wallets

- **Blocto** - Web and mobile wallet
- **Lilico** - Browser extension wallet
- **Ledger** - Hardware wallet
- **Flow Wallet** - Official Flow wallet
- **Dapper Wallet** - Gaming-focused wallet
- **NuFi** - Multi-chain wallet

## 🔮 Future Roadmap

### Advanced DeFi & Cross-Protocol Workflows
- Token swaps, lending, staking, liquidity management, and DAO governance  
- Workflow automation with multi-action chaining, conditional execution, and portfolio strategies (stop-loss, take-profit, rebalancing)  

### AI-Powered Enhancements
- Natural language and voice interfaces for complex multi-step instructions  
- Predictive analytics, AI-suggested optimizations, and real-time market intelligence  

### Ecosystem Expansion
- Cross-chain support (Ethereum, Bitcoin, others) with DeFi aggregation for best execution  
- NFT collection management and trading  
- Social trading with copyable strategies  

## 🏆 Innovation & Impact

FlowSense represents the next evolution of blockchain interaction:

1. **Discovery**: AI agents can dynamically find available blockchain actions
2. **Composition**: Natural language creates complex automated workflows
3. **Execution**: Atomic transactions with comprehensive validation and error handling
4. **Extensibility**: Modular framework designed for easy addition of new action types
5. **User Experience**: No-code DeFi that makes blockchain accessible to everyone

**FlowSense serves as the foundation for mainstream blockchain adoption through AI-powered automation.**

## 🙏 Acknowledgments

- **Flow Blockchain** - For the innovative blockchain infrastructure and developer tools
- **Flow Community** - For feedback and support during development
- **AI Research Community** - For natural language processing insights and research

## 📞 Contact

- **Twitter**: [@yashonchainx](https://x.com/yashonchainx) | [@hiralvala563](https://x.com/hiralvala563)
- **Email**: [Contact through GitHub Issues]

---

Built with ❤️ by the FlowSense team for the future of AI-driven DeFi and mainstream blockchain adoption.

**FlowSense: Where Natural Language Meets Blockchain Automation** 🚀