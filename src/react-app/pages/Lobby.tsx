import { useState } from "react";
import { useNavigate } from "react-router";
import { Switch } from "@/react-app/components/ui/switch";
import { Button } from "@/react-app/components/ui/button";
import { 
  Mic, 
  Sparkles, 
  MessageCircle, 
  Replace, 
  ChevronRight,
  Zap,
  History
} from "lucide-react";

interface FocusParameter {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const focusParameters: FocusParameter[] = [
  {
    id: "articulation",
    label: "Articulation",
    description: "Clarity of speech and pronunciation",
    icon: <Mic className="w-5 h-5" />,
  },
  {
    id: "expression",
    label: "Expression",
    description: "Emotional resonance and vocal variety",
    icon: <Sparkles className="w-5 h-5" />,
  },
  {
    id: "verbal_crunches",
    label: "Verbal Crunches",
    description: 'Detection of "um," "uh," "like," etc.',
    icon: <MessageCircle className="w-5 h-5" />,
  },
  {
    id: "swap_list",
    label: "Swap List",
    description: "Real-time vocabulary upgrades",
    icon: <Replace className="w-5 h-5" />,
  },
];

export default function LobbyPage() {
  const navigate = useNavigate();
  const [selectedParams, setSelectedParams] = useState<Record<string, boolean>>({
    articulation: true,
    expression: true,
    verbal_crunches: true,
    swap_list: false,
  });

  const toggleParam = (id: string) => {
    setSelectedParams((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const activeCount = Object.values(selectedParams).filter(Boolean).length;

  const handleStartSession = () => {
    const params = new URLSearchParams();
    Object.entries(selectedParams).forEach(([key, value]) => {
      if (value) params.append("focus", key);
    });
    navigate(`/arena?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">ComPal Live</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/vault")}
            className="text-muted-foreground hover:text-foreground"
          >
            <History className="w-4 h-4 mr-2" />
            History
          </Button>
        </header>

        {/* Main content */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
          <div className="w-full max-w-lg">
            {/* Title section */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
                Ready to <span className="text-primary">Practice?</span>
              </h1>
              <p className="text-muted-foreground text-lg">
                Select your focus areas for this session
              </p>
            </div>

            {/* Focus parameters */}
            <div className="space-y-3 mb-10">
              {focusParameters.map((param) => (
                <div
                  key={param.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleParam(param.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleParam(param.id);
                    }
                  }}
                  className={`w-full p-4 rounded-2xl border transition-all duration-300 text-left flex items-center gap-4 group cursor-pointer ${
                    selectedParams[param.id]
                      ? "bg-primary/10 border-primary/40 shadow-lg shadow-primary/10"
                      : "bg-card border-border hover:border-primary/30 hover:bg-card/80"
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      selectedParams[param.id]
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    {param.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{param.label}</h3>
                    <p className="text-sm text-muted-foreground">{param.description}</p>
                  </div>
                  <Switch
                    checked={selectedParams[param.id]}
                    onCheckedChange={() => toggleParam(param.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              ))}
            </div>

            {/* Start button */}
            <Button
              onClick={handleStartSession}
              disabled={activeCount === 0}
              size="lg"
              className="w-full h-14 text-lg font-semibold rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/30 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/40 disabled:opacity-50 disabled:shadow-none"
            >
              Start Live Session
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>

            {activeCount === 0 && (
              <p className="text-center text-muted-foreground text-sm mt-4">
                Select at least one focus area to begin
              </p>
            )}
          </div>
        </main>

        {/* Footer note */}
        <footer className="p-6 text-center">
          <p className="text-xs text-muted-foreground">
            🔒 Your sessions are private. No audio or video is recorded.
          </p>
        </footer>
      </div>
    </div>
  );
}
