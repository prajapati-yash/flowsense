"use client";
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BiPaperPlane } from "react-icons/bi";
import NetworkSwitcher from "../NetworkSwitcher/NetworkSwitcher";
import WalletConnectionWrapper from "../WalletConnection/WalletConnectionWrapper";
import TransactionPreview from "../TransactionStatus/TransactionPreview";
import ExecutionLoader from "../TransactionStatus/ExecutionLoader";
import TransactionResultComponent from "../TransactionStatus/TransactionResult";
import logo from "@/app/assets/fs2.png"
import Image from "next/image";
import Link from "next/link";
import { useFlowSenseAgent, AgentResponse } from "@/hooks/useFlowSenseAgent";
import { TransactionPlan } from "@/services/transaction-router";
import { TransactionResult, TransactionStatus } from "@/services/flow-transactions";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  type?: 'text' | 'transaction_preview' | 'transaction_status' | 'transaction_result' | 'error';
  data?: unknown;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

const GetStartedMain = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingTransactionPlan, setPendingTransactionPlan] = useState<TransactionPlan | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // FlowSense AI Agent
  const {
    agentState,
    processUserInput,
    executeTransaction,
    resetAgent,
    getAgentIntroduction,
    validateWalletConnection
  } = useFlowSenseAgent();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chats, currentChatId]);

  const currentChat = chats.find((chat) => chat.id === currentChatId);

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
    };
    setChats((prev) => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setInputText("");

    // Add introduction message
    setTimeout(() => {
      const intro = getAgentIntroduction();
      const introMessage = createMessageFromResponse(intro);
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === newChat.id
            ? { ...chat, messages: [introMessage] }
            : chat
        )
      );
    }, 500);
  };

  const addMessage = (message: Message) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === currentChatId
          ? {
              ...chat,
              messages: [...chat.messages, message],
              title:
                chat.messages.length === 0
                  ? message.text.slice(0, 30) + "..."
                  : chat.title,
            }
          : chat
      )
    );
  };

  const createMessageFromResponse = (response: AgentResponse): Message => {
    return {
      id: Date.now().toString(),
      text: response.content,
      isUser: false,
      timestamp: response.timestamp,
      type: response.type,
      data: response.data
    };
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading || pendingTransactionPlan) return;

    const userInput = inputText.trim();

    // Create user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: userInput,
      isUser: true,
      timestamp: new Date(),
    };

    // If no current chat, create one
    let chatId = currentChatId;
    if (!chatId) {
      const newChatId = Date.now().toString();
      const newChat: Chat = {
        id: newChatId,
        title: userInput.slice(0, 30) + (userInput.length > 30 ? "..." : ""),
        messages: [],
        createdAt: new Date(),
      };
      setChats((prev) => [newChat, ...prev]);
      setCurrentChatId(newChatId);
      chatId = newChatId;
    }

    // Add user message to the specific chat
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              messages: [...chat.messages, userMessage],
            }
          : chat
      )
    );

    setInputText("");
    setIsLoading(true);

    try {
      // Check wallet connection first
      const walletStatus = await validateWalletConnection();
      if (!walletStatus.connected) {
        const errorMessage = createMessageFromResponse({
          type: 'error',
          content: `❌ ${walletStatus.message}\n\nPlease connect your wallet using the button in the top right corner.`,
          timestamp: new Date()
        });

        setChats((prev) =>
          prev.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: [...chat.messages, errorMessage],
                }
              : chat
          )
        );
        setIsLoading(false);
        return;
      }

      // Process user input with AI agent
      const agentResponse = await processUserInput(userInput);
      const aiMessage = createMessageFromResponse(agentResponse);

      // Store transaction plan if provided
      if (agentResponse.type === 'transaction_preview' && agentResponse.data) {
        setPendingTransactionPlan(agentResponse.data as TransactionPlan);
      }

      // Add AI message to the specific chat
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                messages: [...chat.messages, aiMessage],
              }
            : chat
        )
      );

      // Add wallet warning if applicable
      if (walletStatus.message) {
        const warningMessage = createMessageFromResponse({
          type: 'text',
          content: walletStatus.message,
          timestamp: new Date()
        });

        setChats((prev) =>
          prev.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: [...chat.messages, warningMessage],
                }
              : chat
          )
        );
      }

    } catch (error: unknown) {
      const errorMessage = createMessageFromResponse({
        type: 'error',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      });

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                messages: [...chat.messages, errorMessage],
              }
            : chat
        )
      );
    }

    setIsLoading(false);
  };

  const handleConfirmTransaction = async (plan: TransactionPlan) => {
    setIsLoading(true);
    setPendingTransactionPlan(null);

    try {
      // Add status message to show execution has started
      const statusMessage: Message = {
        id: Date.now().toString() + '_status',
        text: "🔄 Executing transaction...",
        isUser: false,
        timestamp: new Date(),
        type: 'transaction_status',
        data: { status: 'pending' }
      };
      addMessage(statusMessage);

      // Execute transaction
      const result = await executeTransaction(plan);
      const resultMessage = createMessageFromResponse(result);

      // Remove the status message and add result
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId
            ? {
                ...chat,
                messages: chat.messages.filter(msg => msg.id !== statusMessage.id).concat(resultMessage)
              }
            : chat
        )
      );

    } catch (error: unknown) {
      const errorMessage = createMessageFromResponse({
        type: 'error',
        content: `Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      });
      addMessage(errorMessage);
    }

    setIsLoading(false);
  };

  const handleCancelTransaction = () => {
    setPendingTransactionPlan(null);
    resetAgent();

    const cancelMessage: Message = {
      id: Date.now().toString(),
      text: "Transaction cancelled. You can start a new request anytime!",
      isUser: false,
      timestamp: new Date(),
      type: 'text'
    };
    addMessage(cancelMessage);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const selectChat = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-black/50 backdrop-blur-md border-r border-[#00ef8b]/20 flex flex-col">
        {/* New Chat Button */}
        <div className="p-4 border-b border-[#00ef8b]/20">
          <motion.button
            onClick={createNewChat}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full cursor-pointer font-viga px-6 py-3 rounded-lg bg-gradient-to-r from-[#00ef8b] to-white text-black font-medium text-lg shadow-lg hover:shadow-xl transition-all duration-300"
          >
            + New Chat
          </motion.button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          <h3 className="text-white/70 text-sm font-medium mb-4 font-viga uppercase tracking-wide">
            Recent Chats
          </h3>
          <AnimatePresence>
            {chats.map((chat) => (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                whileHover={{ scale: 1.02 }}
                className={`p-3 rounded-lg cursor-pointer font-rubik transition-all duration-300 ${
                  currentChatId === chat.id
                    ? "bg-[#00ef8b]/20 border border-[#00ef8b]/40"
                    : "bg-white/5 hover:bg-white/10 border border-transparent"
                }`}
                onClick={() => selectChat(chat.id)}
              >
                <div className="text-white font-medium text-sm truncate">
                  {chat.title}
                </div>
                <div className="text-white/50 text-xs mt-1">
                  {chat.createdAt.toLocaleDateString()}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="py-3 px-6 border-b border-[#00ef8b]/20 bg-black/30 backdrop-blur-md flex justify-between">
        <div className="flex items-center">
        <Link href="/" passHref>
          <Image src={logo} alt="" className="w-20"/>
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
          <p className="font-rubik text-white/70 mt-1">
            Ask me anything about blockchain transactions and smart contracts
          </p>
          </div>
          </div>
          <div className="flex items-center gap-4">
          <NetworkSwitcher className="wallet-controls-network" />
          <WalletConnectionWrapper className="wallet-controls-connection" />
        </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {currentChat && currentChat.messages.length > 0 ? (
            <AnimatePresence>
              {currentChat.messages.map((message) => (
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
                    <div className="max-w-3xl px-6 py-4 rounded-2xl bg-gradient-to-r from-[#00ef8b] to-white text-black">
                      <div className="font-rubik text-base leading-relaxed whitespace-pre-wrap">
                        {message.text}
                      </div>
                      <div className="text-xs mt-2 text-black/60">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  ) : (
                    // AI Agent message
                    <div className="max-w-4xl w-full">
                      {message.type === 'transaction_preview' && message.data ? (
                        <div className="space-y-4">
                          <div className="bg-white/10 backdrop-blur-md border border-[#00ef8b]/20 text-white px-6 py-4 rounded-2xl">
                            <div className="font-rubik text-base leading-relaxed whitespace-pre-wrap">
                              {message.text}
                            </div>
                            <div className="text-xs mt-2 text-white/50">
                              {message.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                          <TransactionPreview
                            plan={message.data as TransactionPlan}
                            onConfirm={() => handleConfirmTransaction(message.data as TransactionPlan)}
                            onCancel={handleCancelTransaction}
                            isLoading={isLoading}
                          />
                        </div>
                      ) : message.type === 'transaction_status' ? (
                        <ExecutionLoader
                          status={(message.data as TransactionStatus) || agentState.transactionStatus || { status: 'pending' } as TransactionStatus}
                          txId={agentState.transactionResult?.txId}
                        />
                      ) : message.type === 'transaction_result' && message.data ? (
                        <TransactionResultComponent
                          result={message.data as TransactionResult}
                          onNewTransaction={() => {
                            resetAgent();
                            setPendingTransactionPlan(null);
                          }}
                        />
                      ) : (
                        // Regular text message
                        <div className="bg-white/10 backdrop-blur-md border border-[#00ef8b]/20 text-white px-6 py-4 rounded-2xl">
                          <div className="font-rubik text-base leading-relaxed whitespace-pre-wrap">
                            {message.text}
                          </div>
                          <div className="text-xs mt-2 text-white/50">
                            {message.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center flex flex-col justify-center items-center">
              <Link href="/" passHref className="">
          <Image src={logo} alt="" className="w-20"/>
          </Link>
                <h3
                  className="text-2xl font-viga font-medium mb-2 bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, #ffffff, #00ef8b)",
                  }}
                >
                  Welcome to FlowSense
                </h3>
                <p className="text-white/70 font-rubik max-w-md">
                  Start a conversation by typing your question below. I can help
                  you with blockchain transactions, smart contracts, and more.
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
              <div className="bg-white/10 backdrop-blur-md border border-[#00ef8b]/20 text-white px-6 py-4 rounded-2xl">
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
                  <span className="text-white/70 text-sm">
                    {agentState.isProcessing
                      ? `FlowSense AI: ${agentState.currentStep === 'parsing' ? 'Understanding your request...'
                        : agentState.currentStep === 'routing' ? 'Creating transaction plan...'
                        : agentState.currentStep === 'executing' ? 'Executing transaction...'
                        : agentState.currentStep === 'previewing' ? 'Preparing transaction preview...'
                        : 'Processing...'}`
                      : 'FlowSense AI is thinking...'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="px-3 py-3 border-t border-[#00ef8b]/20 bg-black/30 backdrop-blur-md">
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
                placeholder={pendingTransactionPlan ? "Transaction ready for confirmation..." : "Try: 'Transfer 10 FLOW to 0x123abc...' or 'Send 5 FLOW to Alice immediately'"}
                className="w-full px-6 py-4 pr-16 font-rubik bg-white/10 backdrop-blur-md border border-[#00ef8b]/20 rounded-2xl text-white placeholder-white/50 resize-none focus:outline-none focus:border-[#00ef8b]/40 transition-all duration-300"
                rows={1}
                style={{
                  minHeight: "56px",
                  maxHeight: "200px",
                }}
              />
              <motion.button
                type="submit"
                disabled={!inputText.trim() || isLoading || !!pendingTransactionPlan}
                whileHover={{ scale: inputText.trim() && !isLoading && !pendingTransactionPlan ? 1.05 : 1 }}
                whileTap={{ scale: inputText.trim() && !isLoading && !pendingTransactionPlan ? 0.95 : 1 }}
                className={`absolute right-2 top-2 bottom-2 size-[42px] rounded-xl flex items-center justify-center transition-all duration-300 ${
                  inputText.trim() && !isLoading && !pendingTransactionPlan
                    ? "bg-gradient-to-r from-[#00ef8b] to-white text-black shadow-lg hover:shadow-xl"
                    : "bg-white/20 text-white/50 cursor-not-allowed"
                }`}
              >
                <BiPaperPlane className="size-6"/>
              </motion.button>
            </form>
            <p className="text-white/50 text-xs font-rubik text-center">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GetStartedMain;
