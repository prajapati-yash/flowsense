# Flow Wallet Integration Roadmap

Complete step-by-step guide to integrate Flow wallet into FlowSense application.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Implementation Steps](#implementation-steps)
4. [Testing Guide](#testing-guide)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:
- ✅ Node.js 18+ installed
- ✅ MongoDB setup and running (connection string in `.env.local`)
- ✅ Flow CLI installed (for testing): `sh -ci "$(curl -fsSL https://raw.githubusercontent.com/onflow/flow-cli/master/install.sh)"`
- ✅ Basic understanding of React hooks and async/await

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                           │
│  (GetStartedMain.tsx - Chat Interface with Wallet Connect)      │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      React Context Layer                         │
│  FlowProvider.tsx - Manages wallet state & FCL initialization   │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Service Layer (Hooks)                         │
│  useWallet.ts - Wallet connection/disconnection logic           │
│  useFlowTransaction.ts - Transaction execution & monitoring      │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Flow Client Library (FCL)                     │
│  - Handles wallet popups                                         │
│  - Manages authentication                                        │
│  - Executes transactions                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Key Principles
1. **User Gesture Chain Preservation**: All wallet actions must be triggered directly from user interactions (no async state updates in between)
2. **Minimal State**: Use refs instead of state where possible to avoid re-renders
3. **Database Persistence**: Store wallet address in database, not just local state
4. **Error Handling**: Use toast notifications (non-blocking) instead of alerts

---

## Implementation Steps

### Phase 1: FCL Configuration & Provider Setup

#### Step 1.1: Install Dependencies

```bash
npm install @onflow/fcl @onflow/types
```

#### Step 1.2: Create FCL Configuration File

**File: `src/lib/flow-config.ts`**

```typescript
import * as fcl from "@onflow/fcl";

// Network configuration
export const FLOW_NETWORK = process.env.NEXT_PUBLIC_FLOW_NETWORK || "testnet";

// Configure FCL based on network
export const configureFCL = () => {
  if (FLOW_NETWORK === "mainnet") {
    fcl.config({
      "accessNode.api": "https://rest-mainnet.onflow.org",
      "discovery.wallet": "https://fcl-discovery.onflow.org/authn",
      "app.detail.title": "FlowSense",
      "app.detail.icon": "https://flowsense.app/favicon.png",
    });
  } else if (FLOW_NETWORK === "testnet") {
    fcl.config({
      "accessNode.api": "https://rest-testnet.onflow.org",
      "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
      "app.detail.title": "FlowSense",
      "app.detail.icon": "https://flowsense.app/favicon.png",
    });
  } else {
    // Local emulator
    fcl.config({
      "accessNode.api": "http://localhost:8888",
      "discovery.wallet": "http://localhost:8701/fcl/authn",
      "app.detail.title": "FlowSense",
      "app.detail.icon": "https://flowsense.app/favicon.png",
    });
  }
};

// Helper to get current network info
export const getNetworkInfo = () => {
  return {
    network: FLOW_NETWORK,
    isMainnet: FLOW_NETWORK === "mainnet",
    isTestnet: FLOW_NETWORK === "testnet",
    isEmulator: FLOW_NETWORK === "emulator",
  };
};
```

**Add to `.env.local`:**
```bash
NEXT_PUBLIC_FLOW_NETWORK=testnet
```

#### Step 1.3: Create Flow Provider

**File: `src/Components/Providers/FlowProvider.tsx`**

```typescript
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
```

#### Step 1.4: Integrate Provider in Layout

**File: `src/app/layout.tsx`**

Update the layout to wrap children with FlowProvider:

```typescript
import FlowProvider from "@/Components/Providers/FlowProvider";
import ToastProvider from "@/Components/Toast/ToastProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${rubik.variable} ${rubikMonoOne.variable} ${bricolage.variable} ${viga.variable} antialiased`}
      >
        <FlowProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </FlowProvider>
      </body>
    </html>
  );
}
```

---

### Phase 2: Wallet Connection Hook

#### Step 2.1: Create useWallet Hook

**File: `src/hooks/useWallet.ts`**

```typescript
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
```

---

### Phase 3: Transaction Execution Hook

#### Step 3.1: Create Transaction Hook

**File: `src/hooks/useFlowTransaction.ts`**

```typescript
"use client";

import { useState, useCallback, useRef } from "react";
import * as fcl from "@onflow/fcl";
import { useToast } from "@/Components/Toast/ToastProvider";

