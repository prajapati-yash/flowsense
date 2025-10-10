"use client";
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BiPaperPlane } from "react-icons/bi";
import logo from "@/app/assets/fs2.png"
import Image from "next/image";
import Link from "next/link";
import { chatAPI, ChatListItem, Message } from "@/services/chat-api";
import { useToast } from "@/Components/Toast/ToastProvider";
import { useWallet } from "@/hooks/useWallet";
import { useFlowTransaction } from "@/hooks/useFlowTransaction";
import WalletButton from "@/Components/WalletConnection/WalletButton";
import NetworkSwitcher from "@/Components/NetworkSwitcher/NetworkSwitcher";
import { FlowTransactions } from "@/services/flow-transactions";
import { nlpParser } from "@/services/nlp-parser";
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
  const { executeTransaction, executeScript } = useFlowTransaction();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChatMessages]);

  // Load chats when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      loadChats();
    }
  }, [isConnected, address]);

  // Load chats from database
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
  // Load specific chat with messages
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
  

  const createNewChat = async () => {
    if (!address) {
      showToast('Please connect your wallet first', 'warning');
      return;
    }

    try {
      setIsLoading(true);
      const newChat = await chatAPI.createChat(address, 'New Chat');

      // Add to local chat list
      setChats((prev) => [newChat, ...prev]);
      setCurrentChatId(newChat.id);
      setCurrentChatMessages([]);
      setInputText("");

      // Add introduction message to database
      setTimeout(async () => {
        const supportedTokens = nlpParser.getSupportedTokens();
        const introMessage = `👋 Welcome to FlowSense!\n\nI can help you interact with the Flow blockchain using natural language. Here are some things you can try:\n\n` +
          `💱 **Swap tokens**: "swap 10 FLOW to USDC"\n` +
          `💸 **Transfer**: "send 5 FLOW to 0x..."\n` +
          `💰 **Check balance**: "check my FLOW balance"\n\n` +
          `Supported tokens: ${supportedTokens.map(t => t.toUpperCase()).join(', ')}\n\n` +
          `Your wallet is connected: ${address}`;
        await addMessageToDB(newChat.id, introMessage, false, 'text');
      }, 500);

      console.log('[GetStartedMain] Created new chat:', newChat.id);
    } catch (error) {
      console.error('[GetStartedMain] Failed to create chat:', error);
      showToast('Failed to create new chat. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Add message to database and update local state
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

      // Update local messages
      setCurrentChatMessages((prev) => [...prev, message]);

      // Update chat title in list if first user message
      if (isUser && currentChatMessages.length === 0) {
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === chatId
              ? { ...chat, title: text.slice(0, 30) + (text.length > 30 ? '...' : '') }
              : chat
          )
        );
      }

      return message;
    } catch (error) {
      console.error('[GetStartedMain] Failed to add message:', error);
      throw error;
    }
  };

  // Handle transfer command
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

    // Parse intent FIRST (synchronous, before any async operations)
    const intent = nlpParser.parse(userInput);

    // Clear input immediately
    setInputText("");
    setIsLoading(true);

    // Handle unknown intent (no transaction needed)
    if (intent.type === 'unknown') {
      try {
        await addMessageToDB(chatId, userInput, true, 'text');

        const supportedTokens = nlpParser.getSupportedTokens();
        const helpMessage = `I didn't understand that command. Here's what I can help you with:\n\n` +
          `💱 **Swap tokens**: "swap 10 FLOW to USDC"\n` +
          `💸 **Transfer**: "send 5 FLOW to 0x..."\n` +
          `💰 **Check balance**: "check my FLOW balance"\n\n` +
          `Supported tokens: ${supportedTokens.map(t => t.toUpperCase()).join(', ')}`;

        await addMessageToDB(chatId, helpMessage, false, 'text');
      } catch (error) {
        console.error('[handleSendMessage] Error:', error);
      }
      setIsLoading(false);
      return;
    }

    // Create transaction/script plan (synchronous)
    const plan = transactionRouter.routeToTransaction(intent, address!);

    if (!plan) {
      try {
        await addMessageToDB(chatId, userInput, true, 'text');
        await addMessageToDB(
          chatId,
          `Sorry, I couldn't create a transaction plan for: ${intent.type}`,
          false,
          'error'
        );
      } catch (error) {
        console.error('[handleSendMessage] Error:', error);
      }
      setIsLoading(false);
      return;
    }

    // CRITICAL: Execute transaction IMMEDIATELY (no async operations before this)
    // This preserves the user gesture chain for wallet popup
    try {
      let result;

      if ('estimatedGas' in plan) {
        // It's a transaction - execute immediately
        result = await executeTransaction(plan.cadence, plan.args);
      } else {
        // It's a script (read-only)
        result = await executeScript(plan.cadence, plan.args);
      }

      // NOW save messages to database (after transaction is approved)
      try {
        // Add user message
        await addMessageToDB(chatId, userInput, true, 'text');

        // Add result message
        if ('estimatedGas' in plan) {
          // Transaction result
          if (result.success) {
            const successMessage = transactionRouter.formatTransactionResult(
              intent,
              result.transactionId!
            );
            await addMessageToDB(chatId, successMessage, false, 'transaction_result', {
              transactionId: result.transactionId,
            });
          } else {
            const errorMessage = transactionRouter.formatError(intent, result.error || 'Unknown error');
            await addMessageToDB(chatId, errorMessage, false, 'error');
          }
        } else {
          // Script result
          if (result.success) {
            const resultMessage = transactionRouter.formatScriptResult(intent, result.result);
            await addMessageToDB(chatId, resultMessage, false, 'text');
          } else {
            const errorMessage = transactionRouter.formatError(intent, result.error || 'Unknown error');
            await addMessageToDB(chatId, errorMessage, false, 'error');
          }
        }
      } catch (dbError) {
        console.error('[handleSendMessage] Database error:', dbError);
        // Transaction succeeded but DB save failed - not critical
      }

    } catch (error: unknown) {
      console.error('[handleSendMessage] Transaction error:', error);
      try {
        await addMessageToDB(chatId, userInput, true, 'text');
        await addMessageToDB(
          chatId,
          `❌ Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          false,
          'error'
        );
      } catch (dbError) {
        console.error('[handleSendMessage] Database error:', dbError);
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

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-black/50 backdrop-blur-md border-r border-[#00ef8b]/20 flex flex-col">
        {/* New Chat Button */}
        <div className="p-4 border-b border-[#00ef8b]/20">
          <motion.button
            onClick={createNewChat}
            disabled={isLoading}
            whileHover={{ scale: !isLoading ? 1.02 : 1 }}
            whileTap={{ scale: !isLoading ? 0.98 : 1 }}
            className={`w-full cursor-pointer font-viga px-6 py-3 rounded-lg font-medium text-lg shadow-lg transition-all duration-300 ${
              !isLoading
                ? "bg-gradient-to-r from-[#00ef8b] to-white text-black hover:shadow-xl"
                : "bg-white/20 text-white/50 cursor-not-allowed"
            }`}
          >
            {isFetchingChats ? "Loading..." : "+ New Chat"}
          </motion.button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          <h3 className="text-white/70 text-sm font-medium mb-4 font-viga uppercase tracking-wide">
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
                    {new Date(chat.createdAt).toLocaleDateString()}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
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

          <div className="flex items-center gap-3">
            <NetworkSwitcher />
            <WalletButton />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
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
                    <div className="max-w-3xl px-6 py-4 rounded-2xl bg-gradient-to-r from-[#00ef8b] to-white text-black">
                      <div className="font-rubik text-base leading-relaxed whitespace-pre-wrap">
                        {message.text}
                      </div>
                      <div className="text-xs mt-2 text-black/60">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ) : (
                    // AI message
                    <div className="max-w-4xl w-full">
                      <div className="bg-white/10 backdrop-blur-md border border-[#00ef8b]/20 text-white px-6 py-4 rounded-2xl">
                        <div className="font-rubik text-base leading-relaxed whitespace-pre-wrap">
                          {message.text}
                        </div>
                        <div className="text-xs mt-2 text-white/50">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center flex flex-col justify-center items-center">
                <Link href="/" passHref>
                  <Image src={logo} alt="FlowSense Logo" className="w-20"/>
                </Link>
                <h3
                  className="text-2xl font-viga font-medium mb-2 bg-clip-text text-transparent"
                  style={{
                    backgroundImage: "linear-gradient(to right, #ffffff, #00ef8b)",
                  }}
                >
                  Welcome to FlowSense
                </h3>
                <p className="text-white/70 font-rubik max-w-md">
                  {isConnected
                    ? `Start a conversation by typing your message below. Try "swap 10 FLOW to USDC" or "check my balance"`
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
                    Processing...
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
                placeholder="Type your message..."
                className="w-full px-6 py-4 pr-16 font-rubik bg-white/10 backdrop-blur-md border border-[#00ef8b]/20 rounded-2xl text-white placeholder-white/50 resize-none focus:outline-none focus:border-[#00ef8b]/40 transition-all duration-300"
                rows={1}
                style={{
                  minHeight: "56px",
                  maxHeight: "200px",
                }}
              />
              <motion.button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                whileHover={{ scale: inputText.trim() && !isLoading ? 1.05 : 1 }}
                whileTap={{ scale: inputText.trim() && !isLoading ? 0.95 : 1 }}
                className={`absolute right-2 top-2 bottom-2 size-[42px] rounded-xl flex items-center justify-center transition-all duration-300 ${
                  inputText.trim() && !isLoading
                    ? "bg-gradient-to-r from-[#00ef8b] to-white text-black shadow-lg hover:shadow-xl"
                    : "bg-white/20 text-white/50 cursor-not-allowed"
                }`}
              >
                <BiPaperPlane className="size-6"/>
              </motion.button>
            </form>
            <p className="text-white/50 text-xs font-rubik text-center mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GetStartedMain;
