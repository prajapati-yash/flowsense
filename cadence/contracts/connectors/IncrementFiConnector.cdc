import FungibleToken from 0xf233dcee88fe0abe
import FlowToken from 0x1654653399040a61
import FiatToken from 0xb19436aae4d94622
import SwapFactory from 0xb063c16cac85dbd1
import SwapInterfaces from 0xb78ef7afa52ff906
import SwapConfig from 0xb78ef7afa52ff906
import FlowActionsInterfaces from "../FlowActionsInterfaces.cdc"

/// IncrementFi Connector
/// Bridges Flow Actions Swapper interface with IncrementFi DEX
access(all) contract IncrementFiConnector {

    /// Events (defined locally, not imported)
    access(all) event SwapExecuted(
        swapper: Address,
        tokenIn: String,
        tokenOut: String,
        amountIn: UFix64,
        amountOut: UFix64,
        priceImpact: UFix64?
    )

    /// Storage paths
    access(all) let SwapperStoragePath: StoragePath
    access(all) let SwapperPublicPath: PublicPath

    /// IncrementFi Swapper implementation
    access(all) resource Swapper: FlowActionsInterfaces.Swapper {

        /// Get quote for a swap
        access(all) fun getQuote(
            tokenInType: Type,
            tokenOutType: Type,
            amountIn: UFix64
        ): UFix64 {
            // Get token keys
            let token0Key = SwapConfig.SliceTokenTypeIdentifierFromVaultType(
                vaultTypeIdentifier: tokenInType.identifier
            )
            let token1Key = SwapConfig.SliceTokenTypeIdentifierFromVaultType(
                vaultTypeIdentifier: tokenOutType.identifier
            )

            // Get pair address
            let pairAddr = SwapFactory.getPairAddress(token0Key: token0Key, token1Key: token1Key)
                ?? panic("Swap pair does not exist for ".concat(token0Key).concat(" / ").concat(token1Key))

            // Borrow pair public reference
            let pairPublicRef = getAccount(pairAddr)
                .capabilities.borrow<&{SwapInterfaces.PairPublic}>(SwapConfig.PairPublicPath)
                ?? panic("Could not borrow pair public reference")

            // Get pair info for reserves
            let pairInfo = pairPublicRef.getPairInfo()
            let reserve0 = pairInfo[2] as! UFix64
            let reserve1 = pairInfo[3] as! UFix64

            // Determine if token0 is input
            let isToken0In = token0Key < token1Key

            // Calculate output using constant product formula (x * y = k)
            // amountOut = (amountIn * reserveOut * 997) / (reserveIn * 1000 + amountIn * 997)
            // Note: 0.3% fee (997/1000)
            let reserveIn = isToken0In ? reserve0 : reserve1
            let reserveOut = isToken0In ? reserve1 : reserve0

            let amountInWithFee = amountIn * 997.0
            let numerator = amountInWithFee * reserveOut
            let denominator = (reserveIn * 1000.0) + amountInWithFee

            return numerator / denominator
        }

        /// Execute swap
        access(all) fun swap(
            vaultIn: @{FungibleToken.Vault},
            tokenOutType: Type,
            amountOutMin: UFix64
        ): @{FungibleToken.Vault} {
            let tokenInType = vaultIn.getType()
            let amountIn = vaultIn.balance

            // Get token keys
            let token0Key = SwapConfig.SliceTokenTypeIdentifierFromVaultType(
                vaultTypeIdentifier: tokenInType.identifier
            )
            let token1Key = SwapConfig.SliceTokenTypeIdentifierFromVaultType(
                vaultTypeIdentifier: tokenOutType.identifier
            )

            // Get pair address
            let pairAddr = SwapFactory.getPairAddress(token0Key: token0Key, token1Key: token1Key)
                ?? panic("Swap pair does not exist for ".concat(token0Key).concat(" / ").concat(token1Key))

            // Borrow pair public reference
            let pairPublicRef = getAccount(pairAddr)
                .capabilities.borrow<&{SwapInterfaces.PairPublic}>(SwapConfig.PairPublicPath)
                ?? panic("Could not borrow pair public reference")

            // Execute swap
            let swapResVault <- pairPublicRef.swap(
                vaultIn: <-vaultIn,
                exactAmountOut: nil
            )

            // Validate minimum output (slippage protection)
            assert(
                swapResVault.balance >= amountOutMin,
                message: "Swap output ".concat(swapResVault.balance.toString())
                    .concat(" is less than minimum ").concat(amountOutMin.toString())
                    .concat(". Slippage too high.")
            )

            // Emit event
            emit SwapExecuted(
                swapper: self.owner?.address ?? panic("No owner"),
                tokenIn: tokenInType.identifier,
                tokenOut: tokenOutType.identifier,
                amountIn: amountIn,
                amountOut: swapResVault.balance,
                priceImpact: nil
            )

            return <-swapResVault
        }

        /// Check if swap path exists
        access(all) fun canSwap(tokenInType: Type, tokenOutType: Type): Bool {
            let token0Key = SwapConfig.SliceTokenTypeIdentifierFromVaultType(
                vaultTypeIdentifier: tokenInType.identifier
            )
            let token1Key = SwapConfig.SliceTokenTypeIdentifierFromVaultType(
                vaultTypeIdentifier: tokenOutType.identifier
            )

            let pairAddr = SwapFactory.getPairAddress(token0Key: token0Key, token1Key: token1Key)
            return pairAddr != nil
        }

        /// Get supported token pairs
        access(all) fun getSupportedPairs(): [{String: Type}] {
            // IncrementFi supports these pairs on mainnet:
            // - FLOW/USDC
            // - FLOW/stgUSDC
            // - USDC/stgUSDC
            // - And more...

            return [
                {
                    "tokenIn": Type<@FlowToken.Vault>(),
                    "tokenOut": Type<@FiatToken.Vault>()
                },
                {
                    "tokenIn": Type<@FiatToken.Vault>(),
                    "tokenOut": Type<@FlowToken.Vault>()
                }
                // Add more pairs as needed
            ]
        }

        init() {}
    }

    /// Create a new IncrementFi Swapper
    access(all) fun createSwapper(): @Swapper {
        return <-create Swapper()
    }

    /// Helper function to setup swapper for an account
    access(all) fun setupSwapper(account: auth(Storage, Capabilities) &Account) {
        // Check if swapper already exists
        if account.storage.borrow<&Swapper>(from: self.SwapperStoragePath) == nil {
            // Create and save swapper
            let swapper <- self.createSwapper()
            account.storage.save(<-swapper, to: self.SwapperStoragePath)

            // Create public capability
            let cap = account.capabilities.storage.issue<&{FlowActionsInterfaces.Swapper}>(
                self.SwapperStoragePath
            )
            account.capabilities.publish(cap, at: self.SwapperPublicPath)
        }
    }

    init() {
        self.SwapperStoragePath = /storage/incrementFiSwapper
        self.SwapperPublicPath = /public/incrementFiSwapper
    }
}