export interface TransactionStatus {
  status: "idle" | "pending" | "processing" | "success" | "error";
  transactionId?: string;
  errorMessage?: string;
}

export function useFlowTransaction() {
  const { showToast } = useToast();
  const [txStatus, setTxStatus] = useState<TransactionStatus>({ status: "idle" });

  // Use ref to avoid breaking user gesture chain
  const txStatusRef = useRef<TransactionStatus>({ status: "idle" });

  // Execute a Cadence transaction
  const executeTransaction = useCallback(
    async (cadenceCode: string, args: any[] = [], statusCallback?: (status: TransactionStatus) => void) => {
      try {
        // Reset status
        const initialStatus: TransactionStatus = { status: "pending" };
        txStatusRef.current = initialStatus;
        setTxStatus(initialStatus);
        statusCallback?.(initialStatus);

        showToast("Waiting for wallet approval...", "info");

        // Send transaction - This will trigger wallet popup
        // IMPORTANT: Must be called synchronously from user gesture
        const transactionId = await fcl.mutate({
          cadence: cadenceCode,
          args: (arg, t) => args,
          limit: 9999,
        });

        console.log("[useFlowTransaction] Transaction sent:", transactionId);

        const processingStatus: TransactionStatus = {
          status: "processing",
          transactionId,
        };
        txStatusRef.current = processingStatus;
        setTxStatus(processingStatus);
        statusCallback?.(processingStatus);

        showToast("Transaction submitted! Processing...", "info");

        // Wait for transaction to be sealed
        const transaction = await fcl.tx(transactionId).onceSealed();

        console.log("[useFlowTransaction] Transaction sealed:", transaction);

        if (transaction.statusCode === 0) {
          const successStatus: TransactionStatus = {
            status: "success",
            transactionId,
          };
          txStatusRef.current = successStatus;
          setTxStatus(successStatus);
          statusCallback?.(successStatus);

          showToast("Transaction successful!", "success");
          return { success: true, transactionId, transaction };
        } else {
          throw new Error(`Transaction failed with status code: ${transaction.statusCode}`);
        }
      } catch (error: any) {
        console.error("[useFlowTransaction] Transaction error:", error);

        const errorMessage = error?.message || "Transaction failed";
        const errorStatus: TransactionStatus = {
          status: "error",
          errorMessage,
        };
        txStatusRef.current = errorStatus;
        setTxStatus(errorStatus);
        statusCallback?.(errorStatus);

        showToast(errorMessage, "error");
        return { success: false, error: errorMessage };
      }
    },
    [showToast]
  );

  // Execute a Cadence script (read-only, no transaction)
  const executeScript = useCallback(async (cadenceCode: string, args: any[] = []) => {
    try {
      const result = await fcl.query({
        cadence: cadenceCode,
        args: (arg, t) => args,
      });

      return { success: true, result };
    } catch (error: any) {
      console.error("[useFlowTransaction] Script error:", error);
      const errorMessage = error?.message || "Script execution failed";
      showToast(errorMessage, "error");
      return { success: false, error: errorMessage };
    }
  }, [showToast]);

  return {
    executeTransaction,
    executeScript,
    txStatus,
    isProcessing: txStatus.status === "pending" || txStatus.status === "processing",
  };
}
```

---

### Phase 4: Wallet UI Components

#### Step 4.1: Create Wallet Connection Button Component

**File: `src/Components/WalletConnection/WalletButton.tsx`**

```typescript
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
```

#### Step 4.2: Create Network Switcher Component

**File: `src/Components/NetworkSwitcher/NetworkSwitcher.tsx`**

```typescript
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
```

---

### Phase 5: Integrate Wallet into Chat Interface

#### Step 5.1: Update GetStartedMain with Wallet

**File: `src/Components/GetStarted/GetStartedMain.tsx`**

Add the following imports at the top:

```typescript
import { useWallet } from "@/hooks/useWallet";
import { useFlowTransaction } from "@/hooks/useFlowTransaction";
import WalletButton from "@/Components/WalletConnection/WalletButton";
import NetworkSwitcher from "@/Components/NetworkSwitcher/NetworkSwitcher";
```

Add wallet hooks after existing state declarations (around line 21):

```typescript
const { showToast } = useToast();
const { address, isConnected } = useWallet();
const { executeTransaction, executeScript } = useFlowTransaction();
```

Update the header section (around line 242) to include wallet button:

```typescript
{/* Header */}
<div className="py-3 px-6 border-b border-[#00ef8b]/20 bg-black/30 backdrop-blur-md flex justify-between items-center">
  <div className="flex items-center">
    <Link href="/" passHref>
      <Image src={logo} alt="FlowSense Logo" className="w-20"/>
    </Link>
    <div>
      <h1
        className="text-2xl font-viga font-semibold bg-clip-text text-transparent"
        style={{
          backgroundImage: "linear-gradient(to right, #ffffff, #00ef8b)",
        }}
      >
        FlowSense
      </h1>
      <p className="font-rubik text-white/70 mt-1 text-sm">
        {isConnected ? `Connected: ${address}` : "Connect your wallet to get started"}
      </p>
    </div>
  </div>

  {/* Wallet Controls */}
  <div className="flex items-center gap-3">
    <NetworkSwitcher />
    <WalletButton />
  </div>
