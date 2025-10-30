import FlowActionsInterfaces from "../contracts/FlowActionsInterfaces.cdc"
import IncrementFiConnector from "../contracts/connectors/IncrementFiConnector.cdc"

/// Get swap quote using Flow Actions Swapper
///
/// @param swapperAddress - Address of account with swapper
/// @param tokenInType - Type identifier for input token
/// @param tokenOutType - Type identifier for output token
/// @param amountIn - Amount of input tokens
///
/// @return Expected output amount
access(all) fun main(
    swapperAddress: Address,
    tokenInType: String,
    tokenOutType: String,
    amountIn: UFix64
): UFix64 {
    // Parse token types
    let tokenIn = CompositeType(tokenInType)
        ?? panic("Invalid input token type: ".concat(tokenInType))

    let tokenOut = CompositeType(tokenOutType)
        ?? panic("Invalid output token type: ".concat(tokenOutType))

    // Borrow swapper
    let account = getAccount(swapperAddress)
    let swapper = account.capabilities.borrow<&{FlowActionsInterfaces.Swapper}>(
        IncrementFiConnector.SwapperPublicPath
    ) ?? panic("Could not borrow Swapper from address ".concat(swapperAddress.toString()))

    // Get quote
    return swapper.getQuote(
        tokenInType: tokenIn,
        tokenOutType: tokenOut,
        amountIn: amountIn
    )
}
