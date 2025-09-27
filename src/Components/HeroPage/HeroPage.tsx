"use client";
import React, { useRef } from "react";
import { motion, MotionValue, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import FloatingWalletCircle from "@/Components/3DCircle/FloatingWalletCircle";

interface KeywordTileProps {
  text: string;
  className?: string;
  scrollY: MotionValue<number>;
  index: number;
}

// 2. KeywordTile Component - Implements Parallax/Tilt effect on hover
const KeywordTile: React.FC<KeywordTileProps> = ({
  text,
  className = "",
  scrollY,
  index,
}) => {
  const tileRef = useRef<HTMLDivElement>(null);

  // Create random scatter transforms for each tile
  const scatterX = useTransform(
    scrollY,
    [0, 500],
    [0, (Math.random() - 0.5) * 400]
  );
  const scatterY = useTransform(
    scrollY,
    [0, 500],
    [0, (Math.random() - 0.5) * 300]
  );
  const rotation = useTransform(
    scrollY,
    [0, 500],
    [0, (Math.random() - 0.5) * 45]
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const tile = tileRef.current;
    if (!tile) return;

    const rect = tile.getBoundingClientRect();
    const x = e.clientX - rect.left; // cursor X inside tile
    const y = e.clientY - rect.top; // cursor Y inside tile

    const moveX = (x - rect.width / 2) / 4; // Adjust divisor (10) for intensity
    const moveY = (y - rect.height / 2) / 4;

    // Move slightly in the opposite direction of cursor movement for a 3D effect
    tile.style.transform = `translate3d(${-moveX}px, ${-moveY}px, 0) scale(1.05)`;
    tile.style.transition = "transform 0.1s ease-out"; // Fast transition for responsiveness
  };

  const handleMouseLeave = () => {
    const tile = tileRef.current;
    if (!tile) return;
    // Reset position and scale when mouse leaves
    tile.style.transform = "translate3d(0, 0, 0) scale(1)";
    tile.style.transition = "transform 0.3s ease-out"; // Slower transition for smooth reset
  };
  return (
    <motion.div
      ref={tileRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        x: scatterX,
        y: scatterY,
        rotate: rotation,
      }}
      className={` uppercase w-44 px-8 py-12 rounded-lg overflow-hidden
                         bg-white/10 backdrop-blur-md border border-[#00ef8b]/20
                         text-white font-medium text-lg
                         shadow-2xl transform transition-transform duration-300 hover:scale-105
                  ${className}`}
      // Custom shadow style to mimic the 3D-lifted, blurred look
      // style={{
      //   boxShadow: '0 6px 12px rgba(0, 0, 0, 0.4), 0 1px 4px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
      // }}
    >
      {text}
    </motion.div>
  );
};

const HeroPage = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();

  const tiles = [
    { text: "Automation", className: "absolute top-0 left-64 text-sm" },
    { text: "Intent", className: "absolute top-16 left-28 text-sm" },
    { text: "Scheduled", className: "absolute top-20 left-96 text-sm" },
    { text: "DeFi", className: "absolute top-36 right-60 text-sm" },
    { text: "Natural", className: "absolute top-60 left-96 text-sm" },
    { text: "Actions", className: "absolute top-80 right-40 text-sm" },
    { text: "Flow", className: "absolute bottom-6 left-44 text-sm" },
    {
      text: "Cadence",
      className:
        "absolute top-44 right-4 text-sm w-12 h-12 flex items-center justify-center",
    },
  ];

  return (
    <div
      ref={containerRef}
      className="overflow-hidden bg-black relative h-screen w-full flex items-center justify-between p-8 md:p-16 lg:p-24"
    >
      {/* <Image src={logo} alt="" className=" w-48 top-10 absolute " /> */}

      <div className="absolute top-[10%] left-[2%] w-[250px] h-[250px] bg-[#00ef8b]/40 blur-3xl opacity-100 rounded-full z-0" />
      <div className="absolute bottom-[10%] right-[4%] w-[200px] h-[200px] bg-[#00ef8b]/60 blur-3xl opacity-100 rounded-full z-0" />
      <div className="absolute bottom-[50%] right-[28%] w-[150px] h-[150px] bg-[#00ef8b]/50 blur-3xl opacity-100 rounded-full z-0" />
      <div className="flex items-center justify-between w-full gap-12">
        {/* Content Container - Aligned to the left */}
        <div className="relative flex-1 text-white">
          {" "}
          {/* max-w-2xl to control text width */}
          {/* White backdrop blur bg */}
          <h2
            className="font-viga uppercase font-semibold text-3xl md:text-4xl lg:text-6xl leading-tight mb-4 bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(to right, #ffffff, #00ef8b)",
            }}
          >
            One Sentence. <br />
            Atomic Execution.
          </h2>
          <p className="text-white/90 max-w-3xl font-rubik text-base md:text-xl leading-relaxed mb-8">
            The FlowSense Platform transforms natural language commands
            into seamless, secure, atomic blockchain transactions.
          </p>
          {/* Buttons Container */}
          <div className="flex font-viga flex-col sm:flex-row gap-4">
            {/* Button 1: Get Started */}
            <Link
              href="/get-started"
              className="cursor-pointer relative uppercase px-8 py-3 rounded-lg overflow-hidden
                         bg-gradient-to-r from-white to-[#00ef8b] backdrop-blur-md border border-[#00ef8b]/20
                          text-black/80 font-medium text-lg
                         shadow-2xl transform transition-transform duration-300 hover:scale-105"
            >
              Get Started
              {/* Optional: Add a subtle overlay for a 'glass' effect if desired */}
              <span className="absolute inset-0 border border-white/20 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-300"></span>
            </Link>
          </div>
        </div>

        {/* Keyword Tiles - Right Side Scattered */}
        <div className="relative z-10 hiddeny-hidden overflow- lg:block flex-1 text-center h-96">
          {tiles.map((tile, index) => (
            <KeywordTile
              key={tile.text}
              text={tile.text}
              className={tile.className}
              scrollY={scrollY}
              index={index}
            />
          ))}
        </div>
      </div>

      {/* 3D Floating Wallet Circle */}
      <FloatingWalletCircle />
    </div>
  );
};

export default HeroPage;
