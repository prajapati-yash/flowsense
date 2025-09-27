"use client";

import { useFlowCurrentUser } from "@onflow/react-sdk";
import * as fcl from "@onflow/fcl";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/Components/Toast/ToastProvider";

interface WalletConnectionProps {
  className?: string;
}

interface UserState {
  addr?: string;
  loggedIn?: boolean;
}

export default function WalletConnection({
  className = "",
}: WalletConnectionProps) {
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userState, setUserState] = useState<UserState | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [forceDisconnected, setForceDisconnected] = useState(false);
  const [localConnectionState, setLocalConnectionState] = useState<
    "connected" | "disconnected" | "connecting"
  >("disconnected");
  const currentUser = useFlowCurrentUser();
  const { showToast } = useToast();

  // Handle wallet connection
  const handleConnect = useCallback(async () => {
    try {
      setIsLoading(true);
      setLocalConnectionState("connecting");
      setForceDisconnected(false); // Reset force disconnect flag
      console.log("Starting wallet authentication...");

      const response = await fcl.authenticate();
      console.log("Wallet authentication response:", response);

      // Give a small delay to ensure state updates
      setTimeout(() => {
        if (!userState?.addr) {
          console.log("Forcing state refresh after connection");
          setIsLoading(false);
          setLocalConnectionState("disconnected");
        } else {
          setLocalConnectionState("connected");
        }
      }, 1000);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      setIsLoading(false);
      setLocalConnectionState("disconnected");
    }
  }, [userState]);

  // Handle wallet disconnection
  const handleDisconnect = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log("Starting wallet disconnection...");

      // Clear the current user session
      await fcl.unauthenticate();
      console.log("Wallet disconnected successfully");

      // Clear local state immediately and force re-render
      setUserState(null);
      setIsLoading(false);
      setLocalConnectionState("disconnected");
      setForceDisconnected(true);
      setRefreshKey((prev) => prev + 1);

      // Force immediate UI update
      requestAnimationFrame(() => {
        setUserState(null);
        setIsLoading(false);
        setLocalConnectionState("disconnected");
        setForceDisconnected(true);
        setRefreshKey((prev) => prev + 1);
      });

      // Reset force disconnect flag after a short delay to allow FCL to catch up
      setTimeout(() => {
        setForceDisconnected(false);
        setRefreshKey((prev) => prev + 1);
      }, 2000);

      // Show success toast
      showToast("Wallet disconnected successfully!", "success", 3000);
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);

      // Force clear the user state even if unauthenticate fails
      try {
        await fcl.currentUser.unauthenticate();
        setUserState(null);
        setIsLoading(false);
        setForceDisconnected(true);
        setRefreshKey((prev) => prev + 1);

        // Force another state update
        requestAnimationFrame(() => {
          setUserState(null);
          setIsLoading(false);
          setForceDisconnected(true);
          setRefreshKey((prev) => prev + 1);
        });

        // Reset force disconnect flag after a short delay
        setTimeout(() => {
          setForceDisconnected(false);
          setRefreshKey((prev) => prev + 1);
        }, 2000);

        console.log("Forced wallet disconnection");
        showToast("Wallet disconnected successfully!", "success", 3000);
      } catch (e) {
        console.error("Failed to force clear user state:", e);
        setIsLoading(false);
        setUserState(null);
        setForceDisconnected(true);
        setRefreshKey((prev) => prev + 1);
        showToast("Disconnection completed", "info", 3000);
      }
    }
  }, [showToast]);

  // Initialize client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Subscribe to FCL current user changes for better reactivity
  useEffect(() => {
    if (!isClient) return;

    const unsubscribe = fcl.currentUser.subscribe((user: UserState) => {
      console.log("FCL user state changed:", user);

      // Always update userState
      setUserState(user);

      // Clear loading state when connection is established or lost
      if (user?.addr || (!user?.addr && isLoading)) {
        setIsLoading(false);
      }

      // Handle disconnection - if user is null/undefined, force disconnected state
      if (!user?.addr) {
        setUserState(null);
        setIsLoading(false);
        setLocalConnectionState("disconnected");
        setForceDisconnected(true);
        setRefreshKey((prev) => prev + 1);
      } else {
        // Reset force disconnect flag if user connects
        setLocalConnectionState("connected");
        setForceDisconnected(false);
        setRefreshKey((prev) => prev + 1);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isClient, isLoading]);

  // Monitor useFlowCurrentUser hook changes as backup
  useEffect(() => {
    console.log("useFlowCurrentUser state:", currentUser);

    // Update local state if FCL subscription missed it
    if (currentUser.user?.addr && !userState?.addr) {
      setUserState(currentUser.user as UserState);
      setForceDisconnected(false);
      setRefreshKey((prev) => prev + 1);
    }

    // Handle disconnection case - if currentUser.user is null but userState still has addr
    if (!currentUser.user?.addr && userState?.addr) {
      setUserState(null);
      setIsLoading(false);
      setForceDisconnected(true);
      setRefreshKey((prev) => prev + 1);
    }

    // Clear loading state when connection is established
    if (currentUser.user?.addr && isLoading) {
      setIsLoading(false);
    }
  }, [currentUser, userState, isLoading]);

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isClient) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <button
          disabled
          className="px-6 py-3 rounded-lg bg-white/10 backdrop-blur-md border border-[#00ef8b]/20 text-white font-rubik font-medium text-sm transition-all duration-300 opacity-60 cursor-not-allowed"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  // Use local connection state as primary, fallback to FCL state
  const connectedAddress =
    localConnectionState === "disconnected" || forceDisconnected
      ? null // Force disconnected state
      : localConnectionState === "connected" && userState?.addr
      ? userState?.addr
      : userState?.addr && userState?.loggedIn !== false
      ? userState?.addr
      : (currentUser.user as UserState)?.addr &&
        (currentUser.user as UserState)?.loggedIn !== false
      ? (currentUser.user as UserState)?.addr
      : null;

  if (connectedAddress) {
    return (
      <div
        key={`connected-${connectedAddress}`}
        className={`font-rubik flex items-center gap-4 bg-white/5 backdrop-blur-md border border-[#00ef8b]/30 rounded-lg p-3 ${className}`}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#00ef8b] rounded-full"></div>
            <span className="text-xs font-rubik text-white/80">Connected</span>
          </div>
          <div
            className="text-sm font-rubik font-medium text-white"
            title={connectedAddress}
          >
            {formatAddress(connectedAddress)}
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={isLoading}
          className="px-4 py-2 rounded-lg bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-400 font-rubik font-medium text-xs transition-all duration-300 hover:bg-red-500/30 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? "Disconnecting..." : "Disconnect"}
        </button>
      </div>
    );
  }

  return (
    <div
      key={`disconnected-${refreshKey}`}
      className={`flex items-center gap-3 ${className}`}
    >
      <button
        onClick={handleConnect}
        disabled={isLoading}
        className="px-6 py-3 cursor-pointer rounded-lg bg-gradient-to-r from-[#00ef8b] to-white text-black font-rubik font-medium text-sm shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
      >
        {isLoading ? "Connecting..." : "Connect Wallet"}
      </button>
    </div>
  );
}
