import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Outlet } from "@tanstack/react-router";

const WizardLayout = () => {
  return (
    <div style={{ width: "100vw", height: "100vh" }} className="bg-background">
      <div className="w-full h-full flex items-center justify-center">
        <AnimatePresence mode="wait">
          <Outlet />
        </AnimatePresence>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/wizard")({
  component: WizardLayout,
});

export default WizardLayout;
