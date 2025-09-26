import React from 'react'
import ChatMessage from './ChatMessage';

const ChatWindow = () => {
    const messages = [
        { role: "user", text: "Hello AI!" },
        { role: "assistant", text: "Hi there 👋 How can I help you today?" },
      ];
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
    {messages.map((msg, i) => (
      <ChatMessage key={i} role={msg.role} text={msg.text} />
    ))}
  </div>
  )
}

export default ChatWindow
