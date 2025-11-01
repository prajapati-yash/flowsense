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
 * Flow Actions Swap Transaction
 * Uses standardized Swapper interface with IncrementFi connector
 * Updated for Cadence 1.0+ and Flow Actions architecture
 */
const FLOW_ACTIONS_SWAP_TRANSACTION = `
import FungibleToken from 0xf233dcee88fe0abe
import FlowActionsInterfaces from 0xa9c238d801df5106
import IncrementFiConnector from 0xa9c238d801df5106

transaction(
    amountIn: UFix64,
    amountOutMin: UFix64,
    tokenInPath: StoragePath,
    tokenOutType: String,
    tokenOutReceiverPath: PublicPath
) {

    let swapper: &{FlowActionsInterfaces.Swapper}
    let tokenInVault: @{FungibleToken.Vault}
    let tokenOutReceiverRef: &{FungibleToken.Receiver}
    let outputType: Type

    prepare(signer: auth(Storage, BorrowValue, Capabilities) &Account) {

        // Setup IncrementFi swapper if not exists
        IncrementFiConnector.setupSwapper(account: signer)

        // Borrow swapper capability
        self.swapper = signer.capabilities.borrow<&{FlowActionsInterfaces.Swapper}>(
            IncrementFiConnector.SwapperPublicPath
        ) ?? panic("Could not borrow Swapper capability")

        // Parse output token type
        self.outputType = CompositeType(tokenOutType)
            ?? panic("Invalid token type identifier: ".concat(tokenOutType))

        // Validate swap path exists
        let tokenInVaultRef = signer.storage.borrow<&{FungibleToken.Vault}>(
            from: tokenInPath
        ) ?? panic("Could not borrow input token vault from ".concat(tokenInPath.toString()))

        let tokenInType = tokenInVaultRef.getType()

        assert(
            self.swapper.canSwap(tokenInType: tokenInType, tokenOutType: self.outputType),
            message: "Swap path does not exist for ".concat(tokenInType.identifier).concat(" -> ").concat(tokenOutType)
        )

        // Get quote for slippage check
        let quote = self.swapper.getQuote(
            tokenInType: tokenInType,
            tokenOutType: self.outputType,
            amountIn: amountIn
        )
        log("Expected output: ".concat(quote.toString()))
        log("Minimum output: ".concat(amountOutMin.toString()))

        // Withdraw input tokens
        let vault = signer.storage.borrow<auth(FungibleToken.Withdraw) &{FungibleToken.Vault}>(
            from: tokenInPath
        ) ?? panic("Could not borrow input token vault for withdrawal")

        self.tokenInVault <- vault.withdraw(amount: amountIn)

        // Get output token receiver
        self.tokenOutReceiverRef = signer.capabilities.get<&{FungibleToken.Receiver}>(
            tokenOutReceiverPath
        ).borrow() ?? panic("Could not borrow output token receiver from ".concat(tokenOutReceiverPath.toString()))
    }

    execute {
        // Execute swap via Flow Actions Swapper interface
        let swapResVault <- self.swapper.swap(
            vaultIn: <-self.tokenInVault,
            tokenOutType: self.outputType,
            amountOutMin: amountOutMin
        )

        // Deposit output tokens to user
        self.tokenOutReceiverRef.deposit(from: <-swapResVault)

        log("✅ Swap successful via Flow Actions!")
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
 * Initialize stgUSDC vault (Stargate bridged USDC from EVM)
 * Required before receiving stgUSDC from swaps
 */
const SETUP_STG_USDC_VAULT = `
import FungibleToken from 0xf233dcee88fe0abe
import EVMVMBridgedToken_f1815bd50389c46847f0bda824ec8da914045d14 from 0x1e4aa0b87d10b141

