"use client";

import { motion } from "framer-motion";

type LoaderProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function Loader({ size = "md", className }: LoaderProps) {
  const sizeMap = {
    sm: { width: 48, stroke: 4, blur: 6 },
    md: { width: 80, stroke: 6, blur: 10 },
    lg: { width: 120, stroke: 8, blur: 16 },
  };

  const { width, stroke, blur } = sizeMap[size];
  const dimension = width + blur * 2; // Extra space for glow
  const center = dimension / 2;
  const radius = width / 2 - stroke;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className={`relative flex flex-col items-center justify-center ${
        className ?? ""
      }`}
    >
      <div className="relative" style={{ width: dimension, height: dimension }}>
        <svg
          width={dimension}
          height={dimension}
          viewBox={`0 0 ${dimension} ${dimension}`}
          className="absolute inset-0 overflow-visible"
        >
          <defs>
            <filter
              id="netflix-glow"
              x="-100%"
              y="-100%"
              width="300%"
              height="300%"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation={blur / 2.5} result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Static Gray Track Circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="white"
            strokeWidth={stroke}
            strokeOpacity={0.08}
          />

          {/* Rotating Glowing Red Arc */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#71717a"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.4} ${circumference}`}
            filter="url(#netflix-glow)"
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{ 
              transformOrigin: "center",
              transformBox: "fill-box" 
            }}
          />
        </svg>
      </div>

      {size === "lg" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          className="mt-6 tracking-[0.4em] font-black text-[10px] text-zinc-500 uppercase italic"
        >
          Загрузка
        </motion.div>
      )}
    </div>
  );
}
