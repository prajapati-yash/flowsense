/**
 * Transaction Router Service
 * Routes parsed intents to appropriate Cadence transactions
 */

import * as fcl from "@onflow/fcl";
import * as t from "@onflow/types";
import { ParsedIntent } from "./nlp-parser";

// IncrementFi Swap Router Address (Mainnet)
const SWAP_ROUTER_ADDRESS = "0xb063c16cac85dbd1";

/**
 * Swap transaction using IncrementFi
 * This transaction swaps tokens using the IncrementFi DEX
 */
const SWAP_TRANSACTION = `
import FungibleToken from 0xf233dcee88fe0abe
import SwapInterfaces from 0xb78ef7afa52ff906
import SwapConfig from 0xb78ef7afa52ff906
import SwapError from 0xb78ef7afa52ff906
import SwapFactory from 0xb78ef7afa52ff906
import SwapRouter from 0xb063c16cac85dbd1

transaction(
    tokenInKey: String,
    tokenInAmount: UFix64,
    tokenOutKey: String,
    amountOutMin: UFix64,
    deadline: UFix64
) {
    prepare(signer: AuthAccount) {
        // Execute the swap
        let vaultOut <- SwapRouter.swapExactTokensForTokens(
            exactVaultIn: <- signer.borrow<&{FungibleToken.Provider}>(from: StoragePath(identifier: tokenInKey)!)!.withdraw(amount: tokenInAmount),
            tokenKeyPath: [tokenInKey, tokenOutKey],
            exactAmountOut: amountOutMin,
            swapPath: [tokenInKey, tokenOutKey],
            deadline: deadline,
            tokenInVaultType: CompositeType(tokenInKey)!,
            tokenOutVaultType: CompositeType(tokenOutKey)!,
            tokenOutReceiverPath: PublicPath(identifier: tokenOutKey)!,
            tokenOutBalancePath: PublicPath(identifier: tokenOutKey.concat("Balance"))!
        )

        // Deposit the swapped tokens
        signer.borrow<&{FungibleToken.Receiver}>(from: PublicPath(identifier: tokenOutKey)!)!
            .deposit(from: <- vaultOut)
    }
}
`;

/**
 * Real IncrementFi swap transaction for mainnet
 * Updated for Cadence 1.0+
 */
const INCREMENTFI_SWAP_TRANSACTION = `
import FungibleToken from 0xf233dcee88fe0abe
import SwapFactory from 0xb063c16cac85dbd1
import SwapInterfaces from 0xb78ef7afa52ff906
import SwapConfig from 0xb78ef7afa52ff906

transaction(
    amountIn: UFix64,
    amountOutMin: UFix64,
    swapPath: [String],
    tokenInPath: StoragePath,
    tokenOutReceiverPath: PublicPath
) {

    let pairPublicRef: &{SwapInterfaces.PairPublic}
    let tokenInVault: @{FungibleToken.Vault}
    let tokenOutReceiverRef: &{FungibleToken.Receiver}

    prepare(signer: auth(Storage, BorrowValue) &Account) {

        assert(swapPath.length == 2, message: "Swap path must contain exactly 2 tokens")

        let token0Key = SwapConfig.SliceTokenTypeIdentifierFromVaultType(vaultTypeIdentifier: swapPath[0])
        let token1Key = SwapConfig.SliceTokenTypeIdentifierFromVaultType(vaultTypeIdentifier: swapPath[1])

        // Get pair address
        let pairAddr = SwapFactory.getPairAddress(token0Key: token0Key, token1Key: token1Key)
            ?? panic("Swap pair does not exist for ".concat(token0Key).concat(" / ").concat(token1Key))

        // Borrow pair public reference
        self.pairPublicRef = getAccount(pairAddr)
            .capabilities.borrow<&{SwapInterfaces.PairPublic}>(SwapConfig.PairPublicPath)
            ?? panic("Could not borrow pair public reference")

        // Borrow input token vault and withdraw
        let vault = signer.storage.borrow<auth(FungibleToken.Withdraw) &{FungibleToken.Vault}>(
            from: tokenInPath
        ) ?? panic("Could not borrow input token vault from ".concat(tokenInPath.toString()))

        self.tokenInVault <- vault.withdraw(amount: amountIn)

        // Get output token receiver
        self.tokenOutReceiverRef = signer.capabilities.get<&{FungibleToken.Receiver}>(
            tokenOutReceiverPath
        ).borrow() ?? panic("Could not borrow output token receiver from ".concat(tokenOutReceiverPath.toString()))
    }

    execute {
        // Perform swap
        let swapResVault <- self.pairPublicRef.swap(
            vaultIn: <-self.tokenInVault,
            exactAmountOut: nil
        )

        // Validate minimum output (slippage protection)
        assert(
            swapResVault.balance >= amountOutMin,
            message: "Swap output ".concat(swapResVault.balance.toString())
                .concat(" is less than minimum ").concat(amountOutMin.toString())
                .concat(". Slippage too high.")
        )

        // Deposit output tokens to user
        self.tokenOutReceiverRef.deposit(from: <-swapResVault)

        log("✅ Swap successful!")
        log("Input: ".concat(amountIn.toString()))
        log("Output: >= ".concat(amountOutMin.toString()))
    }
}
`;

