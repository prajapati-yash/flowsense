'use client'

import { useFlowCurrentUser } from '@onflow/react-sdk'
import * as fcl from '@onflow/fcl'
import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/Components/Toast/ToastProvider'
import styles from './WalletConnection.module.css'

interface WalletConnectionProps {
  className?: string
}

export default function WalletConnection({ className = '' }: WalletConnectionProps) {
  const [isClient, setIsClient] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [userState, setUserState] = useState(null)
  const currentUser = useFlowCurrentUser()
  const { showToast } = useToast()

  // Handle wallet connection
  const handleConnect = useCallback(async () => {
    try {
      setIsLoading(true)
      console.log('Starting wallet authentication...')

      const response = await fcl.authenticate()
      console.log('Wallet authentication response:', response)

      // Give a small delay to ensure state updates
      setTimeout(() => {
        if (!userState?.addr) {
          console.log('Forcing state refresh after connection')
          setIsLoading(false)
        }
      }, 1000)

    } catch (error) {
      console.error('Failed to connect wallet:', error)
      setIsLoading(false)
    }
  }, [userState])

  // Handle wallet disconnection
  const handleDisconnect = useCallback(async () => {
    try {
      setIsLoading(true)
      console.log('Starting wallet disconnection...')

      // Clear the current user session
      await fcl.unauthenticate()
      console.log('Wallet disconnected successfully')

      // Clear local state immediately
      setUserState(null)

      // Show helpful toast about refreshing if needed
      showToast(
        'Wallet disconnected successfully! If the wallet still appears connected, please refresh the page.',
        'info',
        7000
      )

    } catch (error) {
      console.error('Failed to disconnect wallet:', error)

      // Force clear the user state even if unauthenticate fails
      try {
        fcl.currentUser.unauthenticate()
        setUserState(null)
        console.log('Forced wallet disconnection')
      } catch (e) {
        console.error('Failed to force clear user state:', e)
      }
      setIsLoading(false)
    }
  }, [])

  // Initialize client-side rendering
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Subscribe to FCL current user changes for better reactivity
  useEffect(() => {
    if (!isClient) return

    const unsubscribe = fcl.currentUser.subscribe((user) => {
      console.log('FCL user state changed:', user)
      setUserState(user)

      // Clear loading state when connection is established or lost
      if (user?.addr || (!user?.addr && isLoading)) {
        setIsLoading(false)
      }
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [isClient, isLoading])

  // Monitor useFlowCurrentUser hook changes as backup
  useEffect(() => {
    console.log('useFlowCurrentUser state:', currentUser)

    // Update local state if FCL subscription missed it
    if (currentUser.user?.addr && !userState?.addr) {
      setUserState(currentUser.user)
    }

    // Clear loading state when connection is established
    if (currentUser.user?.addr && isLoading) {
      setIsLoading(false)
    }
  }, [currentUser, userState, isLoading])

  const formatAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (!isClient) {
    return (
      <div className={`${styles.walletConnection} ${className}`}>
        <button
          disabled
          className={styles.connectButton}
        >
          Connect Wallet
        </button>
      </div>
    )
  }

  // Use FCL subscription state as primary, fallback to hook state
  const connectedAddress = userState?.addr || currentUser.user?.addr

  if (connectedAddress) {
    return (
      <div className={`${styles.walletConnection} ${styles.connected} ${className}`}>
        <div className={styles.walletInfo}>
          <div className={styles.walletStatus}>
            <span className={styles.statusIndicator}></span>
            <span className={styles.statusText}>Connected</span>
          </div>
          <div className={styles.walletAddress} title={connectedAddress}>
            {formatAddress(connectedAddress)}
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={isLoading}
          className={styles.disconnectButton}
        >
          {isLoading ? 'Disconnecting...' : 'Disconnect'}
        </button>
      </div>
    )
  }

  return (
    <div className={`${styles.walletConnection} ${className}`}>
      <button
        onClick={handleConnect}
        disabled={isLoading}
        className={styles.connectButton}
      >
        {isLoading ? 'Connecting...' : 'Connect Wallet'}
      </button>
    </div>
  )
}