'use client'

import WalletButton from '@/Components/WalletConnection/WalletButton'
import NetworkSwitcher from '@/Components/NetworkSwitcher/NetworkSwitcher'
import Image from 'next/image'
import logo from "@/app/assets/fs.png"
interface HeaderProps {
  className?: string
}

export default function Header({ className = '' }: HeaderProps) {
  return (
    <header className={`absolute top-0 left-0 right-0 z-20 py-6 px-8 md:px-16 lg:px-24 ${className}`}>
      <div className="flex justify-between items-center">
        {/* Logo/Brand */}
        <Image src={logo} alt="" className=" w-48  " />

        {/* Wallet Controls */}
        <div className="flex items-center gap-4">
          <NetworkSwitcher />
          <WalletButton />
        </div>
      </div>
    </header>
  )
}