/**
 * Transfer FLOW tokens
 * Updated for Cadence 1.0+
 */
const TRANSFER_FLOW_TRANSACTION = `
import FungibleToken from 0xf233dcee88fe0abe
import FlowToken from 0x1654653399040a61

transaction(recipient: Address, amount: UFix64) {
    let sentVault: @{FungibleToken.Vault}

    prepare(signer: auth(Storage, Capabilities) &Account) {
        let vaultRef = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
            from: /storage/flowTokenVault
        ) ?? panic("Could not borrow reference to the owner's Vault!")

        self.sentVault <- vaultRef.withdraw(amount: amount)
    }

    execute {
        let recipient = getAccount(recipient)

        let receiverRef = recipient.capabilities.get<&{FungibleToken.Receiver}>(
            /public/flowTokenReceiver
        ).borrow() ?? panic("Could not borrow receiver reference to the recipient's Vault")

        receiverRef.deposit(from: <-self.sentVault)
    }
}
`;

/**
 * Get FLOW balance
 * Updated for Cadence 1.0+
 */
const GET_FLOW_BALANCE_SCRIPT = `
import FungibleToken from 0xf233dcee88fe0abe
import FlowToken from 0x1654653399040a61

access(all) fun main(address: Address): UFix64 {
    let account = getAccount(address)

    let vaultRef = account.capabilities.get<&{FungibleToken.Balance}>(
        /public/flowTokenBalance
    ).borrow() ?? panic("Could not borrow Balance reference to the Vault")

    return vaultRef.balance
}
`;

/**
 * Get generic token balance
 * Updated for Cadence 1.0+
 */
const GET_TOKEN_BALANCE_SCRIPT = `
import FungibleToken from 0xf233dcee88fe0abe

access(all) fun main(address: Address, storagePath: String): UFix64 {
    let account = getAccount(address)

    let publicPath = PublicPath(identifier: storagePath.concat("Balance"))!

    let vaultRef = account.capabilities.get<&{FungibleToken.Balance}>(publicPath)
        .borrow() ?? panic("Could not borrow Balance reference to the Vault")

    return vaultRef.balance
}
`;

export interface TransactionPlan {
  cadence: string;
  args: any[];
  description: string;
  estimatedGas?: string;
}

export interface ScriptPlan {
  cadence: string;
  args: any[];
  description: string;
}

/**
 * Format a number as UFix64 string (must have decimal point)
 */
function formatUFix64(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    throw new Error(`Invalid number: ${value}`);
  }

  // Ensure at least one decimal place
  return num.toFixed(Math.max(1, (num.toString().split('.')[1] || '').length));
}

/**
 * Convert path string to FCL Path object
 * Example: "/storage/flowTokenVault" -> { domain: "storage", identifier: "flowTokenVault" }
 */
function pathToObject(pathString: string): { domain: string; identifier: string } {
  const pathMatch = pathString.match(/^\/(storage|public|private)\/(.+)$/);

  if (!pathMatch) {
    throw new Error(`Invalid path format: ${pathString}`);
  }

  return {
    domain: pathMatch[1],
    identifier: pathMatch[2],
  };
}

class TransactionRouter {
  /**
   * Route intent to transaction plan
   */
  routeToTransaction(intent: ParsedIntent, userAddress: string): TransactionPlan | ScriptPlan | null {
    switch (intent.type) {
      case 'swap':
        return this.createSwapTransaction(intent);

      case 'transfer':
        return this.createTransferTransaction(intent);

      case 'balance':
        return this.createBalanceScript(intent, userAddress);

      default:
        return null;
    }
  }

