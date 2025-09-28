import FlowTransactionScheduler from 0x8c5303eaa26202d6
import FlowTransactionSchedulerUtils from 0x8c5303eaa26202d6

// Test script to find the correct way to access scheduler manager
access(all) fun main(): {String: AnyStruct} {
    let results: {String: AnyStruct} = {}

    // Try different approaches to get the manager

    // Try different approaches to access manager

    // Approach 1: Try Manager from account
    let schedulerAccount = getAccount(0x8c5303eaa26202d6)
    if let managerCap = schedulerAccount.capabilities.get<&{FlowTransactionSchedulerUtils.Manager}>(/public/SchedulerManager) {
        if managerCap.check() {
            results["public_manager_found"] = true
        } else {
            results["public_manager_found"] = false
        }
    } else {
        results["public_manager_found"] = false
    }

    // Approach 2: Try direct constructor
    results["scheduler_exists"] = true

    // Try to get more info about available methods
    results["current_time"] = getCurrentBlock().timestamp

    return results
}