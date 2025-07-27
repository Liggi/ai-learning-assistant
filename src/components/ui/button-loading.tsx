import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ButtonLoadingProps {
  className?: string;
  children?: React.ReactNode;
}

export function ButtonLoading({
  className,
  children = "Please wait",
}: ButtonLoadingProps) {
  return (
    <Button disabled className={className}>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {children}
    </Button>
  );
}
