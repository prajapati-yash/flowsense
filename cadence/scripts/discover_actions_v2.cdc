import FlowSenseActionsV2 from "../contracts/FlowSenseActionsV2.cdc"

// Discover available actions for AI agents - V2 with real Flow scheduler
access(all) fun main(category: String?): [FlowSenseActionsV2.ActionMetadata] {
    let actions = FlowSenseActionsV2.discoverActions(category: category)

    log("FlowSenseV2 Discovery: Found ".concat(actions.length.toString()).concat(" actions"))

    for action in actions {
        log("FlowSenseV2: Action: ".concat(action.name))
        log("FlowSenseV2: Description: ".concat(action.description))
        log("FlowSenseV2: Category: ".concat(action.category))
        log("FlowSenseV2: Version: ".concat(action.version))
        log("FlowSenseV2: Capabilities: ".concat(action.capabilities.length.toString()).concat(" available"))
        log("FlowSenseV2: Requirements: ".concat(action.requirements.length.toString()).concat(" needed"))
        log("FlowSenseV2: Tags: ".concat(action.tags.length.toString()).concat(" tags"))
        log("FlowSenseV2: ---")
    }

    return actions
}