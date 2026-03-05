import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@/react-app/components/ui/button";
import { ScoreBar } from "@/react-app/components/ScoreBar";
import { AudioVisualizer } from "@/react-app/components/AudioVisualizer";
import { SwapSuggestion } from "@/react-app/components/SwapSuggestion";
import { useLiveCoachingEngine } from "@/react-app/hooks/useLiveCoachingEngine";
import { useSession } from "@/react-app/context/SessionContext";
//import { generateGeminiFeedback } from "@/react-app/lib/gemini";
import {
  Zap,
  Square,
  Mic,
  MicOff,
  MessageCircle,
  Send,
  AlertCircle,
  X,
  AlertTriangle,
} from "lucide-react";

interface TranscriptEntry {
  speaker: "user" | "ai";
  text: string;
  timestamp: Date;
  fillerWords?: { word: string; count: number }[];
  articulationNote?: string;
}

interface Score {
  current: number;
  trend: "up" | "down" | "stable";
}

interface FillerWordStats {
  word: string;
  count: number;
  lastUsed: Date;
}

interface ArticulationAnalysis {
  score: number;
  issues: string[];
  strengths: string[];
}

/*const parameterMeta: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  articulation: { label: "Articulation", icon: <Mic className="w-4 h-4" />, color: "bg-cyan-400" },
  expression: { label: "Expression", icon: <Sparkles className="w-4 h-4" />, color: "bg-purple-400" },
  verbal_crunches: { label: "Verbal Crunches", icon: <MessageCircle className="w-4 h-4" />, color: "bg-amber-400" },
  swap_list: { label: "Swap List", icon: <Replace className="w-4 h-4" />, color: "bg-emerald-400" },
};*/

function analyzeArticulation(text: string): ArticulationAnalysis {
  const issues: string[] = [];
  const strengths: string[] = [];
  let score = 7;

  const words = text.trim().split(/\s+/);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  sentences.forEach(sentence => {
    const s = sentence.trim().toLowerCase();
    const wordsInSentence = s.split(/\s+/);
    
    const incompleteStarters = ['what i mean', 'i mean to say', 'meaning that', 'is the'];
    if (incompleteStarters.some(starter => s.startsWith(starter))) {
      issues.push("Incomplete thought");
      score -= 1;
    }
    
    if (wordsInSentence.length < 3 && sentences.length === 1) {
      issues.push("Too brief");
      score -= 0.5;
    }
  });

  const hasSubject = /\b(i|we|you|he|she|they|it|the|a|an|people|ai|work)\b/i.test(text);
  const hasVerb = /\b(is|are|was|were|will|can|could|would|should|think|believe|say|mean|going|do|does|did)\b/i.test(text);
  
  if (hasSubject && hasVerb) {
    strengths.push("Clear structure");
    score += 0.5;
  } else if (!hasSubject || !hasVerb) {
    issues.push("Unclear structure");
    score -= 1;
  }

  const endsAbruptly = !/[.!?]$/.test(text.trim()) && text.trim().length > 20;
  if (endsAbruptly) {
    issues.push("Trails off");
    score -= 0.5;
  }

  const meaningfulWords = text.toLowerCase().match(/\b(important|significant|crucial|interesting|fascinating|believe|think|because|therefore|however|although|meaning|impact|change|future)\b/gi);
  if (meaningfulWords && meaningfulWords.length >= 2) {
    strengths.push("Rich vocabulary");
    score += 1;
  }

  if (words.length >= 10 && words.length <= 50) {
    strengths.push("Good length");
    score += 0.5;
  } else if (words.length < 5) {
    issues.push("Too short");
    score -= 1;
  }

  score = Math.max(1, Math.min(10, Math.round(score * 10) / 10));

  return { score, issues, strengths };
}

function detectFillerWords(text: string): { word: string; count: number }[] {
  const fillers = ['um', 'uh', 'like', 'basically', 'you know', 'literally', 'actually', 'sort of', 'kind of', 'so', 'right', 'yeah', 'well', 'hmm', 'uhh', 'umm'];
  const lower = text.toLowerCase();
  const detected: { word: string; count: number }[] = [];
  
  fillers.forEach(filler => {
    const regex = new RegExp(`\\b${filler.replace(/ /g, '\\s+')}\\b`, 'gi');
    const matches = lower.match(regex);
    if (matches && matches.length > 0) {
      detected.push({ word: filler, count: matches.length });
    }
  });
  
  return detected;
}

