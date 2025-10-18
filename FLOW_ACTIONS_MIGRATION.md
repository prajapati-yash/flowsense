# Flow Actions Migration Guide

## Overview

FlowSense now uses **Flow Actions** - a standardized framework for composable DeFi workflows. This replaces the previous direct IncrementFi integration with a modular, protocol-agnostic architecture.

## What Changed?

### Before: Direct Integration ❌
```
User Input → NLP Parser → Direct IncrementFi Transaction → Blockchain
```
- Tightly coupled to IncrementFi
- Hard to switch DEXs
- Protocol-specific code

### After: Flow Actions Architecture ✅
```
User Input → NLP Parser → Flow Actions Swapper → Connector → DEX → Blockchain
```
- Protocol-agnostic interfaces
- Easy to add new DEXs
- Composable workflows

---

## Architecture

### Flow Actions Interfaces (`FlowActionsInterfaces.cdc`)

Standardized interfaces for DeFi primitives:

1. **Source** - Provides tokens (vault withdrawal, rewards claiming)
2. **Sink** - Accepts tokens (vault deposits with capacity limits)
3. **Swapper** - Exchanges tokens (DEX trades, bridges)
4. **PriceOracle** - Provides price data
5. **Flasher** - Issues flash loans

### Connectors

Bridge Flow Actions interfaces to specific protocols:

- **IncrementFiConnector** - Implements Swapper for IncrementFi DEX
- **Future**: BloctoSwapConnector, MatrixMarketConnector, etc.

### Transaction Flow

```cadence
// 1. Setup swapper (one-time)
IncrementFiConnector.setupSwapper(account: signer)

// 2. Borrow Swapper interface
let swapper = signer.capabilities.borrow<&{FlowActionsInterfaces.Swapper}>(...)

// 3. Get quote (optional, for slippage)
let quote = swapper.getQuote(tokenIn, tokenOut, amountIn)

// 4. Execute swap via interface
let outputVault <- swapper.swap(
    vaultIn: <-inputVault,
    tokenOutType: Type<@USDC.Vault>(),
    amountOutMin: minOutput
)
```

---

## File Structure

```
flowsense/
├── cadence/
│   ├── contracts/
│   │   ├── FlowActionsInterfaces.cdc          ✅ NEW - Core interfaces
│   │   └── connectors/
│   │       └── IncrementFiConnector.cdc       ✅ NEW - IncrementFi bridge
│   ├── transactions/
│   │   ├── swap_with_flow_actions.cdc         ✅ NEW - Flow Actions swap
│   │   ├── swap_generic.cdc                   ⚠️  DEPRECATED
│   │   └── swap_incrementfi.cdc               ⚠️  DEPRECATED
│   └── scripts/
│       └── get_swap_quote.cdc                 ✅ NEW - Get quotes
└── src/
    └── services/
        └── transaction-router.ts              ✅ UPDATED - Uses Flow Actions
```

---

## Benefits

### 1. Protocol Agnostic
```typescript
// Easy to switch DEXs - just change the connector!
// IncrementFiConnector → BloctoSwapConnector
```

### 2. Composable Workflows
```cadence
// Example: Claim rewards → Swap → Stake (future)
let source: &{FlowActionsInterfaces.Source} = ...
let swapper: &{FlowActionsInterfaces.Swapper} = ...
let sink: &{FlowActionsInterfaces.Sink} = ...

let rewards <- source.withdraw(tokenType: Type<@FlowToken.Vault>(), amount: 100.0)
let usdc <- swapper.swap(vaultIn: <-rewards, tokenOutType: Type<@USDC.Vault>(), ...)
sink.deposit(vault: <-usdc)
```

### 3. Standardized Interface
```cadence
// All swappers implement the same interface
access(all) resource interface Swapper {
    access(all) fun getQuote(...): UFix64
    access(all) fun swap(...): @{FungibleToken.Vault}
    access(all) fun canSwap(...): Bool
}
```

### 4. Easy Testing
```cadence
// Mock swapper for testing
access(all) resource MockSwapper: FlowActionsInterfaces.Swapper {
    // Return fixed quotes for testing
    access(all) fun getQuote(...): UFix64 {
        return 100.0 // Mock quote
    }
}
```

---

## How to Use

### 1. Deploy Contracts

Update your `flow.json`:

```json
{
  "contracts": {
    "FlowActionsInterfaces": {
      "source": "./cadence/contracts/FlowActionsInterfaces.cdc",
      "aliases": {
        "testnet": "0xYOUR_ADDRESS",
        "mainnet": "0xYOUR_ADDRESS"
      }
    },
    "IncrementFiConnector": {
      "source": "./cadence/contracts/connectors/IncrementFiConnector.cdc",
      "aliases": {
        "testnet": "0xYOUR_ADDRESS",
        "mainnet": "0xYOUR_ADDRESS"
      }
    }
  }
}
```

Deploy:
```bash
flow project deploy --network testnet
```

### 2. Update Contract Addresses

In `transaction-router.ts`, update the import addresses:

```typescript
const FLOW_ACTIONS_SWAP_TRANSACTION = `
import FlowActionsInterfaces from 0xYOUR_DEPLOYED_ADDRESS
import IncrementFiConnector from 0xYOUR_DEPLOYED_ADDRESS
...
`;
```

### 3. Test Swap

