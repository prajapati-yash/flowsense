"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as fcl from "@onflow/fcl";
import { configureFCL } from "@/lib/flow-config";

interface FlowContextType {
  user: {
    addr: string | null;
    loggedIn: boolean;
  };
  isInitialized: boolean;
}

const FlowContext = createContext<FlowContextType | undefined>(undefined);

export const useFlow = () => {
  const context = useContext(FlowContext);
  if (!context) {
    throw new Error("useFlow must be used within FlowProvider");
  }
  return context;
};

interface FlowProviderProps {
  children: ReactNode;
}

export default function FlowProvider({ children }: FlowProviderProps) {
  const [user, setUser] = useState<{ addr: string | null; loggedIn: boolean }>({
    addr: null,
    loggedIn: false,
  });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Configure FCL on mount
    configureFCL();
    setIsInitialized(true);

    // Subscribe to authentication changes
    const unsubscribe = fcl.currentUser.subscribe((currentUser) => {
      setUser({
        addr: currentUser.addr || null,
        loggedIn: currentUser.loggedIn || false,
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <FlowContext.Provider value={{ user, isInitialized }}>
      {children}
    </FlowContext.Provider>
  );
}
