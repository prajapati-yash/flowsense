"use client";
import React from "react";
import { RiTwitterXLine } from "react-icons/ri";

const Footer = () => {
  return (
    <footer className="relative w-full h-[50vh] bg-black overflow-hidden flex flex-col justify-between text-white">
      {/* Grid Background with top fade */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, #00ef8b 1px, transparent 1px),
              linear-gradient(to bottom, #00ef8b 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
            opacity: 0.25,
            maskImage: "linear-gradient(to top, rgba(0,0,0,1), rgba(0,0,0,0))",
            WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,1), rgba(0,0,0,0))",
          }}
        />
      </div>

      {/* Main Content - Centered */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 gap-6">
        <h2 className="text-2xl md:text-3xl font-viga uppercase text-[#00ef8b] text-center">
          Connect with Creators
        </h2>

        <div className="flex flex-col gap-2 items-center font-rubik justify-center">
          {/* User 1 */}
          <div className="flex items-center gap-3">
            <span className="text-white/80 text-sm md:text-base">Yash Prajapati</span>
            <a
              href="https://x.com/yashonchainx"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#00ef8b] transition-colors text-xl"
            >
              <RiTwitterXLine  />
            </a>
          </div>

          {/* User 2 */}
          <div className="flex items-center gap-3">
            <span className="text-white/80 text-sm md:text-base">Hiral Vala</span>
            <a
              href="https://x.com/hiralvala563"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#00ef8b] transition-colors text-xl"
            >
              <RiTwitterXLine  />
            </a>
          </div>
        </div>
      </div>

      {/* Copyright - Bottom */}
      <div className="relative z-10 text-center mb-4">
        <p className="text-white/50 text-sm font-rubik">
          &copy; {new Date().getFullYear()} Flow Actions AI. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
