import { motion } from "framer-motion";
import type React from "react";

export const LoadingBubble: React.FC = () => {
  return (
    <motion.div
      className="max-w-[85%] sm:max-w-[75%] md:max-w-[65%] lg:max-w-[55%] py-3 px-12
                 rounded-tl-3xl rounded-br-3xl rounded-tr-lg rounded-bl-lg
                 border border-slate-700/60
                 bg-slate-800/30 backdrop-blur-sm
                 flex items-center space-x-3
                 relative overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <p className="text-[13px] leading-relaxed text-white/70 relative z-10">AI is thinking</p>
      <div className="relative w-6 h-6 z-10">
        <div className="absolute inset-0 border border-slate-700/50 rounded-full" />
        <motion.div
          className="absolute inset-0 border border-slate-400/70 rounded-full"
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
