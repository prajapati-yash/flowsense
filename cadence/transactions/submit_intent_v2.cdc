import FlowSenseActionsV2 from "../contracts/FlowSenseActionsV2.cdc"
import FlowToken from 0x7e60df042a9c0868
import FungibleToken from 0x9a0766d93b6608b7

// Submit and execute intent with real Flow scheduler integration
transaction(rawIntent: String, receiverAddress: Address, amount: UFix64, executeAt: UFix64) {

    // References to the user's Flow token vault
    let userVault: auth(FungibleToken.Withdraw) &FlowToken.Vault
    let userAddress: Address

    prepare(signer: auth(BorrowValue) &Account) {
        self.userAddress = signer.address

        // Get reference to the signer's stored vault
        self.userVault = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow reference to the owner's Vault!")

        log("FlowSenseV2: Transaction prepared for user ".concat(self.userAddress.toString()))
        log("FlowSenseV2: User vault balance: ".concat(self.userVault.balance.toString()))
        log("FlowSenseV2: Intent: ".concat(rawIntent))
        log("FlowSenseV2: Receiver: ".concat(receiverAddress.toString()))
        log("FlowSenseV2: Amount: ".concat(amount.toString()))
        log("FlowSenseV2: Execute at: ".concat(executeAt.toString()))
    }

    execute {
        // Submit intent to FlowSense V2 contract
        let result: FlowSenseActionsV2.ActionResult = FlowSenseActionsV2.submitAndExecuteIntent(
            user: self.userAddress,
            rawIntent: rawIntent,
            toReceiver: receiverAddress,
            amount: amount,
            executeAt: executeAt,
            userVault: self.userVault
        )

        // Log detailed result information
        log("FlowSenseV2: ==================== EXECUTION RESULT ====================")
        log("FlowSenseV2: Success: ".concat(result.success ? "true" : "false"))
        log("FlowSenseV2: Message: ".concat(result.message))
        log("FlowSenseV2: Execution Mode: ".concat(result.executionMode.rawValue.toString()))

        if let executedAt = result.executedAt {
            log("FlowSenseV2: Executed at: ".concat(executedAt.toString()))
        }

        if let scheduledFor = result.scheduledFor {
            log("FlowSenseV2: Scheduled for: ".concat(scheduledFor.toString()))
        }

        if let scheduledTxId = result.scheduledTransactionId {
            log("FlowSenseV2: Scheduled Transaction ID: ".concat(scheduledTxId.toString()))
        }

        if let gasUsed = result.gasUsed {
            log("FlowSenseV2: Gas used: ".concat(gasUsed.toString()))
        }

        // Log additional data
        for key in result.data.keys {
            log("FlowSenseV2: ".concat(key).concat(": [data available]"))
        }

        log("FlowSenseV2: =====================================================")

        // Handle execution mode specific logic
        switch result.executionMode {
            case FlowSenseActionsV2.ExecutionMode.immediate:
                if result.success {
                    log("FlowSenseV2: ✅ IMMEDIATE TRANSFER SUCCESSFUL!")
                    log("FlowSenseV2: 💰 ".concat(amount.toString()).concat(" FLOW transferred to ").concat(receiverAddress.toString()))
                } else {
                    log("FlowSenseV2: ❌ IMMEDIATE TRANSFER FAILED!")
                    log("FlowSenseV2: Error: ".concat(result.message))
                }

            case FlowSenseActionsV2.ExecutionMode.scheduled:
                if result.success {
                    log("FlowSenseV2: 📅 TRANSFER SCHEDULED SUCCESSFULLY!")
                    log("FlowSenseV2: 🚀 Transfer will execute automatically via native Flow scheduler")

                    if let scheduledFor = result.scheduledFor {
                        log("FlowSenseV2: ⏰ Scheduled For: ".concat(scheduledFor.toString()))
                        let timeUntil = scheduledFor - getCurrentBlock().timestamp
                        log("FlowSenseV2: ⏳ Time until execution: ".concat(timeUntil.toString()).concat(" seconds"))
                    }

                    if let scheduledTxId = result.scheduledTransactionId {
                        log("FlowSenseV2: 🆔 Flow Scheduler Transaction ID: ".concat(scheduledTxId.toString()))
                    }

                    log("FlowSenseV2: 📝 Status: SCHEDULED FOR AUTONOMOUS EXECUTION")
                } else {
                    log("FlowSenseV2: ❌ SCHEDULING FAILED!")
                    log("FlowSenseV2: Error: ".concat(result.message))
                }
        }

        // Final status
        if result.success {
            log("FlowSenseV2: ================== SUCCESS ==================")
        } else {
            log("FlowSenseV2: ================== FAILED ===================")
            panic("Transaction failed: ".concat(result.message))
        }
    }
}