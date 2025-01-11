import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ButtonLoading({ className }: { className?: string }) {
  return (
    <Button disabled className={className}>
      <Loader2 className="animate-spin" />
      Please wait
    </Button>
  );
}