transaction() {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        let storagePath = StoragePath(identifier: "EVMVMBridgedToken_f1815bd50389c46847f0bda824ec8da914045d14Vault")!
        let receiverPath = PublicPath(identifier: "EVMVMBridgedToken_f1815bd50389c46847f0bda824ec8da914045d14Receiver")!
        let balancePath = PublicPath(identifier: "EVMVMBridgedToken_f1815bd50389c46847f0bda824ec8da914045d14Balance")!

        // Check if vault already exists
        if signer.storage.borrow<&AnyResource>(from: storagePath) != nil {
            log("✅ stgUSDC vault already exists - no setup needed")
            return
        }

        log("Creating new stgUSDC vault...")

        // Create new vault using the specific bridged token contract
        let vault <- EVMVMBridgedToken_f1815bd50389c46847f0bda824ec8da914045d14.createEmptyVault(
            vaultType: Type<@EVMVMBridgedToken_f1815bd50389c46847f0bda824ec8da914045d14.Vault>()
        )

        // Save it to storage
        signer.storage.save(<-vault, to: storagePath)

        // Create public receiver capability
        let receiverCap = signer.capabilities.storage.issue<&{FungibleToken.Receiver}>(storagePath)
        signer.capabilities.publish(receiverCap, at: receiverPath)

        // Create public balance capability
        let balanceCap = signer.capabilities.storage.issue<&{FungibleToken.Balance}>(storagePath)
        signer.capabilities.publish(balanceCap, at: balancePath)

        log("✅ stgUSDC vault created successfully!")
        log("You can now receive stgUSDC from swaps")
    }
}
`;

/**
 * Initialize stgUSDT vault (Stargate bridged USDT from EVM)
 * Required before receiving stgUSDT from swaps
 */
const SETUP_STG_USDT_VAULT = `
import FungibleToken from 0xf233dcee88fe0abe
import EVMVMBridgedToken_674843c06ff83502ddb4d37c2e09c01cda38cbc8 from 0x1e4aa0b87d10b141

