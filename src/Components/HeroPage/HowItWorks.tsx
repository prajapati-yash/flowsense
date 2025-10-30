"use client";
import React, { useRef } from "react";
import { motion, useScroll, useTransform, MotionValue  } from "framer-motion";

interface StepCardProps {
  title: string;
  description: string;
  index: number;
  scrollYProgress: MotionValue<number>;
}

const StepCard: React.FC<StepCardProps> = ({ title, description, index, scrollYProgress }) => {
  const start = index * 0.25; // Each card gets its scroll segment
  const end = start + 0.3;

  // ✅ Hooks are now inside a proper React component
  const y = useTransform(scrollYProgress, [start, end], [50, 0]);
  const opacity = useTransform(scrollYProgress, [start, end], [0, 1]);

  return (
    <motion.div
      style={{ y, opacity }}
      className="bg-[#071b22]/40 backdrop-blur-xl border border-[#00ef8b]/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-[#00ef8b]/50 transition-all duration-300 cursor-pointer"
    >
      <h3 className="text-lg sm:text-xl md:text-2xl uppercase font-rubik font-semibold text-[#00ef8b] mb-2 sm:mb-3">
        {title}
      </h3>
      <p className="text-white/90 font-rubik text-sm sm:text-base md:text-lg leading-relaxed">
        {description}
      </p>
      <div className="mt-3 sm:mt-4 w-12 sm:w-16 h-1 bg-gradient-to-r from-[#00ef8b] to-[#01cd78] rounded-full"></div>
    </motion.div>
  );
};

const HowItWorks = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });

    const HowItWorks = [
      {
        title: "Intelligent Action Preparation",
        description: "The FlowSense AI Agent queries the Flow blockchain using dedicated scripts to dynamically discover all available actions and functions, creating a real-time, up-to-date registry for intent processing.",
      },
      {
        title: "Natural Language Intent",
        description: "Users submit complex DeFi goals as simple text prompts (e.g., 'Claim my staking rewards and swap them for USDC'), which the AI processes for the correct action, amount, and timing.",
      },
      {
        title: "Comprehensive Validation & Signing",
        description: "The AI validates the request (balance, receiver address, timing) and constructs the final structured transaction for the user to securely sign with their wallet.",
      },
      {
        title: "Atomic On-Chain Execution",
        description: "The signed intent is submitted and executed instantly or stored for scheduled execution. Flow's native validation ensures real asset movement is atomic and precise.",
      },
    ];

  return (
    <div
      ref={containerRef}
      className="max-w-[1600px] mx-auto font-syne min-h-screen flex items-center justify-center relative pt-12 sm:pt-16 md:pt-20 pb-40 sm:pb-44 md:pb-52 px-4 sm:px-6 md:px-8"
    >
      <div className="flex flex-col lg:flex-row w-full max-w-[1200px] items-center justify-center gap-8 sm:gap-12 lg:gap-24 xl:gap-32">
        {/* Left Side - Rotating Element */}
        <div className="flex items-center justify-center lg:flex-shrink-0">
          <div className="relative">
            {/* Outer rotating circle */}
            <motion.div
              style={{ rotate: useTransform(scrollYProgress, [0, 1], [0, 360]) }}
              className="w-48 h-48 sm:w-64 sm:h-64 md:w-72 md:h-72 lg:w-80 lg:h-80 rounded-full border-2 border-[#00ef8b]/30 relative"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 sm:w-3 sm:h-3 bg-[#00ef8b] rounded-full"></div>
              <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#00ef8b]/70 rounded-full"></div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 sm:w-3 sm:h-3 bg-[#00ef8b] rounded-full"></div>
              <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#00ef8b]/70 rounded-full"></div>
            </motion.div>

            <div className="absolute inset-4 sm:inset-6 md:inset-8 rounded-full bg-[#071b22]/60 backdrop-blur-xl border border-[#00ef8b]/20 flex items-center justify-center">
              <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-[#00ef8b]/20 to-[#00ef8b]/20 flex items-center justify-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-viga font-bold text-[#00ef8b]">How?</div>
              </div>
            </div>

            <motion.div
              style={{ rotate: useTransform(scrollYProgress, [0, 1], [0, -180]) }}
              className="absolute inset-6 sm:inset-10 md:inset-12 rounded-full border border-dashed border-[#00ef8b]/20"
            ></motion.div>
          </div>
        </div>

        {/* Right Side - Scroll-Based Animated Cards */}
        <div className="w-full lg:flex-1 space-y-6 sm:space-y-8 md:space-y-10">
          <motion.h2
            initial={{ opacity: 0, y: -30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-viga uppercase font-semibold text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl leading-tight bg-clip-text text-transparent mb-6 sm:mb-8 text-center lg:text-left"
            style={{
              backgroundImage: "linear-gradient(to right, #ffffff, #00ef8b)",
            }}
          >
            How IT Works?
          </motion.h2>

          {HowItWorks.map((step, index) => (
            <StepCard
              key={index}
              title={step.title}
              description={step.description}
              index={index}
              scrollYProgress={scrollYProgress}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;