function scoreExpression(text: string): number {
  const lower = text.toLowerCase();
  const expressiveWords = [
    "amazing", "incredible", "crucial", "vital", "powerful", "transform", "exciting",
    "passionate", "love", "fascinating", "interesting", "curious", "future", "economy",
    "significant", "important", "believe", "think", "feel", "concerned", "excited",
    "stressful", "worried", "layoffs", "ai", "jobs"
  ];
  const count = expressiveWords.filter((w) => lower.includes(w)).length;
  return Math.min(10, Math.max(4, 5 + count));
}

function detectSwaps(text: string): { original: string; suggested: string }[] {
  const swapMap: Record<string, string> = {
    basically: "fundamentally",
    "very important": "critical",
    "a lot of": "numerous",
    "kind of": "somewhat",
    "sort of": "rather",
    "think about": "consider",
    problem: "challenge",
    use: "leverage",
    "really good": "excellent",
  };
  const lower = text.toLowerCase();
  return Object.entries(swapMap)
    .filter(([k]) => lower.includes(k))
    .map(([k, v]) => ({ original: k, suggested: v }));
}

function getSmartFallback(message: string, fillerWords: { word: string; count: number }[]): string {
  const lowerMsg = message.toLowerCase();
  
  if (lowerMsg.includes('layoff') || lowerMsg.includes('layoffs') || lowerMsg.includes('fired')) {
    return "I'm sorry about the layoffs happening - that's been really tough for many people. How is this affecting you or people you know?";
  }
  if (lowerMsg.includes('ai') && (lowerMsg.includes('replace') || lowerMsg.includes('job'))) {
    return "The concern about AI replacing jobs is real. What kind of work do you do, and how do you see AI affecting it?";
  }
  if (lowerMsg.includes('stressful') || lowerMsg.includes('stress')) {
    return "It sounds like you're dealing with a lot of stress. What's been the hardest part for you?";
  }
  if (lowerMsg.includes('ai impacting') || lowerMsg.includes('ai affecting')) {
    return "AI's impact is definitely huge right now. How have you seen it change things in your own life or work?";
  }
  if (lowerMsg.includes('future') || lowerMsg.includes('10 years')) {
    return "Thinking about the future is both exciting and uncertain. What changes are you most curious or concerned about?";
  }
  if (lowerMsg.includes('human') && lowerMsg.includes('conversation')) {
    return "I appreciate you wanting a more natural conversation! Let's keep chatting - what else is on your mind about AI and the future?";
  }
  if (fillerWords.length > 0) {
    return `You raised a good point! Quick tip: try pausing instead of saying "${fillerWords[0].word}" - it sounds more confident. What else would you like to discuss?`;
  }
  
  return "Tell me more about that - I'm curious to hear your thoughts on this topic.";
}

export default function ArenaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeParams = searchParams.getAll("focus");
 // const { setSessionData } = useSession();
 const { setSessionData } = useSession();

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [fillerAlert, setFillerAlert] = useState<string | null>(null);
  const [articulationAlert, setArticulationAlert] = useState<string | null>(null);
  
  const sessionIdRef = useRef(`session-${Date.now()}`);
  const [sessionFillerWords, setSessionFillerWords] = useState<FillerWordStats[]>([]);
  const [sessionArticulationIssues, setSessionArticulationIssues] = useState<string[]>([]);
  const [sessionArticulationStrengths, setSessionArticulationStrengths] = useState<string[]>([]);

  const isBrowserSupported = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const [_healthStatus, setHealthStatus] = useState({
    mic: "checking",
    speech: isBrowserSupported ? "healthy" : "unsupported",
    network: "healthy",
    devices: 0
  });
  const [realtimeVolume, setRealtimeVolume] = useState(0);
  
  const micStreamRef = useRef<MediaStream | null>(null);
  const isProcessingRef = useRef(false);

  const [scores, setScores] = useState<Record<string, Score>>({
    articulation: { current: 7, trend: "stable" },
    expression: { current: 6, trend: "up" },
    verbal_crunches: { current: 8, trend: "stable" },
    swap_list: { current: 5, trend: "down" },
  });

  const [transcript, setTranscript] = useState<TranscriptEntry[]>([
    {
      speaker: "ai",
      text: "Hi there! I'm so glad we're practicing together today. To get us started, what's something you're really passionate about, or a topic that's been on your mind lately?",
      timestamp: new Date(),
    },
  ]);

  const [swapSuggestions, setSwapSuggestions] = useState<{ id: number; original: string; suggested: string }[]>([]);
  const swapIdRef = useRef(0);

  // AI Response function
  const getAIResponse = useCallback(async (userMessage: string, fillerWords: { word: string; count: number }[], articulationNote: string) => {
    console.log('[Arena] Getting AI response for:', userMessage);
    
    try {
      const response = await fetch('/api/coaching', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    message: userMessage, 
    fillerWords,
    sessionId: sessionIdRef.current,
    articulationFeedback: articulationNote
  })
});

