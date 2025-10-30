import FungibleToken from 0xf233dcee88fe0abe

/// Flow Actions Interfaces
/// Standardized interfaces for composable DeFi workflows
/// Based on FLIP 339
access(all) contract FlowActionsInterfaces {

    /// Source - Provides tokens on demand
    /// Withdraws from vaults or claims rewards
    access(all) resource interface Source {
        /// Get available balance for a token
        access(all) fun getAvailableBalance(tokenType: Type): UFix64

        /// Withdraw tokens up to amount
        /// Respects minimum balance constraints
        access(all) fun withdraw(tokenType: Type, amount: UFix64): @{FungibleToken.Vault}

        /// Get minimum balance that must remain
        access(all) fun getMinimumBalance(tokenType: Type): UFix64
    }

    /// Sink - Accepts token deposits
    /// Deposits to vaults with capacity limits
    access(all) resource interface Sink {
        /// Get current capacity for a token
        access(all) fun getCapacity(tokenType: Type): UFix64

        /// Deposit tokens up to capacity
        /// No-op when capacity exceeded (doesn't revert)
        access(all) fun deposit(vault: @{FungibleToken.Vault})

        /// Check if can accept deposit
        access(all) fun canAccept(tokenType: Type, amount: UFix64): Bool
    }

    /// Swapper - Exchanges one token for another
    /// Supports DEX trades, bridges, bidirectional swaps
    access(all) resource interface Swapper {
        /// Get quote for a swap (for slippage protection)
        access(all) fun getQuote(
            tokenInType: Type,
            tokenOutType: Type,
            amountIn: UFix64
        ): UFix64

        /// Execute swap
        access(all) fun swap(
            vaultIn: @{FungibleToken.Vault},
            tokenOutType: Type,
            amountOutMin: UFix64
        ): @{FungibleToken.Vault}

        /// Check if swap path exists
        access(all) fun canSwap(tokenInType: Type, tokenOutType: Type): Bool

        /// Get supported token pairs
        access(all) fun getSupportedPairs(): [{String: Type}]
    }

    /// PriceOracle - Provides real-time price data
    access(all) resource interface PriceOracle {
        /// Get price in USD (or reference token)
        access(all) fun getPrice(tokenType: Type): UFix64

        /// Get price ratio between two tokens
        access(all) fun getPriceRatio(
            tokenA: Type,
            tokenB: Type
        ): UFix64

        /// Check if price is available
        access(all) fun hasPriceFor(tokenType: Type): Bool
    }

    /// Flasher - Issues flash loans
    access(all) resource interface Flasher {
        /// Get available flash loan amount
        access(all) fun getFlashLoanCapacity(tokenType: Type): UFix64

        /// Execute flash loan
        /// Must be repaid within same transaction
        access(all) fun flashLoan(
            tokenType: Type,
            amount: UFix64,
            callback: &{FlashLoanCallback}
        )

        /// Get flash loan fee
        access(all) fun getFlashLoanFee(tokenType: Type, amount: UFix64): UFix64
    }

    /// Callback for flash loans
    access(all) resource interface FlashLoanCallback {
        access(all) fun executeCallback(
            loan: @{FungibleToken.Vault}
        ): @{FungibleToken.Vault}
    }

    /// Swap configuration
    access(all) struct SwapConfig {
        access(all) let tokenInType: Type
        access(all) let tokenOutType: Type
        access(all) let amountIn: UFix64
        access(all) let amountOutMin: UFix64
        access(all) let deadline: UFix64?
        access(all) let metadata: {String: String}

        init(
            tokenInType: Type,
            tokenOutType: Type,
            amountIn: UFix64,
            amountOutMin: UFix64,
            deadline: UFix64?,
            metadata: {String: String}
        ) {
            self.tokenInType = tokenInType
            self.tokenOutType = tokenOutType
            self.amountIn = amountIn
            self.amountOutMin = amountOutMin
            self.deadline = deadline
            self.metadata = metadata
        }
    }

    /// Swap result
    access(all) struct SwapResult {
        access(all) let amountIn: UFix64
        access(all) let amountOut: UFix64
        access(all) let tokenInType: Type
        access(all) let tokenOutType: Type
        access(all) let priceImpact: UFix64?
        access(all) let executedAt: UFix64

        init(
            amountIn: UFix64,
            amountOut: UFix64,
            tokenInType: Type,
            tokenOutType: Type,
            priceImpact: UFix64?,
            executedAt: UFix64
        ) {
            self.amountIn = amountIn
            self.amountOut = amountOut
            self.tokenInType = tokenInType
            self.tokenOutType = tokenOutType
            self.priceImpact = priceImpact
            self.executedAt = executedAt
        }
    }

    /// Events
    access(all) event SwapExecuted(
        swapper: Address,
        tokenIn: String,
        tokenOut: String,
        amountIn: UFix64,
        amountOut: UFix64,
        priceImpact: UFix64?
    )

    access(all) event SourceWithdrawn(
        source: Address,
        tokenType: String,
        amount: UFix64
    )

    access(all) event SinkDeposited(
        sink: Address,
        tokenType: String,
        amount: UFix64
    )
}
