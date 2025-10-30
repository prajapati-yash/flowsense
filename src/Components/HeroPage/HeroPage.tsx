"use client";
import React, { useRef } from "react";
import { motion, MotionValue, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
// import FloatingWalletCircle from "@/Components/3DCircle/FloatingWalletCircle";

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
      className={` uppercase w-32 sm:w-36 md:w-40 lg:w-44 px-4 sm:px-6 md:px-8 py-8 sm:py-10 md:py-12 rounded-lg overflow-hidden
                         bg-white/10 backdrop-blur-md border border-[#00ef8b]/20
                         text-white font-medium text-sm sm:text-base md:text-lg
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
    { text: "Automation", className: "absolute top-0 left-8 sm:left-32 md:left-48 lg:left-64" },
    { text: "Intent", className: "absolute top-12 sm:top-16 left-4 sm:left-16 md:left-20 lg:left-28" },
    { text: "Scheduled", className: "absolute top-16 sm:top-20 left-32 sm:left-56 md:left-72 lg:left-96" },
    { text: "DeFi", className: "absolute top-24 sm:top-36 right-20 sm:right-32 md:right-48 lg:right-60" },
    { text: "Natural", className: "absolute top-44 sm:top-60 left-32 sm:left-56 md:left-72 lg:left-96" },
    { text: "Actions", className: "absolute top-60 sm:top-80 right-16 sm:right-24 md:right-32 lg:right-40" },
    { text: "Flow", className: "absolute bottom-4 sm:bottom-6 left-20 sm:left-32 md:left-36 lg:left-44" },
    {
      text: "Discovery",
      className:
        "absolute top-32 sm:top-44 right-2 sm:right-4",
    },
  ];

  return (
    <div
      ref={containerRef}
      className="overflow-hidden bg-black relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-12 lg:p-16 xl:p-24"
    >
      {/* Background Gradient Blurs - Responsive sizing */}
      <div className="absolute top-[10%] left-[2%] w-[150px] h-[150px] sm:w-[200px] sm:h-[200px] md:w-[250px] md:h-[250px] bg-[#00ef8b]/40 blur-3xl opacity-100 rounded-full z-0" />
      <div className="absolute bottom-[10%] right-[4%] w-[120px] h-[120px] sm:w-[150px] sm:h-[150px] md:w-[200px] md:h-[200px] bg-[#00ef8b]/60 blur-3xl opacity-100 rounded-full z-0" />
      <div className="absolute bottom-[50%] right-[28%] w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] md:w-[150px] md:h-[150px] bg-[#00ef8b]/50 blur-3xl opacity-100 rounded-full z-0" />

      <div className="flex flex-col lg:flex-row items-center justify-between w-full gap-8 sm:gap-12 lg:gap-16 max-w-7xl mx-auto">
        {/* Content Container - Centered on mobile, left-aligned on desktop */}
        <div className="relative flex-1 text-white text-center lg:text-left z-10 w-full lg:w-auto">
          {/* Heading */}
          <h2
            className="font-viga uppercase font-semibold text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl leading-tight mb-4 sm:mb-6 bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(to right, #ffffff, #00ef8b)",
            }}
          >
            One Sentence. <br />
            Atomic Execution.
          </h2>

          {/* Description */}
          <p className="text-white/90 max-w-3xl font-rubik text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed mb-6 sm:mb-8 mx-auto lg:mx-0">
            The FlowSense Platform transforms natural language commands
            into seamless, secure, atomic blockchain transactions.
          </p>

          {/* Buttons Container */}
          <div className="flex font-viga flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            {/* Button: Get Started */}
            <Link
              href="/get-started"
              className="cursor-pointer relative uppercase px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg overflow-hidden
                         bg-gradient-to-r from-white to-[#00ef8b] backdrop-blur-md border border-[#00ef8b]/20
                         text-black/80 font-medium text-base sm:text-lg
                         shadow-2xl transform transition-transform duration-300 hover:scale-105"
            >
              Get Started
              {/* Subtle overlay for glass effect */}
              <span className="absolute inset-0 border border-white/20 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-300"></span>
            </Link>
          </div>
        </div>

        {/* Keyword Tiles - Stacked on mobile (flex-col), absolute positioning on large screens */}
        <div className="relative z-10 flex-1 w-full lg:w-auto">
          {/* Mobile/Tablet: Flex column layout */}
          {/* <div className="flex flex-col items-center gap-4 lg:hidden">
            {tiles.map((tile, index) => (
              <KeywordTile
                key={tile.text}
                text={tile.text}
                className=""
                scrollY={scrollY}
                index={index}
              />
            ))}
          </div> */}

          {/* Desktop: Absolute positioning with scatter effect */}
          <div className="hidden lg:block relative text-center h-96 w-full">
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
      </div>
    </div>
  );
};

export default HeroPage;