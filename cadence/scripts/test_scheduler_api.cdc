import FlowTransactionScheduler from 0x8c5303eaa26202d6

// Test script to explore the actual FlowTransactionScheduler API
access(all) fun main(): {String: AnyStruct} {
    // Try to estimate a simple transaction
    let futureTime = getCurrentBlock().timestamp + 120.0 // 2 minutes from now

    // Basic estimation attempt
    let estimate = FlowTransactionScheduler.estimate(
        data: "test data",
        timestamp: futureTime,
        priority: FlowTransactionScheduler.Priority.Medium,
        executionEffort: 100
    )

    return {
        "estimate_success": true,
        "current_time": getCurrentBlock().timestamp,
        "future_time": futureTime,
        "estimate_data": estimate
    }
}