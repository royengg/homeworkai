import React from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";

const Footer: React.FC = () => {
  return (
    <footer className="relative w-full bg-[#FAFAF9] dark:bg-[#0A0A0A] overflow-hidden pt-24 pb-20 md:pb-0 flex flex-col items-center justify-end">
      <div className="absolute inset-x-0 bottom-0 h-48 w-full pointer-events-none bg-gradient-to-t from-[#FAFAF9] dark:from-[#0A0A0A] via-transparent to-transparent z-10" />
      
      <div className="w-full flex justify-center items-end select-none translate-y-[10%]">
        <motion.h1
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-[18vw] md:text-[14rem] leading-[0.8] font-black tracking-tighter text-center bg-clip-text text-transparent bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 z-0 select-none pb-10"
        >
          Solved.
        </motion.h1>
      </div>

      <div className="absolute bottom-6 z-20 w-full max-w-[1400px] px-6">
        <div className="flex flex-col md:flex-row items-center justify-between text-sm font-medium text-neutral-500 dark:text-gray-400 gap-4 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-white/40 dark:border-neutral-800 shadow-sm p-4 rounded-3xl md:rounded-full mx-auto">
          
          <div className="text-neutral-400 dark:text-neutral-500">
            &copy; 2026 Homework AI Inc.
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
            <span>Made with</span>
            <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
            <span>for Students.</span>
          </div>

          <div className="flex items-center gap-6">
            {["About", "Privacy", "Terms", "Twitter"].map((link) => (
              <a
                key={link}
                href="#"
                className="hover:text-indigo-600 transition-colors duration-200 relative group"
              >
                {link}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-600 transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
