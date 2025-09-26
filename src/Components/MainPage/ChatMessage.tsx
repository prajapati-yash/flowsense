import React from 'react'

const ChatMessage = ({ role, text }: { role: string; text: string }) => {
    const isUser = role === "user";

    return (
      <div
        className={`max-w-[70%] p-4 rounded-2xl backdrop-blur-md ${
          isUser
            ? "ml-auto bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
            : "mr-auto bg-white/10 text-gray-200"
        }`}
      >
        {text}
      </div>
  )
}

export default ChatMessage
