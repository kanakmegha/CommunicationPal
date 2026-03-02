import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/react-app/components/ui/button";
import { 
  ArrowLeft, 
  History, 
  Clock, 
  TrendingUp,
  Calendar,
  ChevronRight,
  Loader2,
  Mic,
  Sparkles,
  MessageCircle,
  Plus
} from "lucide-react";

interface Session {
  id: number;
  overall_score: number;
  duration_seconds: number;
  parameter_scores: Array<{
    id: string;
    label: string;
    score: number;
    previous: number;
  }>;
  learning_curve: Array<{ turn: number; score: number }>;
  feedback: string[];
  focus_parameters: string[];
  created_at: string;
}

const parameterIcons: Record<string, React.ReactNode> = {
  articulation: <Mic className="w-3.5 h-3.5" />,
  expression: <Sparkles className="w-3.5 h-3.5" />,
  verbal_crunches: <MessageCircle className="w-3.5 h-3.5" />,
};

export default function VaultPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/sessions");
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-amber-400";
    return "text-red-400";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/")}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <History className="w-6 h-6 text-primary" />
                The Vault
              </h1>
              <p className="text-sm text-muted-foreground">
                {sessions.length} session{sessions.length !== 1 ? "s" : ""} recorded
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("/")} className="gap-2">
            <Plus className="w-4 h-4" />
            New Session
          </Button>
        </div>

        {sessions.length === 0 ? (
          /* Empty state */
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center mx-auto mb-6">
              <History className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No sessions yet</h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Complete a coaching session and save it to start building your history.
            </p>
            <Button onClick={() => navigate("/")} className="gap-2">
              <Plus className="w-4 h-4" />
              Start Your First Session
            </Button>
          </div>
        ) : (
          /* Session list */
          <div className="space-y-3">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setSelectedSession(selectedSession?.id === session.id ? null : session)}
                className="w-full text-left bg-card border border-border rounded-2xl p-4 hover:border-primary/30 transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  {/* Score badge */}
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex flex-col items-center justify-center shrink-0">
                    <span className={`text-xl font-bold ${getScoreColor(session.overall_score)}`}>
                      {session.overall_score}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase">Score</span>
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(session.created_at)}</span>
                      <span className="text-muted-foreground/50">•</span>
                      <span>{formatTime(session.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{formatDuration(session.duration_seconds)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {session.parameter_scores.map((param) => (
                          <div 
                            key={param.id}
                            className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center text-muted-foreground"
                            title={param.label}
                          >
                            {parameterIcons[param.id]}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Expand indicator */}
                  <ChevronRight 
                    className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
                      selectedSession?.id === session.id ? "rotate-90" : ""
                    }`} 
                  />
                </div>

                {/* Expanded details */}
                {selectedSession?.id === session.id && (
                  <div className="mt-4 pt-4 border-t border-border">
                    {/* Parameter scores */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {session.parameter_scores.map((param) => (
                        <div key={param.id} className="bg-secondary/50 rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-muted-foreground">
                              {parameterIcons[param.id]}
                            </span>
                            <span className="text-xs text-muted-foreground">{param.label}</span>
                          </div>
                          <span className="text-lg font-bold">{param.score}/10</span>
                        </div>
                      ))}
                    </div>

                    {/* Feedback highlights */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Key Feedback
                      </h4>
                      <ul className="space-y-2">
                        {session.feedback.slice(0, 2).map((item, i) => (
                          <li key={i} className="text-sm text-foreground/80 pl-3 border-l-2 border-primary/30">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
