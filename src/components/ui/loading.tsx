import { AnimatePresence, motion, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

// Define different sets of phrases for different contexts
const phraseSets = {
  default: [
    "Generating learning plan",
    "Considering pathways",
    "Analyzing progress",
    "Optimizing curriculum",
    "Personalizing content",
  ],
  calibration: [
    "Preparing knowledge assessment",
    "Building concept map",
    "Gathering learning concepts",
    "Analyzing subject areas",
    "Preparing calibration tools",
  ],
  curriculumMapGeneration: [
    "Creating your personalized curriculum map",
    "Organizing learning modules",
    "Sequencing learning path",
    "Tailoring to your knowledge level",
    "Building learning connections",
  ],
  curriculumMapLoading: [
    "Loading your curriculum map",
    "Preparing visualization",
    "Rendering learning path",
    "Setting up your journey",
    "Arranging learning modules",
  ],
};

type LoadingContext = keyof typeof phraseSets;

interface LoadingProps {
  progress?: number;
  context?: LoadingContext;
}

export default function Loading({ progress, context = "default" }: LoadingProps) {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const hasProgress = progress !== undefined;

  // Select the appropriate phrase set based on context
  const phrases = phraseSets[context];

  // Use spring animation for smoother, non-linear progress
  const animatedProgress = useSpring(0, {
    stiffness: 40, // Lower stiffness for smoother animation
    damping: 20, // Balanced damping for natural movement without overshooting
    restDelta: 0.001,
  });

  // Transform the spring value to a percentage string
  const progressWidth = useTransform(animatedProgress, (value) => `${value}%`);

  // Update the spring animation when progress changes
  useEffect(() => {
    if (hasProgress) {
      animatedProgress.set(progress);
    }
  }, [progress, hasProgress, animatedProgress]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhraseIndex((prevIndex) => (prevIndex + 1) % phrases.length);
    }, 4000); // Change phrase every 4 seconds

    return () => clearInterval(interval);
  }, [phrases]);

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

      <div className="relative h-14 overflow-hidden w-64 mb-6">
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
            <p className="text-neutral-300 text-center text-sm font-medium">
              {phrases[currentPhraseIndex]}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {hasProgress && (
        <div className="w-64 overflow-hidden">
          <div className="h-[2px] bg-neutral-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-neutral-500 to-neutral-300"
              style={{ width: progressWidth }}
            />
          </div>

          {/* Add subtle pulse animation for more visual interest */}
          <motion.div
            className="h-[1px] w-full mt-[1px] bg-gradient-to-r from-transparent via-neutral-700 to-transparent opacity-50"
            animate={{
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 2,
              ease: "easeInOut",
              repeat: Infinity,
              repeatDelay: 0,
            }}
          />
        </div>
      )}
    </div>
  );
}
