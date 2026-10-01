import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient.js";
import Auth from "./components/Auth.jsx";
import HeartHealthyTracker from "./components/HeartHealthyTracker.jsx";

export default function App() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (checkingSession) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", color: "#5C6670" }}>
        Loading…
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return <HeartHealthyTracker user={session.user} />;
}
