import FlowSenseActionsFinal from 0x9c23faae746705fe

// Get comprehensive user statistics
access(all) fun main(userAddress: Address): {String: UInt64} {
    return FlowSenseActionsFinal.getUserStats(user: userAddress)
}