</div>
```

#### Step 5.2: Update Chat API to Use Real Wallet Address

**File: `src/services/chat-api.ts`**

Replace the static wallet address with dynamic one:

```typescript
class ChatAPIService {
  /**
   * Make authenticated API request
   */
  private async authenticatedFetch(
    url: string,
    options: RequestInit = {},
    walletAddress?: string
  ): Promise<Response> {
    // Get wallet address from parameter or throw error
    if (!walletAddress) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-wallet-address': walletAddress,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response;
  }

  /**
   * Fetch all chats for current user
   */
  async fetchChats(walletAddress: string): Promise<ChatListItem[]> {
    try {
      const response = await this.authenticatedFetch('/api/chats', {}, walletAddress);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch chats');
      }

      return data.chats.map((chat: ChatListItem) => ({
        ...chat,
        createdAt: new Date(chat.createdAt),
        updatedAt: chat.updatedAt ? new Date(chat.updatedAt) : undefined,
        lastMessageAt: chat.lastMessageAt ? new Date(chat.lastMessageAt) : undefined
      }));
    } catch (error) {
      console.error('[ChatAPI] Fetch chats failed:', error);
      throw error;
    }
  }

  /**
   * Create a new chat
   */
  async createChat(walletAddress: string, title: string = 'New Chat'): Promise<Chat> {
    try {
      const response = await this.authenticatedFetch('/api/chats', {
        method: 'POST',
        body: JSON.stringify({ title }),
      }, walletAddress);

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create chat');
      }

      return {
        ...data.chat,
        createdAt: new Date(data.chat.createdAt),
        updatedAt: data.chat.updatedAt ? new Date(data.chat.updatedAt) : undefined,
        lastMessageAt: data.chat.lastMessageAt ? new Date(data.chat.lastMessageAt) : undefined
      };
    } catch (error) {
      console.error('[ChatAPI] Create chat failed:', error);
      throw error;
    }
  }

  /**
   * Fetch specific chat with messages
   */
  async fetchChat(walletAddress: string, chatId: string): Promise<Chat> {
    try {
      const response = await this.authenticatedFetch(`/api/chats/${chatId}`, {}, walletAddress);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch chat');
      }

      return {
        ...data.chat,
        createdAt: new Date(data.chat.createdAt),
        updatedAt: data.chat.updatedAt ? new Date(data.chat.updatedAt) : undefined,
        lastMessageAt: data.chat.lastMessageAt ? new Date(data.chat.lastMessageAt) : undefined,
        messages: data.chat.messages.map((msg: Message) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      };
    } catch (error) {
      console.error('[ChatAPI] Fetch chat failed:', error);
      throw error;
    }
  }

  /**
   * Add message to chat
   */
  async addMessage(
    walletAddress: string,
    chatId: string,
    text: string,
    isUser: boolean,
    type: Message['type'] = 'text',
    data: unknown = null
  ): Promise<Message> {
    try {
      const response = await this.authenticatedFetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text, isUser, type, data }),
      }, walletAddress);

      const responseData = await response.json();

      if (!responseData.success) {
        throw new Error(responseData.error || 'Failed to add message');
      }

      return {
        ...responseData.message,
        timestamp: new Date(responseData.message.timestamp)
      };
    } catch (error) {
      console.error('[ChatAPI] Add message failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const chatAPI = new ChatAPIService();
```

#### Step 5.3: Update GetStartedMain to Pass Wallet Address

Update all `chatAPI` method calls in `GetStartedMain.tsx` to pass the wallet address:

```typescript
// Around line 35
const loadChats = async () => {
  if (!address) return; // Don't load if wallet not connected

  try {
    setIsFetchingChats(true);
    const fetchedChats = await chatAPI.fetchChats(address);
    setChats(fetchedChats);
    console.log('[GetStartedMain] Loaded chats from database:', fetchedChats.length);
  } catch (error) {
    console.error('[GetStartedMain] Failed to load chats:', error);
    // Silent fail - user can still create new chats
  } finally {
    setIsFetchingChats(false);
  }
};

// Around line 50
const loadChat = async (chatId: string) => {
  if (!address) return;

  try {
    const chat = await chatAPI.fetchChat(address, chatId);
    setCurrentChatMessages(chat.messages);
    setCurrentChatId(chatId);
    console.log('[GetStartedMain] Loaded chat:', chatId, 'with', chat.messages.length, 'messages');
  } catch (error) {
    console.error('[GetStartedMain] Failed to load chat:', error);
  }
};

// Around line 61
const createNewChat = async () => {
  if (!address) {
    showToast('Please connect your wallet first', 'warning');
    return;
  }

  try {
    setIsLoading(true);
    const newChat = await chatAPI.createChat(address, 'New Chat');
    // ... rest of the code
  } catch (error) {
    console.error('[GetStartedMain] Failed to create chat:', error);
    showToast('Failed to create new chat. Please try again.', 'error');
  } finally {
    setIsLoading(false);
  }
};

// Update addMessageToDB around line 88
const addMessageToDB = async (
  chatId: string,
  text: string,
  isUser: boolean,
  type: Message['type'] = 'text',
  data: unknown = null
) => {
  if (!address) {
    throw new Error('Wallet not connected');
  }

  try {
    const message = await chatAPI.addMessage(address, chatId, text, isUser, type, data);
    // ... rest of the code
  } catch (error) {
    console.error('[GetStartedMain] Failed to add message:', error);
    throw error;
  }
};

// Update handleSendMessage around line 119
const handleSendMessage = async () => {
  if (!inputText.trim() || isLoading) return;

  if (!address || !isConnected) {
    showToast('Please connect your wallet first', 'warning');
    return;
  }

  const userInput = inputText.trim();

  // Create chat if none exists
  let chatId = currentChatId;
  if (!chatId) {
    try {
      const newChat = await chatAPI.createChat(address, userInput.slice(0, 30) + (userInput.length > 30 ? '...' : ''));
      setChats((prev) => [newChat, ...prev]);
      setCurrentChatId(newChat.id);
      chatId = newChat.id;
    } catch (error) {
      console.error('[GetStartedMain] Failed to create chat:', error);
      showToast('Failed to create chat. Please try again.', 'error');
      return;
    }
  }

  // ... rest of the code
};
```

Add useEffect to load chats when wallet connects:

```typescript
// Add this after the existing useEffect on line 32
useEffect(() => {
  if (isConnected && address) {
    loadChats();
  }
}, [isConnected, address]);
```

---

### Phase 6: Example Transaction Integration

#### Step 6.1: Create Simple Transfer Transaction

**File: `cadence/transactions/transfer_flow.cdc`**

```cadence
import FungibleToken from 0xFungibleToken
import FlowToken from 0xFlowToken

transaction(recipient: Address, amount: UFix64) {
    let sentVault: @FungibleToken.Vault

    prepare(signer: AuthAccount) {
        // Get a reference to the signer's stored vault
        let vaultRef = signer.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow reference to the owner's Vault!")

        // Withdraw tokens from the signer's stored vault
        self.sentVault <- vaultRef.withdraw(amount: amount)
    }

    execute {
        // Get the recipient's public account object
        let recipient = getAccount(recipient)

        // Get a reference to the recipient's Receiver
        let receiverRef = recipient.getCapability(/public/flowTokenReceiver)
            .borrow<&{FungibleToken.Receiver}>()
            ?? panic("Could not borrow receiver reference to the recipient's Vault")

        // Deposit the withdrawn tokens in the recipient's receiver
        receiverRef.deposit(from: <-self.sentVault)
    }
}
```

#### Step 6.2: Create Transaction Helper

**File: `src/services/flow-transactions.ts`**

```typescript
import * as fcl from "@onflow/fcl";
import * as t from "@onflow/types";

// Transaction codes
const TRANSFER_FLOW_TRANSACTION = `
import FungibleToken from 0xFungibleToken
import FlowToken from 0xFlowToken

transaction(recipient: Address, amount: UFix64) {
    let sentVault: @FungibleToken.Vault

    prepare(signer: AuthAccount) {
        let vaultRef = signer.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow reference to the owner's Vault!")

        self.sentVault <- vaultRef.withdraw(amount: amount)
    }

    execute {
        let recipient = getAccount(recipient)

        let receiverRef = recipient.getCapability(/public/flowTokenReceiver)
            .borrow<&{FungibleToken.Receiver}>()
            ?? panic("Could not borrow receiver reference to the recipient's Vault")

        receiverRef.deposit(from: <-self.sentVault)
    }
}
`;

// Get balance script
const GET_BALANCE_SCRIPT = `
import FungibleToken from 0xFungibleToken
import FlowToken from 0xFlowToken

pub fun main(address: Address): UFix64 {
    let account = getAccount(address)

    let vaultRef = account.getCapability(/public/flowTokenBalance)
        .borrow<&FlowToken.Vault{FungibleToken.Balance}>()
        ?? panic("Could not borrow Balance reference to the Vault")

    return vaultRef.balance
}
`;

export interface TransferFlowParams {
  recipient: string;
  amount: string;
}

export const FlowTransactions = {
  /**
   * Transfer FLOW tokens
   */
  transferFlow: (params: TransferFlowParams) => ({
    cadence: TRANSFER_FLOW_TRANSACTION,
    args: [
      fcl.arg(params.recipient, t.Address),
      fcl.arg(params.amount, t.UFix64),
    ],
  }),

  /**
   * Get FLOW balance for an address
   */
  getBalance: (address: string) => ({
    cadence: GET_BALANCE_SCRIPT,
    args: [fcl.arg(address, t.Address)],
  }),
};
```

#### Step 6.3: Example Usage in Chat

Add this helper function to `GetStartedMain.tsx`:

```typescript
// Add this after the addMessageToDB function
const handleTransferCommand = async (recipient: string, amount: string) => {
  if (!isConnected || !address) {
    showToast('Please connect your wallet first', 'warning');
    return;
  }

  try {
    // Create or get chat
    let chatId = currentChatId;
    if (!chatId) {
      const newChat = await chatAPI.createChat(address, 'Transfer Transaction');
      setChats((prev) => [newChat, ...prev]);
      setCurrentChatId(newChat.id);
      chatId = newChat.id;
    }

    // Add user message
    await addMessageToDB(
      chatId,
      `Transfer ${amount} FLOW to ${recipient}`,
      true,
      'text'
    );

    // Add processing message
    await addMessageToDB(
      chatId,
      'Processing transaction...',
      false,
      'text'
    );

    // Execute transaction
    const tx = FlowTransactions.transferFlow({ recipient, amount });
    const result = await executeTransaction(tx.cadence, tx.args);

    if (result.success) {
      await addMessageToDB(
        chatId,
        `✅ Transaction successful!\nTransaction ID: ${result.transactionId}`,
        false,
        'transaction_result',
        { transactionId: result.transactionId }
      );
    } else {
      await addMessageToDB(
        chatId,
        `❌ Transaction failed: ${result.error}`,
        false,
        'error'
      );
    }
  } catch (error) {
    console.error('[handleTransferCommand] Error:', error);
    showToast(
      error instanceof Error ? error.message : 'Transaction failed',
      'error'
    );
  }
};
```

Import the transactions helper at the top:

```typescript
import { FlowTransactions } from "@/services/flow-transactions";
```

---

## Phase 6 Status: ✅ COMPLETED (2025-10-08)

All Phase 6 implementation tasks have been completed:
- ✅ Created Cadence transfer transaction file (`cadence/transactions/transfer_flow.cdc`)
- ✅ Created Flow transaction helper service (`src/services/flow-transactions.ts`)
- ✅ Added transfer command handler to GetStartedMain
- ✅ Updated chat-api.ts to use real wallet addresses instead of static address
- ✅ Updated all chat API calls in GetStartedMain to pass wallet address

**Additional Updates Completed:**
- Updated `chat-api.ts` to accept `walletAddress` parameter in all methods
- Updated `GetStartedMain.tsx` to pass wallet address to all chat API calls
- Added wallet connection check before creating chats and sending messages
- Updated useEffect to load chats when wallet connects

**Example Usage:**
To test the transfer functionality, you can call the `handleTransferCommand` function from the chat interface:
```typescript
handleTransferCommand("0x1234567890abcdef", "1.0")
```

This will:
1. Prompt the user to approve the transaction in their wallet
2. Execute the transfer on Flow blockchain
3. Display the transaction result in the chat

---

## Testing Guide

### Test 1: Wallet Connection

1. Start dev server: `npm run dev`
2. Open browser: `http://localhost:3000/chat`
3. Click "Connect Wallet" button
4. Verify popup opens without issues
5. Complete authentication in wallet
6. Verify wallet address displays in header
7. Verify chats load after connection

### Test 2: Chat Persistence with Wallet

1. Connect wallet
2. Create a new chat
3. Send a message
4. Check MongoDB to verify:
   - User document created with wallet address
   - Chat document linked to user
   - Message saved correctly
5. Disconnect and reconnect wallet
6. Verify chats persist

### Test 3: Network Switching

1. Update `.env.local`: `NEXT_PUBLIC_FLOW_NETWORK=testnet`
2. Restart server
3. Verify "Testnet" badge shows
4. Connect wallet
5. Change to `mainnet`
6. Restart and verify "Mainnet" badge shows

### Test 4: Simple Transaction (Testnet)

1. Ensure you have testnet FLOW tokens (use faucet: https://testnet-faucet.onflow.org/)
2. Connect wallet on testnet
3. Execute transfer transaction
4. Verify popup opens for approval
5. Approve transaction
6. Verify transaction appears in messages
7. Check transaction on flowscan.org

---

## Troubleshooting

### Issue: Wallet popup not opening

**Symptoms:** Click "Connect Wallet", see "1" badge on extension, popup doesn't open

**Causes:**
1. State update breaking user gesture chain
2. Async operation before FCL call
3. Popup blocker enabled

**Solutions:**
1. Ensure `connect()` is called directly from onClick handler
2. Don't use `useState` for transaction state - use `useRef`
3. Check browser popup settings
4. Test in different browser

### Issue: "User rejected signature" error

**Symptoms:** Transaction fails with rejection error

**Solutions:**
1. Normal - user clicked "Decline" in wallet
2. Handle gracefully with toast notification
3. Don't retry automatically

### Issue: Transaction stuck in "Pending" state

**Symptoms:** Transaction shows "Processing..." indefinitely

**Solutions:**
1. Check network connection
2. Verify correct network (testnet/mainnet)
3. Check Flow status: https://status.onflow.org/
4. Transaction may have failed - check blockchain explorer
5. Add timeout to transaction monitoring

### Issue: "Could not borrow reference" error

**Symptoms:** Transaction fails with Cadence error

**Solutions:**
1. Verify account has initialized storage
2. Check capability paths are correct
3. Ensure contract addresses are correct for network
4. Test with Flow CLI first

### Issue: Chats not loading after wallet connection

**Symptoms:** Wallet connects but no chats appear

**Solutions:**
1. Check MongoDB connection
2. Verify API routes are working (check Network tab)
3. Check console for errors
4. Verify wallet address is being sent in headers
5. Check API authentication middleware

### Issue: FCL "Access node not configured" error

**Symptoms:** Transactions fail with configuration error

**Solutions:**
1. Verify `configureFCL()` is called before any FCL operations
2. Check network environment variable is set
3. Ensure FlowProvider is wrapping the app
4. Check `flow-config.ts` has correct access node URLs

---

## Additional Resources

- **Flow Documentation:** https://developers.flow.com/
- **FCL Documentation:** https://developers.flow.com/tools/fcl-js
- **Cadence Language:** https://cadence-lang.org/
- **Flow Testnet Faucet:** https://testnet-faucet.onflow.org/
- **Flow Block Explorers:**
  - Testnet: https://testnet.flowscan.org/
  - Mainnet: https://flowscan.org/
- **Flow Discord:** https://discord.gg/flow

---

## Summary

This roadmap provides a complete guide to integrating Flow wallet into FlowSense. Key takeaways:

1. **Preserve user gesture chain** - Critical for popup functionality
2. **Use refs over state** - Avoid re-renders that break gesture chain
3. **Database persistence** - Store wallet address and associate with user
4. **Non-blocking errors** - Use toasts, not alerts
5. **Test thoroughly** - Wallet integration has many edge cases

Follow the phases in order, test each step before moving to the next, and refer to the troubleshooting section for common issues.

---

**Created:** 2025-10-08
**Last Updated:** 2025-10-08
**Version:** 1.1 - Phase 6 Completed
