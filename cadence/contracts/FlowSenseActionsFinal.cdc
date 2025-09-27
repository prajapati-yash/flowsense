import FlowToken from 0x7e60df042a9c0868
import FungibleToken from 0x9a0766d93b6608b7

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
        access(all) case scheduled      // Execute at specific time (>5 seconds)
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

    // Combined intent submission + execution
    access(all) fun submitAndExecuteIntent(
        user: Address,
        rawIntent: String,
        toReceiver: Address,
        amount: UFix64,
        executeAt: UFix64,
        userVault: auth(FungibleToken.Withdraw) &FlowToken.Vault
    ): ActionResult {
        // Create transfer action
        let transferAction = TransferAction(
            id: self.nextIntentId,
            fromUser: user,
            toReceiver: toReceiver,
            amount: amount,
            executeAt: executeAt
        )

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

        // Execute the transfer
        let result = transferAction.executeTransfer(userVault: userVault)

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
}