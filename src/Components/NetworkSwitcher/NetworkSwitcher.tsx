"use client";

import React from "react";
import { getNetworkInfo } from "@/lib/flow-config";

export default function NetworkSwitcher() {
  const networkInfo = getNetworkInfo();

  const getNetworkColor = () => {
    if (networkInfo.isMainnet) return "bg-green-500";
    if (networkInfo.isTestnet) return "bg-yellow-500";
    return "bg-blue-500";
  };

  const getNetworkLabel = () => {
    if (networkInfo.isMainnet) return "Mainnet";
    if (networkInfo.isTestnet) return "Testnet";
    return "Emulator";
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-[#00ef8b]/20">
      <div className={`w-2 h-2 rounded-full ${getNetworkColor()}`}></div>
      <span className="text-white text-xs font-medium">{getNetworkLabel()}</span>
    </div>
  );
}