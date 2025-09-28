import FlowSenseActionsV2 from 0x9c23faae746705fe
import FlowTransactionScheduler from 0x8c5303eaa26202d6

// Setup transaction handler after contract updates
transaction() {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        log("Setting up FlowSense transaction handler...")

        // Storage paths
        let handlerStoragePath = /storage/FlowSenseTransferHandlerV2
        let handlerPublicPath = /public/FlowSenseTransferHandlerV2
        let handlerPrivatePath = /private/FlowSenseTransferHandlerV2Private

        // Clear existing storage if any
        if signer.storage.borrow<&AnyResource>(from: handlerStoragePath) != nil {
            let existing <- signer.storage.load<@AnyResource>(from: handlerStoragePath)
            destroy existing
        }

        // Create and save new handler
        let handler <- FlowSenseActionsV2.createFlowSenseTransferHandler()
        signer.storage.save(<-handler, to: handlerStoragePath)

        // Clear existing capabilities
        signer.capabilities.unpublish(handlerPublicPath)

        // Create new capabilities with proper entitlements
        let executeCap = signer.capabilities.storage.issue<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>(handlerStoragePath)

        let publicCap = signer.capabilities.storage.issue<&FlowSenseActionsV2.FlowSenseTransferHandler>(handlerStoragePath)
        signer.capabilities.publish(publicCap, at: handlerPublicPath)

        log("Handler setup completed successfully!")
    }
}