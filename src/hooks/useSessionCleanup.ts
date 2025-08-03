import { useEffect } from "react";

export function useSessionCleanup(sessionId: string | null) {
  useEffect(() => {
    if (!sessionId) return;

    const handleUnload = () => {
      const url = `http://localhost:8000/session/clear/${sessionId}`;
      navigator.sendBeacon(url);
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [sessionId]);
}