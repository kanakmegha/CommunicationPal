import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/react-app/components/ui/button";
import { useSession } from "@/react-app/context/SessionContext";
import { 
  XAxis, 
  YAxis, 
  ResponsiveContainer,
  Tooltip,
  Area,
  AreaChart
} from "recharts";
import { 
  Trophy, 
  TrendingUp, 
  Lightbulb, 
  Save, 
  RotateCcw,
  Mic,
  Sparkles,
  MessageCircle,
  CheckCircle2,
  ArrowUp,
  ArrowDown
} from "lucide-react";

const iconMap: Record<string, typeof Mic> = {
  articulation: Mic,
  expression: Sparkles,
  verbal_crunches: MessageCircle,
};

export default function DebriefPage() {
  const navigate = useNavigate();
  const { sessionData, clearSession } = useSession();
  const [saved, setSaved] = useState(false);

  // Redirect if no session data
  useEffect(() => {
    if (!sessionData) {
      navigate("/");
    }
  }, [sessionData, navigate]);

  if (!sessionData) {
    return null;
  }

  const scoreDiff = sessionData.overallScore - sessionData.previousScore;
  const isImproved = scoreDiff > 0;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSave = async () => {
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overall_score: sessionData.overallScore,
          duration_seconds: sessionData.durationSeconds,
          parameter_scores: sessionData.parameters,
          learning_curve: sessionData.learningCurve,
          feedback: sessionData.feedback,
          focus_parameters: sessionData.focusParameters,
        }),
      });

      if (response.ok) {
        setSaved(true);
      }
    } catch (error) {
      console.error("Failed to save session:", error);
    }
  };

  const handleNewSession = () => {
    clearSession();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Session Complete</h1>
          <p className="text-muted-foreground">
            Duration: {formatDuration(sessionData.durationSeconds)}
          </p>
        </div>

        {/* Overall Score Card */}
        <div className="bg-card border border-border rounded-3xl p-6 md:p-8 mb-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
          <div className="relative">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Trophy className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Session Average
              </span>
            </div>
            <div className="flex items-baseline justify-center gap-2 mb-3">
              <span className="text-7xl md:text-8xl font-bold text-foreground">
                {sessionData.overallScore}
              </span>
              <span className="text-2xl text-muted-foreground">/100</span>
            </div>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
              isImproved 
                ? "bg-emerald-400/10 text-emerald-400" 
                : scoreDiff === 0
                ? "bg-muted text-muted-foreground"
                : "bg-red-400/10 text-red-400"
            }`}>
              {scoreDiff !== 0 && (isImproved ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />)}
              {scoreDiff === 0 ? "Same as last session" : `${Math.abs(scoreDiff)} points vs last session`}
            </div>
          </div>
        </div>

        {/* Two column layout */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Parameter Scores */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Focus Area Scores
            </h2>
            <div className="space-y-4">
              {sessionData.parameters.map((param) => {
                const Icon = iconMap[param.id] || Mic;
                const diff = param.score - param.previous;
                return (
                  <div key={param.id} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{param.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">{param.score}/10</span>
                          {diff !== 0 && (
                            <span className={`text-xs ${diff > 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {diff > 0 ? "+" : ""}{diff}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-700"
                          style={{ width: `${param.score * 10}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {sessionData.parameters.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No focus parameters selected
                </p>
              )}
            </div>
          </div>

          {/* Learning Curve */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Learning Curve
            </h2>
            <div className="h-48">
              {sessionData.learningCurve.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sessionData.learningCurve}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(187, 100%, 50%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(187, 100%, 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="turn" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 12 }}
                      tickFormatter={(v) => `T${v}`}
                    />
                    <YAxis 
                      domain={[50, 100]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 12 }}
                      width={30}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(220, 18%, 10%)',
                        border: '1px solid hsl(220, 15%, 18%)',
                        borderRadius: '12px',
                        padding: '8px 12px'
                      }}
                      labelStyle={{ color: 'hsl(215, 20%, 55%)' }}
                      itemStyle={{ color: 'hsl(187, 100%, 50%)' }}
                      formatter={(value) => [`${value}`, 'Score']}
                      labelFormatter={(label) => `Turn ${label}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke="hsl(187, 100%, 50%)" 
                      strokeWidth={2}
                      fill="url(#scoreGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No learning curve data
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Feedback */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Coach Feedback
          </h2>
          {sessionData.feedback.length > 0 ? (
            <ul className="space-y-3">
              {sessionData.feedback.map((item, i) => (
                <li key={i} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">{i + 1}</span>
                  </div>
                  <p className="text-foreground/90 leading-relaxed">{item}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No feedback available
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={handleSave}
            disabled={saved}
            className="flex-1 h-12 text-base gap-2"
            variant={saved ? "secondary" : "default"}
          >
            {saved ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Saved to History
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save to History
              </>
            )}
          </Button>
          <Button 
            onClick={handleNewSession}
            variant="outline"
            className="flex-1 h-12 text-base gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Start New Session
          </Button>
        </div>
      </div>
    </div>
  );
}
