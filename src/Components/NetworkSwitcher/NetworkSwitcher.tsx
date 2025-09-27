'use client'

import { useFlowCurrentUser } from '@onflow/react-sdk'
import { useNetwork } from '@/Components/Providers/FlowProvider'
import { useToast } from '@/Components/Toast/ToastProvider'
import { FLOW_NETWORKS, FlowNetwork } from '@/lib/flow-config'
import styles from './NetworkSwitcher.module.css'

interface NetworkSwitcherProps {
  className?: string
  onNetworkChange?: (network: FlowNetwork) => void
}

export default function NetworkSwitcher({
  className = '',
  onNetworkChange
}: NetworkSwitcherProps) {
  const { currentNetwork, switchNetwork, isLoading } = useNetwork()
  const currentUser = useFlowCurrentUser()
  const { showToast } = useToast()

  const handleNetworkChange = async (network: FlowNetwork) => {
    if (network === currentNetwork) return

    // Check if wallet is connected and show guidance
    if (currentUser.user?.addr) {
      showToast(
        `To switch from ${getNetworkDisplayName(currentNetwork)} to ${getNetworkDisplayName(network)}, please disconnect your wallet first, then reconnect with the desired network.`,
        'warning',
        8000
      )
      return
    }

    try {
      await switchNetwork(network)
      onNetworkChange?.(network)
      console.log(`Successfully switched to ${network}`)
      showToast(
        `Successfully switched to ${getNetworkDisplayName(network)}`,
        'success',
        3000
      )
    } catch (error) {
      console.error('Failed to switch network:', error)
      showToast(
        `Failed to switch to ${getNetworkDisplayName(network)}. Please try again.`,
        'error',
        5000
      )
    }
  }

  const getNetworkDisplayName = (network: FlowNetwork) => {
    const names = {
      testnet: 'Testnet',
      mainnet: 'Mainnet'
    }
    return names[network]
  }

  const getNetworkColor = (network: FlowNetwork) => {
    const colors = {
      testnet: 'orange',
      mainnet: 'green'
    }
    return colors[network]
  }

  return (
    <div className={`${styles.networkSwitcher} ${className}`}>
      <div className={styles.networkInfo}>
        <span className={styles.networkLabel}>Network:</span>
        <div className={styles.networkIndicator}>
          <span
            className={`${styles.networkDot} ${styles[getNetworkColor(currentNetwork)]}`}
            title={`Connected to ${getNetworkDisplayName(currentNetwork)}`}
          ></span>
          <span className={styles.networkName}>
            {getNetworkDisplayName(currentNetwork)}
          </span>
        </div>
      </div>

      <select
        value={currentNetwork}
        onChange={(e) => handleNetworkChange(e.target.value as FlowNetwork)}
        disabled={isLoading}
        className={styles.networkSelect}
      >
        {Object.keys(FLOW_NETWORKS).map((network) => (
          <option key={network} value={network}>
            {getNetworkDisplayName(network as FlowNetwork)}
          </option>
        ))}
      </select>

      {isLoading && (
        <span className={styles.loadingIndicator}>Switching...</span>
      )}
    </div>
  )
}