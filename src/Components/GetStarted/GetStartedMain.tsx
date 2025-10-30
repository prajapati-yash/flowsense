"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BiPaperPlane } from "react-icons/bi";
import logo from "@/app/assets/fs2.png";
import Image from "next/image";
import Link from "next/link";
import { chatAPI, ChatListItem, Message } from "@/services/chat-api";
import { ParsedIntent } from "@/services/nlp-parser";
import { useToast } from "@/Components/Toast/ToastProvider";
import { useWallet } from "@/hooks/useWallet";
import { useFlowTransaction } from "@/hooks/useFlowTransaction";
import WalletButton from "@/Components/WalletConnection/WalletButton";
import NetworkSwitcher from "@/Components/NetworkSwitcher/NetworkSwitcher";
import { transactionRouter } from "@/services/transaction-router";

const GetStartedMain = () => {
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [currentChatMessages, setCurrentChatMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingChats, setIsFetchingChats] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { showToast } = useToast();
  const { address, isConnected } = useWallet();
  const { executeTransaction } = useFlowTransaction();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChatMessages]);

  // Load chats from database
  const loadChats = useCallback(async () => {
    if (!address) return; // Don't load if wallet not connected

    try {
      setIsFetchingChats(true);
      const fetchedChats = await chatAPI.fetchChats(address);
      setChats(fetchedChats);
      console.log(
        "[GetStartedMain] Loaded chats from database:",
        fetchedChats.length
      );
    } catch (error) {
      console.error("[GetStartedMain] Failed to load chats:", error);
      // Silent fail - user can still create new chats
    } finally {
      setIsFetchingChats(false);
    }
  }, [address]);

  // Load chats when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      loadChats();
    }
  }, [isConnected, address, loadChats]);

  // Load specific chat with messages
  const loadChat = async (chatId: string) => {
    if (!address) return;

    try {
      const chat = await chatAPI.fetchChat(address, chatId);
      setCurrentChatMessages(chat.messages);
      setCurrentChatId(chatId);
      console.log(
        "[GetStartedMain] Loaded chat:",
        chatId,
        "with",
        chat.messages.length,
        "messages"
      );
    } catch (error) {
      console.error("[GetStartedMain] Failed to load chat:", error);
    }
  };

  const createNewChat = async () => {
    if (!address) {
      showToast("Please connect your wallet first", "warning");
      return;
    }

    try {
      setIsLoading(true);
      const newChat = await chatAPI.createChat(address, "New Chat");

      // Add to local chat list
      setChats((prev) => [newChat, ...prev]);
      setCurrentChatId(newChat.id);
      setCurrentChatMessages([]);
      setInputText("");

      // Add introduction message to database
      setTimeout(async () => {
        const introMessage =
          `👋 Welcome to FlowSense AI!\n\n` +
          `I'm your AI-powered blockchain assistant. I can help you interact with the Flow blockchain using natural language. Here are some things you can try:\n\n` +
          `💱 **Swap tokens**: "swap 10 FLOW to USDC"\n` +
          `💸 **Transfer**: "send 5 FLOW to 0x..."\n` +
          `💰 **Check balance**: "what's my FLOW balance?"\n` +
          `💵 **Get prices**: "how much USDC can I get for 10 FLOW?"\n` +
          `📊 **View portfolio**: "show me my portfolio"\n\n` +
          `Supported tokens: FLOW, USDC, USDT\n\n` +
          `Your wallet is connected: ${address}`;
        await addMessageToDB(newChat.id, introMessage, false, "text");
      }, 500);

      console.log("[GetStartedMain] Created new chat:", newChat.id);
    } catch (error) {
      console.error("[GetStartedMain] Failed to create chat:", error);
      showToast("Failed to create new chat. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Add message to database and update local state
  const addMessageToDB = async (
    chatId: string,
    text: string,
    isUser: boolean,
    type: Message["type"] = "text",
    data: unknown = null
  ) => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    try {
      const message = await chatAPI.addMessage(
        address,
        chatId,
        text,
        isUser,
        type,
        data
      );

      // Update local messages
      setCurrentChatMessages((prev) => [...prev, message]);

      // Update chat title in list if first user message
      if (isUser && currentChatMessages.length === 0) {
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  title: text.slice(0, 30) + (text.length > 30 ? "..." : ""),
                }
              : chat
          )
        );
      }

      return message;
    } catch (error) {
      console.error("[GetStartedMain] Failed to add message:", error);
      throw error;
    }
  };

  // Handle transaction execution when user clicks "Sign Transaction"
  const handleExecuteTransaction = async (messageId: string) => {
    if (!address || !isConnected) {
      showToast("Please connect your wallet first", "warning");
      return;
    }

    const message = currentChatMessages.find((m) => m.id === messageId);
    if (!message || message.type !== "transaction_preview" || !message.data) {
      console.error(
        "[handleExecuteTransaction] Invalid message or missing data"
      );
      return;
    }

    const messageData = message.data as {
      intent: ParsedIntent;
      plan: {
        cadence: string;
        args: unknown[];
        description: string;
        estimatedGas: string;
      };
      status?: string;
      executedAt?: number;
    };

    const { intent, plan } = messageData;
    const chatId = currentChatId;
    if (!chatId) return;

    // Update status to processing
    await chatAPI.updateMessage(chatId, messageId, address, {
      data: {
        ...messageData,
        status: "processing",
        executedAt: Date.now(),
      },
    });

    try {
      // Execute transaction
      const result = await executeTransaction(plan.cadence, plan.args);

      // Update message status based on result
      if (result.success && "transactionId" in result) {
        // Success - update to completed
        await chatAPI.updateMessage(chatId, messageId, address, {
          data: {
            ...messageData,
            status: "success",
            transactionId: result.transactionId,
          },
        });

        const successMessage = transactionRouter.formatTransactionResult(
          intent,
          result.transactionId
        );
        await addMessageToDB(
          chatId,
          successMessage,
          false,
          "transaction_result",
          {
            transactionId: result.transactionId,
          }
        );
        showToast("Transaction successful!", "success");
      } else if (!result.success && "error" in result) {
        // Failed - update to failed so user can retry
        await chatAPI.updateMessage(chatId, messageId, address, {
          data: {
            ...messageData,
            status: "failed",
            error: result.error,
          },
        });

        const errorMessage = transactionRouter.formatError(
          intent,
          result.error || "Unknown error"
        );
        await addMessageToDB(chatId, errorMessage, false, "error");
        showToast("Transaction failed", "error");
      }
    } catch (txError) {
      console.error("[handleExecuteTransaction] Transaction error:", txError);

      // Update to failed on error
      await chatAPI.updateMessage(chatId, messageId, address, {
        data: {
          ...messageData,
          status: "failed",
          error: txError instanceof Error ? txError.message : "Unknown error",
        },
      });

      await addMessageToDB(
        chatId,
        `❌ Transaction failed: ${
          txError instanceof Error ? txError.message : "Unknown error"
        }`,
        false,
        "error"
      );
      showToast("Transaction failed", "error");
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    if (!address || !isConnected) {
      showToast("Please connect your wallet first", "warning");
      return;
    }

    const userInput = inputText.trim();

    // Create chat if none exists
    let chatId = currentChatId;
    if (!chatId) {
      try {
        const newChat = await chatAPI.createChat(
          address,
          userInput.slice(0, 30) + (userInput.length > 30 ? "..." : "")
        );
        setChats((prev) => [newChat, ...prev]);
        setCurrentChatId(newChat.id);
        chatId = newChat.id;
      } catch (error) {
        console.error("[GetStartedMain] Failed to create chat:", error);
        showToast("Failed to create chat. Please try again.", "error");
        return;
      }
    }

    // Clear input immediately
    setInputText("");
    setIsLoading(true);

    try {
      // Add user message to database
      await addMessageToDB(chatId, userInput, true, "text");

      // Process message with AI agent
      console.log("[handleSendMessage] Processing with AI agent...");
      // Pass chatId so agent can load previous messages from database
      const agentResult = await chatAPI.processMessage(
        address,
        userInput,
        chatId
      );

      console.log("[handleSendMessage] Agent result:", agentResult.intent.type);

      // Add AI response to database
      await addMessageToDB(chatId, agentResult.response, false, "text");

      // Handle intent for transactions
      const intent = agentResult.intent;

      // If intent is swap, transfer, or vault_init, prepare transaction for signing
      if (
        intent.type === "swap" ||
        intent.type === "transfer" ||
        intent.type === "vault_init"
      ) {
        // Create transaction plan
        const plan = transactionRouter.routeToTransaction(intent, address);

        if (plan && "estimatedGas" in plan) {
          // Create transaction preview message with sign button
          const previewMessage = `📝 **Transaction Ready**\n\n${plan.description}\n\n⛽ Estimated Gas: ${plan.estimatedGas}\n\n👇 Click the button below to sign the transaction with your wallet.`;

          await addMessageToDB(
            chatId,
            previewMessage,
            false,
            "transaction_preview",
            {
              intent,
              plan,
            }
          );
        }
      }
    } catch (error: unknown) {
      console.error("[handleSendMessage] Error:", error);

      // Handle specific error types
      let errorMessage =
        "Sorry, I encountered an error processing your request.";

      if (error instanceof Error) {
        if (error.message.includes("API key")) {
          errorMessage =
            "AI service is not configured. Please contact support.";
        } else if (error.message.includes("rate limit")) {
          errorMessage =
            "Too many requests. Please wait a moment and try again.";
        } else {
          errorMessage = `❌ Error: ${error.message}`;
        }
      }

      try {
        await addMessageToDB(chatId, errorMessage, false, "error");
      } catch (dbError) {
        console.error("[handleSendMessage] Database error:", dbError);
      }
    }

    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const selectChat = (chatId: string) => {
    loadChat(chatId);
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* Mobile Sidebar Toggle Button */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden fixed top-4 lg:top-6 left-4 z-50 p-2 rounded-lg bg-[#00ef8b]/20 border border-[#00ef8b]/40 backdrop-blur-md"
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
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed lg:relative z-40 lg:z-auto
        w-72 sm:w-80 lg:w-80
        bg-black/50 backdrop-blur-md border-r border-[#00ef8b]/20
        flex flex-col h-full
        transition-transform duration-300 ease-in-out
        ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }
      `}
      >
        {/* Close Button (Mobile Only) - Top */}
        <div className="lg:hidden p-2 border-b border-[#00ef8b]/20 flex justify-between items-center">
          <Link href="/" passHref>
            <Image
              src={logo}
              alt="FlowSense Logo"
              className="w-14 sm:w-16 lg:w-20"
            />
          </Link>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 rounded-lg bg-[#00ef8b]/20 border border-[#00ef8b]/40 hover:bg-[#00ef8b]/30 transition-colors"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3 sm:p-4 border-b border-[#00ef8b]/20">
          <motion.button
            onClick={() => {
              createNewChat();
              setIsSidebarOpen(false);
            }}
            disabled={isLoading}
            whileHover={{ scale: !isLoading ? 1.02 : 1 }}
            whileTap={{ scale: !isLoading ? 0.98 : 1 }}
            className={`w-full cursor-pointer font-viga px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium text-base sm:text-lg shadow-lg transition-all duration-300 ${
              !isLoading
                ? "bg-gradient-to-r from-[#00ef8b] to-white text-black hover:shadow-xl"
                : "bg-white/20 text-white/50 cursor-not-allowed"
            }`}
          >
            {isFetchingChats ? "Loading..." : "+ New Chat"}
          </motion.button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 custom-scrollbar">
          <h3 className="text-white/70 text-xs sm:text-sm font-medium mb-3 sm:mb-4 font-viga uppercase tracking-wide">
            Recent Chats
          </h3>
          {isFetchingChats ? (
            <div className="text-center text-white/50 text-sm py-8">
              Loading chats...
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center text-white/50 text-sm py-8">
              No chats yet. Create one to get started!
            </div>
          ) : (
            <AnimatePresence>
              {chats.map((chat) => (
                <motion.div
                  key={chat.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  whileHover={{ scale: 1.02 }}
                  className={`p-2.5 sm:p-3 rounded-lg cursor-pointer font-rubik transition-all duration-300 ${
                    currentChatId === chat.id
                      ? "bg-[#00ef8b]/20 border border-[#00ef8b]/40"
                      : "bg-white/5 hover:bg-white/10 border border-transparent"
                  }`}
                  onClick={() => {
                    selectChat(chat.id);
                    setIsSidebarOpen(false);
                  }}
                >
                  <div className="text-white font-medium text-xs sm:text-sm truncate">
                    {chat.title}
                  </div>
                  <div className="text-white/50 text-xs mt-1">
                    {new Date(chat.createdAt).toLocaleDateString()}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col w-full lg:w-auto">
        {/* Header */}
        <div className="py-2 sm:py-3 px-3 sm:px-4 lg:px-6 border-b border-[#00ef8b]/20 bg-black/30 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 ml-12 lg:ml-0">
            <Link href="/" passHref>
              <Image
                src={logo}
                alt="FlowSense Logo"
                className="w-14 sm:w-16 lg:w-20"
              />
            </Link>
            <div className="flex-1 min-w-0 hidden sm:block">
              <h1
                className="text-lg sm:text-xl lg:text-2xl font-viga font-semibold bg-clip-text text-transparent truncate"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, #ffffff, #00ef8b)",
                }}
              >
                FlowSense
              </h1>
              <p className="font-rubik text-white/70 text-xs sm:text-sm mt-0.5 sm:mt-1 truncate">
                {isConnected
                  ? `Connected: ${address}`
                  : "Connect your wallet to get started"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <NetworkSwitcher />
            <WalletButton />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 custom-scrollbar">
          {currentChatMessages.length > 0 ? (
            <AnimatePresence>
              {currentChatMessages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${
                    message.isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.isUser ? (
                    // User message
                    <div className="max-w-[85%] sm:max-w-2xl lg:max-w-3xl px-4 sm:px-5 lg:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#00ef8b] to-white text-black">
                      <div className="font-rubik text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
                        {message.text}
                      </div>
                      <div className="text-xs mt-1.5 sm:mt-2 text-black/60">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ) : (
                    // AI message
                    <div className="max-w-[95%] sm:max-w-3xl lg:max-w-4xl w-full">
                      <div className="bg-white/10 backdrop-blur-md border border-[#00ef8b]/20 text-white px-4 sm:px-5 lg:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl">
                        <div className="font-rubik text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
                          {message.text}
                        </div>

                        {/* Show Sign Transaction button for transaction previews */}
                        {message.type === "transaction_preview" &&
                          !!message.data &&
                          (() => {
                            const txData = message.data as {
                              status?: string;
                              createdAt?: number;
                              executedAt?: number;
                            };
                            let status = txData.status || "ready";
                            const createdAt = message.timestamp
                              ? new Date(message.timestamp).getTime()
                              : Date.now();
                            const executedAt = txData.executedAt || Date.now();
                            const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
                            const threeMinutesAgo = Date.now() - 3 * 60 * 1000;
                            const isExpired =
                              createdAt < tenMinutesAgo && status !== "success";

                            // If processing for more than 3 minutes, treat as failed (user can retry)
                            if (
                              status === "processing" &&
                              executedAt < threeMinutesAgo
                            ) {
                              status = "failed";
                            }

                            let buttonText = "✍️ Sign Transaction";
                            let buttonDisabled = false;
                            let buttonClass =
                              "px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-[#00ef8b] to-[#00c770] text-black font-semibold rounded-lg hover:shadow-lg hover:shadow-[#00ef8b]/50 transition-all duration-300";

                            if (isExpired) {
                              buttonText = "⏱️ Transaction Expired";
                              buttonDisabled = true;
                              buttonClass =
                                "px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-gray-600 text-gray-300 font-semibold rounded-lg cursor-not-allowed";
                            } else if (status === "processing") {
                              buttonText = "⏳ Processing...";
                              buttonDisabled = true;
                              buttonClass =
                                "px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-yellow-600 text-white font-semibold rounded-lg cursor-not-allowed";
                            } else if (status === "success") {
                              buttonText = "✅ Transaction Completed";
                              buttonDisabled = true;
                              buttonClass =
                                "px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-green-600 text-white font-semibold rounded-lg cursor-not-allowed";
                            } else if (status === "failed") {
                              buttonText = "🔄 Retry Transaction";
                              buttonDisabled = false;
                              buttonClass =
                                "px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-orange-500/50 transition-all duration-300";
                            }

                            return (
                              <div className="mt-3 sm:mt-4">
                                <button
                                  onClick={() =>
                                    handleExecuteTransaction(message.id)
                                  }
                                  disabled={buttonDisabled}
                                  className={buttonClass}
                                >
                                  {buttonText}
                                </button>
                              </div>
                            );
                          })()}

                        <div className="text-xs mt-1.5 sm:mt-2 text-white/50">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <div className="flex items-center justify-center h-full px-4">
              <div className="text-center flex flex-col justify-center items-center">
                <Link href="/" passHref>
                  <Image
                    src={logo}
                    alt="FlowSense Logo"
                    className="w-16 sm:w-20"
                  />
                </Link>
                <h3
                  className="text-xl sm:text-2xl font-viga font-medium mb-2 bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, #ffffff, #00ef8b)",
                  }}
                >
                  Welcome to FlowSense
                </h3>
                <p className="text-white/70 font-rubik text-sm sm:text-base max-w-md px-4">
                  {isConnected
                    ? `Start a conversation by typing your message below. Try "swap 10 FLOW to USDC", "what's my balance?", or "show me my portfolio"`
                    : "Connect your wallet to start interacting with the Flow blockchain"}
                </p>
              </div>
            </div>
          )}

          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white/10 backdrop-blur-md border border-[#00ef8b]/20 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl max-w-[95%] sm:max-w-none">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-[#00ef8b] rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-[#00ef8b] rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-[#00ef8b] rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                  <span className="text-white/70 text-xs sm:text-sm">
                    Processing...
                  </span>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="px-2 sm:px-3 py-2 sm:py-3 border-t border-[#00ef8b]/20 bg-black/30 backdrop-blur-md">
          <div className="max-w-4xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative"
            >
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="w-full px-4 sm:px-6 py-3 sm:py-4 pr-12 sm:pr-16 font-rubik text-sm sm:text-base bg-white/10 backdrop-blur-md border border-[#00ef8b]/20 rounded-xl sm:rounded-2xl text-white placeholder-white/50 resize-none focus:outline-none focus:border-[#00ef8b]/40 transition-all duration-300"
                rows={1}
                style={{
                  minHeight: "48px",
                  maxHeight: "200px",
                }}
              />
              <motion.button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                whileHover={{
                  scale: inputText.trim() && !isLoading ? 1.05 : 1,
                }}
                whileTap={{ scale: inputText.trim() && !isLoading ? 0.95 : 1 }}
                className={`absolute right-2 top-1.5 sm:top-2 bottom-1.5 sm:bottom-2 w-9 h-9 sm:w-[42px] sm:h-[42px] rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300 ${
                  inputText.trim() && !isLoading
                    ? "bg-gradient-to-r from-[#00ef8b] to-white text-black shadow-lg hover:shadow-xl"
                    : "bg-white/20 text-white/50 cursor-not-allowed"
                }`}
              >
                <BiPaperPlane className="w-5 h-5 sm:w-6 sm:h-6" />
              </motion.button>
            </form>
            <p className="text-white/50 text-[10px] sm:text-xs font-rubik text-center mt-1 sm:mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GetStartedMain;