```bash
# Natural language
"swap 10 FLOW to USDC"

# Or via script
flow scripts execute cadence/scripts/get_swap_quote.cdc \
  --args-json '[
    {"type": "Address", "value": "0xYOUR_ADDRESS"},
    {"type": "String", "value": "A.1654653399040a61.FlowToken.Vault"},
    {"type": "String", "value": "A.b19436aae4d94622.FiatToken.Vault"},
    {"type": "UFix64", "value": "10.0"}
  ]'
```

---

## Adding New DEX Connectors

### Step 1: Create Connector Contract

```cadence
// BloctoSwapConnector.cdc
import FlowActionsInterfaces from 0x...
import BloctoSwap from 0x...

access(all) contract BloctoSwapConnector {

    access(all) resource Swapper: FlowActionsInterfaces.Swapper {

        access(all) fun swap(...): @{FungibleToken.Vault} {
            // Implement using BloctoSwap contracts
            return <-BloctoSwap.swap(...)
        }

        access(all) fun getQuote(...): UFix64 {
            // Get quote from BloctoSwap
            return BloctoSwap.getAmountOut(...)
        }

        // ... implement other methods
    }
}
```

### Step 2: Update Transaction

```typescript
// In transaction-router.ts
const FLOW_ACTIONS_SWAP_TRANSACTION = `
import BloctoSwapConnector from 0x... // Change connector

// Rest stays the same - uses Swapper interface
prepare(signer: auth(...) &Account) {
    BloctoSwapConnector.setupSwapper(account: signer) // Change setup

    self.swapper = signer.capabilities.borrow<&{FlowActionsInterfaces.Swapper}>(
        BloctoSwapConnector.SwapperPublicPath // Change path
    ) ?? panic("...")

    // Everything else is identical!
}
`;
```

### Step 3: Test

No changes needed to NLP parser or UI - it just works! ✨

---

## Supported Features

### Current (IncrementFi Connector)

- ✅ FLOW ↔ USDC swaps
- ✅ Quote estimation with slippage
- ✅ Swap path validation
- ✅ Event emission
- ✅ Error handling

### Planned

- 🔨 Multiple DEX connectors (BloctoSwap, MatrixMarket)
- 🔨 Source interface (vault management)
- 🔨 Sink interface (deposits)
- 🔨 PriceOracle interface
- 🔨 Flasher interface (flash loans)
- 🔨 Multi-hop swaps
- 🔨 Aggregated routing (best price across DEXs)

---

## Migration Checklist

For existing installations:

- [ ] Deploy `FlowActionsInterfaces.cdc` to testnet/mainnet
- [ ] Deploy `IncrementFiConnector.cdc` to testnet/mainnet
- [ ] Update contract addresses in `transaction-router.ts`
- [ ] Update `flow.json` with new contract aliases
- [ ] Test swap with `get_swap_quote.cdc` script
- [ ] Test full swap via UI with "swap 1 FLOW to USDC"
- [ ] Remove old swap transactions (optional cleanup)

---

## Troubleshooting

### Issue: "Could not borrow Swapper capability"

**Cause:** Swapper not setup for account

**Solution:**
```cadence
// The transaction auto-calls this:
IncrementFiConnector.setupSwapper(account: signer)

// Or manually:
flow transactions send cadence/transactions/setup_swapper.cdc --signer your-account
```

### Issue: "Swap pair does not exist"

**Cause:** Token pair not available on IncrementFi

**Solution:**
- Check supported pairs at https://app.increment.fi
- Or switch to a different connector that supports the pair

### Issue: "Invalid token type identifier"

**Cause:** Wrong token type format

**Solution:** Use full identifier:
```
✅ "A.1654653399040a61.FlowToken.Vault"
❌ "FlowToken"
```

---

## Key Differences from Direct Integration

| Aspect | Direct Integration | Flow Actions |
|--------|-------------------|--------------|
| **Coupling** | Tight (IncrementFi specific) | Loose (interface-based) |
| **Flexibility** | Hard to change DEX | Easy to swap connectors |
| **Composability** | Single operations | Chainable workflows |
| **Testing** | Mock entire DEX | Mock interface only |
| **Maintenance** | Update all transactions | Update connector only |
| **Future-proof** | Protocol changes break code | Interface stays stable |

---

## Example Workflows

### Simple Swap
```
User: "swap 10 FLOW to USDC"
↓
NLP Parser → ParsedIntent
↓
Transaction Router → Flow Actions Swap Transaction
↓
IncrementFi Connector → IncrementFi DEX
↓
Result: USDC tokens
```

### Future: Complex Workflow
```
User: "claim rewards and swap to USDC"
↓
Source.withdraw() → Get rewards
↓
Swapper.swap() → Convert to USDC
↓
Sink.deposit() → Deposit to vault
↓
All atomic in one transaction! 🚀
```

---

## Resources

- **Flow Actions Docs**: https://developers.flow.com/blockchain-development-tutorials/flow-actions
- **FLIP 339**: https://github.com/onflow/flips/pull/339
- **IncrementFi**: https://docs.increment.fi/
- **Flow DeFi**: https://flow.com/defi

---

## Summary

✅ **Migrated to Flow Actions architecture**
- Standardized Swapper interface
- IncrementFi connector implementation
- Protocol-agnostic transaction routing
- Future-ready for multi-protocol support

🚀 **Benefits**
- Easy to add new DEXs
- Composable DeFi workflows
- Better testing and maintenance
- Stable interface, flexible implementation

📝 **Next Steps**
- Deploy contracts to testnet/mainnet
- Add more connectors (BloctoSwap, etc.)
- Implement Source/Sink for complex workflows
- Add aggregated routing for best prices

---

**Migration Complete!** FlowSense now uses Flow Actions for all swap operations. 🎉
