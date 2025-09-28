import FlowToken from 0x7e60df042a9c0868
import FungibleToken from 0x9a0766d93b6608b7

// Native Flow Scheduled Transactions Support - PROPER IMPLEMENTATION
import FlowTransactionScheduler from 0x8c5303eaa26202d6
import FlowTransactionSchedulerUtils from 0x8c5303eaa26202d6

// FlowSense Actions V2 - Updated with Real Flow Scheduler Integration
// This version implements the actual Flow scheduler API for working scheduled transactions
access(all) contract FlowSenseActionsV2 {

    // Events for tracking all activity
    access(all) event IntentSubmitted(id: UInt64, user: Address, intent: String, executeAt: UFix64)
    access(all) event ActionDiscovered(actionType: String, user: Address)
    access(all) event TransferExecutedImmediately(id: UInt64, from: Address, to: Address, amount: UFix64)
    access(all) event TransferScheduled(id: UInt64, from: Address, to: Address, amount: UFix64, executeAt: UFix64, scheduledTransactionId: UInt64)
    access(all) event WorkflowExecuted(intentId: UInt64, actionsExecuted: Int, success: Bool)

    // Execution modes for flexible timing
    access(all) enum ExecutionMode: UInt8 {
        access(all) case immediate      // Execute right now (≤5 seconds)
        access(all) case scheduled      // Execute at specific time (>5 seconds) - Native Flow scheduler
    }

    // Action status for workflow tracking
    access(all) enum ActionStatus: UInt8 {
        access(all) case pending        // Not yet executed
        access(all) case scheduled      // Scheduled for future execution
        access(all) case executed       // Successfully completed
        access(all) case failed         // Execution failed
        access(all) case cancelled      // User cancelled
    }

    // Flow Actions compliant metadata for AI discovery
    access(all) struct ActionMetadata {
        access(all) let name: String
        access(all) let description: String
        access(all) let category: String
        access(all) let tags: [String]
        access(all) let version: String
        access(all) let capabilities: [String]
        access(all) let requirements: [String]

        init(name: String, description: String, category: String, tags: [String], version: String, capabilities: [String], requirements: [String]) {
            self.name = name
            self.description = description
            self.category = category
            self.tags = tags
            self.version = version
            self.capabilities = capabilities
            self.requirements = requirements
        }
    }

    // Execution result for comprehensive feedback
    access(all) struct ActionResult {
        access(all) let success: Bool
        access(all) let message: String
        access(all) let executionMode: ExecutionMode
        access(all) let executedAt: UFix64?
        access(all) let scheduledFor: UFix64?
        access(all) let scheduledTransactionId: UInt64?
        access(all) let gasUsed: UFix64?
        access(all) let data: {String: AnyStruct}

        init(success: Bool, message: String, executionMode: ExecutionMode, executedAt: UFix64?, scheduledFor: UFix64?, scheduledTransactionId: UInt64?, gasUsed: UFix64?, data: {String: AnyStruct}) {
            self.success = success
            self.message = message
            self.executionMode = executionMode
            self.executedAt = executedAt
            self.scheduledFor = scheduledFor
            self.scheduledTransactionId = scheduledTransactionId
            self.gasUsed = gasUsed
            self.data = data
        }
    }

    // Data structure for scheduled transactions
    access(all) struct ScheduledTransferData {
        access(all) let id: UInt64
        access(all) let fromUser: Address
        access(all) let toReceiver: Address
        access(all) let amount: UFix64
        access(all) let originalIntent: String

        init(id: UInt64, fromUser: Address, toReceiver: Address, amount: UFix64, originalIntent: String) {
            self.id = id
            self.fromUser = fromUser
            self.toReceiver = toReceiver
            self.amount = amount
            self.originalIntent = originalIntent
        }
    }

    // User intent tracking for analytics
    access(all) struct UserIntent {
        access(all) let id: UInt64
        access(all) let user: Address
        access(all) let rawIntent: String
        access(all) let parsedActions: [TransferAction]
        access(all) var status: ActionStatus
        access(all) let submittedAt: UFix64

        init(id: UInt64, user: Address, rawIntent: String, parsedActions: [TransferAction]) {
            self.id = id
            self.user = user
            self.rawIntent = rawIntent
            self.parsedActions = parsedActions
            self.status = ActionStatus.pending
            self.submittedAt = getCurrentBlock().timestamp
        }

        access(all) fun updateStatus(_ newStatus: ActionStatus) {
            self.status = newStatus
        }
    }

    // Atomic action for FLOW transfers
    access(all) struct TransferAction {
        access(all) let id: UInt64
        access(all) let fromUser: Address
        access(all) let toReceiver: Address
        access(all) let amount: UFix64
        access(all) let executeAt: UFix64

        init(id: UInt64, fromUser: Address, toReceiver: Address, amount: UFix64, executeAt: UFix64) {
            self.id = id
            self.fromUser = fromUser
            self.toReceiver = toReceiver
            self.amount = amount
            self.executeAt = executeAt
        }

        // Execute immediate transfer
        access(all) fun executeImmediateTransfer(userVault: auth(FungibleToken.Withdraw) &FlowToken.Vault, startTime: UFix64): ActionResult {
            // Get receiver account and vault capability
            let receiverAccount = getAccount(self.toReceiver)
            let receiverVault = receiverAccount.capabilities.get<&{FungibleToken.Receiver}>(/public/flowTokenReceiver).borrow()

            if receiverVault == nil {
                return ActionResult(
                    success: false,
                    message: "Could not get receiver vault for ".concat(self.toReceiver.toString()),
                    executionMode: ExecutionMode.immediate,
                    executedAt: nil,
                    scheduledFor: nil,
                    scheduledTransactionId: nil,
                    gasUsed: getCurrentBlock().timestamp - startTime,
                    data: {"error": "receiver_vault_not_found", "receiver": self.toReceiver}
                )
            }

            // Execute transfer
            let transferVault <- userVault.withdraw(amount: self.amount)
            receiverVault!.deposit(from: <-transferVault)

            // Emit success event
            emit TransferExecutedImmediately(id: self.id, from: self.fromUser, to: self.toReceiver, amount: self.amount)

            return ActionResult(
                success: true,
                message: "Transfer executed successfully",
                executionMode: ExecutionMode.immediate,
                executedAt: getCurrentBlock().timestamp,
                scheduledFor: nil,
                scheduledTransactionId: nil,
                gasUsed: getCurrentBlock().timestamp - startTime,
                data: {
                    "transfer_id": self.id,
                    "amount_transferred": self.amount,
                    "receiver_verified": true,
                    "execution_time": getCurrentBlock().timestamp
                }
            )
        }
    }

    // NATIVE FLOW SCHEDULED TRANSACTIONS HANDLER
    access(all) resource FlowSenseTransferHandler: FlowTransactionScheduler.TransactionHandler {

        // Execute scheduled transfer when triggered by Flow scheduler
        access(FlowTransactionScheduler.Execute) fun executeTransaction(id: UInt64, data: AnyStruct?) {
            log("FlowSenseTransferHandler: Executing scheduled transaction ID ".concat(id.toString()))

            // Validate and extract transfer data
            if let transferData = data as? ScheduledTransferData {
                log("FlowSenseTransferHandler: Processing transfer of ".concat(transferData.amount.toString()).concat(" FLOW"))

                // Execute the scheduled transfer
                self.executeScheduledTransfer(transferData)
            } else {
                log("FlowSenseTransferHandler: ERROR - Invalid transfer data format for transaction ID ".concat(id.toString()))
            }
        }

        // Execute the actual scheduled transfer
        access(all) fun executeScheduledTransfer(_ data: ScheduledTransferData) {
            // Get user account and vault
            let userAccount = getAccount(data.fromUser)
            let userVaultCap = userAccount.capabilities.get<auth(FungibleToken.Withdraw) &FlowToken.Vault>(/public/flowTokenVault)

            if !userVaultCap.check() {
                log("FlowSenseTransferHandler: ERROR - Could not access user vault for ".concat(data.fromUser.toString()))
                return
            }

            let userVault = userVaultCap.borrow()!

            // Get receiver account and vault
            let receiverAccount = getAccount(data.toReceiver)
            let receiverVault = receiverAccount.capabilities.get<&{FungibleToken.Receiver}>(/public/flowTokenReceiver).borrow()

            if receiverVault == nil {
                log("FlowSenseTransferHandler: ERROR - Could not get receiver vault for ".concat(data.toReceiver.toString()))
                return
            }

            // Check balance
            if userVault.balance < data.amount {
                log("FlowSenseTransferHandler: ERROR - Insufficient balance. Required: ".concat(data.amount.toString()).concat(", Available: ").concat(userVault.balance.toString()))
                return
            }

            // Execute transfer
            let transferVault <- userVault.withdraw(amount: data.amount)
            receiverVault!.deposit(from: <-transferVault)

            // Update contract storage
            FlowSenseActionsV2.completedTransfers[data.id] = FlowSenseActionsV2.scheduledTransfers[data.id]!
            FlowSenseActionsV2.scheduledTransfers.remove(key: data.id)

            // Update intent status
            if let intent = FlowSenseActionsV2.userIntents[data.id] {
                intent.updateStatus(ActionStatus.executed)
                FlowSenseActionsV2.userIntents[data.id] = intent
            }

            log("FlowSenseTransferHandler: SUCCESS - Transfer completed for ID ".concat(data.id.toString()))
        }

        // Required interface methods for Flow scheduler
        access(all) view fun getViews(): [Type] {
            return []
        }

        access(all) view fun resolveView(_ view: Type): AnyStruct? {
            return nil
        }

        init() {
            log("FlowSenseTransferHandler: Handler resource initialized")
        }
    }

    // Contract storage
    access(all) var nextIntentId: UInt64
    access(self) var userIntents: {UInt64: UserIntent}
    access(self) var userIntentLists: {Address: [UInt64]}
    access(self) var registeredActions: {String: ActionMetadata}
    access(self) var scheduledTransfers: {UInt64: TransferAction}
    access(self) var completedTransfers: {UInt64: TransferAction}

    // Storage paths for handler management
    access(all) let HandlerStoragePath: StoragePath
    access(all) let HandlerPublicPath: PublicPath
    access(all) let HandlerPrivatePath: PrivatePath

    init() {
        self.nextIntentId = 1
        self.userIntents = {}
        self.userIntentLists = {}
        self.registeredActions = {}
        self.scheduledTransfers = {}
        self.completedTransfers = {}

        // Storage paths
        self.HandlerStoragePath = /storage/FlowSenseTransferHandlerV2
        self.HandlerPublicPath = /public/FlowSenseTransferHandlerV2
        self.HandlerPrivatePath = /private/FlowSenseTransferHandlerV2Private

        // Register core transfer action
        self.registeredActions["transfer"] = ActionMetadata(
            name: "Smart FLOW Transfer V2",
            description: "AI-powered FLOW transfers with real scheduled execution",
            category: "DeFi",
            tags: ["transfer", "scheduling", "FLOW", "AI", "automation"],
            version: "2.0.0",
            capabilities: ["immediate_transfer", "scheduled_transfer", "balance_validation", "receiver_verification"],
            requirements: ["FLOW_balance", "receiver_address", "valid_amount"]
        )

        // Setup transaction handler in contract account
        self.setupContractHandler()
    }

    // Setup the transaction handler in contract account
    access(self) fun setupContractHandler() {
        // Create and save handler
        let handler <- create FlowSenseTransferHandler()
        self.account.storage.save(<-handler, to: self.HandlerStoragePath)

        // Create capabilities with proper entitlements for Flow scheduler
        let executeCap = self.account.capabilities.storage.issue<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>(self.HandlerStoragePath)
        self.account.capabilities.unpublish(self.HandlerPrivatePath)
        self.account.capabilities.publish(executeCap, at: self.HandlerPrivatePath)

        let publicCap = self.account.capabilities.storage.issue<&FlowSenseTransferHandler>(self.HandlerStoragePath)
        self.account.capabilities.unpublish(self.HandlerPublicPath)
        self.account.capabilities.publish(publicCap, at: self.HandlerPublicPath)

        log("FlowSenseActionsV2: Contract handler setup completed with proper entitlements")
    }

    // Enhanced intent submission with real Flow scheduler
    access(all) fun submitAndExecuteIntent(
        user: Address,
        rawIntent: String,
        toReceiver: Address,
        amount: UFix64,
        executeAt: UFix64,
        userVault: auth(FungibleToken.Withdraw) &FlowToken.Vault
    ): ActionResult {
        let startTime = getCurrentBlock().timestamp

        // Create transfer action
        let transferAction = TransferAction(
            id: self.nextIntentId,
            fromUser: user,
            toReceiver: toReceiver,
            amount: amount,
            executeAt: executeAt
        )

        // Determine execution mode
        let executionMode = self.determineExecutionMode(action: transferAction)

        // Create intent with parsed action
        let intent = UserIntent(
            id: self.nextIntentId,
            user: user,
            rawIntent: rawIntent,
            parsedActions: [transferAction]
        )

        // Store intent
        self.userIntents[self.nextIntentId] = intent
        if self.userIntentLists[user] == nil {
            self.userIntentLists[user] = []
        }
        self.userIntentLists[user]!.append(self.nextIntentId)

        // Emit intent submission event
        emit IntentSubmitted(
            id: self.nextIntentId,
            user: user,
            intent: rawIntent,
            executeAt: executeAt
        )

        // Execute based on determined mode
        let result: ActionResult = self.executeBasedOnMode(
            executionMode: executionMode,
            transferAction: transferAction,
            userVault: userVault,
            startTime: startTime
        )

        // Increment counter only on success
        if result.success {
            self.nextIntentId = self.nextIntentId + 1
        }

        return result
    }

    // Execute based on determined mode
    access(all) fun executeBasedOnMode(
        executionMode: ExecutionMode,
        transferAction: TransferAction,
        userVault: auth(FungibleToken.Withdraw) &FlowToken.Vault,
        startTime: UFix64
    ): ActionResult {
        switch executionMode {
            case ExecutionMode.immediate:
                return transferAction.executeImmediateTransfer(userVault: userVault, startTime: startTime)

            case ExecutionMode.scheduled:
                return self.scheduleWithNativeFlow(
                    transferAction: transferAction,
                    userVault: userVault,
                    startTime: startTime
                )

            default:
                return ActionResult(
                    success: false,
                    message: "Unsupported execution mode",
                    executionMode: executionMode,
                    executedAt: nil,
                    scheduledFor: nil,
                    scheduledTransactionId: nil,
                    gasUsed: getCurrentBlock().timestamp - startTime,
                    data: {"error": "unsupported_mode"}
                )
        }
    }

    // Schedule with native Flow scheduler
    access(all) fun scheduleWithNativeFlow(
        transferAction: TransferAction,
        userVault: auth(FungibleToken.Withdraw) &FlowToken.Vault,
        startTime: UFix64
    ): ActionResult {
        // Prepare transfer data
        let transferData = ScheduledTransferData(
            id: transferAction.id,
            fromUser: transferAction.fromUser,
            toReceiver: transferAction.toReceiver,
            amount: transferAction.amount,
            originalIntent: "Scheduled FLOW transfer via FlowSense AI"
        )

        log("FlowSenseV2: Scheduling with REAL Flow scheduler")
        log("FlowSenseV2: Transfer ID: ".concat(transferAction.id.toString()))
        log("FlowSenseV2: Execute at: ".concat(transferAction.executeAt.toString()))

        // Estimate with REAL Flow scheduler
        let estimate = FlowTransactionScheduler.estimate(
            data: transferData,
            timestamp: transferAction.executeAt,
            priority: FlowTransactionScheduler.Priority.High,
            executionEffort: 100
        )

        // Check for estimation errors
        if estimate.error != nil {
            return ActionResult(
                success: false,
                message: "Scheduling estimation failed: ".concat(estimate.error!),
                executionMode: ExecutionMode.scheduled,
                executedAt: nil,
                scheduledFor: nil,
                scheduledTransactionId: nil,
                gasUsed: getCurrentBlock().timestamp - startTime,
                data: {"error": "estimation_failed", "estimate_error": estimate.error!}
            )
        }

        // Check if user has enough balance for transfer + fees
        let schedulingFees = estimate.flowFee ?? 0.001 // Default fee if estimate fails
        let totalRequired = transferAction.amount + schedulingFees
        if userVault.balance < totalRequired {
            return ActionResult(
                success: false,
                message: "Insufficient balance. Required: ".concat(totalRequired.toString()).concat(" FLOW (including scheduling fees)"),
                executionMode: ExecutionMode.scheduled,
                executedAt: nil,
                scheduledFor: nil,
                scheduledTransactionId: nil,
                gasUsed: getCurrentBlock().timestamp - startTime,
                data: {
                    "required_balance": totalRequired,
                    "available_balance": userVault.balance,
                    "transfer_amount": transferAction.amount,
                    "scheduling_fees": schedulingFees
                }
            )
        }

        // Get handler capability with proper interface conformance
        let handlerCap = self.account.capabilities.get<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>(self.HandlerPrivatePath)
        if !handlerCap.check() {
            return ActionResult(
                success: false,
                message: "Could not access handler capability",
                executionMode: ExecutionMode.scheduled,
                executedAt: nil,
                scheduledFor: nil,
                scheduledTransactionId: nil,
                gasUsed: getCurrentBlock().timestamp - startTime,
                data: {"error": "handler_capability_failed"}
            )
        }

        // Create manager if it doesn't exist
        if self.account.storage.borrow<&AnyResource>(from: FlowTransactionSchedulerUtils.managerStoragePath) == nil {
            let manager <- FlowTransactionSchedulerUtils.createManager()
            self.account.storage.save(<-manager, to: FlowTransactionSchedulerUtils.managerStoragePath)
        }

        // Borrow manager
        let manager = self.account.storage.borrow<auth(FlowTransactionSchedulerUtils.Owner) &{FlowTransactionSchedulerUtils.Manager}>(
            from: FlowTransactionSchedulerUtils.managerStoragePath
        )
        if manager == nil {
            return ActionResult(
                success: false,
                message: "Could not borrow scheduler manager",
                executionMode: ExecutionMode.scheduled,
                executedAt: nil,
                scheduledFor: nil,
                scheduledTransactionId: nil,
                gasUsed: getCurrentBlock().timestamp - startTime,
                data: {"error": "manager_borrow_failed"}
            )
        }

        // Withdraw fees for REAL Flow scheduler
        let fees <- userVault.withdraw(amount: schedulingFees) as! @FlowToken.Vault

        // Schedule with REAL Flow scheduler - 100% implementation
        let scheduledId = manager!.schedule(
            handlerCap: handlerCap,
            data: transferData,
            timestamp: transferAction.executeAt,
            priority: FlowTransactionScheduler.Priority.High,
            executionEffort: 100,
            fees: <-fees
        )

        log("FlowSenseV2: SUCCESS! Real Flow scheduler registration completed")
        log("FlowSenseV2: Scheduled Transaction ID: ".concat(scheduledId.toString()))

        // Store scheduled transfer
        self.scheduledTransfers[transferAction.id] = transferAction

        // Emit scheduling event
        emit TransferScheduled(
            id: transferAction.id,
            from: transferAction.fromUser,
            to: transferAction.toReceiver,
            amount: transferAction.amount,
            executeAt: transferAction.executeAt,
            scheduledTransactionId: scheduledId
        )

        return ActionResult(
            success: true,
            message: "Transfer scheduled successfully with native Flow scheduler",
            executionMode: ExecutionMode.scheduled,
            executedAt: nil,
            scheduledFor: transferAction.executeAt,
            scheduledTransactionId: scheduledId,
            gasUsed: getCurrentBlock().timestamp - startTime,
            data: {
                "scheduled_transaction_id": scheduledId,
                "transfer_id": transferAction.id,
                "execution_time": transferAction.executeAt,
                "fees_paid": schedulingFees,
                "scheduler_type": "real_flow_scheduler"
            }
        )
    }

    // Mode detection logic
    access(all) fun determineExecutionMode(action: TransferAction): ExecutionMode {
        let currentTime = getCurrentBlock().timestamp
        let timeDiff = action.executeAt - currentTime

        // Immediate execution (≤5 seconds)
        if timeDiff <= 5.0 {
            return ExecutionMode.immediate
        }

        // Scheduled execution for future times
        return ExecutionMode.scheduled
    }

    // Action discovery for AI agents
    access(all) fun discoverActions(category: String?): [ActionMetadata] {
        let results: [ActionMetadata] = []

        for actionType in self.registeredActions.keys {
            let metadata = self.registeredActions[actionType]!

            if category == nil || metadata.category == category {
                results.append(metadata)
            }
        }

        return results
    }

    // Get user statistics
    access(all) fun getUserStats(user: Address): {String: AnyStruct} {
        let intentIds = self.userIntentLists[user] ?? []
        var totalIntents = intentIds.length
        var executedCount = 0
        var scheduledCount = 0
        var failedCount = 0

        for intentId in intentIds {
            if let intent = self.userIntents[intentId] {
                switch intent.status {
                    case ActionStatus.executed:
                        executedCount = executedCount + 1
                    case ActionStatus.scheduled:
                        scheduledCount = scheduledCount + 1
                    case ActionStatus.failed:
                        failedCount = failedCount + 1
                }
            }
        }

        return {
            "total_intents": totalIntents,
            "executed_count": executedCount,
            "scheduled_count": scheduledCount,
            "failed_count": failedCount,
            "success_rate": totalIntents > 0 ? UFix64(executedCount) / UFix64(totalIntents) : 0.0,
            "user_address": user
        }
    }

    // Get user intent history
    access(all) fun getUserIntents(user: Address): [UserIntent] {
        let intentIds = self.userIntentLists[user] ?? []
        let results: [UserIntent] = []

        for intentId in intentIds {
            if let intent = self.userIntents[intentId] {
                results.append(intent)
            }
        }

        return results
    }

    // Create a new transaction handler (for external setup)
    access(all) fun createFlowSenseTransferHandler(): @FlowSenseTransferHandler {
        return <-create FlowSenseTransferHandler()
    }
}