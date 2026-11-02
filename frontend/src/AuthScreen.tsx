import { useState } from "react";
import { ArrowRight, Eye, EyeOff, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "./supabase";

export function AuthScreen({ recovery = false }: { recovery?: boolean }) {
  const [mode, setMode] = useState<"signin" | "signup" | "reset" | "update">(recovery ? "update" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (mode === "update") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        await supabase.auth.signOut();
        setNotice("Password updated. Please sign in with your new password.");
        setMode("signin");
        setPassword("");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setNotice(data.session ? "Your account is ready. Welcome to VivaProof AI." : "Account created. Check your email to confirm your address, then sign in.");
        if (data.session) setMode("signin");
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        setNotice("If an account exists for this email, a password reset link has been sent.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed. Please try again.");
    } finally { setBusy(false); }
  }

  if (!supabase) return <main className="auth-shell"><section className="auth-card"><div className="auth-brand"><span className="brand-mark"><ShieldCheck size={22}/></span>VivaProof<span>.AI</span></div><h1>Almost ready.</h1><p>Add the Supabase project URL and publishable key to your frontend environment settings to enable secure sign-in.</p><code>VITE_SUPABASE_URL</code><code>VITE_SUPABASE_ANON_KEY</code></section></main>;

  return <main className="auth-shell">
    <div className="auth-glow"/>
    <section className="auth-card">
      <div className="auth-brand"><span className="brand-mark"><ShieldCheck size={22}/></span>VivaProof<span>.AI</span></div>
      <div className="auth-emblem"><Sparkles size={22}/></div>
      <div className="eyebrow">YOUR PRIVATE PROJECT INTELLIGENCE</div>
      <h1>{mode === "signup" ? "Create your account" : mode === "reset" ? "Reset your password" : mode === "update" ? "Choose a new password" : "Welcome back"}</h1>
      <p className="auth-subtitle">{mode === "signup" ? "Create a secure workspace for your project knowledge." : mode === "reset" ? "We'll email you a secure link to reset your password." : mode === "update" ? "Set a new password for your VivaProof account." : "Sign in to continue to your evidence workspace."}</p>
      <form className="auth-form" onSubmit={submit}>
        {mode !== "update" && <><label htmlFor="auth-email">Email address</label>
        <input id="auth-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/></>}
        {mode !== "reset" && <><label htmlFor="auth-password">{mode === "update" ? "New password" : "Password"}</label><div className="password-field"><input id="auth-password" type={showPassword ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={6} required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters"/><button type="button" onClick={() => setShowPassword(v => !v)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></>}
        {error && <div className="auth-error">{error}</div>}
        {notice && <div className="auth-notice">{notice}</div>}
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : mode === "update" ? "Update password" : "Sign in"} <ArrowRight size={16}/></button>
      </form>
      {mode === "signin" && <button className="auth-text-button" onClick={() => {setMode("reset");setError("");setNotice("");}}>Forgot password?</button>}
      {(mode === "signin" || mode === "signup") && <div className="auth-switch">{mode === "signup" ? "Already have an account?" : "New to VivaProof AI?"} <button onClick={() => {setMode(mode === "signup" ? "signin" : "signup");setError("");setNotice("");}}>{mode === "signup" ? "Sign in" : "Create account"}</button></div>}
      {(mode === "reset" || mode === "update") && <button className="auth-text-button" onClick={() => {setMode("signin");setError("");setNotice("");}}>Back to sign in</button>}
      <div className="auth-security"><ShieldCheck size={14}/> Private workspace · Your documents stay isolated to your account</div>
    </section>
    <div className="auth-caption">EVIDENCE, NOT GUESSES <span>✦</span> BUILT FOR PROJECT CLARITY</div>
  </main>;
}
