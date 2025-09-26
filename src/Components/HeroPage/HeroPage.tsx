import React from 'react';
import Image from 'next/image';
import bg from '@/app/assets/bg4.jpg';
import Header from '@/Components/Header/Header';

const KeywordTile = ({ text, className = '' }: { text: string; className?: string }) => {
  return (
    <div
      className={`relative uppercase w-44 px-8 py-12 rounded-lg overflow-hidden
                         bg-white/4 backdrop-blur-md border border-white/20
                         text-white font-medium text-lg
                         shadow-2xl transform transition-transform duration-300 hover:scale-105
                  ${className}`}
      // Custom shadow style to mimic the 3D-lifted, blurred look
      // style={{
      //   boxShadow: '0 6px 12px rgba(0, 0, 0, 0.4), 0 1px 4px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
      // }}
    >
      {text}
    </div>
  );
};

const HeroPage = () => {
  return (
    <div className="relative h-screen w-full flex items-center justify-between p-8 md:p-16 lg:p-24">
      {/* Background image */}
      <Image
        src={bg}
        alt="Background"
        layout="fill" // Use layout="fill" for responsive full-bleed images in Next.js
        objectFit="cover" // Cover the entire area
        quality={100} // High quality image
        className="absolute inset-0"
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Header with wallet integration */}
      <Header />
      <div className='flex justify-between w-full gap-12'>

      {/* Content Container - Aligned to the left */}
      <div className="relative z-10 flex-1 text-white"> {/* max-w-2xl to control text width */}
        {/* White backdrop blur bg */}
          <h2 className="font-bricolage uppercase font-semibold text-3xl md:text-4xl lg:text-7xl leading-tight mb-4">
          One Sentence. <br/>Atomic Execution.
          </h2>
          <p className="text-white/90 max-w-3xl font-rubik text-base md:text-xl leading-relaxed mb-8">
            The Flow Actions AI Platform transforms natural language commands into seamless, secure, atomic blockchain transactions.
          </p>

          {/* Buttons Container */}
          <div className="flex font-rubik flex-col sm:flex-row gap-4">
            {/* Button 1: Get Started */}
            <button
              className="relative uppercase px-8 py-3 rounded-lg overflow-hidden
                         bg-white/4 backdrop-blur-md border border-white/20
                         text-white font-medium text-lg
                         shadow-2xl transform transition-transform duration-300 hover:scale-105"
            >
              Get Started
              {/* Optional: Add a subtle overlay for a 'glass' effect if desired */}
              <span className="absolute inset-0 border border-white/20 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-300"></span>
            </button>

            {/* Button 2: Explore Developer Tools */}
            <button
              className="relative uppercase px-8 py-3 rounded-lg overflow-hidden
                         bg-white/4 backdrop-blur-md border border-white/20
                         text-white font-medium text-lg
                         shadow-2xl transform transition-transform duration-300 hover:scale-105"
            >
              Explore Developer Tools
              {/* Optional: Add a subtle overlay for a 'glass' effect if desired */}
              <span className="absolute inset-0 border border-white/20 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-300"></span>
            </button>
          </div>
        </div>

      {/* Keyword Tiles - Right Side Scattered */}
      <div className="relative z-10 hidden lg:block flex-1 text-center h-96">
        <KeywordTile text="Services" className="absolute top-0 left-64  text-sm" />
        <KeywordTile text="Benefits" className="absolute top-2 left-36 text-sm" />
        <KeywordTile text="Partnership?" className="absolute top-6 left-80 text-sm" />
        <KeywordTile text="Questions?" className="absolute bottom-16 left-0 text-sm" />
        <KeywordTile text="AI AGENT" className="absolute top-24 right-60 text-sm" />
        <KeywordTile text="SEAMLESS" className="absolute bottom-32 right-32 text-sm" />
        <KeywordTile text="INSIGHTS" className="absolute bottom-8 right-48 text-sm" />
        <KeywordTile text="X" className="absolute top-32 right-8 text-sm w-12 h-12 flex items-center justify-center" />
      </div>
      </div>
      </div>
  );
};

export default HeroPage;