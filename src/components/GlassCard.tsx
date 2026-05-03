import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  "data-testid"?: string;
}

export function GlassCard({ children, className, onClick, "data-testid": testId }: GlassCardProps) {
  return (
    <div
      className={cn("glass-card p-4", className)}
      onClick={onClick}
      data-testid={testId}
    >
      {children}
    </div>
  );
}
