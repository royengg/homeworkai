

import { TextGenerateEffect } from './TextGenerateEffect';
import { Spotlight } from './ui/Spotlight';

export function Hero() {
  return (
    <div className="w-full relative flex items-center justify-center pt-20 pb-20 overflow-hidden bg-transparent">
        <div className="absolute inset-0 w-full h-full bg-grid-small-gray-200 z-0 [mask-image:radial-gradient(circle_at_center,black,transparent_80%)] pointer-events-none"></div>
        <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20 fill-orange-500 dark:fill-amber-500"
        fill="orange"
      />
      <div className="text-center relative z-10 w-full max-w-3xl animate-fade-in px-4">
        <h1 className="text-4xl sm:text-5xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-brand-text-primary dark:text-[#E5E5E5] mb-6">
          Turn messy assignments into{" "}
          <span className="relative whitespace-nowrap">
            <span className="text-gradient relative z-10">intelligent solutions.</span>
            <svg className="absolute -bottom-1 left-0 w-full h-4 text-brand-secondary/80 z-0" viewBox="0 0 200 9" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="markerShape">
                  <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="noise" />
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
                </filter>
              </defs>
              <path filter="url(#markerShape)" d="M2.00025 6.99997C25.5002 6.50002 85.5002 -2.49997 197.999 5.99998C115.499 -3.00004 22.0002 0.00002 2.00025 6.99997Z"/>
            </svg>
            {/* Sticky Note */}
            <div className="absolute -top-2 -right-5 md:-top-3 md:-right-16 bg-[#fde047] text-black font-hand text-xl md:text-2xl -rotate-[15deg] px-3 py-1 md:px-4 md:py-2 shadow-[2px_4px_12px_rgba(0,0,0,0.15)] rounded-br-3xl z-30 transform hover:scale-110 transition-transform duration-200 cursor-default border border-black/10 hidden sm:block">
              {/* Tape Effect */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-3 md:w-8 md:h-4 bg-white/40 backdrop-blur-sm -rotate-3 border-l border-r border-white/30 transform skew-x-12 shadow-sm"></div>
              Finally!
            </div>
          </span>
        </h1>
        <div className="w-[90%] md:w-full mx-auto">
          <TextGenerateEffect
            words="Stop staring at blank pages. Get the step-by-step math help you need, right now."
            className="max-w-lg mx-auto"
          />
        </div>
      </div>
    </div>
  );
}
