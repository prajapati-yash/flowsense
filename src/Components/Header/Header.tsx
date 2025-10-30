'use client'

import { useState, useEffect } from 'react'
import WalletButton from '@/Components/WalletConnection/WalletButton'
import NetworkSwitcher from '@/Components/NetworkSwitcher/NetworkSwitcher'
import Image from 'next/image'
import logo from "@/app/assets/fs.png"

interface HeaderProps {
  className?: string
}

export default function Header({ className = '' }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  return (
    <>
      <header className={`absolute top-0 left-0 right-0 z-50 py-4 sm:py-5 md:py-6 px-4 sm:px-6 md:px-8 lg:px-16 xl:px-24 ${className}`}>
        <div className="flex justify-between items-center">
          {/* Logo/Brand */}
          <div className="flex-shrink-0">
            <Image
              src={logo}
              alt="FlowSense Logo"
              className="w-32 sm:w-36 md:w-40 lg:w-48 h-auto"
              priority
            />
          </div>

          {/* Desktop Wallet Controls */}
          <div className="hidden sm:flex items-center gap-2 md:gap-3 lg:gap-4">
            <NetworkSwitcher />
            <WalletButton />
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="cursor-pointer sm:hidden p-2 rounded-lg hover:bg-gray-100/10 transition-colors relative z-[60]"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Full-Page Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-40 sm:hidden transition-all duration-300 ease-in-out ${
          isMobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        {/* Backdrop with blur */}
        <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" />

        {/* Grid Background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, #00ef8b 1px, transparent 1px),
                linear-gradient(to bottom, #00ef8b 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        {/* Menu Content */}
        <div
          className={`relative h-full flex flex-col items-center justify-center px-8 transition-all duration-500 ease-out ${
            isMobileMenuOpen
              ? 'translate-y-0 opacity-100'
              : '-translate-y-10 opacity-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Logo in Menu */}
          <div className="mb-12">
            <Image
              src={logo}
              alt="FlowSense Logo"
              className="w-48 h-auto"
              priority
            />
          </div>

          {/* Menu Items */}
          <div className="flex flex-col gap-6 w-full max-w-sm">
            {/* Network Switcher Card */}
            <div
              className={`transition-all duration-700 ease-out ${
                isMobileMenuOpen
                  ? 'translate-x-0 opacity-100'
                  : '-translate-x-10 opacity-0'
              }`}
              style={{ transitionDelay: '100ms' }}
            >
              <div className="bg-white/5 backdrop-blur-lg border border-[#00ef8b]/30 rounded-2xl p-6 hover:border-[#00ef8b]/50 transition-all duration-300">
                <h3 className="text-[#00ef8b] font-rubik font-semibold text-sm uppercase mb-3 tracking-wider">
                  Network
                </h3>
                <NetworkSwitcher />
              </div>
            </div>

            {/* Wallet Connection Card */}
            <div
              className={`transition-all duration-700 ease-out ${
                isMobileMenuOpen
                  ? 'translate-x-0 opacity-100'
                  : '-translate-x-10 opacity-0'
              }`}
              style={{ transitionDelay: '200ms' }}
            >
              <div className="bg-white/5 backdrop-blur-lg border border-[#00ef8b]/30 rounded-2xl p-6 hover:border-[#00ef8b]/50 transition-all duration-300">
                <h3 className="text-[#00ef8b] font-rubik font-semibold text-sm uppercase mb-3 tracking-wider">
                  Wallet
                </h3>
                <WalletButton />
              </div>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-[15%] right-[10%] w-32 h-32 bg-[#00ef8b]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-[20%] left-[10%] w-40 h-40 bg-[#00ef8b]/10 rounded-full blur-3xl" />

          {/* Close hint text */}
          {/* <div
            className={`absolute bottom-8 text-white/40 text-sm font-rubik transition-all duration-700 ${
              isMobileMenuOpen
                ? 'opacity-100'
                : 'opacity-0'
            }`}
            style={{ transitionDelay: '300ms' }}
          >
            Tap anywhere to close
          </div> */}
        </div>
      </div>
    </>
  )
}