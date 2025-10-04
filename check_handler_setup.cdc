import FlowSenseActionsV2 from 0x9c23faae746705fe

access(all) fun main(): {String: AnyStruct} {
    let results: {String: AnyStruct} = {}
    let account = getAccount(0x9c23faae746705fe)

    // Check public capability for FlowSenseActionsV2 handler
    let publicCapExists = account.capabilities.get<&FlowSenseActionsV2.FlowSenseTransferHandler>(/public/FlowSenseTransferHandlerV2).check()
    results["public_capability_exists"] = publicCapExists

    // Try to borrow the capability
    if let handlerRef = account.capabilities.get<&FlowSenseActionsV2.FlowSenseTransferHandler>(/public/FlowSenseTransferHandlerV2).borrow() {
        results["handler_borrowable"] = true
    } else {
        results["handler_borrowable"] = false
    }

    // Check for the old contract handler too
    let oldCapExists = account.capabilities.get<&AnyResource>(/public/FlowSenseTransferHandler).check()
    results["old_handler_exists"] = oldCapExists

    return results
}