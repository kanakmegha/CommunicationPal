import { BrowserRouter as Router, Routes, Route } from "react-router";
import { SessionProvider } from "@/react-app/context/SessionContext";
import LobbyPage from "@/react-app/pages/Lobby";
import ArenaPage from "@/react-app/pages/Arena";
import DebriefPage from "@/react-app/pages/Debrief";
import VaultPage from "@/react-app/pages/Vault";

export default function App() {
  return (
    <SessionProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LobbyPage />} />
          <Route path="/arena" element={<ArenaPage />} />
          <Route path="/debrief" element={<DebriefPage />} />
          <Route path="/vault" element={<VaultPage />} />
        </Routes>
      </Router>
    </SessionProvider>
  );
}