import * as fcl from '@onflow/fcl'

export type FlowNetwork = 'testnet' | 'mainnet'

export interface FlowConfig {
  network: FlowNetwork
  accessNode: string
  discoveryWallet: string
  discoveryAuthn: string
}

export const FLOW_NETWORKS: Record<FlowNetwork, FlowConfig> = {
  testnet: {
    network: 'testnet',
    accessNode: 'https://rest-testnet.onflow.org',
    discoveryWallet: 'https://fcl-discovery.onflow.org/testnet/authn',
    discoveryAuthn: 'https://fcl-discovery.onflow.org/api/testnet/authn'
  },
  mainnet: {
    network: 'mainnet',
    accessNode: 'https://rest-mainnet.onflow.org',
    discoveryWallet: 'https://fcl-discovery.onflow.org/authn',
    discoveryAuthn: 'https://fcl-discovery.onflow.org/api/authn'
  }
}

// Initialize FCL immediately on import
const network = (process.env.NEXT_PUBLIC_FLOW_NETWORK as FlowNetwork) || 'testnet'
const config = FLOW_NETWORKS[network]

fcl.config({
  'flow.network': config.network,
  'accessNode.api': config.accessNode,
  'discovery.wallet': config.discoveryWallet,
  'discovery.authn.endpoint': config.discoveryAuthn,
  'app.detail.title': process.env.NEXT_PUBLIC_APP_TITLE || 'FlowSense',
  'app.detail.icon': process.env.NEXT_PUBLIC_APP_ICON || '',
  'walletconnect.projectId': process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
  'app.detail.description': 'Flow blockchain wallet integration platform',
  'app.detail.url': typeof window !== 'undefined' ? window.location.origin : 'https://flowsense.app'
})

export function initializeFlowConfig() {
  // Configuration is now done on import, this function is kept for backward compatibility
}

// Network switching is now handled by the FlowProvider context
// This function is kept for backward compatibility but is deprecated
export async function switchNetwork(network: FlowNetwork) {
  console.warn('switchNetwork is deprecated. Use the useNetwork hook from FlowProvider instead.')
  const config = FLOW_NETWORKS[network]

  fcl.config({
    'flow.network': config.network,
    'accessNode.api': config.accessNode,
    'discovery.wallet': config.discoveryWallet,
    'discovery.authn.endpoint': config.discoveryAuthn
  })
}