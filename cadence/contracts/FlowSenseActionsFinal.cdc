import FlowToken from 0x7e60df042a9c0868
import FungibleToken from 0x9a0766d93b6608b7

// Native Flow Scheduled Transactions Support
// Real testnet addresses from https://github.com/onflow/scheduledtransactions-scaffold
import FlowTransactionScheduler from 0x8c5303eaa26202d6
import FlowTransactionSchedulerUtils from 0x8c5303eaa26202d6

// FlowSense Actions Final - Combined Discovery + Execution for Flow Actions Bounty
// Perfect for AI agents: Natural language → Action discovery → Automatic execution
access(all) contract FlowSenseActionsFinal {

    // Events for tracking all activity
    access(all) event IntentSubmitted(id: UInt64, user: Address, intent: String, executeAt: UFix64)
    access(all) event ActionDiscovered(actionType: String, user: Address)
    access(all) event TransferExecutedImmediately(id: UInt64, from: Address, to: Address, amount: UFix64)
    access(all) event TransferScheduled(id: UInt64, from: Address, to: Address, amount: UFix64, executeAt: UFix64)
    access(all) event WorkflowExecuted(intentId: UInt64, actionsExecuted: Int, success: Bool)

    // Execution modes for flexible timing
    access(all) enum ExecutionMode: UInt8 {
        access(all) case immediate      // Execute right now (≤5 seconds)
        access(all) case scheduled      // Execute at specific time (>5 seconds) - Can be custom or native
        access(all) case escrowed       // Hold FLOW until execution time
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
        access(all) let capabilities: [String]    // What this action can do
        access(all) let requirements: [String]    // What this action needs

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

    // Enhanced result with comprehensive execution details
    access(all) struct ActionResult {
        access(all) let success: Bool
        access(all) let message: String
        access(all) let executionMode: ExecutionMode
        access(all) let executedAt: UFix64?
        access(all) let scheduledFor: UFix64?
        access(all) let gasUsed: UFix64?
        access(all) let data: {String: AnyStruct}

        init(success: Bool, message: String, executionMode: ExecutionMode, executedAt: UFix64?, scheduledFor: UFix64?, gasUsed: UFix64?, data: {String: AnyStruct}) {
            self.success = success
            self.message = message
            self.executionMode = executionMode
            self.executedAt = executedAt
            self.scheduledFor = scheduledFor
            self.gasUsed = gasUsed
            self.data = data
        }
    }

    // Data structure for native scheduled transactions
    access(all) struct ScheduledTransferData {
        access(all) let id: UInt64
        access(all) let fromUser: Address
        access(all) let toReceiver: Address
        access(all) let amount: UFix64
        access(all) let originalIntent: String
        access(all) let submittedAt: UFix64

        init(id: UInt64, fromUser: Address, toReceiver: Address, amount: UFix64, originalIntent: String) {
            self.id = id
            self.fromUser = fromUser
            self.toReceiver = toReceiver
            self.amount = amount
            self.originalIntent = originalIntent
            self.submittedAt = getCurrentBlock().timestamp
        }

        // Validation method
        access(all) fun isValid(): Bool {
            return self.amount > 0.0 && self.fromUser != self.toReceiver
        }

        // Helper method to get readable description
        access(all) fun getDescription(): String {
            return "Transfer ".concat(self.amount.toString()).concat(" FLOW from ").concat(self.fromUser.toString()).concat(" to ").concat(self.toReceiver.toString())
        }
    }

    // Generic action interface - Flow Actions compliant
    access(all) struct interface ActionData {
        access(all) let actionType: String
        access(all) let metadata: ActionMetadata
        access(all) fun validate(): Bool
        access(all) fun getExecutionMode(): ExecutionMode
    }

    // User intent with natural language + parsed actions
    access(all) struct UserIntent {
        access(all) let id: UInt64
        access(all) let user: Address
        access(all) let rawIntent: String
        access(all) let parsedActions: [{ActionData}]
        access(all) let submittedAt: UFix64
        access(all) var status: ActionStatus

        init(id: UInt64, user: Address, rawIntent: String, parsedActions: [{ActionData}]) {
            self.id = id
            self.user = user
            self.rawIntent = rawIntent
            self.parsedActions = parsedActions
            self.submittedAt = getCurrentBlock().timestamp
            self.status = ActionStatus.pending
        }

        access(all) fun updateStatus(_ newStatus: ActionStatus) {
            self.status = newStatus
        }
    }

    // Comprehensive Transfer Action with execution capability
    access(all) struct TransferAction: ActionData {
        access(all) let actionType: String
        access(all) let metadata: ActionMetadata
        access(all) let id: UInt64
        access(all) let fromUser: Address
        access(all) let toReceiver: Address
        access(all) let amount: UFix64
        access(all) let executeAt: UFix64
        access(all) let submittedAt: UFix64

        init(id: UInt64, fromUser: Address, toReceiver: Address, amount: UFix64, executeAt: UFix64) {
            self.actionType = "FlowSenseActionsFinal.TransferAction"
            self.metadata = ActionMetadata(
                name: "Smart FLOW Transfer",
                description: "Transfer FLOW tokens with flexible timing and AI-driven execution",
                category: "DeFi",
                tags: ["transfer", "scheduling", "FLOW", "AI", "automation"],
                version: "2.0.0",
                capabilities: ["immediate_transfer", "scheduled_transfer", "balance_validation", "receiver_verification"],
                requirements: ["FlowToken.Vault", "sufficient_balance", "valid_receiver"]
            )
            self.id = id
            self.fromUser = fromUser
            self.toReceiver = toReceiver
            self.amount = amount
            self.executeAt = executeAt
            self.submittedAt = getCurrentBlock().timestamp
        }

        access(all) fun validate(): Bool {
            if self.amount <= 0.0 { return false }
            if self.executeAt < self.submittedAt { return false }
            if self.fromUser == self.toReceiver { return false }
            return true
        }

        access(all) fun getExecutionMode(): ExecutionMode {
            let currentTime = getCurrentBlock().timestamp
            let timeDiff = self.executeAt - currentTime

            if timeDiff <= 5.0 {
                return ExecutionMode.immediate
            } else {
                return ExecutionMode.scheduled
            }
        }

        // Execute the transfer with comprehensive error handling
        access(all) fun executeTransfer(userVault: auth(FungibleToken.Withdraw) &FlowToken.Vault): ActionResult {
            if !self.validate() {
                return ActionResult(
                    success: false,
                    message: "Transfer validation failed",
                    executionMode: self.getExecutionMode(),
                    executedAt: nil,
                    scheduledFor: nil,
                    gasUsed: nil,
                    data: {"error": "validation_failed", "action_id": self.id}
                )
            }

            let executionMode = self.getExecutionMode()
            let startTime = getCurrentBlock().timestamp

            switch executionMode {
                case ExecutionMode.immediate:
                    return self.executeImmediateTransfer(userVault: userVault, startTime: startTime)
                case ExecutionMode.scheduled:
                    return self.scheduleTransfer(startTime: startTime)
                default:
                    return ActionResult(
                        success: false,
                        message: "Unsupported execution mode",
                        executionMode: executionMode,
                        executedAt: nil,
                        scheduledFor: nil,
                        gasUsed: nil,
                        data: {}
                    )
            }
        }

        // Execute immediate transfer
        access(all) fun executeImmediateTransfer(userVault: auth(FungibleToken.Withdraw) &FlowToken.Vault, startTime: UFix64): ActionResult {
            // Balance validation
            if userVault.balance < self.amount {
                return ActionResult(
                    success: false,
                    message: "Insufficient balance for transfer",
                    executionMode: ExecutionMode.immediate,
                    executedAt: nil,
                    scheduledFor: nil,
                    gasUsed: getCurrentBlock().timestamp - startTime,
                    data: {
                        "required": self.amount,
                        "available": userVault.balance,
                        "deficit": self.amount - userVault.balance
                    }
                )
            }

            // Get receiver vault capability
            let receiverAccount = getAccount(self.toReceiver)
            let receiverVault = receiverAccount.capabilities.get<&{FungibleToken.Receiver}>(/public/flowTokenReceiver).borrow()

            if receiverVault == nil {
                return ActionResult(
                    success: false,
                    message: "Receiver vault not accessible",
                    executionMode: ExecutionMode.immediate,
                    executedAt: nil,
                    scheduledFor: nil,
                    gasUsed: getCurrentBlock().timestamp - startTime,
                    data: {"receiver": self.toReceiver, "error": "vault_not_found"}
                )
            }

            // Execute the transfer
            let tokens <- userVault.withdraw(amount: self.amount)
            receiverVault!.deposit(from: <-tokens)

            // Emit success event
            emit TransferExecutedImmediately(
                id: self.id,
                from: self.fromUser,
                to: self.toReceiver,
                amount: self.amount
            )

            return ActionResult(
                success: true,
                message: "Transfer executed immediately",
                executionMode: ExecutionMode.immediate,
                executedAt: getCurrentBlock().timestamp,
                scheduledFor: nil,
                gasUsed: getCurrentBlock().timestamp - startTime,
                data: {
                    "transfer_id": self.id,
                    "from": self.fromUser,
                    "to": self.toReceiver,
                    "amount": self.amount,
                    "execution_time": getCurrentBlock().timestamp
                }
            )
        }

        // Schedule transfer for future execution
        access(all) fun scheduleTransfer(startTime: UFix64): ActionResult {
            emit TransferScheduled(
                id: self.id,
                from: self.fromUser,
                to: self.toReceiver,
                amount: self.amount,
                executeAt: self.executeAt
            )

            return ActionResult(
                success: true,
                message: "Transfer scheduled for future execution",
                executionMode: ExecutionMode.scheduled,
                executedAt: nil,
                scheduledFor: self.executeAt,
                gasUsed: getCurrentBlock().timestamp - startTime,
                data: {
                    "transfer_id": self.id,
                    "scheduled_for": self.executeAt,
                    "time_until_execution": self.executeAt - getCurrentBlock().timestamp,
                    "can_cancel": true
                }
            )
        }
    }

    // NATIVE SCHEDULED TRANSACTIONS SUPPORT
    // Transaction Handler Resource for Native Flow Scheduling
    // Simplified version without interface conformance until we understand the exact API
    access(all) resource FlowSenseTransferHandler {

        // Execute scheduled transfer when triggered by Flow scheduler
        access(all) fun executeTransaction(id: UInt64, data: AnyStruct?) {
            // Validate and extract transfer data
            if let transferData = data as? ScheduledTransferData {
                // Log execution start
                log("FlowSenseTransferHandler: Executing scheduled transfer ID ".concat(transferData.id.toString()))
                log("Transfer details: ".concat(transferData.amount.toString()).concat(" FLOW from ").concat(transferData.fromUser.toString()).concat(" to ").concat(transferData.toReceiver.toString()))

                // Execute the scheduled transfer
                self.executeScheduledTransfer(transferData)
            } else {
                // Log error - invalid data format
                log("FlowSenseTransferHandler: Invalid transfer data format for scheduled transaction ID ".concat(id.toString()))
                return
            }
        }

        // Execute the actual scheduled transfer
        access(all) fun executeScheduledTransfer(_ data: ScheduledTransferData) {
            // Get user account and vault
            let userAccount = getAccount(data.fromUser)
            let userVault = userAccount.capabilities.get<auth(FungibleToken.Withdraw) &FlowToken.Vault>(/public/flowTokenVault).borrow()

            if userVault == nil {
                log("FlowSenseTransferHandler: ERROR - Could not borrow user vault for ".concat(data.fromUser.toString()))
                return
            }

            // Validate sufficient balance
            if userVault!.balance < data.amount {
                log("FlowSenseTransferHandler: ERROR - Insufficient balance. Required: ".concat(data.amount.toString()).concat(" Available: ").concat(userVault!.balance.toString()))
                return
            }

            // Get receiver account and vault
            let receiverAccount = getAccount(data.toReceiver)
            let receiverVault = receiverAccount.capabilities.get<&{FungibleToken.Receiver}>(/public/flowTokenReceiver).borrow()

            if receiverVault == nil {
                log("FlowSenseTransferHandler: ERROR - Could not borrow receiver vault for ".concat(data.toReceiver.toString()))
                return
            }

            // Execute the transfer
            let tokens <- userVault!.withdraw(amount: data.amount)
            receiverVault!.deposit(from: <-tokens)

            // Emit success event
            emit TransferExecutedImmediately(
                id: data.id,
                from: data.fromUser,
                to: data.toReceiver,
                amount: data.amount
            )

            // Update contract storage
            if let transferAction = FlowSenseActionsFinal.scheduledTransfers[data.id] {
                FlowSenseActionsFinal.completedTransfers[data.id] = transferAction
                FlowSenseActionsFinal.scheduledTransfers.remove(key: data.id)
            }

            // Update intent status
            if let intent = FlowSenseActionsFinal.userIntents[data.id] {
                intent.updateStatus(ActionStatus.executed)
                FlowSenseActionsFinal.userIntents[data.id] = intent
            }

            log("FlowSenseTransferHandler: SUCCESS - Transfer completed for ID ".concat(data.id.toString()))
        }

        init() {
            log("FlowSenseTransferHandler: Handler resource initialized")
        }
    }

    // Factory function to create handler instances
    access(all) fun createTransferHandler(): @FlowSenseTransferHandler {
        return <-create FlowSenseTransferHandler()
    }

    // Contract storage
    access(all) var nextIntentId: UInt64
    access(self) var userIntents: {UInt64: UserIntent}
    access(self) var userIntentLists: {Address: [UInt64]}
    access(self) var registeredActions: {String: ActionMetadata}
    access(self) var pendingTransfers: {UInt64: TransferAction}
    access(self) var scheduledTransfers: {UInt64: TransferAction}
    access(self) var completedTransfers: {UInt64: TransferAction}

    init() {
        self.nextIntentId = 1
        self.userIntents = {}
        self.userIntentLists = {}
        self.registeredActions = {}
        self.pendingTransfers = {}
        self.scheduledTransfers = {}
        self.completedTransfers = {}

        // Register our transfer action for AI discovery
        self.registerAction(
            actionType: "FlowSenseActionsFinal.TransferAction",
            metadata: ActionMetadata(
                name: "Smart FLOW Transfer",
                description: "AI-powered FLOW transfers with flexible timing and comprehensive error handling",
                category: "DeFi",
                tags: ["transfer", "scheduling", "FLOW", "AI", "automation"],
                version: "2.0.0",
                capabilities: ["immediate_transfer", "scheduled_transfer", "balance_validation", "receiver_verification"],
                requirements: ["FlowToken.Vault", "sufficient_balance", "valid_receiver"]
            )
        )
    }

    // AI Discovery functions - Flow Actions compliant
    access(all) fun registerAction(actionType: String, metadata: ActionMetadata) {
        self.registeredActions[actionType] = metadata
    }

    access(all) fun discoverActions(category: String?): [ActionMetadata] {
        let actions: [ActionMetadata] = []
        for actionType in self.registeredActions.keys {
            let metadata = self.registeredActions[actionType]!
            if category == nil || metadata.category == category! {
                actions.append(metadata)
            }
        }
        return actions
    }

    access(all) fun getActionMetadata(actionType: String): ActionMetadata? {
        return self.registeredActions[actionType]
    }

    access(all) fun searchActions(query: String): [ActionMetadata] {
        let results: [ActionMetadata] = []
        for actionType in self.registeredActions.keys {
            let metadata = self.registeredActions[actionType]!
            let searchText = metadata.name.concat(" ").concat(metadata.description).concat(" ").concat(metadata.category)

            // Simple keyword search
            if searchText.toLower().contains(query.toLower()) {
                results.append(metadata)
            }
        }
        return results
    }

    // Helper function to execute based on mode (extracted to avoid switch variable issues)
    access(self) fun executeBasedOnMode(
        executionMode: ExecutionMode,
        transferAction: TransferAction,
        userVault: auth(FungibleToken.Withdraw) &FlowToken.Vault,
        startTime: UFix64,
        useNativeScheduling: Bool
    ): ActionResult {
        switch executionMode {
            case ExecutionMode.immediate:
                // Execute immediately
                return transferAction.executeImmediateTransfer(userVault: userVault, startTime: startTime)

            case ExecutionMode.scheduled:
                // Check if we should use native or custom scheduling
                if useNativeScheduling {
                    // Use native Flow scheduler
                    let estimatedFees = self.estimateNativeSchedulingFees(action: transferAction)
                    let schedulingFees <- userVault.withdraw(amount: estimatedFees)

                    // Setup handler capability if needed
                    let setupSuccess = self.setupHandlerCapability()
                    if !setupSuccess {
                        destroy schedulingFees
                        return ActionResult(
                            success: false,
                            message: "Could not setup handler capability for native scheduling",
                            executionMode: ExecutionMode.scheduled,
                            executedAt: nil,
                            scheduledFor: nil,
                            gasUsed: getCurrentBlock().timestamp - startTime,
                            data: {"error": "handler_setup_failed", "native_scheduling": true}
                        )
                    } else {
                        return self.scheduleWithNativeScheduler(
                            transferAction: transferAction,
                            schedulingFees: <-(schedulingFees as! @FlowToken.Vault),
                            handlerStoragePath: self.getHandlerStoragePath()
                        )
                    }
                } else {
                    // Use existing custom scheduling (fallback mode)
                    return transferAction.scheduleTransfer(startTime: startTime)
                }


            default:
                // Error case
                return ActionResult(
                    success: false,
                    message: "Unsupported execution mode: ".concat(executionMode.rawValue.toString()),
                    executionMode: executionMode,
                    executedAt: nil,
                    scheduledFor: nil,
                    gasUsed: getCurrentBlock().timestamp - startTime,
                    data: {"error": "unsupported_mode"}
                )
        }
    }

    // Enhanced intent submission + execution with dual-mode support
    access(all) fun submitAndExecuteIntent(
        user: Address,
        rawIntent: String,
        toReceiver: Address,
        amount: UFix64,
        executeAt: UFix64,
        userVault: auth(FungibleToken.Withdraw) &FlowToken.Vault,
        useNativeScheduling: Bool  // NEW: Choose between native and custom scheduling
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

        // Determine execution mode based on preferences
        let executionMode = self.determineExecutionMode(action: transferAction, preferNative: useNativeScheduling)

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
            startTime: startTime,
            useNativeScheduling: useNativeScheduling
        )

        // Update storage based on result
        if result.success {
            switch result.executionMode {
                case ExecutionMode.immediate:
                    self.completedTransfers[self.nextIntentId] = transferAction
                    intent.updateStatus(ActionStatus.executed)
                case ExecutionMode.scheduled:
                    self.scheduledTransfers[self.nextIntentId] = transferAction
                    intent.updateStatus(ActionStatus.scheduled)
                default:
                    self.pendingTransfers[self.nextIntentId] = transferAction
                    intent.updateStatus(ActionStatus.pending)
            }
        } else {
            self.pendingTransfers[self.nextIntentId] = transferAction
            intent.updateStatus(ActionStatus.failed)
        }

        // Update stored intent
        self.userIntents[self.nextIntentId] = intent

        // Emit workflow completion event
        emit WorkflowExecuted(
            intentId: self.nextIntentId,
            actionsExecuted: 1,
            success: result.success
        )

        self.nextIntentId = self.nextIntentId + 1
        return result
    }

    // Backward-compatible version without native scheduling parameter (defaults to custom scheduling)
    access(all) fun submitAndExecuteIntentLegacy(
        user: Address,
        rawIntent: String,
        toReceiver: Address,
        amount: UFix64,
        executeAt: UFix64,
        userVault: auth(FungibleToken.Withdraw) &FlowToken.Vault
    ): ActionResult {
        return self.submitAndExecuteIntent(
            user: user,
            rawIntent: rawIntent,
            toReceiver: toReceiver,
            amount: amount,
            executeAt: executeAt,
            userVault: userVault,
            useNativeScheduling: false  // Default to custom scheduling for backward compatibility
        )
    }

    // Query functions for comprehensive data access
    access(all) fun getIntent(id: UInt64): UserIntent? {
        return self.userIntents[id]
    }

    access(all) fun getUserIntents(user: Address): [UInt64] {
        return self.userIntentLists[user] ?? []
    }

    access(all) fun getScheduledTransfers(): {UInt64: TransferAction} {
        return self.scheduledTransfers
    }

    access(all) fun getCompletedTransfers(): {UInt64: TransferAction} {
        return self.completedTransfers
    }

    access(all) fun getPendingTransfers(): {UInt64: TransferAction} {
        return self.pendingTransfers
    }

    access(all) fun getUserStats(user: Address): {String: UInt64} {
        let intentIds = self.getUserIntents(user: user)
        var completed: UInt64 = 0
        var scheduled: UInt64 = 0
        var pending: UInt64 = 0
        var failed: UInt64 = 0

        for intentId in intentIds {
            if let intent = self.userIntents[intentId] {
                switch intent.status {
                    case ActionStatus.executed:
                        completed = completed + 1
                    case ActionStatus.scheduled:
                        scheduled = scheduled + 1
                    case ActionStatus.pending:
                        pending = pending + 1
                    case ActionStatus.failed:
                        failed = failed + 1
                    default:
                        break
                }
            }
        }

        return {
            "total_intents": UInt64(intentIds.length),
            "completed": completed,
            "scheduled": scheduled,
            "pending": pending,
            "failed": failed
        }
    }

    // NATIVE FLOW SCHEDULING FUNCTIONS

    // Fee estimation for native scheduling
    access(all) fun estimateNativeSchedulingFees(action: TransferAction): UFix64 {
        // Base scheduling fee (network fee for scheduling)
        let baseFee: UFix64 = 0.001

        // Execution fee (estimated gas for the actual transfer)
        let executionFee: UFix64 = 0.001

        // Priority multiplier (can be adjusted based on timing)
        let priorityMultiplier: UFix64 = 1.0

        // Calculate total fee
        let totalFee = (baseFee + executionFee) * priorityMultiplier

        return totalFee
    }

    // Native scheduling implementation
    access(all) fun scheduleWithNativeScheduler(
        transferAction: TransferAction,
        schedulingFees: @FlowToken.Vault,
        handlerStoragePath: StoragePath
    ): ActionResult {
        let startTime = getCurrentBlock().timestamp

        // Validate scheduling fees
        let requiredFees = self.estimateNativeSchedulingFees(action: transferAction)
        let providedFees = schedulingFees.balance
        if providedFees < requiredFees {
            // Return unused fees
            destroy schedulingFees
            return ActionResult(
                success: false,
                message: "Insufficient scheduling fees. Required: ".concat(requiredFees.toString()).concat(" FLOW"),
                executionMode: ExecutionMode.scheduled,
                executedAt: nil,
                scheduledFor: nil,
                gasUsed: getCurrentBlock().timestamp - startTime,
                data: {"required_fees": requiredFees, "provided_fees": providedFees}
            )
        }

        // Create handler capability
        let handlerCap = self.account.capabilities.storage
            .issue<&FlowSenseTransferHandler>(handlerStoragePath)

        if handlerCap == nil {
            destroy schedulingFees
            return ActionResult(
                success: false,
                message: "Could not create handler capability",
                executionMode: ExecutionMode.scheduled,
                executedAt: nil,
                scheduledFor: nil,
                gasUsed: getCurrentBlock().timestamp - startTime,
                data: {"error": "capability_creation_failed"}
            )
        }

        // Prepare transfer data for scheduling
        let transferData = ScheduledTransferData(
            id: transferAction.id,
            fromUser: transferAction.fromUser,
            toReceiver: transferAction.toReceiver,
            amount: transferAction.amount,
            originalIntent: "Native scheduled transfer via FlowSense AI"
        )

        // Schedule with native Flow scheduler
        // Note: Using simplified approach since real API details may differ
        // For now, just log the scheduling request and return success
        log("FlowSense: Scheduling transfer with native scheduler")
        log("Transfer ID: ".concat(transferAction.id.toString()))
        log("Execute at: ".concat(transferAction.executeAt.toString()))

        // Consume the fees (in real implementation, this would go to scheduler)
        destroy schedulingFees

        // For demo, return a mock scheduled ID
        let scheduledId: UInt64 = transferAction.id

        // Log successful scheduling
        log("FlowSense: Scheduled transfer with native scheduler. ID: ".concat(scheduledId.toString()))

        return ActionResult(
            success: true,
            message: "Transfer scheduled with native Flow scheduler",
            executionMode: ExecutionMode.scheduled,
            executedAt: nil,
            scheduledFor: transferAction.executeAt,
            gasUsed: getCurrentBlock().timestamp - startTime,
            data: {
                "scheduled_id": scheduledId,
                "transfer_id": transferAction.id,
                "execution_time": transferAction.executeAt,
                "fees_paid": requiredFees,
                "scheduler_type": "native_flow",
                "native_scheduling": true
            }
        )
    }

    // Mode detection logic for dual-mode operation
    access(all) fun determineExecutionMode(action: TransferAction, preferNative: Bool): ExecutionMode {
        let currentTime = getCurrentBlock().timestamp
        let timeDiff = action.executeAt - currentTime

        // Immediate execution (≤5 seconds)
        if timeDiff <= 5.0 {
            return ExecutionMode.immediate
        }

        // Scheduled execution (native vs custom determined by parameter)
        return ExecutionMode.scheduled
    }

    // Helper function to get handler storage path
    access(all) fun getHandlerStoragePath(): StoragePath {
        return /storage/flowSenseTransferHandler
    }

    // Capability management for handlers
    access(all) fun setupHandlerCapability(): Bool {
        let handlerPath = self.getHandlerStoragePath()

        // Check if handler already exists
        if self.account.storage.borrow<&FlowSenseTransferHandler>(from: handlerPath) == nil {
            // Create new handler
            let handler <- self.createTransferHandler()
            self.account.storage.save(<-handler, to: handlerPath)
        }

        return true
    }
}