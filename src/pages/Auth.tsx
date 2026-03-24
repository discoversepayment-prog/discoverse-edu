import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Logo } from "@/components/Logo";
import { Mail, Lock, User, ArrowRight } from "lucide-react";

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) setError(error.message);
      else setMessage("Check your email to confirm your account.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }
    setLoading(false);
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError("");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError(result.error.message || "Failed to sign in with Google");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex relative noise-bg">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 border-r border-border items-center justify-center p-16 relative">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
        <div className="max-w-md relative z-10">
          <div className="flex items-center gap-2.5 mb-10">
            <Logo size={32} />
            <span className="text-xl font-bold text-primary-custom tracking-tight">Discoverse</span>
          </div>
          <h1 className="text-[2.5rem] font-black text-primary-custom leading-[1.05] tracking-tight mb-4">
            Explore any topic<br />in interactive 3D
          </h1>
          <p className="text-secondary-custom text-[14px] leading-relaxed">
            AI-powered 3D learning with specialized agents, step-by-step simulations, and natural voice narration.
          </p>
          <div className="mt-12 space-y-4">
            {["Creator-built specialized AI agents", "Interactive 3D simulations", "Voice narration in Hindi & English"].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center shrink-0">
                  <ArrowRight size={10} strokeWidth={3} className="text-primary-foreground" />
                </div>
                <span className="text-[12px] text-secondary-custom">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <Logo size={24} />
            <span className="text-[15px] font-bold text-primary-custom">Discoverse</span>
          </div>

          <h2 className="text-xl font-bold text-primary-custom mb-1 tracking-tight">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h2>
          <p className="text-[12px] text-secondary-custom mb-7">
            {isSignUp ? "Start exploring 3D learning" : "Sign in to continue learning"}
          </p>

          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 h-11 bg-secondary border border-border rounded-lg text-[12px] font-medium text-primary-custom hover:bg-secondary/80 transition-colors duration-150 disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] text-tertiary-custom uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3">
            {isSignUp && (
              <div className="relative">
                <User size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary-custom" />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name"
                  className="w-full h-11 bg-secondary border border-border rounded-lg pl-9 pr-4 text-[12px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-primary/30 transition-colors" />
              </div>
            )}
            <div className="relative">
              <Mail size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary-custom" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required
                className="w-full h-11 bg-secondary border border-border rounded-lg pl-9 pr-4 text-[12px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-primary/30 transition-colors" />
            </div>
            <div className="relative">
              <Lock size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary-custom" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required minLength={6}
                className="w-full h-11 bg-secondary border border-border rounded-lg pl-9 pr-4 text-[12px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-primary/30 transition-colors" />
            </div>

            {error && <p className="text-[11px] text-destructive">{error}</p>}
            {message && <p className="text-[11px] text-emerald-400">{message}</p>}

            <button type="submit" disabled={loading}
              className="w-full h-11 bg-primary text-primary-foreground rounded-lg text-[12px] font-bold hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50">
              {loading ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-[12px] text-secondary-custom mt-6">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => { setIsSignUp(!isSignUp); setError(""); setMessage(""); }} className="text-primary-custom font-semibold hover:underline">
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
