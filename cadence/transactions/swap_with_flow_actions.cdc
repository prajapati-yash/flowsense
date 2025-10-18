import FungibleToken from 0xf233dcee88fe0abe
import FlowActionsInterfaces from "../contracts/FlowActionsInterfaces.cdc"
import IncrementFiConnector from "../contracts/connectors/IncrementFiConnector.cdc"

/// Swap using Flow Actions Swapper interface
/// Works with any connector that implements the Swapper interface
///
/// @param amountIn - Amount of input tokens to swap
/// @param amountOutMin - Minimum output amount (slippage protection)
/// @param tokenInPath - Storage path for input token vault
/// @param tokenOutType - Type identifier for output token
/// @param tokenOutReceiverPath - Public receiver path for output token
///
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

        // Get quote for slippage check (optional, for logging)
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
