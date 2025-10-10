import FungibleToken from 0xf233dcee88fe0abe
import SwapFactory from 0xb063c16cac85dbd1
import SwapInterfaces from 0xb78ef7afa52ff906
import SwapConfig from 0xb78ef7afa52ff906

/// Generic IncrementFi swap transaction for mainnet
/// Swaps any supported token pair (FLOW, USDC, stgUSDC, etc.)
///
/// @param amountIn - Amount of input tokens to swap
/// @param amountOutMin - Minimum output amount (slippage protection, typically 0.5% less than expected)
/// @param swapPath - Token identifiers [inputToken, outputToken]
/// @param tokenInPath - Storage path for input token vault (e.g., /storage/flowTokenVault)
/// @param tokenInReceiverPath - Public receiver path for input token (e.g., /public/flowTokenReceiver)
/// @param tokenOutReceiverPath - Public receiver path for output token (e.g., /public/fiatTokenReceiver)
///
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
