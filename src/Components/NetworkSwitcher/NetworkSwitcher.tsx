"use client";

import { useFlowCurrentUser } from "@onflow/react-sdk";
import { useNetwork } from "@/Components/Providers/FlowProvider";
import { useToast } from "@/Components/Toast/ToastProvider";
import { FLOW_NETWORKS, FlowNetwork } from "@/lib/flow-config";

interface NetworkSwitcherProps {
  className?: string;
  onNetworkChange?: (network: FlowNetwork) => void;
}

export default function NetworkSwitcher({
  className = "",
  onNetworkChange,
}: NetworkSwitcherProps) {
  const { currentNetwork, switchNetwork, isLoading } = useNetwork();
  const currentUser = useFlowCurrentUser();
  const { showToast } = useToast();

  const handleNetworkChange = async (network: FlowNetwork) => {
    if (network === currentNetwork) return;

    // Check if wallet is connected and show guidance
    if (currentUser.user?.addr) {
      showToast(
        `To switch from ${getNetworkDisplayName(
          currentNetwork
        )} to ${getNetworkDisplayName(
          network
        )}, please disconnect your wallet first, then reconnect with the desired network.`,
        "warning",
        8000
      );
      return;
    }

    try {
      await switchNetwork(network);
      onNetworkChange?.(network);
      console.log(`Successfully switched to ${network}`);
      showToast(
        `Successfully switched to ${getNetworkDisplayName(network)}`,
        "success",
        3000
      );
    } catch (error) {
      console.error("Failed to switch network:", error);
      showToast(
        `Failed to switch to ${getNetworkDisplayName(
          network
        )}. Please try again.`,
        "error",
        5000
      );
    }
  };

  const getNetworkDisplayName = (network: FlowNetwork) => {
    const names = {
      testnet: "Testnet",
      mainnet: "Mainnet",
    };
    return names[network];
  };

  const getNetworkColor = (network: FlowNetwork) => {
    const colors = {
      testnet: "#f59e0b", // amber-500
      mainnet: "#10b981", // emerald-500
    };
    return colors[network];
  };

  const getNetworkGradient = (network: FlowNetwork) => {
    const gradients = {
      testnet: "from-amber-500 to-orange-500",
      mainnet: "from-emerald-500 to-green-500",
    };
    return gradients[network];
  };

  return (
    <div className={`flex items-center gap-3 font-rubik ${className}`}>
      {/* Current Network Display */}
      <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md border border-[#00ef8b]/30 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: getNetworkColor(currentNetwork) }}
          ></div>
          <span className="text-xs text-white/70">Network:</span>
          <span className="text-sm font-medium text-white">
            {getNetworkDisplayName(currentNetwork)}
          </span>
        </div>
      </div>

      {/* Network Selector */}
      <div className="relative">
        <select
          value={currentNetwork}
          onChange={(e) => handleNetworkChange(e.target.value as FlowNetwork)}
          disabled={isLoading}
          className="appearance-none bg-gradient-to-r from-[#00ef8b]/20 to-white/10 backdrop-blur-md border border-[#00ef8b]/40 rounded-lg px-4 py-2 pr-8 text-white font-medium text-sm cursor-pointer transition-all duration-300 hover:border-[#00ef8b]/60 hover:shadow-lg hover:shadow-[#00ef8b]/20 focus:outline-none focus:ring-2 focus:ring-[#00ef8b]/50 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {Object.keys(FLOW_NETWORKS).map((network) => (
            <option
              key={network}
              value={network}
              className="bg-black text-white"
            >
              {getNetworkDisplayName(network as FlowNetwork)}
            </option>
          ))}
        </select>

        {/* Custom Dropdown Arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg
            className="w-4 h-4 text-white/60"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md border border-[#00ef8b]/30 rounded-lg px-3 py-2">
          <div className="w-4 h-4 border-2 border-[#00ef8b]/30 border-t-[#00ef8b] rounded-full animate-spin"></div>
          <span className="text-xs text-white/70">Switching...</span>
        </div>
      )}
    </div>
  );
}
