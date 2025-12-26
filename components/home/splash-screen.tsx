"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function SplashScreen({ 
  onComplete,
  isLoading = false,
  isOnboardingPending = false
}: { 
  onComplete: () => void;
  isLoading?: boolean;
  isOnboardingPending?: boolean;
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Simpler, faster timer
    const timer = setTimeout(() => {
      if (!isLoading) {
        setIsVisible(false);
        setTimeout(onComplete, 1000);
      }
    }, 2500); 

    return () => clearTimeout(timer);
  }, [isLoading, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0, 
            filter: "blur(20px)",
            scale: 1.1
          }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#030303] overflow-hidden"
        >
          {/* Subtle Grain Overlay */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://res.cloudinary.com/dcb9m8vmb/image/upload/v1711111111/grain_u9v9v9.png')] mix-blend-overlay" />

          {/* Minimal Ambient Glow */}
          <motion.div 
            animate={{ 
               opacity: [0.1, 0.2, 0.1],
               scale: [1, 1.1, 1],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-blue-900/10 blur-[100px] rounded-full"
          />

          {/* Center Content */}
          <div className="relative flex flex-col items-center z-10">
            {/* Logo */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="flex items-center gap-4 mb-4"
            >
              <div className="flex items-center">
                 <span className="font-[900] text-[clamp(60px,10vw,120px)] leading-none tracking-tighter text-white">
                   HD
                 </span>
                 <div className="w-[2px] h-[clamp(60px,10vw,120px)] bg-red-600 mx-4 rotate-12" />
                 <span className="font-[900] text-[clamp(60px,10vw,120px)] leading-none tracking-tighter text-white">
                   GOOD
                 </span>
              </div>
            </motion.div>

            {/* Slogan with fade-in */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="relative"
            >
               <span className="text-zinc-400 text-sm md:text-xl font-medium tracking-[0.5em] uppercase">
                 Ваш личный кинотеатр
               </span>
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: "100%" }}
                 transition={{ delay: 0.8, duration: 1.5, ease: "easeInOut" }}
                 className="h-[1px] bg-gradient-to-r from-transparent via-red-600 to-transparent absolute -bottom-2 left-0"
               />
            </motion.div>
          </div>

          {/* Loading Indicator (if loading) */}
          <div className="absolute bottom-12">
             {isLoading && (
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="flex gap-1"
               >
                 {[0, 1, 2].map(i => (
                   <motion.div 
                     key={i}
                     animate={{ opacity: [0.3, 1, 0.3] }}
                     transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                     className="w-2 h-2 rounded-full bg-zinc-600"
                   />
                 ))}
               </motion.div>
             )}
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}
