'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { FlowProvider as ReactFlowProvider } from '@onflow/react-sdk'
import { FLOW_NETWORKS, FlowNetwork } from '@/lib/flow-config'
import * as fcl from '@onflow/fcl'

interface NetworkContextType {
  currentNetwork: FlowNetwork
  switchNetwork: (network: FlowNetwork) => Promise<void>
  isLoading: boolean
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined)

export const useNetwork = () => {
  const context = useContext(NetworkContext)
  if (!context) {
    throw new Error('useNetwork must be used within a FlowProvider')
  }
  return context
}

interface FlowProviderProps {
  children: ReactNode
}

export default function FlowProvider({ children }: FlowProviderProps) {
  const [currentNetwork, setCurrentNetwork] = useState<FlowNetwork>('testnet')
  const [isLoading, setIsLoading] = useState(false)
  const [flowConfig, setFlowConfig] = useState(() => {
    const network = (process.env.NEXT_PUBLIC_FLOW_NETWORK as FlowNetwork) || 'testnet'
    const config = FLOW_NETWORKS[network]
    return {
      accessNodeUrl: config.accessNode,
      discoveryWallet: config.discoveryWallet,
      discoveryAuthnEndpoint: config.discoveryAuthn,
      appDetailTitle: process.env.NEXT_PUBLIC_APP_TITLE || 'FlowSense',
      appDetailIcon: process.env.NEXT_PUBLIC_APP_ICON || '',
      appDetailDescription: 'Flow blockchain wallet integration platform',
      appDetailUrl: typeof window !== 'undefined' ? window.location.origin : 'https://flowsense.app',
      walletconnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
      flowNetwork: config.network
    }
  })

  useEffect(() => {
    const network = (process.env.NEXT_PUBLIC_FLOW_NETWORK as FlowNetwork) || 'testnet'
    setCurrentNetwork(network)
  }, [])

  const switchNetwork = async (network: FlowNetwork) => {
    if (network === currentNetwork) return

    try {
      setIsLoading(true)
      const config = FLOW_NETWORKS[network]

      // Update FCL configuration
      fcl.config({
        'flow.network': config.network,
        'accessNode.api': config.accessNode,
        'discovery.wallet': config.discoveryWallet,
        'discovery.authn.endpoint': config.discoveryAuthn,
        'walletconnect.projectId': process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
        'app.detail.description': 'Flow blockchain wallet integration platform',
        'app.detail.url': typeof window !== 'undefined' ? window.location.origin : 'https://flowsense.app'
      })

      // Update flow config for provider
      setFlowConfig({
        accessNodeUrl: config.accessNode,
        discoveryWallet: config.discoveryWallet,
        discoveryAuthnEndpoint: config.discoveryAuthn,
        appDetailTitle: process.env.NEXT_PUBLIC_APP_TITLE || 'FlowSense',
        appDetailIcon: process.env.NEXT_PUBLIC_APP_ICON || '',
        appDetailDescription: 'Flow blockchain wallet integration platform',
        appDetailUrl: typeof window !== 'undefined' ? window.location.origin : 'https://flowsense.app',
        walletconnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
        flowNetwork: config.network
      })

      setCurrentNetwork(network)

      // Check if user is connected and prompt for reconnection
      const currentUser = await fcl.currentUser.snapshot()
      if (currentUser.loggedIn) {
        console.log(`Network switched to ${network}. Wallet will reconnect on next interaction.`)
        // Don't force disconnect here - let user choose when to reconnect
      }

    } catch (error) {
      console.error('Failed to switch network:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const networkContextValue: NetworkContextType = {
    currentNetwork,
    switchNetwork,
    isLoading
  }

  return (
    <NetworkContext.Provider value={networkContextValue}>
      <ReactFlowProvider config={flowConfig} key={currentNetwork}>
        {children}
      </ReactFlowProvider>
    </NetworkContext.Provider>
  )
}