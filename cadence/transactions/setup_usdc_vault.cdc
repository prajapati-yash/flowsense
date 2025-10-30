import FungibleToken from 0xf233dcee88fe0abe
import USDCFlow from 0xf1ab99c82dee3526

/// Setup USDC.e vault for the first time
/// Required before you can receive USDC from swaps
/// Note: Uses USDCFlow (bridged USDC) - native USDC was discontinued Sept 2024
transaction() {
    prepare(signer: auth(Storage, Capabilities) &Account) {

        // Check if vault already exists
        if signer.storage.borrow<&USDCFlow.Vault>(from: /storage/usdcFlowVault) != nil {
            log("✅ USDC.e vault already exists - no setup needed")
            return
        }

        log("Creating new USDC.e vault...")

        // Create new USDC vault
        let vault <- USDCFlow.createEmptyVault(vaultType: Type<@USDCFlow.Vault>())

        // Save it to storage
        signer.storage.save(<-vault, to: /storage/usdcFlowVault)

        // Create public receiver capability
        let receiverCap = signer.capabilities.storage.issue<&{FungibleToken.Receiver}>(
            /storage/usdcFlowVault
        )
        signer.capabilities.publish(receiverCap, at: /public/usdcFlowReceiver)

        // Create public balance capability
        let balanceCap = signer.capabilities.storage.issue<&{FungibleToken.Balance}>(
            /storage/usdcFlowVault
        )
        signer.capabilities.publish(balanceCap, at: /public/usdcFlowBalance)

        log("✅ USDC.e vault created successfully!")
        log("You can now receive USDC from swaps")
    }
}
