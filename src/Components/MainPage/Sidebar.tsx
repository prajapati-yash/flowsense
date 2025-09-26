"use client"
import React from 'react'

const Sidebar = () => {
    const chats = ["What is Web3?", "Explain staking", "Best UI practices"];
  return (
    <div className="w-64 bg-white shadow-xl flex flex-col h-full">
      <div className="p-4 border-b">
        <button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl py-2 font-medium hover:opacity-90">
          + New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {chats.map((chat, i) => (
          <div
            key={i}
            className="p-3 rounded-lg bg-gray-100 hover:bg-gray-200 cursor-pointer text-sm text-gray-800"
          >
            {chat}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Sidebar
