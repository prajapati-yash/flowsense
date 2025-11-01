import SwapFactory from 0xb063c16cac85dbd1
import SwapConfig from 0xb78ef7afa52ff906

/// Check if a trading pair exists on IncrementFi
/// Returns the pair address if it exists, nil otherwise
access(all) fun main(token0Identifier: String, token1Identifier: String): Address? {
    let token0Key = SwapConfig.SliceTokenTypeIdentifierFromVaultType(vaultTypeIdentifier: token0Identifier)
    let token1Key = SwapConfig.SliceTokenTypeIdentifierFromVaultType(vaultTypeIdentifier: token1Identifier)

    let pairAddr = SwapFactory.getPairAddress(token0Key: token0Key, token1Key: token1Key)

    if pairAddr != nil {
        log("✅ Pair exists!")
        log("Token 0: ".concat(token0Key))
        log("Token 1: ".concat(token1Key))
        log("Pair Address: ".concat(pairAddr!.toString()))
    } else {
        log("❌ Pair does not exist")
        log("Token 0: ".concat(token0Key))
        log("Token 1: ".concat(token1Key))
    }

    return pairAddr
}
