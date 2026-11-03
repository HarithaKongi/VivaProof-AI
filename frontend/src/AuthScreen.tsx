import { useState } from "react";
import { ArrowRight, Eye, EyeOff, ShieldCheck, Sparkles, Check, Loader2 } from "lucide-react";
import { supabase } from "./supabase";

type Mode = "signin" | "signup" | "reset" | "update";
type Props = { recovery?: boolean; initialMode?: "signin" | "signup"; onBack?: () => void };

export function AuthScreen({ recovery = false, initialMode = "signin", onBack }: Props) {
  const [mode, setMode] = useState<Mode>(recovery ? "update" : initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const strength = [password.length >= 8, /[A-Z]/.test(password) && /[a-z]/.test(password), /\\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
  const strengthLabel = ["Add a password", "Weak", "Fair", "Good", "Strong"][password ? strength : 0];

  function switchMode(next: Mode) {
    setMode(next); setError(""); setNotice(""); setPassword(""); setConfirmPassword("");
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (mode !== "update" && mode !== "reset" && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(cleanEmail)) {
        throw new Error("Enter a valid email address.");
      }
      if (mode === "signup") {
        if (!name.trim()) throw new Error("Enter your full name.");
        if (password.length < 8) throw new Error("Use at least 8 characters for your password.");
        if (password !== confirmPassword) throw new Error("Your passwords do not match.");
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail, password,
          options: { data: { full_name: name.trim(), onboarding_completed: false }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) {
          setNotice("Your account is ready. Welcome to VivaProof.");
        } else {
          setNotice("Account created. Check your inbox to confirm your email, then sign in.");
        }
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: window.location.origin });
        if (error) throw error;
        setNotice("If an account exists for this email, a password reset link has been sent.");
      } else {
        if (password.length < 8) throw new Error("Use at least 8 characters for your password.");
        if (password !== confirmPassword) throw new Error("Your passwords do not match.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setNotice("Password updated successfully. Your secure session is ready.");
        onBack?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed. Please try again.");
    } finally { setBusy(false); }
  }

  if (!supabase) return <main className="auth-page"><section className="auth-card"><h1>Authentication setup needed</h1><p>Add the Supabase URL and publishable key to the frontend environment.</p><code>VITE_SUPABASE_URL</code><code>VITE_SUPABASE_PUBLISHABLE_KEY</code></section></main>;

  return <main className="auth-page">
    <div className="auth-backdrop" />
    <div className="auth-layout">
      <aside className="auth-story">
        <a className="wordmark" href="#home" onClick={e => { e.preventDefault(); onBack?.(); }}>
          <span className="logo-symbol"><ShieldCheck size={20}/></span><span>VIVA<span className="wordmark-light">PROOF</span></span>
        </a>
        <div className="auth-story-copy">
          <span className="section-eyebrow">PROJECT INTELLIGENCE, WITH PROOF</span>
          <h2>Your work deserves answers you can trust.</h2>
          <p>Bring your project files together. Ask questions. Follow every answer back to the evidence.</p>
          <div className="auth-story-points"><span><Check/> Source-linked responses</span><span><Check/> Private, account-scoped documents</span><span><Check/> A clearer view of your project</span></div>
        </div>
        <div className="auth-story-foot">VIVA PROOF <i>·</i> EVIDENCE, NOT GUESSES</div>
      </aside>
      <section className="auth-card">
        <button className="auth-back" type="button" onClick={onBack}>← Back to home</button>
        <div className="auth-emblem"><Sparkles size={21}/></div>
        <span className="section-eyebrow">{mode === "signup" ? "START YOUR PRIVATE WORKSPACE" : mode === "reset" ? "ACCOUNT RECOVERY" : mode === "update" ? "SECURE YOUR ACCOUNT" : "WELCOME BACK"}</span>
        <h1>{mode === "signup" ? "Create your account" : mode === "reset" ? "Reset your password" : mode === "update" ? "Choose a new password" : "Sign in to VivaProof"}</h1>
        <p className="auth-subtitle">{mode === "signup" ? "A secure home for your project knowledge." : mode === "reset" ? "We'll send a secure reset link if the account exists." : mode === "update" ? "Choose a new password to protect your workspace." : "Continue to your evidence workspace."}</p>
        <form className="auth-form" onSubmit={submit} noValidate>
          {mode === "signup" && <><label htmlFor="auth-name">Full name</label><input id="auth-name" autoComplete="name" required value={name} onChange={e => { setName(e.target.value); setError(""); }} placeholder="Your name"/></>}
          {mode !== "update" && <><label htmlFor="auth-email">Email address</label><input id="auth-email" type="email" autoComplete="email" required value={email} onChange={e => { setEmail(e.target.value); setError(""); }} placeholder="you@example.com"/></>}
          {mode !== "reset" && <>
            <label htmlFor="auth-password">{mode === "update" ? "New password" : "Password"}</label>
            <div className="password-field"><input id="auth-password" type={showPassword ? "text" : "password"} autoComplete={mode === "signup" || mode === "update" ? "new-password" : "current-password"} minLength={8} required value={password} onChange={e => { setPassword(e.target.value); setError(""); }} placeholder="At least 8 characters"/><button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>
            {(mode === "signup" || mode === "update") && <div className="password-strength"><div>{[1,2,3,4].map(n => <i key={n} className={strength >= n ? "filled" : ""}/>)}</div><span>{strengthLabel}</span></div>}
            {(mode === "signup" || mode === "update") && <><label htmlFor="auth-confirm">Confirm password</label><div className="password-field"><input id="auth-confirm" type={showConfirm ? "text" : "password"} autoComplete="new-password" required value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setError(""); }} placeholder="Re-enter your password"/><button type="button" onClick={() => setShowConfirm(v => !v)} aria-label={showConfirm ? "Hide confirmation" : "Show confirmation"}>{showConfirm ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>{confirmPassword && <small className={password === confirmPassword ? "password-match" : "password-mismatch"}>{password === confirmPassword ? "Passwords match" : "Passwords do not match"}</small>}</>}
          </>}
          {error && <div className="auth-error" role="alert">{error}</div>}
          {notice && <div className="auth-notice" role="status">{notice}</div>}
          <button className="button-primary auth-submit" type="submit" disabled={busy}>{busy && <Loader2 className="spin" size={16}/ >}{busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : mode === "update" ? "Update password" : "Sign in"} {!busy && <ArrowRight size={16}/>}</button>
        </form>
        {mode === "signin" && <button className="auth-text-button" onClick={() => switchMode("reset")}>Forgot password?</button>}
        {(mode === "signin" || mode === "signup") && <div className="auth-switch">{mode === "signup" ? "Already have an account?" : "New to VivaProof?"}<button onClick={() => switchMode(mode === "signup" ? "signin" : "signup")}>{mode === "signup" ? "Sign in" : "Create account"}</button></div>}
        {(mode === "reset" || mode === "update") && <button className="auth-text-button" onClick={() => switchMode("signin")}>Back to sign in</button>}
        <div className="auth-security"><ShieldCheck size={14}/> Secure authentication powered by Supabase</div>
      </section>
    </div>
  </main>;
}
