import React from "react";
import { motion } from "framer-motion";

export const LoadingBubble: React.FC = () => {
  return (
    <motion.div
      className="max-w-[85%] sm:max-w-[75%] md:max-w-[65%] lg:max-w-[55%] p-3
                 rounded-tl-3xl rounded-br-3xl rounded-tr-lg rounded-bl-lg
                 bg-gradient-to-br from-[#2F6B87]/60 to-[#2A5F78]/60 backdrop-blur-sm
                 flex items-center space-x-3
                 relative overflow-hidden
                 animate-glow"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <span className="absolute inset-0 bg-gradient-to-br from-cyan-500/40 to-blue-500/40 opacity-60 transition-opacity duration-300 ease-in-out"></span>
      <span className="absolute inset-0 bg-gradient-to-br from-cyan-400/30 to-blue-400/30 opacity-40 blur-md transition-opacity duration-300 ease-in-out"></span>
      <p className="text-[13px] leading-relaxed text-white/90 relative z-10">
        AI is thinking
      </p>
      <div className="relative w-6 h-6 z-10">
        <div className="absolute inset-0 border-2 border-slate-700/50 rounded-full" />
        <motion.div
          className="absolute inset-0 border-2 border-cyan-400/70 rounded-full"
          animate={{
            opacity: [0.2, 1, 0.2],
            scale: [0.8, 1.2, 0.8],
            rotate: 360,
          }}
          transition={{
            duration: 3,
            ease: "easeInOut",
            times: [0, 0.5, 1],
            repeat: Infinity,
            repeatDelay: 0,
          }}
        />
      </div>
    </motion.div>
  );
};
