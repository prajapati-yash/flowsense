import FlowToken from 0x7e60df042a9c0868
import FungibleToken from 0x9a0766d93b6608b7

// Simple immediate FLOW transfer transaction
transaction(amount: UFix64, to: Address) {

    let sentVault: @{FungibleToken.Vault}

    prepare(signer: auth(Storage, BorrowValue) &Account) {

        // Get a reference to the signer's stored vault
        let vaultRef = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow reference to the owner's Vault!")

        // Withdraw tokens from the signer's stored vault
        self.sentVault <- vaultRef.withdraw(amount: amount)
    }

    execute {

        // Get the recipient's public account object
        let recipient = getAccount(to)

        // Get a reference to the recipient's Receiver
        let receiverRef = recipient.capabilities.get<&{FungibleToken.Receiver}>(/public/flowTokenReceiver).borrow()
            ?? panic("Could not borrow receiver reference to the recipient's Vault")

        // Deposit the withdrawn tokens in the recipient's receiver
        receiverRef.deposit(from: <-self.sentVault)

        log("Transfer completed successfully!")
        log("Amount: ".concat(amount.toString()).concat(" FLOW"))
        log("To: ".concat(to.toString()))
    }
}