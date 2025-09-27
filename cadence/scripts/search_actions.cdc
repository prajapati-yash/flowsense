import FlowSenseActionsFinal from 0x9c23faae746705fe

// Search actions by keyword for AI agent discovery
access(all) fun main(query: String): [FlowSenseActionsFinal.ActionMetadata] {
    return FlowSenseActionsFinal.searchActions(query: query)
}