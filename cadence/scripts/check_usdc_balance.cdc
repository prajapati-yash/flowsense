import FungibleToken from 0xf233dcee88fe0abe
import USDCFlow from 0xf1ab99c82dee3526

/// Check USDC.e balance for an address
access(all) fun main(address: Address): {String: AnyStruct} {
    let account = getAccount(address)

    // Try to borrow USDC vault
    let vaultRef = account.capabilities.borrow<&{FungibleToken.Balance}>(
        /public/usdcFlowBalance
    )

    if vaultRef == nil {
        return {
            "hasVault": false,
            "balance": 0.0,
            "message": "⚠️ No USDC.e vault found. Run setup_usdc_vault.cdc first."
        }
    }

    return {
        "hasVault": true,
        "balance": vaultRef!.balance,
        "message": "✅ USDC.e balance: ".concat(vaultRef!.balance.toString())
    }
}
