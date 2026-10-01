import React, { useState } from "react";
import { HeartPulse } from "lucide-react";
import { supabase } from "../supabaseClient.js";

export default function Auth() {
  const [mode, setMode] = useState("signin"); // 'signin' | 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setStatus({
          type: "ok",
          message: "Account created. Check your email to confirm, then sign in.",
        });
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Something went wrong." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-root">
      <style>{`
        .auth-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F6F3ED;
          font-family: 'IBM Plex Sans', sans-serif;
          padding: 20px;
        }
        .auth-card {
          background: #FBF9F5;
          border: 1px solid #E2DCCF;
          border-radius: 12px;
          padding: 32px 28px;
          width: 100%;
          max-width: 360px;
        }
        .auth-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Fraunces', serif;
          font-size: 20px;
          font-weight: 600;
          color: #1E3D3D;
          margin-bottom: 4px;
        }
        .auth-sub { font-size: 13px; color: #5C6670; margin: 0 0 22px; }
        .auth-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
        .auth-field label { font-size: 12.5px; color: #5C6670; }
        .auth-field input {
          padding: 10px 11px;
          border-radius: 7px;
          border: 1px solid #E2DCCF;
          font-size: 14px;
          font-family: inherit;
        }
        .auth-submit {
          width: 100%;
          padding: 11px;
          border-radius: 8px;
          border: none;
          background: #1E3D3D;
          color: #F2EFE7;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          margin-top: 6px;
        }
        .auth-submit:disabled { opacity: 0.6; cursor: default; }
        .auth-toggle {
          margin-top: 16px;
          font-size: 13px;
          text-align: center;
          color: #5C6670;
        }
        .auth-toggle button {
          background: none;
          border: none;
          color: #A43E3E;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
        }
        .auth-status {
          margin-top: 14px;
          font-size: 13px;
          padding: 9px 11px;
          border-radius: 7px;
        }
        .auth-status.error { background: #F6E7E6; color: #7A2B2B; }
        .auth-status.ok { background: #E9EFE7; color: #3C4F3C; }
      `}</style>
      <div className="auth-card">
        <div className="auth-brand"><HeartPulse size={20} /> Heart Rhythm</div>
        <p className="auth-sub">
          {mode === "signin" ? "Sign in to your tracker." : "Create an account to start tracking."}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        {status.message && (
          <div className={`auth-status ${status.type}`}>{status.message}</div>
        )}
        <div className="auth-toggle">
          {mode === "signin" ? (
            <>No account yet? <button onClick={() => setMode("signup")}>Sign up</button></>
          ) : (
            <>Already have an account? <button onClick={() => setMode("signin")}>Sign in</button></>
          )}
        </div>
      </div>
    </div>
  );
}
