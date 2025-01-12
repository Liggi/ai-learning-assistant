"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const phrases = [
  "Generating learning plan",
  "Considering pathways",
  "Analyzing progress",
  "Optimizing curriculum",
  "Personalizing content",
];

export default function Loading() {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhraseIndex((prevIndex) => (prevIndex + 1) % phrases.length);
    }, 4000); // Change phrase every 4 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <motion.div className="relative w-16 h-16 mb-3">
        <div className="absolute inset-0 border-4 border-neutral-700 rounded-full" />
        <motion.div
          className="absolute inset-0 border-4 border-neutral-300 rounded-full"
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
      </motion.div>
      <div className="relative h-14 overflow-hidden w-64">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentPhraseIndex}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{
              opacity: { duration: 0.4, ease: "easeInOut" },
              y: {
                duration: 0.4,
                ease: [0.33, 1, 0.68, 1],
                times: [0, 0.8, 1],
              },
            }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <p className="text-neutral-300 text-center text-lg font-light tracking-wide">
              {phrases[currentPhraseIndex]}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
