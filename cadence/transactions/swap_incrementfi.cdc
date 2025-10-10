import FungibleToken from 0xf233dcee88fe0abe
import FlowToken from 0x1654653399040a61
import FiatToken from 0xb19436aae4d94622
import SwapFactory from 0xb063c16cac85dbd1
import SwapInterfaces from 0xb78ef7afa52ff906
import SwapConfig from 0xb78ef7afa52ff906

/// Direct IncrementFi swap transaction for mainnet
/// Swaps FLOW tokens for USDC (or vice versa)
transaction(
    amountIn: UFix64,
    amountOutMin: UFix64,
    swapPath: [String]  // e.g., ["A.1654653399040a61.FlowToken", "A.b19436aae4d94622.FiatToken"]
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

        // Determine input token and get vault
        let isToken0In = swapPath[0] == Type<@FlowToken.Vault>().identifier

        if isToken0In {
            // Swapping FLOW for USDC
            let flowVault = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
                from: /storage/flowTokenVault
            ) ?? panic("Could not borrow FlowToken vault")

            // Withdraw input amount
            self.tokenInVault <- flowVault.withdraw(amount: amountIn)

            // Get USDC receiver
            self.tokenOutReceiverRef = signer.capabilities.get<&{FungibleToken.Receiver}>(
                /public/fiatTokenReceiver
            ).borrow() ?? panic("Could not borrow FiatToken receiver")

        } else {
            // Swapping USDC for FLOW
            let usdcVault = signer.storage.borrow<auth(FungibleToken.Withdraw) &FiatToken.Vault>(
                from: /storage/fiatTokenVault
            ) ?? panic("Could not borrow FiatToken vault")

            // Withdraw input amount
            self.tokenInVault <- usdcVault.withdraw(amount: amountIn)

            // Get FLOW receiver
            self.tokenOutReceiverRef = signer.capabilities.get<&{FungibleToken.Receiver}>(
                /public/flowTokenReceiver
            ).borrow() ?? panic("Could not borrow FlowToken receiver")
        }
    }

    execute {
        // Get swap quote first to check slippage
        let pairInfo = self.pairPublicRef.getPairInfo()
        let reserve0 = pairInfo[2] as! UFix64
        let reserve1 = pairInfo[3] as! UFix64

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
