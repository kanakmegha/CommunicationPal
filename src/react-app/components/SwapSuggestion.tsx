import { ArrowRight } from "lucide-react";

interface SwapSuggestionProps {
  original: string;
  suggested: string;
  onAccept?: () => void;
  onDismiss?: () => void;
}

export function SwapSuggestion({ original, suggested, onAccept, onDismiss }: SwapSuggestionProps) {
  return (
    <div className="p-3 bg-card border border-border rounded-xl animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center gap-2 text-sm mb-2">
        <span className="text-muted-foreground line-through">{original}</span>
        <ArrowRight className="w-3 h-3 text-primary" />
        <span className="text-primary font-medium">{suggested}</span>
      </div>
      <div className="flex gap-2">
        <button 
          onClick={onAccept}
          className="flex-1 text-xs py-1.5 px-3 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
        >
          Got it
        </button>
        <button 
          onClick={onDismiss}
          className="text-xs py-1.5 px-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
