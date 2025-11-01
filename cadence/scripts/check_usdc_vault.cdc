import FungibleToken from 0xf233dcee88fe0abe
import FiatToken from 0xb19436aae4d94622

/// Check if an address has a USDC vault set up
access(all) fun main(address: Address): Bool {
    let account = getAccount(address)

    // Check if the account has a USDC vault in storage
    let vaultRef = account.capabilities.borrow<&{FungibleToken.Balance}>(
        /public/fiatTokenBalance
    )

    return vaultRef != nil
}
