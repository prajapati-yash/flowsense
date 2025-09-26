# FlowSense - Flow Actions AI Platform

🚀 **One Sentence. Atomic Execution.**

FlowSense transforms blockchain interaction by letting users execute complex DeFi workflows through natural language commands like *"Use my claimed $ACTION tokens to buy $FLOW and stake it"* - no coding, wallet complexity, or Flow knowledge required.

## 🧠 How It Works

Our AI agent intelligently:
1. **Parses** user intents from natural language
2. **Discovers** and chains together Flow Actions (`ClaimRewards` → `SwapToken` → `StakeToken`)
3. **Generates** a single atomic Cadence transaction for seamless execution

## ✨ Features

- 🤖 **AI-Powered Intent Recognition** - Natural language to blockchain actions
- ⚡ **Atomic Execution** - Complex workflows in single transactions
- 🔗 **Action Chaining** - Intelligent workflow composition
- 🛡️ **Secure & Trustless** - No custodial risk, direct blockchain execution
- 🌐 **Flow Ecosystem** - Native integration with Flow blockchain
- 💎 **No-Code DeFi** - Accessible to everyone, no technical knowledge required

## 🎯 Example Use Cases

```
"Claim my staking rewards and swap them for USDC"
→ ClaimRewards → SwapToken

"Use 100 FLOW to provide liquidity on the FLOW/USDC pool"
→ SwapToken → AddLiquidity

"Stake all my FLOW tokens for maximum yield"
→ GetBalance → StakeToken

"Harvest my farming rewards and compound them back"
→ HarvestRewards → SwapToken → AddLiquidity
```

## Supported Wallets

- **Blocto** - Web and mobile wallet
- **Lilico** - Browser extension wallet
- **Ledger** - Hardware wallet
- **Flow Wallet** - Official Flow wallet
- **Dapper Wallet** - Gaming-focused wallet
- **NuFi** - Multi-chain wallet

## Quick Start

1. **Install dependencies:**
   ```bash
   yarn install
   ```

2. **Configure environment:**
   - Copy `.env.local` and update network settings
   - Default is testnet, change to mainnet by uncommenting mainnet variables

3. **Start development server:**
   ```bash
   yarn dev
   ```

4. **Build for production:**
   ```bash
   yarn build
   ```

## Environment Configuration

The app uses environment variables for network configuration:

```env
# Testnet (Default)
NEXT_PUBLIC_FLOW_NETWORK=testnet
NEXT_PUBLIC_FLOW_ACCESS_NODE=https://rest-testnet.onflow.org
NEXT_PUBLIC_FLOW_DISCOVERY_WALLET=https://fcl-discovery.onflow.org/testnet/authn
NEXT_PUBLIC_FLOW_DISCOVERY_AUTHN=https://fcl-discovery.onflow.org/api/testnet/authn

# Mainnet (Uncomment to use)
# NEXT_PUBLIC_FLOW_NETWORK=mainnet
# NEXT_PUBLIC_FLOW_ACCESS_NODE=https://rest-mainnet.onflow.org
# NEXT_PUBLIC_FLOW_DISCOVERY_WALLET=https://fcl-discovery.onflow.org/authn
# NEXT_PUBLIC_FLOW_DISCOVERY_AUTHN=https://fcl-discovery.onflow.org/api/authn
```

## Project Structure

```
src/
├── Components/
│   ├── Header/              # Navigation with wallet controls
│   ├── HeroPage/           # Main landing page
│   ├── NetworkSwitcher/    # Network selection component
│   ├── Providers/          # Flow provider setup
│   └── WalletConnection/   # Wallet connection logic
├── lib/
│   └── flow-config.ts      # Flow network configuration
├── types/
│   └── flow.ts            # TypeScript definitions
└── app/
    ├── layout.tsx         # Root layout with providers
    └── page.tsx          # Main page
```

## Network Configuration

The app supports three networks:

- **Testnet** - For development and testing
- **Mainnet** - For production use
- **Local** - For local development with Flow emulator

Switch networks using the NetworkSwitcher component or by updating environment variables.

## Usage

1. **Connect Wallet:** Click "Connect Wallet" to authenticate with your preferred Flow wallet
2. **Switch Networks:** Use the network selector to switch between testnet/mainnet
3. **View Connection:** See your connected address and connection status

## Dependencies

- `@onflow/fcl` - Flow Client Library
- `@onflow/react-sdk` - React hooks for Flow
- `@onflow/types` - Flow type definitions
- `next` - Next.js framework
- `react` - React library
- `tailwindcss` - CSS framework

## Development

The application uses:
- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **CSS Modules** for component styles
- **Dynamic imports** for SSR compatibility

Built with ❤️ by [@yashonchainx](https://x.com/yashonchainx) and [@hiralvala563](https://x.com/hiralvala563) for the Flow ecosystem.
