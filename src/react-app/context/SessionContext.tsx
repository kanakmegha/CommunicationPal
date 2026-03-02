import { createContext, useContext, useState, ReactNode } from "react";

interface ParameterScore {
  id: string;
  label: string;
  score: number;
  previous: number;
}

interface LearningPoint {
  turn: number;
  score: number;
}

interface SessionData {
  overallScore: number;
  previousScore: number;
  durationSeconds: number;
  parameters: ParameterScore[];
  learningCurve: LearningPoint[];
  feedback: string[];
  focusParameters: string[];
}

interface SessionContextType {
  sessionData: SessionData | null;
  setSessionData: (data: SessionData) => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextType>({
  sessionData: null,
  setSessionData: () => {},
  clearSession: () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionData, setSessionData] = useState<SessionData | null>(null);

  const clearSession = () => setSessionData(null);

  return (
    <SessionContext.Provider value={{ sessionData, setSessionData, clearSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}

export type { SessionData, ParameterScore, LearningPoint };
