import { useEffect, useRef, useState } from "react";

interface AudioVisualizerProps {
  isListening: boolean;
  isSpeaking: boolean;
  sharedStream?: MediaStream | null;
}

export function AudioVisualizer({ isListening, isSpeaking, sharedStream }: AudioVisualizerProps) {
  const [bars, setBars] = useState<number[]>(Array(24).fill(0.05));
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    // We only want to start the real mic feed when isListening is true
    // This helps debug if the browser is actually hearing the user
    if (!isListening) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current && !sharedStream) {
        // Only stop tracks if we own the stream
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      // Simple mock glow when isSpeaking (Coach)
      if (isSpeaking) {
        const animateMock = () => {
          setBars(prev => prev.map(() => 0.2 + Math.random() * 0.6));
          animationRef.current = requestAnimationFrame(animateMock);
        };
        animateMock();
      } else {
        setBars(Array(24).fill(0.05));
      }
      return;
    }

    async function initAudio() {
      try {
        let stream = sharedStream;
        if (!stream) {
          console.log("[Visualizer] Requesting internal mic stream...");
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          console.log("[Visualizer] Using shared master stream");
        }
        streamRef.current = stream;
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        
        analyser.fftSize = 64;
        source.connect(analyser);
        
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        sourceRef.current = source;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateBars = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Map frequency data to our 24 bars
          // We focus on the lower frequencies for human speech
          const newBars = [];
          for (let i = 0; i < 24; i++) {
            // Sample frequencies roughly in the human speech range
            const val = dataArray[i % bufferLength] / 255;
            newBars.push(Math.max(0.05, val * 1.5)); // Boost a bit for visibility
          }
          setBars(newBars);
          animationRef.current = requestAnimationFrame(updateBars);
        };
        
        updateBars();
      } catch (err) {
        console.error("AudioVisualizer: Failed to get microphone", err);
        // Fallback to mock data if mic fails so the UI doesn't look broken
        const animateFallback = () => {
          setBars(prev => prev.map(() => 0.1 + Math.random() * 0.2));
          animationRef.current = requestAnimationFrame(animateFallback);
        };
        animateFallback();
      }
    }

    initAudio();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(e => console.error("Error closing AudioContext", e));
      }
    };
  }, [isListening, isSpeaking]);

  return (
    <div className="flex items-end justify-center gap-1.5 h-16 w-full max-w-sm mx-auto px-4 overflow-hidden">
      {bars.map((height, i) => (
        <div
          key={i}
          className={`w-2 rounded-full transition-all duration-75 ${
            isListening 
              ? "bg-gradient-to-t from-emerald-500/40 to-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]" 
              : isSpeaking 
                ? "bg-gradient-to-t from-primary/40 to-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                : "bg-muted/40"
          }`}
          style={{ 
            height: `${Math.max(8, height * 100)}%`,
          }}
        />
      ))}
    </div>
  );
}

