import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
  TooltipPortal,
} from "@/components/ui/tooltip";
import ReactMarkdown from "react-markdown";
import { motion, useAnimationControls, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface MarkdownDisplayProps {
  content: string;
  tooltips?: Record<string, string>;
  tooltipsReady?: boolean;
  onLearnMore?: (concept: string) => void;
  isCreatingArticle?: boolean;
}

const MarkdownDisplay: React.FC<MarkdownDisplayProps> = ({
  content,
  tooltips = {},
  tooltipsReady = false,
  onLearnMore,
  isCreatingArticle = false,
}) => {
  // Track all StrongText components with tooltips for staggered animation
  const [tooltipElements, setTooltipElements] = useState<string[]>([]);

  // Reset tooltip elements when content changes
  useEffect(() => {
    setTooltipElements([]);
  }, [content]);

  // Register a tooltip element for staggered animation
  const registerTooltipElement = (concept: string) => {
    setTooltipElements((prev) => {
      if (!prev.includes(concept)) {
        return [...prev, concept];
      }
      return prev;
    });
  };

  // Define the staggered animation variants for the container and items
  const container = {
    hidden: { opacity: 1 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      },
    },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate={tooltipElements.length > 0 ? "show" : "hidden"}
    >
      <ReactMarkdown
        className="prose prose-invert prose-sm max-w-none [&>:first-child]:mt-0 [&>:last-child]:mb-0 prose-pre:bg-transparent
                   [&>h1+h2]:mt-3 [&>h2+h3]:mt-2"
        components={{
          h1: HeadingOne,
          h2: HeadingTwo,
          h3: HeadingThree,
          p: Paragraph,
          code: CodeBlock,
          pre: PreBlock,
          ol: OrderedList,
          li: ListItem,
          strong: (props) => (
            <StrongText
              {...props}
              tooltips={tooltips}
              tooltipsReady={tooltipsReady}
              tooltipElements={tooltipElements}
              registerTooltipElement={registerTooltipElement}
              index={tooltipElements.length}
              onLearnMore={onLearnMore}
              isCreatingArticle={isCreatingArticle}
            />
          ),
          blockquote: Blockquote,
        }}
      >
        {content}
      </ReactMarkdown>
    </motion.div>
  );
};

const HeadingOne: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h1 className="relative pl-4 mb-4 text-xl font-semibold text-white">
    <span className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 rounded-full"></span>
    {children}
  </h1>
);

const HeadingTwo: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="relative pl-4 mb-4 text-lg font-semibold text-white">
    <span className="absolute left-0 top-1 bottom-1 w-1 bg-cyan-400/80 rounded-full"></span>
    {children}
  </h2>
);

const HeadingThree: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <h3 className="relative pl-4 mb-3 text-base font-semibold text-white">
    <span className="absolute h-4 left-0 top-1 bottom-2 w-1 bg-cyan-400/60 rounded-full"></span>
    {children}
  </h3>
);

const Paragraph: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-slate-300 leading-relaxed mb-5 text-[14px]">{children}</p>
);

const CodeBlock = ({ className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || "");
  const isInline = !match;
  return isInline ? (
    <code className={className} {...props}>
      {children}
    </code>
  ) : (
    <code className={`${className} text-xs`} {...props}>
      {children}
    </code>
  );
};

const PreBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-slate-900/30 backdrop-blur-sm hover:bg-slate-800/40 rounded-xl border transition-all duration-200">
    <pre className="my-4">
      <div className="px-1">{children}</div>
    </pre>
  </div>
);

const OrderedList: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ol className="list-decimal list-inside space-y-2 mb-4 text-slate-300 pl-3">
    {children}
  </ol>
);

const ListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-start gap-2 text-sm text-slate-300 mb-1">
    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500/40 flex-shrink-0" />
    <div>{children}</div>
  </div>
);

interface StrongTextProps {
  children?: React.ReactNode;
  tooltips: Record<string, string>;
  tooltipsReady: boolean;
  tooltipElements: string[];
  registerTooltipElement: (concept: string) => void;
  index: number;
  onLearnMore?: (concept: string) => void;
  isCreatingArticle: boolean;
}

const StrongText: React.FC<StrongTextProps> = ({
  children,
  tooltips,
  tooltipsReady,
  tooltipElements,
  registerTooltipElement,
  index,
  onLearnMore,
  isCreatingArticle,
}) => {
  const concept = String(children).trim();
  const tooltipText = tooltips[concept.toLowerCase()];
  const hasTooltip = tooltipText != null;
  const isRegistered = useRef(false);
  const [isOpen, setIsOpen] = useState(false);

  // Define simpler animation variants
  const item = {
    hidden: {
      borderBottom: "0px solid transparent",
    },
    show: {
      borderBottom: "1px solid rgba(148, 163, 184, 0.3)",
      transition: {
        duration: 0.3,
        delay: index * 0.1,
      },
    },
  };

  // Register this tooltip element for staggered animation
  useEffect(() => {
    if (hasTooltip && !isRegistered.current) {
      registerTooltipElement(concept);
      isRegistered.current = true;
    }
  }, [hasTooltip, concept, registerTooltipElement]);

  if (!hasTooltip) {
    return <span className="font-bold text-white">{children}</span>;
  }

  return (
    <>
      <Tooltip onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          <motion.span
            className="font-bold text-white cursor-help relative"
            variants={item}
            whileHover={{
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              transition: { duration: 0.2 },
            }}
          >
            {children}
          </motion.span>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent
            className="p-4 text-sm backdrop-blur-sm bg-slate-900 text-slate-100 border border-slate-700 rounded-lg shadow-lg shadow-slate-900/50 z-50"
            sideOffset={5}
            style={{ maxWidth: "500px", willChange: "opacity, transform" }}
          >
            <ReactMarkdown className="prose prose-invert prose-sm max-w-none [&>:first-child]:mt-0 [&>:last-child]:mb-0 prose-headings:mb-2 prose-headings:text-slate-200 prose-headings:text-sm prose-headings:font-semibold prose-headings:leading-tight prose-headings:tracking-wide prose-headings:uppercase prose-p:mb-2 prose-p:text-slate-300">
              {tooltipText}
            </ReactMarkdown>
            <div className="mt-3 pt-3 border-t border-slate-700/50">
              <button
                className={`px-3 py-1.5 rounded-full text-xs transition-colors flex items-center gap-1.5 ${
                  isCreatingArticle
                    ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                }`}
                onClick={() => {
                  onLearnMore?.(concept);
                }}
                disabled={isCreatingArticle}
              >
                <span className="text-cyan-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 16v-4"></path>
                    <path d="M12 8h.01"></path>
                  </svg>
                </span>
                {isCreatingArticle ? "Creating..." : "Tell me more about this"}
              </button>
            </div>
          </TooltipContent>
        </TooltipPortal>
      </Tooltip>
    </>
  );
};

const Blockquote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <blockquote
    className="p-4 my-4 mt-6 rounded-xl backdrop-blur-sm
                           bg-green-900/10 border border-green-500/20
                           hover:bg-green-900/20 transition-all duration-200
                           not-prose [&>div>p]:mb-0 [&>div>p:not(:last-child)]:mb-2"
  >
    <div className="text-xs font-medium mb-2 text-green-400">Key Takeaways</div>
    <div className="space-y-2 pt-3 border-t border-slate-700/50">
      {children}
    </div>
  </blockquote>
);

export default MarkdownDisplay;
