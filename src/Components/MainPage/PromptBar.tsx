"use client";

import { useState } from "react";

const PromptBar = () => {
    const [input, setInput] = useState("");

    const handleSend = (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim()) return;
      console.log("User Prompt:", input);
      setInput("");
    };
  
    return (
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 bg-white/10 rounded-2xl p-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything..."
          className="flex-1 bg-transparent outline-none text-white placeholder-gray-400"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium hover:opacity-90"
        >
          Send
        </button>
      </form>
  )
}

export default PromptBar
