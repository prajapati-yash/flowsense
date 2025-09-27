'use client'

import dynamic from 'next/dynamic'

const WalletConnection = dynamic(() => import('./WalletConnection'), {
  ssr: false,
  loading: () => (
    <div className="wallet-connection">
      <button disabled className="connect-button">
        Connect Wallet
      </button>
    </div>
  )
})

interface WalletConnectionWrapperProps {
  className?: string
}

export default function WalletConnectionWrapper({ className }: WalletConnectionWrapperProps) {
  return <WalletConnection className={className} />
}