  /**
   * Create swap transaction using IncrementFi DEX
   */
  private createSwapTransaction(intent: ParsedIntent): TransactionPlan {
    const { amountIn, tokenIn, tokenOut, tokenInInfo, tokenOutInfo } = intent.params;

    // Format amounts for UFix64
    const formattedAmountIn = formatUFix64(amountIn);

    // Set minimum output with 1% slippage tolerance (set to 0 for now, will calculate after getting quote)
    const formattedAmountOutMin = "0.0";

    // Create swap path with type identifiers
    const swapPath = [tokenInInfo.typeIdentifier, tokenOutInfo.typeIdentifier];

    // Convert path strings to Path objects
    const tokenInPathObj = pathToObject(tokenInInfo.storagePath);
    const tokenOutReceiverPathObj = pathToObject(tokenOutInfo.receiverPath);

    return {
      cadence: INCREMENTFI_SWAP_TRANSACTION,
      args: [
        fcl.arg(formattedAmountIn, t.UFix64),                           // amountIn
        fcl.arg(formattedAmountOutMin, t.UFix64),                       // amountOutMin (slippage protection)
        fcl.arg(swapPath, t.Array(t.String)),                           // swapPath
        fcl.arg(tokenInPathObj, t.Path),                                // tokenInPath
        fcl.arg(tokenOutReceiverPathObj, t.Path),                       // tokenOutReceiverPath
      ],
      description: `Swap ${formattedAmountIn} ${tokenIn.toUpperCase()} to ${tokenOut.toUpperCase()} via IncrementFi`,
      estimatedGas: "0.001 FLOW",
    };
  }

  /**
   * Create transfer transaction
   */
  private createTransferTransaction(intent: ParsedIntent): TransactionPlan {
    const { amount, token, recipient, tokenInfo } = intent.params;

    // Format amount for UFix64
    const formattedAmount = formatUFix64(amount);

    if (token === 'flow') {
      return {
        cadence: TRANSFER_FLOW_TRANSACTION,
        args: [
          fcl.arg(recipient, t.Address),
          fcl.arg(formattedAmount, t.UFix64),
        ],
        description: `Transfer ${formattedAmount} ${token.toUpperCase()} to ${recipient}`,
        estimatedGas: "0.00001 FLOW",
      };
    }

    // For other tokens, would need specific transfer transaction
    throw new Error(`Transfer for ${token.toUpperCase()} not yet implemented`);
  }

  /**
   * Create balance check script
   */
  private createBalanceScript(intent: ParsedIntent, userAddress: string): ScriptPlan {
    const { token, tokenInfo } = intent.params;

    if (token === 'flow') {
      return {
        cadence: GET_FLOW_BALANCE_SCRIPT,
        args: [fcl.arg(userAddress, t.Address)],
        description: `Check ${token.toUpperCase()} balance`,
      };
    }

    // For other tokens
    return {
      cadence: GET_TOKEN_BALANCE_SCRIPT,
      args: [
        fcl.arg(userAddress, t.Address),
        fcl.arg(tokenInfo.storagePath.replace('/storage/', ''), t.String),
      ],
      description: `Check ${token.toUpperCase()} balance`,
    };
  }

  /**
   * Format transaction result for display
   */
  formatTransactionResult(intent: ParsedIntent, transactionId: string): string {
    switch (intent.type) {
      case 'swap':
        return `✅ Swap successful!\n\nSwapped ${intent.params.amountIn} ${intent.params.tokenIn.toUpperCase()} to ${intent.params.tokenOut.toUpperCase()}\n\nTransaction ID: ${transactionId}\n\nView on FlowScan: https://flowscan.org/transaction/${transactionId}`;

      case 'transfer':
        return `✅ Transfer successful!\n\nTransferred ${intent.params.amount} ${intent.params.token.toUpperCase()} to ${intent.params.recipient}\n\nTransaction ID: ${transactionId}\n\nView on FlowScan: https://flowscan.org/transaction/${transactionId}`;

      default:
        return `✅ Transaction successful!\n\nTransaction ID: ${transactionId}`;
    }
  }

  /**
   * Format script result for display
   */
  formatScriptResult(intent: ParsedIntent, result: any): string {
    switch (intent.type) {
      case 'balance':
        return `💰 Your ${intent.params.token.toUpperCase()} balance: ${result} tokens`;

      default:
        return `Result: ${JSON.stringify(result)}`;
    }
  }

  /**
   * Format error message
   */
  formatError(intent: ParsedIntent, error: string): string {
    switch (intent.type) {
      case 'swap':
        return `❌ Swap failed!\n\n${error}\n\nPlease make sure you have:\n• Sufficient ${intent.params.tokenIn.toUpperCase()} balance\n• Initialized ${intent.params.tokenOut.toUpperCase()} vault\n• Connected to the correct network`;

      case 'transfer':
        return `❌ Transfer failed!\n\n${error}\n\nPlease verify:\n• Sufficient balance\n• Valid recipient address\n• Correct network`;

      case 'balance':
        return `❌ Could not fetch balance\n\n${error}`;

      default:
        return `❌ Transaction failed: ${error}`;
    }
  }
}

// Export singleton instance
export const transactionRouter = new TransactionRouter();
