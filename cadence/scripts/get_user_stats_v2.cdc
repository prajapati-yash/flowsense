import FlowSenseActionsV2 from "../contracts/FlowSenseActionsV2.cdc"

// Get user statistics - V2 with real Flow scheduler tracking
access(all) fun main(user: Address): {String: AnyStruct} {
    let stats = FlowSenseActionsV2.getUserStats(user: user)

    log("FlowSenseV2 Stats for ".concat(user.toString()).concat(":"))

    for key in stats.keys {
        if let value = stats[key] {
            log("FlowSenseV2: ".concat(key).concat(": ").concat(value.toString()))
        }
    }

    return stats
}