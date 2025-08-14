import { animate } from "framer-motion";
import { useEffect, useState } from "react";
import Loading from "@/components/ui/loading";

/**
 * A component that displays a loading animation with a progress bar
 * for the calibration process.
 */
export function CalibrationLoading() {
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    // Reset progress when loading starts
    setLoadingProgress(0);

    const totalDuration = 10; // 10 seconds

    const controls = animate(0, 99, {
      duration: totalDuration,
      ease: "easeInOut",
      onUpdate: (value) => {
        setLoadingProgress(value);
      },
    });

    return () => controls.stop();
  }, []);

  return <Loading progress={loadingProgress} context="calibration" />;
}
