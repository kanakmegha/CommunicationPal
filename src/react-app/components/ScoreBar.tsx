import { cn } from "@/react-app/lib/utils";

interface ScoreBarProps {
  label: string;
  score: number;
  maxScore?: number;
  trend?: "up" | "down" | "stable";
  color?: string;
}

export function ScoreBar({ 
  label, 
  score, 
  maxScore = 10, 
  trend = "stable",
  color = "bg-primary"
}: ScoreBarProps) {
  const percentage = (score / maxScore) * 100;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold text-foreground">{score}</span>
          <span className="text-xs text-muted-foreground">/{maxScore}</span>
          {trend !== "stable" && (
            <span className={cn(
              "text-xs font-medium",
              trend === "up" ? "text-emerald-400" : "text-red-400"
            )}>
              {trend === "up" ? "↑" : "↓"}
            </span>
          )}
        </div>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
