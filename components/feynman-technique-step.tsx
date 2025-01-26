import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ButtonLoading } from "@/components/ui/button-loading";
import { BookOpen } from "lucide-react";

export default function FeynnmanTechnique({
  userKnowledge,
  setUserKnowledge,
  setStep,
  isLoading,
  isButtonLoading,
  handleSubmit,
}: {
  userKnowledge: string;
  setUserKnowledge: (knowledge: string) => void;
  setStep: (step: number) => void;
  isLoading: boolean;
  isButtonLoading: boolean;
  handleSubmit: () => void;
}) {
  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl mx-auto"
    >
      <h2 className="text-2xl font-semibold text-white mb-4 text-center">
        Explain what you already know
      </h2>
      <p className="text-sm text-gray-400 mb-6">
        Write out everything you already know about this topic as if you're
        explaining it to someone else. This helps identify knowledge gaps and
        creates a better learning path.
      </p>
      <div className="relative mb-4">
        <textarea
          className="w-full min-h-[200px] p-4 rounded-lg border border-gray-600 bg-[#0D1117] text-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.1)] placeholder:text-gray-500 transition-all duration-300 ease-in-out hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] focus:shadow-[0_0_20px_rgba(59,130,246,0.3)]"
          value={userKnowledge}
          onChange={(e) => setUserKnowledge(e.target.value)}
          placeholder="What do you already know about this?"
        />
        <div className="absolute inset-0 rounded-lg pointer-events-none bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-50"></div>
      </div>
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setStep(1)}
          className="flex-1 h-11 bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-gray-200 transition-colors duration-300"
          disabled={isLoading}
        >
          Back
        </Button>
        {isButtonLoading ? (
          <ButtonLoading className="flex-1 h-11 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white transition-all duration-300 ease-in-out flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(129,140,248,0.5)] relative overflow-hidden group" />
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!userKnowledge.trim() || isButtonLoading}
            className="flex-1 h-11 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white transition-all duration-300 ease-in-out flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(129,140,248,0.5)] relative overflow-hidden group"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-60 transition-opacity duration-300 ease-in-out"></span>
            <span className="absolute inset-0 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-40 blur-md transition-opacity duration-300 ease-in-out"></span>
            <BookOpen className="w-5 h-5 relative z-10" />
            <span className="relative z-10">Generate a roadmap</span>
          </Button>
        )}
      </div>
    </motion.div>
  );
}
