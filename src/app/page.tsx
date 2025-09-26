import ChatWindow from "@/Components/MainPage/ChatWindow";
import PromptBar from "@/Components/MainPage/PromptBar";
import Sidebar from "@/Components/MainPage/Sidebar";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 relative bg-gradient-to-br from-[#0D031C] via-[#1a0f2e] to-[#2a1f40]">
        {/* Chat Window */}
        <ChatWindow />

        {/* Prompt Input */}
        <div className="absolute bottom-0 left-0 right-0 p-4 backdrop-blur-xl bg-black/20">
          <PromptBar />
        </div>
      </div>
    </div>
  );
}
