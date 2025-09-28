import FlowSenseActionsV2 from "../contracts/FlowSenseActionsV2.cdc"

// Get user intent history - V2 with real Flow scheduler tracking
access(all) fun main(user: Address): [FlowSenseActionsV2.UserIntent] {
    let intents = FlowSenseActionsV2.getUserIntents(user: user)

    log("FlowSenseV2: Found ".concat(intents.length.toString()).concat(" intents for user ").concat(user.toString()))

    for intent in intents {
        log("FlowSenseV2: Intent ID: ".concat(intent.id.toString()))
        log("FlowSenseV2: Raw Intent: ".concat(intent.rawIntent))
        log("FlowSenseV2: Status: ".concat(intent.status.rawValue.toString()))
        log("FlowSenseV2: Actions: ".concat(intent.parsedActions.length.toString()))
        log("FlowSenseV2: Submitted: ".concat(intent.submittedAt.toString()))
        log("FlowSenseV2: ---")
    }

    return intents
}