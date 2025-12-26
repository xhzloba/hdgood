"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ADVANTAGES = [
  { title: "4K ULTRA HD", subtitle: "Погрузитесь в истинные детали" },
  { title: "DOLBY ATMOS", subtitle: "Звук, который окружает вас" },
  { title: "БЕЗ РЕКЛАМЫ", subtitle: "Только вы и ваше кино" },
  { title: "УМНАЯ ПОДБОРКА", subtitle: "Рекомендации под ваш вкус" },
  { title: "ВАШ КАТАЛОГ", subtitle: "Избранное и история просмотров" },
  { title: "МУЛЬТИСКРИН", subtitle: "Все устройства в одной экосистеме" },
  { title: "HD GOOD ORIGINALS", subtitle: "Эксклюзивные новинки сервиса" },
];

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
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [advantageIndex, setAdvantageIndex] = useState(0);

  useEffect(() => {
    // Increased duration to showcase more features
    const timer = setTimeout(() => {
      setMinTimePassed(true);
    }, 10000); 

    const interval = setInterval(() => {
      setAdvantageIndex((prev) => (prev + 1) % ADVANTAGES.length);
    }, 2800);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (minTimePassed && !isLoading) {
      const exitTimer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onComplete, 1500);
      }, 800);
      return () => clearTimeout(exitTimer);
    }
  }, [minTimePassed, isLoading, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0, 
            scale: isOnboardingPending ? 1.5 : 1.1,
            y: isOnboardingPending ? -100 : 0,
            filter: "blur(30px)" 
          }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#030303] overflow-hidden"
        >
          {/* Grainy Film Texture Overlay */}
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[url('https://res.cloudinary.com/dcb9m8vmb/image/upload/v1711111111/grain_u9v9v9.png')] mix-blend-overlay" />

          {/* Epic Ambient Light Leaks */}
          <motion.div 
            animate={{ 
               opacity: [0.1, 0.15, 0.1],
               scale: [1, 1.3, 1],
               x: ["-10%", "10%", "-10%"],
               rotate: [0, 5, 0]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-blue-600/10 blur-[150px] rounded-full"
          />
          <motion.div 
            animate={{ 
               opacity: [0.1, 0.15, 0.1],
               scale: [1.2, 0.9, 1.2],
               x: ["10%", "-10%", "10%"],
               rotate: [0, -5, 0]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] bg-red-600/10 blur-[150px] rounded-full"
          />

          {/* Central Logo & Features Container */}
          <div className="relative flex flex-col items-center">
            
            {/* Logo Section */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.85, perspective: 1200 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex flex-col items-center mb-28"
            >
              {/* Spinning Chrome Rings */}
              <div className="absolute inset-x-[-120px] inset-y-[-100px] flex items-center justify-center pointer-events-none opacity-20">
                <motion.div 
                   animate={{ rotate: 360 }}
                   transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                   className="absolute w-[350px] h-[350px] border-[0.5px] border-white/20 rounded-full"
                />
                <motion.div 
                   animate={{ rotate: -360 }}
                   transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                   className="absolute w-[400px] h-[400px] border-[0.5px] border-white/10 rounded-full"
                />
                <motion.div 
                   animate={{ rotate: 360 }}
                   transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                   className="absolute w-[450px] h-[450px] border-[1px] border-white/5 rounded-full"
                />
              </div>

              <div className="flex items-center gap-6 relative z-10">
                <motion.span 
                  className="font-[1000] text-[clamp(90px,18vw,180px)] leading-none tracking-tighter text-transparent bg-clip-text bg-linear-to-b from-white via-zinc-200 to-zinc-500"
                  style={{ textShadow: "0 20px 50px rgba(0,0,0,0.5)" }}
                >
                  HD
                </motion.span>
                
                <div className="flex flex-col items-start gap-1 mt-auto mb-8">
                  <motion.div 
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "100%", opacity: 1 }}
                    transition={{ duration: 1.2, delay: 0.8 }}
                    className="h-[3px] bg-red-600 mb-2 shadow-[0_0_25px_#ef4444]"
                  />
                  <span className="font-black italic text-[32px] leading-none tracking-[0.4em] text-red-600 drop-shadow-[0_4px_10px_rgba(220,38,38,0.3)]">
                    GOOD
                  </span>
                </div>
              </div>

              {/* Dynamic Advantages/Features Rotation */}
              <div className="absolute -bottom-20 h-16 flex flex-col items-center justify-center overflow-hidden w-[400px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={advantageIndex}
                    initial={{ y: 30, opacity: 0, filter: "blur(5px)" }}
                    animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                    exit={{ y: -30, opacity: 0, filter: "blur(5px)" }}
                    transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
                    className="flex flex-col items-center"
                  >
                    <span className="text-white text-[16px] font-black tracking-[0.8em] uppercase text-center">
                      {ADVANTAGES[advantageIndex].title}
                    </span>
                    <span className="text-zinc-500 text-[11px] tracking-[0.3em] font-bold mt-2 uppercase">
                      {ADVANTAGES[advantageIndex].subtitle}
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Glowing Deep Red Aura */}
            <motion.div 
               animate={{ 
                 scale: [1, 1.2, 1],
                 opacity: [0.15, 0.25, 0.15]
               }}
               transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
               className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-red-600/10 rounded-full blur-[150px] -z-10"
            />
          </div>

          {/* Cinematic Progress Area */}
          <div className="absolute bottom-28 w-full max-w-[400px] flex flex-col items-center">
            {/* Modern Loading Ring Segment */}
            <div className="relative w-14 h-14 mb-8">
               <svg className="w-full h-full transform -rotate-90">
                 <circle
                   cx="28"
                   cy="28"
                   r="24"
                   className="stroke-zinc-900 fill-none"
                   strokeWidth="1.5"
                 />
                 <motion.circle
                   cx="28"
                   cy="28"
                   r="24"
                   className="stroke-red-600 fill-none"
                   strokeWidth="1.5"
                   strokeDasharray="150.7"
                   initial={{ strokeDashoffset: 150.7 }}
                   animate={{ 
                      strokeDashoffset: isLoading ? [150.7, 80, 40] : 0 
                   }}
                   transition={{ 
                      duration: isLoading ? 15 : 1, 
                      ease: "easeInOut" 
                   }}
                 />
               </svg>
               <motion.div 
                  animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 flex items-center justify-center"
               >
                 <div className="w-2 h-2 bg-red-600 rounded-full shadow-[0_0_15px_#ef4444]" />
               </motion.div>
            </div>

            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="flex items-center gap-6"
            >
               <span className="w-4 h-[1px] bg-zinc-800" />
               <span className="text-[12px] font-black tracking-[0.6em] text-zinc-400 uppercase">
                  {isLoading ? "Загрузка медиасистемы" : "Система готова"}
               </span>
               <span className="w-4 h-[1px] bg-zinc-800" />
            </motion.div>

            {/* Progress Status Detail */}
            <motion.div 
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="mt-4 text-[10px] text-zinc-600 font-bold tracking-[0.3em] uppercase"
            >
              {isLoading ? "Авторизация протокола Cinema 2.4" : "Доступ разрешен"}
            </motion.div>
          </div>

          {/* Side Letterings / Minimalist Accents */}
          <div className="absolute top-16 left-16 flex flex-col gap-3">
             <span className="text-[10px] font-black text-zinc-900 tracking-[1em] uppercase">Частная сеть</span>
             <div className="h-[1px] w-12 bg-zinc-900" />
          </div>
          <div className="absolute top-16 right-16 flex flex-col items-end gap-3">
             <span className="text-[10px] font-black text-zinc-900 tracking-[1em] uppercase">Версия 4.0.2</span>
             <div className="h-[1px] w-12 bg-zinc-900" />
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}
