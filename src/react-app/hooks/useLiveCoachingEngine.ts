// useLiveCoachingEngine.ts
import { useState, useRef, useCallback, useEffect } from 'react';

interface CoachingFeedback {
  transcript?: string;  // Changed: now sends transcript back
  aiResponse?: string;
  articulationScore?: number;
  expressionScore?: number;
}

interface UseLiveCoachingEngineReturn {
  isRecording: boolean;
  isLoading: boolean;
  transcript: string;
  interimTranscript: string;
  setTranscript: (text: string) => void;
  startEngine: (stream: MediaStream) => void;
  stopEngine: () => void;
}

// Speech Recognition Types
interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
  prototype: SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function useLiveCoachingEngine(
  onTranscript: (feedback: CoachingFeedback) => void
): UseLiveCoachingEngineReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const shouldRestartRef = useRef(false);
  const isStartingRef = useRef(false);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const startEngine = useCallback((stream: MediaStream) => {
    if (isStartingRef.current) {
      console.log('[Engine] Already starting, skipping...');
      return;
    }
    
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      console.error('[Engine] Speech Recognition not supported');
      return;
    }

    // Stop existing recognition
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }

    streamRef.current = stream;
    isStartingRef.current = true;
    shouldRestartRef.current = true;

    console.log('[Engine] Creating SpeechRecognition...');
    
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log('[Engine] ✅ Speech recognition STARTED');
      setIsRecording(true);
      isStartingRef.current = false;
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      console.log('[Engine] Result - Final:', finalTranscript, '| Interim:', interim);

      if (finalTranscript) {
        const fullTranscript = transcript + ' ' + finalTranscript;
        setTranscript(fullTranscript.trim());
        
        // ✅ Send transcript back to Arena
        console.log('[Engine] 📤 Sending transcript to Arena:', finalTranscript);
        onTranscriptRef.current({ transcript: finalTranscript.trim() });
      }
      
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[Engine] Error:', event.error, event.message);
      isStartingRef.current = false;
      
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      
      if (event.error === 'not-allowed') {
        shouldRestartRef.current = false;
        setIsRecording(false);
        return;
      }
    };

    recognition.onend = () => {
      console.log('[Engine] Ended, shouldRestart:', shouldRestartRef.current);
      isStartingRef.current = false;
      
      if (shouldRestartRef.current && streamRef.current) {
        const tracks = streamRef.current.getAudioTracks();
        const hasActiveTrack = tracks.some(t => t.enabled && t.readyState === 'live');
        
        if (hasActiveTrack) {
          setTimeout(() => {
            if (shouldRestartRef.current && recognitionRef.current) {
              try { recognitionRef.current.start(); } catch (e) {}
            }
          }, 100);
        } else {
          setIsRecording(false);
        }
      } else {
        setIsRecording(false);
      }
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
      console.log('[Engine] ✅ recognition.start() called');
    } catch (e: any) {
      console.error('[Engine] Failed to start:', e.message);
      isStartingRef.current = false;
      setIsRecording(false);
    }
  }, [transcript]);

  const stopEngine = useCallback(() => {
    console.log('[Engine] 🛑 Stopping...');
    shouldRestartRef.current = false;
    isStartingRef.current = false;
    
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    
    streamRef.current = null;
    setIsRecording(false);
    setTranscript('');
    setInterimTranscript('');
  }, []);

  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  return {
    isRecording,
    isLoading,
    transcript,
    interimTranscript,
    setTranscript,
    startEngine,
    stopEngine
  };
}