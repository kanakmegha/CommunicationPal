import { useNavigate } from "react-router";
import { useSession } from "@/react-app/context/SessionContext";
import { Button } from "@/react-app/components/ui/button";
import { ArrowLeft, Clock, TrendingUp } from "lucide-react";

export default function DebriefPage() {
  const navigate = useNavigate();
  const { sessionData } = useSession();

  // Redirect if no session data
  if (!sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No session data found</p>
          <Button onClick={() => navigate("/arena")}>Start New Session</Button>
        </div>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="p-4 border-b border-border flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/arena")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button variant="outline" onClick={() => navigate("/vault")}>
          View History
        </Button>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        {/* Score Card */}
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-8 text-center mb-6">
          <p className="text-sm text-muted-foreground mb-2">Overall Score</p>
          <p className="text-6xl font-bold text-primary">{sessionData.overallScore}</p>
          <p className="text-sm text-muted-foreground mt-2">
            {sessionData.overallScore > sessionData.previousScore ? "↑" : "↓"} 
            from {sessionData.previousScore}
          </p>
        </div>

        {/* Duration */}
        <div className="bg-card rounded-xl p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <span>Duration</span>
          </div>
          <span className="font-bold">{formatDuration(sessionData.durationSeconds)}</span>
        </div>

        {/* Parameter Scores */}
        <div className="bg-card rounded-xl p-4 mb-4">
          <h3 className="font-semibold mb-3">Scores</h3>
          <div className="space-y-3">
            {sessionData.parameters.map((param: any) => (
              <div key={param.id} className="flex justify-between items-center">
                <span className="text-muted-foreground">{param.label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${param.score * 10}%` }}
                    />
                  </div>
                  <span className="font-bold w-12 text-right">{param.score}/10</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback */}
        <div className="bg-card rounded-xl p-4 mb-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Feedback
          </h3>
          <ul className="space-y-2">
            {sessionData.feedback.map((item, i) => (
              <li key={i} className="text-muted-foreground text-sm">
                • {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions - NO SAVE BUTTON, session already saved automatically */}
        <div className="flex gap-4">
          <Button className="flex-1" onClick={() => navigate("/arena")}>
            New Session
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => navigate("/vault")}>
            View History
          </Button>
        </div>
      </main>
    </div>
  );
}