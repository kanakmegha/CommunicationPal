import { PropsWithChildren } from "react";
import { useAuth, RedirectToSignIn } from "@clerk/clerk-react";

export default function RequireAuth({ children }: PropsWithChildren) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;
  return <>{children}</>;
}

