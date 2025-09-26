'use client'

import WalletConnectionWrapper from '@/Components/WalletConnection/WalletConnectionWrapper'
import NetworkSwitcher from '@/Components/NetworkSwitcher/NetworkSwitcher'

interface HeaderProps {
  className?: string
}

export default function Header({ className = '' }: HeaderProps) {
  return (
    <header className={`absolute top-0 left-0 right-0 z-20 p-6 ${className}`}>
      <div className="flex justify-between items-center">
        {/* Logo/Brand */}
        <div className="flex items-center">
          <h1 className="text-white font-bricolage text-2xl font-bold">
            FlowSense
          </h1>
        </div>

        {/* Wallet Controls */}
        <div className="flex items-center gap-4">
          <NetworkSwitcher className="wallet-controls-network" />
          <WalletConnectionWrapper className="wallet-controls-connection" />
        </div>
      </div>
    </header>
  )
}