transaction() {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        let storagePath = StoragePath(identifier: "EVMVMBridgedToken_674843c06ff83502ddb4d37c2e09c01cda38cbc8Vault")!
        let receiverPath = PublicPath(identifier: "EVMVMBridgedToken_674843c06ff83502ddb4d37c2e09c01cda38cbc8Receiver")!
        let balancePath = PublicPath(identifier: "EVMVMBridgedToken_674843c06ff83502ddb4d37c2e09c01cda38cbc8Balance")!

        // Check if vault already exists
        if signer.storage.borrow<&AnyResource>(from: storagePath) != nil {
            log("✅ stgUSDT vault already exists - no setup needed")
            return
        }

        log("Creating new stgUSDT vault...")

        // Create new vault using the specific bridged token contract
        let vault <- EVMVMBridgedToken_674843c06ff83502ddb4d37c2e09c01cda38cbc8.createEmptyVault(
            vaultType: Type<@EVMVMBridgedToken_674843c06ff83502ddb4d37c2e09c01cda38cbc8.Vault>()
        )

        // Save it to storage
        signer.storage.save(<-vault, to: storagePath)

        // Create public receiver capability
        let receiverCap = signer.capabilities.storage.issue<&{FungibleToken.Receiver}>(storagePath)
        signer.capabilities.publish(receiverCap, at: receiverPath)

        // Create public balance capability
        let balanceCap = signer.capabilities.storage.issue<&{FungibleToken.Balance}>(storagePath)
        signer.capabilities.publish(balanceCap, at: balancePath)

        log("✅ stgUSDT vault created successfully!")
        log("You can now receive stgUSDT from swaps")
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

/**
 * Get all token balances for a user (portfolio view)
 * Checks known token paths on Flow mainnet
 */
const GET_PORTFOLIO_SCRIPT = `
import FungibleToken from 0xf233dcee88fe0abe
import FlowToken from 0x1654653399040a61

access(all) struct TokenBalance {
    access(all) let symbol: String
    access(all) let balance: UFix64
    access(all) let name: String
    access(all) let typeIdentifier: String

    init(symbol: String, balance: UFix64, name: String, typeIdentifier: String) {
        self.symbol = symbol
        self.balance = balance
        self.name = name
        self.typeIdentifier = typeIdentifier
    }
}

access(all) fun main(address: Address): [TokenBalance] {
    let account = getAccount(address)
    var balances: [TokenBalance] = []

    // Helper to try borrowing a token vault and add to balances if it exists
    fun tryAddToken(path: PublicPath, symbol: String, name: String): Bool {
        if let vaultRef = account.capabilities.borrow<&{FungibleToken.Balance}>(path) {
            if vaultRef.balance > 0.0 {
                balances.append(TokenBalance(
                    symbol: symbol,
                    balance: vaultRef.balance,
                    name: name,
                    typeIdentifier: vaultRef.getType().identifier
                ))
                return true
            }
        }
        return false
    }

    // Helper to try borrowing from Receiver path (for tokens that don't publish Balance)
    fun tryAddTokenFromReceiver(path: PublicPath, symbol: String, name: String): Bool {
        if let receiverRef = account.capabilities.borrow<&{FungibleToken.Receiver}>(path) {
            // Try to cast to Balance interface
            if let balanceRef = receiverRef as? &{FungibleToken.Balance} {
                if balanceRef.balance > 0.0 {
                    balances.append(TokenBalance(
                        symbol: symbol,
                        balance: balanceRef.balance,
                        name: name,
                        typeIdentifier: balanceRef.getType().identifier
                    ))
                    return true
                }
            }
        }
        return false
    }

    // Check FLOW (FlowToken)
    tryAddToken(
        path: /public/flowTokenBalance,
        symbol: "FLOW",
        name: "FlowToken"
    )

    // Check USDC (FiatToken - Circle's USDC)
    tryAddToken(
        path: /public/USDCVaultBalance,
        symbol: "USDC",
        name: "FiatToken"
    )

    // Check stgUSDC (Stargate bridged USDC from EVM)
    // Note: Uses Receiver path because Balance capability is not published
    tryAddTokenFromReceiver(
        path: /public/EVMVMBridgedToken_f1815bd50389c46847f0bda824ec8da914045d14Receiver,
        symbol: "USDC",
        name: "stgUSDC"
    )

    // Check stgUSDT (Stargate bridged USDT from EVM)
    // Note: Uses Receiver path because Balance capability is not published
    tryAddTokenFromReceiver(
        path: /public/EVMVMBridgedToken_674843c06ff83502ddb4d37c2e09c01cda38cbc8Receiver,
        symbol: "USDT",
        name: "stgUSDT"
    )

    // Check FUSD (deprecated but may still exist)
    tryAddToken(
        path: /public/fusdBalance,
        symbol: "FUSD",
        name: "FUSD"
    )

    // Check USDT (Tether USD)
    tryAddToken(
        path: /public/teleportedTetherTokenBalance,
        symbol: "USDT",
        name: "TeleportedTetherToken"
    )

    // Check BloctoToken
    tryAddToken(
        path: /public/bloctoTokenBalance,
        symbol: "BLT",
        name: "BloctoToken"
    )

    // Check tUSDT (other USDT variant)
    tryAddToken(
        path: /public/tUSDTVaultBalance,
        symbol: "USDT",
        name: "tUSDT"
    )

    // Check FLOW staking tokens
    tryAddToken(
        path: /public/stFlowTokenBalance,
        symbol: "stFLOW",
        name: "stFlowToken"
    )

    return balances
}
`;

/**
 * Get price/quote using Flow Actions Swapper
 * Uses IncrementFi DEX to get current market price
 */
const GET_PRICE_SCRIPT = `
import FlowActionsInterfaces from 0xa9c238d801df5106
import IncrementFiConnector from 0xa9c238d801df5106

access(all) fun main(
    swapperAddress: Address,
    tokenFromType: String,
    tokenToType: String,
    amount: UFix64
): UFix64 {
    // Parse token types
    let tokenFrom = CompositeType(tokenFromType)
        ?? panic("Invalid token type: ".concat(tokenFromType))

    let tokenTo = CompositeType(tokenToType)
        ?? panic("Invalid token type: ".concat(tokenToType))

    // Borrow swapper capability
    let account = getAccount(swapperAddress)
    let swapper = account.capabilities.borrow<&{FlowActionsInterfaces.Swapper}>(
        IncrementFiConnector.SwapperPublicPath
    ) ?? panic("Could not borrow Swapper from address ".concat(swapperAddress.toString()))

    // Get quote
    return swapper.getQuote(
        tokenInType: tokenFrom,
        tokenOutType: tokenTo,
        amountIn: amount
    )
}
`;

export interface TransactionPlan {
  cadence: string;
  args: unknown[];
  description: string;
  estimatedGas?: string;
}

export interface ScriptPlan {
  cadence: string;
  args: unknown[];
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
function pathToObject(pathString: string): { domain: "storage" | "private" | "public"; identifier: string } {
  const pathMatch = pathString.match(/^\/(storage|public|private)\/(.+)$/);

  if (!pathMatch) {
    throw new Error(`Invalid path format: ${pathString}`);
  }

  return {
    domain: pathMatch[1] as "storage" | "private" | "public",
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

      case 'price':
        return this.createPriceScript(intent, userAddress);

      case 'portfolio':
        return this.createPortfolioScript(intent, userAddress);

      case 'vault_init':
        return this.createVaultInitTransaction(intent);

      default:
        return null;
    }
  }

  /**
   * Create swap transaction using Flow Actions Swapper interface
   * Works with any connector (currently IncrementFi)
   */
  private createSwapTransaction(intent: ParsedIntent): TransactionPlan {
    const { amountIn, tokenIn, tokenOut, tokenInInfo, tokenOutInfo } = intent.params as {
      amountIn: string | number;
      tokenIn: string;
      tokenOut: string;
      tokenInInfo: { storagePath: string; typeIdentifier: string };
      tokenOutInfo: { receiverPath: string; typeIdentifier: string };
    };

    // Format amounts for UFix64
    const formattedAmountIn = formatUFix64(amountIn);

    // Set minimum output with 1% slippage tolerance (set to 0 for now, will calculate after getting quote)
    const formattedAmountOutMin = "0.0";

    // Convert path strings to Path objects
    const tokenInPathObj = pathToObject(tokenInInfo.storagePath);
    const tokenOutReceiverPathObj = pathToObject(tokenOutInfo.receiverPath);

    return {
      cadence: FLOW_ACTIONS_SWAP_TRANSACTION,
      args: [
        fcl.arg(formattedAmountIn, t.UFix64),                           // amountIn
        fcl.arg(formattedAmountOutMin, t.UFix64),                       // amountOutMin (slippage protection)
        fcl.arg(tokenInPathObj, t.Path),                                // tokenInPath
        fcl.arg(tokenOutInfo.typeIdentifier, t.String),                 // tokenOutType
        fcl.arg(tokenOutReceiverPathObj, t.Path),                       // tokenOutReceiverPath
      ],
      description: `Swap ${formattedAmountIn} ${tokenIn.toUpperCase()} to ${tokenOut.toUpperCase()} via Flow Actions`,
      estimatedGas: "0.001 FLOW",
    };
  }

  /**
   * Create transfer transaction
   */
  private createTransferTransaction(intent: ParsedIntent): TransactionPlan {
    const { amount, token, recipient } = intent.params as {
      amount: string | number;
      token: string;
      recipient: string;
      tokenInfo: unknown;
    };

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
   * Create vault initialization transaction
   */
  private createVaultInitTransaction(intent: ParsedIntent): TransactionPlan {
    const { token } = intent.params as {
      token: string;
    };

    const tokenUpper = token.toUpperCase();

    if (token === 'usdc') {
      return {
        cadence: SETUP_STG_USDC_VAULT,
        args: [],
        description: `Initialize ${tokenUpper} vault`,
        estimatedGas: "0.0001 FLOW",
      };
    }

    if (token === 'usdt') {
      return {
        cadence: SETUP_STG_USDT_VAULT,
        args: [],
        description: `Initialize ${tokenUpper} vault`,
        estimatedGas: "0.0001 FLOW",
      };
    }

    throw new Error(`Vault initialization for ${tokenUpper} not supported`);
  }

  /**
   * Create balance check script
   */
  private createBalanceScript(intent: ParsedIntent, userAddress: string): ScriptPlan {
    const { token, tokenInfo } = intent.params as {
      token: string;
      tokenInfo: { storagePath: string };
    };

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
   * Create price query script
   */
  private createPriceScript(intent: ParsedIntent, userAddress: string): ScriptPlan {
    const { amount, tokenFrom, tokenTo, tokenFromInfo, tokenToInfo } = intent.params as {
      amount: string | number;
      tokenFrom: string;
      tokenTo: string;
      tokenFromInfo: { typeIdentifier: string };
      tokenToInfo: { typeIdentifier: string };
    };

    // Format amount for UFix64
    const formattedAmount = formatUFix64(amount);

    return {
      cadence: GET_PRICE_SCRIPT,
      args: [
        fcl.arg(userAddress, t.Address),                      // swapperAddress
        fcl.arg(tokenFromInfo.typeIdentifier, t.String),      // tokenFromType
        fcl.arg(tokenToInfo.typeIdentifier, t.String),        // tokenToType
        fcl.arg(formattedAmount, t.UFix64),                   // amount
      ],
      description: `Get price of ${formattedAmount} ${tokenFrom.toUpperCase()} in ${tokenTo.toUpperCase()}`,
    };
  }

  /**
   * Create portfolio query script
   */
  private createPortfolioScript(intent: ParsedIntent, userAddress: string): ScriptPlan {
    return {
      cadence: GET_PORTFOLIO_SCRIPT,
      args: [fcl.arg(userAddress, t.Address)],
      description: 'Get all token balances (portfolio)',
    };
  }

  /**
   * Format transaction result for display
   */
  formatTransactionResult(intent: ParsedIntent, transactionId: string): string {
    switch (intent.type) {
      case 'swap': {
        const { amountIn, tokenIn, tokenOut } = intent.params as {
          amountIn: string | number;
          tokenIn: string;
          tokenOut: string;
        };
        return `✅ Swap successful!\n\nSwapped ${amountIn} ${tokenIn.toUpperCase()} to ${tokenOut.toUpperCase()}\n\nTransaction ID: ${transactionId}\n\nView on FlowScan: https://flowscan.org/transaction/${transactionId}`;
      }

      case 'transfer': {
        const { amount, token, recipient } = intent.params as {
          amount: string | number;
          token: string;
          recipient: string;
        };
        return `✅ Transfer successful!\n\nTransferred ${amount} ${token.toUpperCase()} to ${recipient}\n\nTransaction ID: ${transactionId}\n\nView on FlowScan: https://flowscan.org/transaction/${transactionId}`;
      }

      case 'vault_init': {
        const { token } = intent.params as {
          token: string;
        };
        return `✅ Vault initialized successfully!\n\n${token.toUpperCase()} vault is now ready to receive tokens.\n\nYou can now:\n• Swap tokens to ${token.toUpperCase()}\n• Receive ${token.toUpperCase()} from others\n\nTransaction ID: ${transactionId}\n\nView on FlowScan: https://flowscan.org/transaction/${transactionId}`;
      }

      default:
        return `✅ Transaction successful!\n\nTransaction ID: ${transactionId}`;
    }
  }

  /**
   * Format script result for display
   */
  formatScriptResult(intent: ParsedIntent, result: unknown): string {
    switch (intent.type) {
      case 'balance':
        return `💰 Your ${(intent.params.token as string).toUpperCase()} balance: ${result} tokens`;

      case 'price':
        const { amount, tokenFrom, tokenTo } = intent.params as { amount: string; tokenFrom: string; tokenTo: string };
        const price = parseFloat(result as string);
        const formattedPrice = price.toFixed(4);

        if (amount === '1') {
          return `💵 Current price: 1 ${tokenFrom.toUpperCase()} = ${formattedPrice} ${tokenTo.toUpperCase()}\n\n(Live price from IncrementFi DEX)`;
        } else {
          return `💵 Price: ${amount} ${tokenFrom.toUpperCase()} = ${formattedPrice} ${tokenTo.toUpperCase()}\n\n(Live price from IncrementFi DEX)`;
        }

      case 'portfolio':
        // Result is array of TokenBalance objects
        const balances = result as Array<{ symbol: string; balance: string; name: string; typeIdentifier: string }>;

        if (!balances || balances.length === 0) {
          return `📊 Your Portfolio:\n\nNo tokens found in your account.\n\nStart by acquiring some FLOW or other tokens!`;
        }

        let portfolioText = `📊 Your Portfolio:\n\n`;

        balances.forEach((token: { symbol: string; balance: string; name: string; typeIdentifier: string }) => {
          const balance = parseFloat(token.balance).toFixed(4);
          portfolioText += `💰 ${token.symbol}: ${balance}\n`;
          if (token.name !== token.symbol) {
            portfolioText += `   (${token.name})\n`;
          }
        });

        portfolioText += `\n✅ Total tokens: ${balances.length}`;

        return portfolioText;

      default:
        return `Result: ${JSON.stringify(result)}`;
    }
  }

  /**
   * Format error message
   */
  formatError(intent: ParsedIntent, error: string): string {
    switch (intent.type) {
      case 'swap': {
        const { tokenIn, tokenOut } = intent.params as {
          tokenIn: string;
          tokenOut: string;
        };
        return `❌ Swap failed!\n\n${error}\n\nPlease make sure you have:\n• Sufficient ${tokenIn.toUpperCase()} balance\n• Initialized ${tokenOut.toUpperCase()} vault\n• Connected to the correct network`;
      }

      case 'transfer':
        return `❌ Transfer failed!\n\n${error}\n\nPlease verify:\n• Sufficient balance\n• Valid recipient address\n• Correct network`;

      case 'balance':
        return `❌ Could not fetch balance\n\n${error}`;

      case 'price':
        return `❌ Could not fetch price\n\n${error}\n\nPlease make sure:\n• You're connected to the correct network\n• The trading pair exists on IncrementFi\n• Your wallet is connected`;

      case 'portfolio':
        return `❌ Could not fetch portfolio\n\n${error}\n\nPlease verify:\n• Your wallet is connected\n• You're on the correct network\n• Your account exists`;

      case 'vault_init': {
        const { token } = intent.params as {
          token: string;
        };
        return `❌ Vault initialization failed!\n\n${error}\n\nThis could mean:\n• The vault might already be initialized\n• Insufficient FLOW for transaction fees\n• Network connection issue\n\nTry asking "What's my ${token.toUpperCase()} balance?" to verify if the vault already exists.`;
      }

      default:
        return `❌ Transaction failed: ${error}`;
    }
  }
}

// Export singleton instance
export const transactionRouter = new TransactionRouter();
