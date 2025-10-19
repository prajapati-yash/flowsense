import FungibleToken from 0xf233dcee88fe0abe
import EVMVMBridgedToken from 0x1e4aa0b87d10b141

/// Setup stgUSDC (Stargate bridged USDC from EVM) vault
/// Required before you can receive stgUSDC from swaps
transaction() {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        let tokenAddress = Address(0xf1815bd50389c46847f0bda824ec8da914045d14)

        let storagePath = StoragePath(identifier: "EVMVMBridgedToken_f1815bd50389c46847f0bda824ec8da914045d14Vault")!
        let receiverPath = PublicPath(identifier: "EVMVMBridgedToken_f1815bd50389c46847f0bda824ec8da914045d14Receiver")!
        let balancePath = PublicPath(identifier: "EVMVMBridgedToken_f1815bd50389c46847f0bda824ec8da914045d14Balance")!

        // Check if vault already exists
        if signer.storage.borrow<&AnyResource>(from: storagePath) != nil {
            log("✅ stgUSDC vault already exists - no setup needed")
            return
        }

        log("Creating new stgUSDC vault...")

        // Create new vault
        let vault <- EVMVMBridgedToken.createEmptyVault(evmAddressHex: tokenAddress)

        // Save it to storage
        signer.storage.save(<-vault, to: storagePath)

        // Create public receiver capability
        let receiverCap = signer.capabilities.storage.issue<&{FungibleToken.Receiver}>(storagePath)
        signer.capabilities.publish(receiverCap, at: receiverPath)

        // Create public balance capability
        let balanceCap = signer.capabilities.storage.issue<&{FungibleToken.Balance}>(storagePath)
        signer.capabilities.publish(balanceCap, at: balancePath)

        log("✅ stgUSDC vault created successfully!")
        log("You can now receive stgUSDC from swaps")
    }
}
