import FungibleToken from 0xf233dcee88fe0abe
import EVMVMBridgedToken from 0x1e4aa0b87d10b141

/// Setup stgUSDT (Stargate bridged USDT from EVM) vault
/// Required before you can receive stgUSDT from swaps
transaction() {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        let tokenAddress = Address(0x674843c06ff83502ddb4d37c2e09c01cda38cbc8)

        let storagePath = StoragePath(identifier: "EVMVMBridgedToken_674843c06ff83502ddb4d37c2e09c01cda38cbc8Vault")!
        let receiverPath = PublicPath(identifier: "EVMVMBridgedToken_674843c06ff83502ddb4d37c2e09c01cda38cbc8Receiver")!
        let balancePath = PublicPath(identifier: "EVMVMBridgedToken_674843c06ff83502ddb4d37c2e09c01cda38cbc8Balance")!

        // Check if vault already exists
        if signer.storage.borrow<&AnyResource>(from: storagePath) != nil {
            log("✅ stgUSDT vault already exists - no setup needed")
            return
        }

        log("Creating new stgUSDT vault...")

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

        log("✅ stgUSDT vault created successfully!")
        log("You can now receive stgUSDT from swaps")
    }
}
