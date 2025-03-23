import React, { useState, useEffect, useRef } from "react";
import { AlertCircle, Activity } from "lucide-react";

interface PerformanceStats {
  fps: number;
  nodeCount: number;
  edgeCount: number;
  renderTime: number;
}

interface PerformanceMonitorProps {
  nodeCount: number;
  edgeCount: number;
  enabled?: boolean;
}

/**
 * Component that displays performance metrics for graph visualization
 */
export function PerformanceMonitor({
  nodeCount,
  edgeCount,
  enabled = false,
}: PerformanceMonitorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 0,
    nodeCount: 0,
    edgeCount: 0,
    renderTime: 0,
  });
  const frameTimeRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Track performance metrics
  useEffect(() => {
    if (!enabled) return;

    const updateStats = (time: number) => {
      if (lastFrameTimeRef.current) {
        const delta = time - lastFrameTimeRef.current;
        frameTimeRef.current.push(delta);

        // Keep only the last 60 frames
        if (frameTimeRef.current.length > 60) {
          frameTimeRef.current.shift();
        }

        // Calculate FPS from frame times
        const avgFrameTime =
          frameTimeRef.current.reduce((sum, time) => sum + time, 0) /
          frameTimeRef.current.length;
        const fps = Math.round(1000 / avgFrameTime);

        setStats({
          fps,
          nodeCount,
          edgeCount,
          renderTime: Math.round(delta),
        });
      }

      lastFrameTimeRef.current = time;
      animFrameRef.current = requestAnimationFrame(updateStats);
    };

    animFrameRef.current = requestAnimationFrame(updateStats);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [enabled, nodeCount, edgeCount]);

  // Updated stats when node/edge count changes
  useEffect(() => {
    if (enabled) {
      setStats((prev) => ({
        ...prev,
        nodeCount,
        edgeCount,
      }));
    }
  }, [nodeCount, edgeCount, enabled]);

  if (!enabled) return null;

  // Determine performance status
  const isPerformanceCritical = stats.fps < 20;
  const isPerformanceWarning = stats.fps < 30;
  const performanceStatus = isPerformanceCritical
    ? "critical"
    : isPerformanceWarning
      ? "warning"
      : "good";

  return (
    <div className="absolute bottom-4 right-4 z-50">
      <div
        className={`
          rounded-md shadow-md border 
          ${
            isOpen
              ? "bg-slate-800/90 border-slate-700"
              : performanceStatus === "critical"
                ? "bg-red-900/60 border-red-800/80"
                : performanceStatus === "warning"
                  ? "bg-yellow-900/60 border-yellow-800/80"
                  : "bg-slate-800/60 border-slate-700/80"
          }
        `}
      >
        {isOpen ? (
          <div className="p-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-medium text-slate-300">
                Performance Monitor
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-300"
              >
                <span className="sr-only">Close</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">FPS</span>
                <span
                  className={`font-mono ${
                    performanceStatus === "critical"
                      ? "text-red-400"
                      : performanceStatus === "warning"
                        ? "text-yellow-400"
                        : "text-green-400"
                  }`}
                >
                  {stats.fps.toFixed(0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nodes</span>
                <span className="font-mono text-slate-300">
                  {stats.nodeCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Edges</span>
                <span className="font-mono text-slate-300">
                  {stats.edgeCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Render Time</span>
                <span className="font-mono text-slate-300">
                  {stats.renderTime}ms
                </span>
              </div>
            </div>

            {performanceStatus === "critical" && (
              <div className="mt-2 text-[10px] bg-red-950/50 border border-red-900/50 text-red-300 p-1.5 rounded">
                <div className="flex gap-1 items-center">
                  <AlertCircle size={12} />
                  <span className="font-medium">Performance Issue</span>
                </div>
                <p className="mt-0.5">
                  Large graph detected. Some nodes have been hidden to improve
                  performance.
                </p>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 flex items-center gap-1.5"
          >
            <Activity
              size={14}
              className={`
                ${
                  performanceStatus === "critical"
                    ? "text-red-400"
                    : performanceStatus === "warning"
                      ? "text-yellow-400"
                      : "text-green-400"
                }
              `}
            />
            <span className="text-xs text-slate-300">{stats.fps} FPS</span>
          </button>
        )}
      </div>
    </div>
  );
}
