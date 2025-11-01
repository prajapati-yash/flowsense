"use client";

import React from "react";
import { motion } from "framer-motion";
import { useWallet } from "@/hooks/useWallet";

export default function WalletButton() {
  const { address, isConnected, isConnecting, connect, disconnect, isInitialized } = useWallet();

  // IMPORTANT: onClick handler must call connect() directly
  // No async state updates before calling connect()
  const handleClick = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  if (!isInitialized) {
    return (
      <div className="px-4 py-2 rounded-lg bg-white/10 text-white/50 text-sm">
        Initializing...
      </div>
    );
  }

  return (
    <motion.button
      onClick={handleClick}
      disabled={isConnecting}
      whileHover={{ scale: isConnecting ? 1 : 1.05 }}
      whileTap={{ scale: isConnecting ? 1 : 0.95 }}
      className={`px-6 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
        isConnected
          ? "bg-gradient-to-r from-[#00ef8b] to-white text-black"
          : "bg-white/10 border border-[#00ef8b]/40 text-white hover:bg-white/20"
      } ${isConnecting ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {isConnecting ? (
        "Connecting..."
      ) : isConnected ? (
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Connected"}
        </span>
      ) : (
        "Connect Wallet"
      )}
    </motion.button>
  );
}