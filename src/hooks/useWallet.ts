"use client";

import { useState, useCallback } from "react";
import * as fcl from "@onflow/fcl";
import { useFlow } from "@/Components/Providers/FlowProvider";
import { useToast } from "@/Components/Toast/ToastProvider";

export function useWallet() {
  const { user, isInitialized } = useFlow();
  const { showToast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  // Connect wallet - MUST be called directly from user interaction
  const connect = useCallback(async () => {
    if (!isInitialized) {
      showToast("Flow is still initializing. Please wait.", "warning");
      return;
    }

    if (isConnecting) {
      return;
    }

    try {
      setIsConnecting(true);

      // This will open the wallet popup
      // IMPORTANT: This must be called directly from a user gesture
      await fcl.authenticate();

      showToast("Wallet connected successfully!", "success");
    } catch (error) {
      console.error("[useWallet] Connection error:", error);
      showToast(
        error instanceof Error ? error.message : "Failed to connect wallet",
        "error"
      );
    } finally {
      setIsConnecting(false);
    }
  }, [isInitialized, isConnecting, showToast]);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    try {
      await fcl.unauthenticate();
      showToast("Wallet disconnected", "info");
    } catch (error) {
      console.error("[useWallet] Disconnect error:", error);
      showToast(
        error instanceof Error ? error.message : "Failed to disconnect wallet",
        "error"
      );
    }
  }, [showToast]);

  return {
    address: user.addr,
    isConnected: user.loggedIn,
    isConnecting,
    connect,
    disconnect,
    isInitialized,
  };
}