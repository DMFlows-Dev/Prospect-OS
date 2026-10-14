"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Magic-link sign in — no passwords to manage, and it works immediately
 * against Supabase's default email settings with zero extra config.
 * Swap for email+password or an SSO provider later if DM Flows prefers.
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const supabase = createClient();

    if (usePassword) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setStatus("error");
        setError(signInError.message);
        return;
      }
      window.location.href = "/dashboard";
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (signInError) {
      setStatus("error");
      setError(signInError.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-bg font-bold">P</div>
          <div>
            <div className="text-base font-bold leading-tight">Prospecting OS</div>
            <div className="text-xs text-text-faint">DM Flows</div>
          </div>
        </div>

        <div className="card">
          {status === "sent" ? (
            <div className="text-sm">
              <p className="font-semibold text-text">Check your email</p>
              <p className="mt-1 text-text-dim">
                We sent a sign-in link to <span className="font-medium">{email}</span>. Open it on this
                device to continue.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="field-label" htmlFor="email">
                  Work email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  className="field-input"
                  placeholder="you@dmflows.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {usePassword && (
                <div>
                  <label className="field-label" htmlFor="password">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    className="field-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
              {error && <p className="text-sm text-danger">{error}</p>}
              <button type="submit" className="btn-primary w-full justify-center" disabled={status === "sending"}>
                {status === "sending"
                  ? usePassword
                    ? "Signing in…"
                    : "Sending link…"
                  : usePassword
                    ? "Sign in"
                    : "Send sign-in link"}
              </button>
              <button
                type="button"
                className="w-full text-center text-xs text-text-faint hover:text-text-dim"
                onClick={() => {
                  setUsePassword((v) => !v);
                  setError(null);
                }}
              >
                {usePassword ? "Use a magic link instead" : "Use a password instead"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
