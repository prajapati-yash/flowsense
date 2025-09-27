"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useFlowCurrentUser } from "@onflow/react-sdk";
import * as fcl from "@onflow/fcl";
import { useToast } from "@/Components/Toast/ToastProvider";

interface FloatingWalletCircleProps {
  className?: string;
}

interface UserState {
  addr?: string;
  loggedIn?: boolean;
}

export default function FloatingWalletCircle({
  className = "",
}: FloatingWalletCircleProps) {
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userState, setUserState] = useState<UserState | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [forceDisconnected, setForceDisconnected] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const currentUser = useFlowCurrentUser();
  const { showToast } = useToast();
  const circleRef = useRef<HTMLDivElement>(null);

  // Motion values for smooth cursor following
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spring animations for smooth movement
  const springX = useSpring(mouseX, { stiffness: 150, damping: 15 });
  const springY = useSpring(mouseY, { stiffness: 150, damping: 15 });

  // Transform values for subtle 3D rotation based on mouse position
  const rotateX = useTransform(
    springY,
    [0, typeof window !== 'undefined' ? window.innerHeight : 800],
    [5, -5]
  );
  const rotateY = useTransform(
    springX,
    [0, typeof window !== 'undefined' ? window.innerWidth : 1200],
    [-5, 5]
  );

  // Initialize client-side rendering
  useEffect(() => {
    setIsClient(true);

    // Set initial position to bottom-center of screen
    const centerX = window.innerWidth / 2;
    const bottomY = window.innerHeight - 100; // 100px from bottom
    mouseX.set(centerX - 48); // Half circle width (96px / 2)
    mouseY.set(bottomY - 48); // Half circle height (96px / 2)
  }, [mouseX, mouseY]);

  // Track scroll position and control visibility
  useEffect(() => {
    if (!isClient) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const viewportHeight = window.innerHeight;

      // Hide component when scrolled past first 100vh
      setIsVisible(scrollY < viewportHeight);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isClient]);

  // Track mouse movement
  useEffect(() => {
    if (!isClient) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      setMousePosition({ x: clientX, y: clientY });

      // Calculate movement range for bottom-center area (similar to KeywordTile)
      const centerX = window.innerWidth / 2;
      const bottomY = window.innerHeight - 100; // 100px from bottom

      // Create subtle movement based on cursor position (like KeywordTile scatter)
      const moveX = (clientX - centerX) * 0.3; // 30% of cursor distance from center
      const moveY = (clientY - bottomY) * 0.2; // 20% of cursor distance from bottom

      // Constrain movement to bottom-center area
      const constrainedX = Math.max(-150, Math.min(150, moveX)); // Max 150px left/right
      const constrainedY = Math.max(-50, Math.min(50, moveY)); // Max 50px up/down

      mouseX.set(centerX + constrainedX - 48); // Center X + movement - half circle width (96px / 2)
      mouseY.set(bottomY + constrainedY - 48); // Bottom Y + movement - half circle height (96px / 2)
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isClient, mouseX, mouseY]);

  // Subscribe to FCL current user changes
  useEffect(() => {
    if (!isClient) return;

    const unsubscribe = fcl.currentUser.subscribe((user: UserState) => {
      setUserState(user);
      if (user?.addr || (!user?.addr && isLoading)) {
        setIsLoading(false);
      }

      // Force re-render by updating state even if user is null
      if (!user?.addr) {
        setUserState(null);
        setIsLoading(false);
        setForceDisconnected(true);
      } else {
        // Reset force disconnect flag if user connects
        setForceDisconnected(false);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isClient, isLoading]);

  // Monitor useFlowCurrentUser hook changes
  useEffect(() => {
    if (currentUser.user?.addr && !userState?.addr) {
      setUserState(currentUser.user as UserState);
    }

    // Handle disconnection case - if currentUser.user is null but userState still has addr
    if (!currentUser.user?.addr && userState?.addr) {
      setUserState(null);
      setIsLoading(false);
      setForceDisconnected(true);
    }

    if (currentUser.user?.addr && isLoading) {
      setIsLoading(false);
    }
  }, [currentUser, userState, isLoading]);

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      setForceDisconnected(false); // Reset force disconnect flag
      const response = await fcl.authenticate();
      console.log("Wallet authentication response:", response);

      setTimeout(() => {
        if (!userState?.addr) {
          setIsLoading(false);
        }
      }, 1000);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      await fcl.unauthenticate();
      setUserState(null);
      setIsLoading(false);
      setForceDisconnected(true);
      setRefreshKey((prev) => prev + 1);

      // Force immediate UI update
      requestAnimationFrame(() => {
        setUserState(null);
        setIsLoading(false);
        setForceDisconnected(true);
        setRefreshKey((prev) => prev + 1);
      });

      showToast("Wallet disconnected successfully!", "success", 3000);
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
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
  };

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isClient || !isVisible) {
    return null;
  }

  // Use FCL subscription state as primary, fallback to hook state
  // Also check if user is actually logged in and not force disconnected
  const connectedAddress =
    !forceDisconnected && userState?.addr && userState?.loggedIn !== false
      ? userState?.addr
      : !forceDisconnected &&
        (currentUser.user as UserState)?.addr &&
        (currentUser.user as UserState)?.loggedIn !== false
      ? (currentUser.user as UserState)?.addr
      : null;

  return (
    <motion.div
      key={`floating-circle-${refreshKey}-${
        connectedAddress ? "connected" : "disconnected"
      }`}
      ref={circleRef}
      className={`fixed z-50 pointer-events-auto ${className}`}
      style={{
        x: springX,
        y: springY,
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        left: 0,
        top: 0,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: isHovered ? 1.1 : 1,
        opacity: 1,
      }}
      transition={{
        scale: { type: "spring", stiffness: 300, damping: 20 },
        opacity: { duration: 0.5 },
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={connectedAddress ? handleDisconnect : handleConnect}
    >
      {/* Main Circle */}
      <div className="relative cursor-pointer">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 w-24 h-24 bg-[#00ef8b]/20 rounded-full blur-lg"></div>

        {/* Main circle container */}
        <div className="relative w-24 h-24 bg-gradient-to-br from-[#00ef8b]/30 via-[#00ef8b]/20 to-white/5 backdrop-blur-md border border-[#00ef8b]/40 rounded-full shadow-lg flex items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,239,139,0.3)] hover:border-[#00ef8b]/60">
          {/* Inner content */}
          <div className="text-center">
            {connectedAddress ? (
              // Connected state
              <div className="space-y-1">
                <div className="w-2 h-2 bg-[#00ef8b] rounded-full mx-auto"></div>
                <div className="text-xs font-rubik font-medium text-white">
                  {formatAddress(connectedAddress)}
                </div>
                <div className="text-xs font-rubik text-white/70">
                  Connected
                </div>
              </div>
            ) : (
              // Disconnected state
              <div className="space-y-1">
                <div className="w-2 h-2 bg-white/60 rounded-full mx-auto"></div>
                <div className="text-xs font-rubik font-medium text-white">
                  {isLoading ? "Connecting..." : "Connect"}
                </div>
                <div className="text-xs font-rubik text-white/70">Wallet</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