let data;

if (!response.ok) {
  const text = await response.text();
  console.error("[Arena] API error:", text);
  throw new Error(text);
}

data = await response.json();
      
      const aiText = data.response || data.fallback || getSmartFallback(userMessage, fillerWords);
      
      const aiEntry: TranscriptEntry = {
        speaker: "ai",
        text: aiText,
        timestamp: new Date()
      };
      setTranscript(prev => [...prev, aiEntry]);
      
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(aiText);
        utterance.rate = 0.95;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
      
    } catch (error: any) {
      console.error('[Arena] AI error:', error?.message);
      
      const fallbackText = getSmartFallback(userMessage, fillerWords);
      
      const fallbackEntry: TranscriptEntry = {
        speaker: "ai",
        text: fallbackText,
        timestamp: new Date()
      };
      setTranscript(prev => [...prev, fallbackEntry]);
      
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(fallbackText);
        utterance.rate = 0.95;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    }
  }, []);

  // Coaching Engine
  const {
    isRecording: _isRecording,
    isLoading: isLoadingAI,
    transcript: engineTranscript,
    interimTranscript: engineInterim,
    setTranscript: _setEngineTranscript,
    startEngine,
    stopEngine
  } = useLiveCoachingEngine((feedback) => {
    console.log('[Arena] Received:', feedback);
    
    if (feedback.transcript) {
      const userText = feedback.transcript.trim();
      
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;
      
      // Analyze articulation
      const articulation = analyzeArticulation(userText);
      
      setScores(prev => ({
        ...prev,
        articulation: {
          current: articulation.score,
          trend: articulation.score > prev.articulation.current ? "up" : articulation.score < prev.articulation.current ? "down" : "stable"
        }
      }));
      
      if (articulation.issues.length > 0) {
        setSessionArticulationIssues(prev => [...prev, ...articulation.issues]);
        setArticulationAlert(`Articulation: ${articulation.issues.join(', ')}`);
        setTimeout(() => setArticulationAlert(null), 4000);
      }
      if (articulation.strengths.length > 0) {
        setSessionArticulationStrengths(prev => [...prev, ...articulation.strengths]);
      }
      
      // Detect filler words
      const fillerWords = detectFillerWords(userText);
      
      if (fillerWords.length > 0) {
        setFillerAlert(`Filler: ${fillerWords.map(f => `"${f.word}" (${f.count}x)`).join(', ')}`);
        setTimeout(() => setFillerAlert(null), 4000);
        
        setSessionFillerWords(prev => {
          const updated = [...prev];
          fillerWords.forEach(fw => {
            const existing = updated.find(w => w.word === fw.word);
            if (existing) {
              existing.count += fw.count;
              existing.lastUsed = new Date();
            } else {
              updated.push({ word: fw.word, count: fw.count, lastUsed: new Date() });
            }
          });
          return updated.sort((a, b) => b.count - a.count);
        });
      }
      
      // Build articulation note
      let articulationNote = '';
      if (articulation.issues.length > 0) {
        articulationNote = `Issues: ${articulation.issues.join(', ')}`;
      }
      
      // Add user message
      const userEntry: TranscriptEntry = {
        speaker: "user",
        text: userText,
        timestamp: new Date(),
        fillerWords: fillerWords.length > 0 ? fillerWords : undefined,
        articulationNote: articulation.issues.length > 0 ? articulation.issues.join(', ') : undefined
      };
      setTranscript(prev => [...prev, userEntry]);
      
      // Update scores
      const expressionScore = scoreExpression(userText);
      setScores(prev => ({
        ...prev,
        expression: {
          current: expressionScore,
          trend: expressionScore > prev.expression.current ? "up" : expressionScore < prev.expression.current ? "down" : "stable"
        }
      }));
      
      let verbalScore = 10;
      if (fillerWords.length > 0) {
        verbalScore = Math.max(1, 10 - fillerWords.reduce((acc, f) => acc + f.count, 0));
      }
      setScores(prev => ({
        ...prev,
        verbal_crunches: {
          current: verbalScore,
          trend: verbalScore > prev.verbal_crunches.current ? "up" : verbalScore < prev.verbal_crunches.current ? "down" : "stable"
        }
      }));
      
      // Detect swaps
      if (activeParams.includes("swap_list")) {
        const newSwaps = detectSwaps(userText).map((s) => ({
          id: ++swapIdRef.current,
          ...s,
        }));
        setSwapSuggestions(prev => {
          const existing = new Set(prev.map(s => s.original + s.suggested));
          const filtered = newSwaps.filter(s => !existing.has(s.original + s.suggested));
          return [...prev, ...filtered];
        });
      }
      
      // Call AI
      getAIResponse(userText, fillerWords, articulationNote);
      
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1000);
    }
  });

  // Stream controller
  useEffect(() => {
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let animationId: number | null = null;
    let isMounted = true;

    async function startMasterStream() {
      try {
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach(t => t.stop());
          micStreamRef.current = null;
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
        });
        
        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        
        micStreamRef.current = stream;
        setHealthStatus(prev => ({ ...prev, mic: "healthy" }));
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        setHealthStatus(prev => ({ ...prev, devices: devices.filter(d => d.kind === 'audioinput').length }));
        
        startEngine(stream);

        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioContext.state === 'suspended') await audioContext.resume();
        analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkVolume = () => {
          if (!analyser || !isMounted) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          setRealtimeVolume(sum / dataArray.length); 
          animationId = requestAnimationFrame(checkVolume);
        };
        checkVolume();
        
      } catch (e: any) {
        console.error('[Arena] Mic error:', e.name, e.message);
        if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
          setHealthStatus(prev => ({ ...prev, mic: "error" }));
          setMicError("Microphone access denied. Allow and refresh.");
        } else if (e.name === 'NotFoundError') {
          setMicError("No microphone found.");
        }
      }
    }

    function stopMasterStream() {
      if (animationId) cancelAnimationFrame(animationId);
      if (audioContext && audioContext.state !== 'closed') audioContext.close();
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
      }
      stopEngine();
    }

    if (isListening) startMasterStream();
    else stopMasterStream();
    
    return () => {
      isMounted = false;
      stopMasterStream();
    };
  }, [isListening, startEngine, stopEngine]);

  // Session timer
  useEffect(() => {
    const timer = setInterval(() => setSessionTime((p) => p + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // End session and save to vault
  const handleEndSession = async () => {
  // Stop everything
  window.speechSynthesis.cancel();
  setIsListening(false);

  console.log('[Arena] Ending session...');

  // Calculate scores
  const finalParams = [
    { id: 'articulation', label: 'Articulation', score: scores.articulation.current, previous: 6 },
    { id: 'expression', label: 'Expression', score: scores.expression.current, previous: 5 },
    { id: 'verbal_crunches', label: 'Verbal Crunches', score: scores.verbal_crunches.current, previous: 7 },
  ];

  const overallScore = Math.round(
    (finalParams.reduce((s, p) => s + p.score, 0) / finalParams.length) * 10
  );

  // Build feedback
  const feedback: string[] = [];
  if (sessionArticulationIssues.length > 0) {
    feedback.push(`Work on: ${[...new Set(sessionArticulationIssues)].slice(0, 2).join(', ')}`);
  }
  if (sessionArticulationStrengths.length > 0) {
    feedback.push(`Strengths: ${[...new Set(sessionArticulationStrengths)].slice(0, 2).join(', ')}`);
  }
  if (sessionFillerWords.length > 0) {
    feedback.push(`Filler words: ${sessionFillerWords.slice(0, 3).map(f => `"${f.word}" (${f.count}x)`).join(', ')}`);
  } else {
    feedback.push('No filler words - great job!');
  }

  // Data to save
  const sessionPayload = {
    overall_score: overallScore,
    duration_seconds: sessionTime,
    parameter_scores: finalParams,
    learning_curve: [
      { turn: 1, score: Math.max(50, overallScore - 15) },
      { turn: 2, score: Math.max(50, overallScore - 5) },
      { turn: 3, score: overallScore },
    ],
    feedback,
    focus_parameters: ['articulation', 'expression', 'verbal_crunches'],
  };

  // ✅ AUTO-SAVE to history (no button needed)
  try {
    console.log('[Arena] Auto-saving session...');
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionPayload)
    });
    console.log('[Arena] Save response:', response.status);
  } catch (error) {
    console.error('[Arena] Save failed:', error);
  }

  // Set data for Debrief page
  setSessionData({
    overallScore,
    previousScore: Math.max(50, overallScore - Math.floor(Math.random() * 10)),
    durationSeconds: sessionTime,
    parameters: finalParams,
    learningCurve: sessionPayload.learning_curve,
    feedback,
    focusParameters: ['articulation', 'expression', 'verbal_crunches'],
  });

  // Navigate to debrief
  navigate("/debrief");
};
  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setIsListening(prev => !prev);
  }, [isSpeaking]);

  const showSwapList = activeParams.includes("swap_list");
  const visibleParams = activeParams.filter((p) => p !== "swap_list");
  const showVerbalCrunches = activeParams.includes("verbal_crunches");
  const showArticulation = activeParams.includes("articulation");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isLoadingAI ? "bg-yellow-400 animate-pulse" : isSpeaking ? "bg-primary animate-pulse" : isListening ? "bg-emerald-400 animate-pulse" : "bg-muted"}`} />
            <span className="text-sm font-medium">
              {isLoadingAI ? "AI Thinking…" : isSpeaking ? "AI Speaking" : isListening ? "Listening" : "Paused"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={toggleListening} className={`${isListening ? "text-emerald-500 bg-emerald-500/10" : "text-muted-foreground"}`}>
            {isListening ? <><Mic className="w-4 h-4 mr-2" />Unmuted</> : <><MicOff className="w-4 h-4 mr-2" />Muted</>}
          </Button>
          <Button variant="destructive" size="sm" onClick={handleEndSession}>
            <Square className="w-4 h-4 mr-2 fill-current" />End
          </Button>
        </div>
      </header>

      {fillerAlert && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 p-3 flex items-center justify-center gap-3 text-amber-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{fillerAlert}</span>
          <button onClick={() => setFillerAlert(null)} className="ml-2"><X className="w-4 h-4" /></button>
        </div>
      )}

      {articulationAlert && (
        <div className="bg-blue-500/10 border-b border-blue-500/20 p-3 flex items-center justify-center gap-3 text-blue-600 text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>{articulationAlert}</span>
          <button onClick={() => setArticulationAlert(null)} className="ml-2"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {visibleParams.length > 0 && (
          <aside className="hidden lg:block w-72 border-r border-border p-4 overflow-y-auto">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Live Scores</h2>
            
            {activeParams.includes('expression') && (
              <div className="mb-6">
                <ScoreBar label="Expression" score={scores.expression.current} trend={scores.expression.trend} color="bg-purple-400" />
              </div>
            )}
            
            {showArticulation && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Mic className="w-4 h-4 text-cyan-400" /> Articulation
                  </h3>
                  <span className="text-lg font-bold text-cyan-500">{scores.articulation.current}/10</span>
                </div>
                
                {sessionArticulationIssues.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-destructive mb-2">Issues:</p>
                    <div className="space-y-1">
                      {[...new Set(sessionArticulationIssues)].slice(0, 4).map((issue, i) => (
                        <div key={i} className="text-xs p-2 rounded bg-destructive/5 text-destructive">{issue}</div>
                      ))}
                    </div>
                  </div>
                )}
                
                {sessionArticulationStrengths.length > 0 && (
                  <div>
                    <p className="text-xs text-emerald-500 mb-2">Strengths:</p>
                    <div className="flex flex-wrap gap-1">
                      {[...new Set(sessionArticulationStrengths)].slice(0, 4).map((s, i) => (
                        <span key={i} className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {showVerbalCrunches && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-amber-400" /> Verbal Crunches
                  </h3>
                  <span className="text-lg font-bold text-amber-500">{sessionFillerWords.reduce((a, f) => a + f.count, 0)}</span>
                </div>
                
                <div className="mb-3 p-2 rounded-lg bg-amber-500/10">
                  <div className="flex justify-between">
                    <span className="text-xs">Score</span>
                    <span className="font-bold">{scores.verbal_crunches.current}/10</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {sessionFillerWords.length === 0 ? (
                    <p className="text-xs text-center py-4 text-muted-foreground">No filler words yet!</p>
                  ) : (
                    sessionFillerWords.map((fw, _i) => (
                      <div key={fw.word} className="flex items-center justify-between p-2 rounded bg-amber-500/5">
                        <span className="text-sm">"{fw.word}"</span>
                        <span className="font-bold text-amber-500">{fw.count}x</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </aside>
        )}

        <main className="flex-1 flex flex-col p-4 overflow-hidden">
          <div className="mb-4">
            <div className="max-w-md mx-auto">
              <div className="relative p-4 rounded-2xl bg-card border">
                <AudioVisualizer isListening={isListening} isSpeaking={isSpeaking || isLoadingAI} sharedStream={micStreamRef.current} />
              </div>
            </div>
          </div>

          {micError && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm text-center">
              {micError}
              <Button variant="destructive" size="xs" onClick={() => window.location.reload()} className="ml-3 h-7 text-xs">Refresh</Button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Transcript</h2>
            <div className="space-y-4">
              {transcript.map((entry, i) => (
                <div key={i} className={`flex ${entry.speaker === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl ${entry.speaker === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border rounded-bl-md"}`}>
                    <p className="text-sm leading-relaxed">{entry.text}</p>
                    
                    {entry.speaker === "user" && (entry.fillerWords || entry.articulationNote) && (
                      <div className="mt-2 pt-2 border-t border-primary-foreground/20 space-y-1">
                        {entry.fillerWords && entry.fillerWords.length > 0 && (
                          <p className="text-[10px] opacity-70">Filler: {entry.fillerWords.map(f => `"${f.word}" (${f.count}x)`).join(', ')}</p>
                        )}
                        {entry.articulationNote && (
                          <p className="text-[10px] opacity-70">Warning: {entry.articulationNote}</p>
                        )}
                      </div>
                    )}
                    
                    <span className={`text-xs mt-2 block ${entry.speaker === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {entry.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}
              {isLoadingAI && (
                <div className="flex justify-start">
                  <div className="bg-card border rounded-2xl p-4">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center mb-2">
            <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase ${!isListening ? "bg-destructive/10 text-destructive" : realtimeVolume > 5 ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
              {!isListening ? "Muted" : realtimeVolume > 5 ? "Listening..." : "Waiting..."}
            </div>
          </div>

          <div className="flex gap-2">
            <textarea
              value={engineTranscript + (engineInterim ? (engineTranscript ? " " : "") + engineInterim : "")}
              placeholder={isListening ? "Speak now..." : "Click Unmute..."}
              rows={2}
              className="flex-1 resize-none rounded-xl border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[50px]"
              readOnly
            />
            <button disabled className="h-12 w-12 rounded-xl bg-primary text-primary-foreground opacity-50">
              <Send className="w-5 h-5 mx-auto" />
            </button>
          </div>
        </main>

        {showSwapList && (
          <aside className="hidden lg:block w-72 border-l border-border p-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Swap List</h2>
            {swapSuggestions.length > 0 ? (
              <div className="space-y-3">
                {swapSuggestions.map((swap) => (
                  <SwapSuggestion key={swap.id} original={swap.original} suggested={swap.suggested} onAccept={() => setSwapSuggestions(p => p.filter(s => s.id !== swap.id))} onDismiss={() => setSwapSuggestions(p => p.filter(s => s.id !== swap.id))} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Vocabulary suggestions appear here.</p>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}