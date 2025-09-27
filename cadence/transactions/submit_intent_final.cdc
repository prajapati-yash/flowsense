import FlowSenseActionsFinal from 0x9c23faae746705fe
import FlowToken from 0x7e60df042a9c0868
import FungibleToken from 0x9a0766d93b6608b7

// Unified transaction - Discovery + Intent Submission + Execution
// Perfect for Flow Actions bounty - AI agents can discover, submit, and execute in one flow
transaction(rawIntent: String, receiverAddress: Address, amount: UFix64, executeAt: UFix64) {

    let userAddress: Address
    let userVault: auth(FungibleToken.Withdraw) &FlowToken.Vault

    prepare(signer: auth(Storage, BorrowValue) &Account) {
        self.userAddress = signer.address

        // Get authorized vault reference for transfers
        self.userVault = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow FlowToken vault with withdraw authorization")

        // Comprehensive validation
        if amount <= 0.0 {
            panic("Amount must be greater than 0")
        }

        if executeAt < getCurrentBlock().timestamp {
            panic("Execute time must be in the future")
        }

        if self.userAddress == receiverAddress {
            panic("Cannot transfer to yourself")
        }

        // Validate receiver can receive tokens
        let receiverAccount = getAccount(receiverAddress)
        let receiverVault = receiverAccount.capabilities.get<&{FungibleToken.Receiver}>(/public/flowTokenReceiver).borrow()
        if receiverVault == nil {
            panic("Receiver does not have a valid FlowToken receiver capability")
        }

        // For immediate transfers, validate balance upfront
        let currentTime = getCurrentBlock().timestamp
        let isImmediate = (executeAt - currentTime) <= 5.0

        if isImmediate && self.userVault.balance < amount {
            panic("Insufficient balance for immediate transfer. Required: ".concat(amount.toString()).concat(", Available: ").concat(self.userVault.balance.toString()))
        }
    }

    execute {
        // Submit intent and execute in one call
        let result = FlowSenseActionsFinal.submitAndExecuteIntent(
            user: self.userAddress,
            rawIntent: rawIntent,
            toReceiver: receiverAddress,
            amount: amount,
            executeAt: executeAt,
            userVault: self.userVault
        )

        if !result.success {
            panic("Intent execution failed: ".concat(result.message))
        }

        // Comprehensive logging based on execution mode
        switch result.executionMode {
            case FlowSenseActionsFinal.ExecutionMode.immediate:
                log("🚀 IMMEDIATE TRANSFER EXECUTED!")
                log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
                log("💬 User Intent: \"".concat(rawIntent).concat("\""))
                log("💰 Amount: ".concat(amount.toString()).concat(" FLOW"))
                log("👤 From: ".concat(self.userAddress.toString()))
                log("🎯 To: ".concat(receiverAddress.toString()))
                log("⏰ Executed At: ".concat(result.executedAt!.toString()))
                log("⚡ Gas Used: ".concat(result.gasUsed!.toString()).concat(" seconds"))
                log("✅ Status: COMPLETED")
                log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

            case FlowSenseActionsFinal.ExecutionMode.scheduled:
                log("📅 TRANSFER SCHEDULED FOR FUTURE!")
                log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
                log("💬 User Intent: \"".concat(rawIntent).concat("\""))
                log("💰 Amount: ".concat(amount.toString()).concat(" FLOW"))
                log("👤 From: ".concat(self.userAddress.toString()))
                log("🎯 To: ".concat(receiverAddress.toString()))
                log("⏰ Scheduled For: ".concat(result.scheduledFor!.toString()))
                let timeUntil = result.scheduledFor! - getCurrentBlock().timestamp
                log("⏳ Time Until Execution: ".concat(timeUntil.toString()).concat(" seconds"))
                log("⚡ Processing Time: ".concat(result.gasUsed!.toString()).concat(" seconds"))
                log("📝 Status: SCHEDULED")
                log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

            default:
                log("❓ Unknown execution mode")
        }

        log("✨ FlowSense AI Agent successfully processed your intent!")
        log("🔍 Your intent has been understood, validated, and executed.")
        log("📊 Result: ".concat(result.message))

        // AI Agent discovery demo
        log("")
        log("🤖 AI AGENT CAPABILITIES DISCOVERED:")
        log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        let availableActions = FlowSenseActionsFinal.discoverActions(category: nil)
        for action in availableActions {
            log("🔧 ".concat(action.name).concat(" (v").concat(action.version).concat(")"))
            log("   📝 ".concat(action.description))
            log("   🏷️  Category: ".concat(action.category))
            log("   ⚡ Capabilities: ".concat(action.capabilities.length.toString()).concat(" features"))
            log("   📋 Requirements: ".concat(action.requirements.length.toString()).concat(" dependencies"))
        }
        log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    }
}