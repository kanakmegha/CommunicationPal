import { BrowserRouter as Router, Routes, Route } from "react-router";
import { SessionProvider } from "@/react-app/context/SessionContext";
import LobbyPage from "@/react-app/pages/Lobby";
import ArenaPage from "@/react-app/pages/Arena";
import DebriefPage from "@/react-app/pages/Debrief";
import VaultPage from "@/react-app/pages/Vault";
import RequireAuth from "@/react-app/components/auth/RequireAuth";
import { SignIn, SignUp, SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";

export default function App() {
  return (
    <SessionProvider>
      <Router>
        <>
          <div className="p-2 border-b border-border flex items-center justify-end">
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
          <Routes>
            <Route path="/" element={<LobbyPage />} />
            <Route path="/sign-in" element={<SignIn routing="path" path="/sign-in" />} />
            <Route path="/sign-up" element={<SignUp routing="path" path="/sign-up" />} />
            <Route
              path="/arena"
              element={
                <RequireAuth>
                  <ArenaPage />
                </RequireAuth>
              }
            />
            <Route
              path="/debrief"
              element={
                <RequireAuth>
                  <DebriefPage />
                </RequireAuth>
              }
            />
            <Route
              path="/vault"
              element={
                <RequireAuth>
                  <VaultPage />
                </RequireAuth>
              }
            />
          </Routes>
          <SignedOut>
            {/* Optional: could redirect or show nothing; routes handle redirect */}
          </SignedOut>
        </>
      </Router>
    </SessionProvider>
  );
}
