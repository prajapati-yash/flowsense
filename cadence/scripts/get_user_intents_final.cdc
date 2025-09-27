import FlowSenseActionsFinal from 0x9c23faae746705fe

// Get all user intents with comprehensive details
access(all) fun main(userAddress: Address): [FlowSenseActionsFinal.UserIntent] {
    let intentIds = FlowSenseActionsFinal.getUserIntents(user: userAddress)
    let userIntents: [FlowSenseActionsFinal.UserIntent] = []

    for intentId in intentIds {
        if let intent = FlowSenseActionsFinal.getIntent(id: intentId) {
            userIntents.append(intent)
        }
    }

    return userIntents
}