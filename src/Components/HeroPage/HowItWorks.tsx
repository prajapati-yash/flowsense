"use client";
import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const HowItWorks = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });

  const whyChooseUsData = [
    {
      title: "Time Saver",
      description: "Save hours every week on research & writing.",
    },
    {
      title: "Never Miss Trends",
      description: "Never miss trending topics—agent monitors and drafts on time.",
    },
    {
      title: "Quality Assured",
      description: "Human-in-the-loop ensures quality and brand voice.",
    },
    {
      title: "Team Focused",
      description: "Built for teams: creators, marketers, and SEO specialists.",
    },
  ];

  return (
    <div
      ref={containerRef}
      className="max-w-[1600px] mx-auto font-syne min-h-screen flex items-center justify-center relative pt-20 pb-36"
    >
      <div className="flex w-full max-w-[1200px] items-center justify-center gap-32">
        {/* Left Side - Rotating Element */}
        <div className=" flex items-center justify-center">
          <div className="relative">
            {/* Outer rotating circle */}
            <motion.div
              style={{ rotate: useTransform(scrollYProgress, [0, 1], [0, 360]) }}
              className="w-80 h-80 rounded-full border-2 border-[#00ef8b]/30 relative"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#00ef8b] rounded-full"></div>
              <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[#00ef8b]/70 rounded-full"></div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-[#00ef8b] rounded-full"></div>
              <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[#00ef8b]/70 rounded-full"></div>
            </motion.div>

            <div className="absolute inset-8 rounded-full bg-[#071b22]/60 backdrop-blur-xl border border-[#00ef8b]/20 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#00ef8b]/20 to-[#00ef8b]/20 flex items-center justify-center">
                <div className="text-4xl font-viga font-bold text-[#00ef8b]">How?</div>
              </div>
            </div>

            <motion.div
              style={{ rotate: useTransform(scrollYProgress, [0, 1], [0, -180]) }}
              className="absolute inset-12 rounded-full border border-dashed border-[#00ef8b]/20"
            ></motion.div>
          </div>
        </div>

        {/* Right Side - Scroll-Based Animated Cards */}
        <div className=" space-y-10">
          <motion.h2
            initial={{ opacity: 0, y: -30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl uppercase font-viga font-bold text-white mb-8"
          >
            How IT <span className="text-[#00ef8b]">Works?</span>
          </motion.h2>

          {whyChooseUsData.map((item, index) => {
            const start = index * 0.25; // Each card gets a scroll segment
            const end = start + 0.3;
            const y = useTransform(scrollYProgress, [start, end], [50, 0]);
            const opacity = useTransform(scrollYProgress, [start, end], [0, 1]);

            return (
              <motion.div
                key={index}
                style={{ y, opacity }}
                className="bg-[#071b22]/40 backdrop-blur-xl border border-[#00ef8b]/20 rounded-2xl p-6 hover:border-[#1aa9da]/50 transition-all duration-300 cursor-pointer"
              >
                <h3 className="text-2xl uppercase font-rubik font-semibold text-[#00ef8b] mb-3">
                  {item.title}
                </h3>
                <p className="text-white/90 font-rubik text-lg leading-relaxed">
                  {item.description}
                </p>
                <div className="mt-4 w-16 h-1 bg-gradient-to-r from-[#00ef8b] to-[#01cd78] rounded-full"></div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;