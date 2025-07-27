import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const levelColors = {
  "No calibration": "from-[#374151] to-[#1F2937]",
  "Lightly Calibrated": "from-[#047857] to-[#065F46]",
  "Well Calibrated": "from-[#059669] to-[#047857]",
  "Finely Calibrated": "from-[#10B981] to-[#059669]",
};

export type CalibrationLevel = keyof typeof levelColors;

interface CalibrationPillProps {
  level: CalibrationLevel | null;
}

export function CalibrationPill({ level }: CalibrationPillProps) {
  return (
    <motion.div
      layout
      layoutId="pill"
      style={{
        originX: 0.5,
        originY: 0.5,
        borderRadius: 9999, // Force consistent border radius
      }}
      transition={{
        duration: 0.3,
        borderRadius: {
          // Add specific transition for border radius
          duration: 0.15,
        },
      }}
      className="relative inline-flex items-center text-white text-sm font-medium shadow-lg"
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-r rounded-full",
          level ? levelColors[level] : levelColors["Not set"]
        )}
      />
      <motion.div
        layout="position"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          opacity: { duration: 0.2 },
        }}
        className="relative px-4 py-1 text-center"
      >
        <motion.span
          key={level}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            opacity: { duration: 0.2, delay: 0.4 },
          }}
        >
          {level || "Not set"}
        </motion.span>
      </motion.div>
    </motion.div>
  );
}
