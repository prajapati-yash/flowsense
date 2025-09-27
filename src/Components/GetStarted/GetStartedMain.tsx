"use client";
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BsAirplane } from "react-icons/bs";
import { BiPaperPlane } from "react-icons/bi";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    // If no current chat, create one
    if (!currentChatId) {
      createNewChat();
    }

    // Add user message
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === currentChatId
          ? { ...chat, messages: [...chat.messages, userMessage] }
          : chat
      )
    );

    setInputText("");
    setIsLoading(true);

    // Simulate AI response (replace with actual AI call)
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `I understand you're asking about: "${inputText}". This is a simulated response from the Flow Actions AI agent. In a real implementation, this would connect to your blockchain AI service to provide atomic transaction solutions.`,
        isUser: false,
        timestamp: new Date(),
      };

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId
            ? {
                ...chat,
                messages: [...chat.messages, aiMessage],
                title:
                  chat.messages.length === 0
                    ? inputText.slice(0, 30) + "..."
                    : chat.title,
              }
            : chat
        )
      );
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
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
            className="w-full font-viga px-6 py-3 rounded-lg bg-gradient-to-r from-[#00ef8b] to-white text-black font-medium text-lg shadow-lg hover:shadow-xl transition-all duration-300"
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
        <div className="py-3 px-6 border-b border-[#00ef8b]/20 bg-black/30 backdrop-blur-md">
          <h1
            className="text-2xl font-viga font-semibold bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(to right, #ffffff, #00ef8b)",
            }}
          >
            Flow Sense
          </h1>
          <p className="font-rubik text-white/70 mt-1">
            Ask me anything about blockchain transactions and smart contracts
          </p>
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
                  <div
                    className={`max-w-3xl px-6 py-4 rounded-2xl ${
                      message.isUser
                        ? "bg-gradient-to-r from-[#00ef8b] to-white text-black"
                        : "bg-white/10 backdrop-blur-md border border-[#00ef8b]/20 text-white"
                    }`}
                  >
                    <div className="font-rubik text-base leading-relaxed whitespace-pre-wrap">
                      {message.text}
                    </div>
                    <div
                      className={`text-xs mt-2 ${
                        message.isUser ? "text-black/60" : "text-white/50"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-[#00ef8b] to-white rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl text-black">⚡</span>
                </div>
                <h3
                  className="text-2xl font-viga font-medium mb-2 bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, #ffffff, #00ef8b)",
                  }}
                >
                  Welcome to Flow Sense
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
                    AI is thinking...
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
            <div className="relative">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about blockchain transactions..."
                className="w-full px-6 py-4 pr-16 font-rubik bg-white/10 backdrop-blur-md border border-[#00ef8b]/20 rounded-2xl text-white placeholder-white/50 resize-none focus:outline-none focus:border-[#00ef8b]/40 transition-all duration-300"
                rows={1}
                style={{
                  minHeight: "56px",
                  maxHeight: "200px",
                }}
              />
              <motion.button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isLoading}
                whileHover={{ scale: inputText.trim() ? 1.05 : 1 }}
                whileTap={{ scale: inputText.trim() ? 0.95 : 1 }}
                className={`absolute right-2 top-2 bottom-2 size-[42px] rounded-xl flex items-center justify-center transition-all duration-300 ${
                  inputText.trim() && !isLoading
                    ? "bg-gradient-to-r from-[#00ef8b] to-white text-black shadow-lg hover:shadow-xl"
                    : "bg-white/20 text-white/50 cursor-not-allowed"
                }`}
              >
                {/* <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg> */}
                <BiPaperPlane className="size-6"/>
              </motion.button>
            </div>
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
