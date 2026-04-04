import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Logo } from "@/components/Logo";
import { Phone, ArrowRight, Shield, User, Sparkles, Chrome } from "lucide-react";
import { toast } from "sonner";
import { generateNickname } from "@/lib/nicknames";

type AuthStep = "phone" | "otp" | "setup_profile";

export default function Auth() {
  const [step, setStep] = useState<AuthStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [isNewUser, setIsNewUser] = useState(false);
  const [profileForm, setProfileForm] = useState({ display_name: "", username: "" });
  const [newUserId, setNewUserId] = useState<string | null>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError(result.error instanceof Error ? result.error.message : "Google sign-in failed");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      toast.success("Welcome!");
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
      setLoading(false);
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanPhone = phone.replace(/\D/g, "");
    if (!/^(97|98)\d{8}$/.test(cleanPhone)) {
      setError("Enter a valid Nepali phone number (97/98XXXXXXXX)");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("send-otp", { body: { phone: cleanPhone } });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setStep("otp");
      setCountdown(60);
      toast.success("OTP sent!");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (otp.length !== 6) { setError("Enter the 6-digit OTP"); return; }
    const cleanPhone = phone.replace(/\D/g, "");
    setLoading(true);
    setError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("verify-otp", { body: { phone: cleanPhone, otp } });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      if (data.action_link) {
        const url = new URL(data.action_link);
        const token_hash = url.searchParams.get("token") || url.hash?.split("token=")[1];
        const email = `${cleanPhone}@phone.discoverse.app`;
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: `phone_${cleanPhone}_initial` });
        if (signInError) {
          await supabase.auth.verifyOtp({ token_hash: token_hash || "", type: "magiclink" });
        }
      }
      if (data.needs_username && data.user_id) {
        setIsNewUser(true);
        setNewUserId(data.user_id);
        setProfileForm({ display_name: "", username: generateNickname() });
        setStep("setup_profile");
        setLoading(false);
        return;
      }
      toast.success("Welcome back!");
    } catch (err: any) {
      setError(err.message || "Verification failed");
    }
    setLoading(false);
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!profileForm.display_name.trim()) { setError("Please enter your name"); return; }
    if (!profileForm.username.trim() || profileForm.username.length < 3) { setError("Username must be at least 3 characters"); return; }
    setLoading(true);
    setError("");
    const username = profileForm.username.toLowerCase().replace(/[^a-z0-9_]/g, "");
    try {
      const { data: existing } = await supabase.from("profiles").select("user_id").eq("username", username).maybeSingle();
      if (existing && existing.user_id !== newUserId) { setError("Username already taken"); setLoading(false); return; }
      await supabase.from("profiles").update({ username, display_name: profileForm.display_name.trim() }).eq("user_id", newUserId!);
      toast.success("Welcome to Discoverse! 🎉");
    } catch (err: any) {
      setError(err.message || "Failed to save profile");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex relative noise-bg">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 border-r border-border items-center justify-center p-16 relative">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        <div className="max-w-md relative z-10">
          <div className="flex items-center gap-2.5 mb-10"><Logo size={32} /><span className="text-xl font-bold text-primary-custom tracking-tight">Discoverse AI</span></div>
          <h1 className="text-[2.5rem] font-black text-primary-custom leading-[1.05] tracking-tight mb-4">
            See any topic<br />in interactive 3D
          </h1>
          <p className="text-secondary-custom text-[14px] leading-relaxed">
            AI-powered instant visual understanding. Type any topic → get a 3D model with step-by-step narration.
          </p>
          <div className="mt-12 space-y-4">
            {["Instant 3D model generation", "Voice narration in Hindi, English & Nepali", "Part-by-part interactive breakdowns", "Free 3 generations every day"].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center shrink-0"><ArrowRight size={10} strokeWidth={3} className="text-primary-foreground" /></div>
                <span className="text-[12px] text-secondary-custom">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-10"><Logo size={24} /><span className="text-[15px] font-bold text-primary-custom">Discoverse AI</span></div>

          {step === "phone" && (
            <>
              <h2 className="text-xl font-bold text-primary-custom mb-1 tracking-tight">Welcome to Discoverse</h2>
              <p className="text-[12px] text-secondary-custom mb-7">Sign in to explore 3D interactive learning</p>

              {/* Google Sign In */}
              <button onClick={handleGoogleLogin} disabled={loading}
                className="w-full h-11 bg-card border border-border rounded-lg text-[12px] font-semibold text-primary-custom hover:bg-secondary transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2.5 mb-4">
                <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-tertiary-custom font-medium uppercase tracking-widest">or with phone</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <form onSubmit={handleSendOtp} className="space-y-3">
                <div className="relative">
                  <Phone size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary-custom" />
                  <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setError(""); }}
                    placeholder="98XXXXXXXX" maxLength={10}
                    className="w-full h-11 bg-secondary border border-border rounded-lg pl-9 pr-4 text-[12px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-primary/30 transition-colors" />
                </div>
                {error && <p className="text-[11px] text-destructive">{error}</p>}
                <button type="submit" disabled={loading || phone.replace(/\D/g, "").length < 10}
                  className="w-full h-11 bg-primary text-primary-foreground rounded-lg text-[12px] font-bold hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <><Shield size={14} />Send OTP</>}
                </button>
              </form>
            </>
          )}

          {step === "otp" && (
            <>
              <h2 className="text-xl font-bold text-primary-custom mb-1 tracking-tight">Enter OTP</h2>
              <p className="text-[12px] text-secondary-custom mb-7">
                Code sent to your phone
                <button onClick={() => { setStep("phone"); setOtp(""); setError(""); }} className="ml-2 text-primary-custom underline text-[11px]">Change</button>
              </p>
              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <div className="flex justify-center gap-1.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <input key={i} type="text" inputMode="numeric" maxLength={1} value={otp[i] || ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        const newOtp = otp.split(""); newOtp[i] = val;
                        setOtp(newOtp.join("").slice(0, 6)); setError("");
                        if (val && e.target.nextElementSibling) (e.target.nextElementSibling as HTMLInputElement).focus();
                      }}
                      onKeyDown={(e) => { if (e.key === "Backspace" && !otp[i] && (e.target as HTMLElement).previousElementSibling) ((e.target as HTMLElement).previousElementSibling as HTMLInputElement).focus(); }}
                      onPaste={(e) => { e.preventDefault(); setOtp(e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)); }}
                      className="w-10 h-12 bg-secondary border border-border rounded-lg text-center text-[16px] font-bold text-primary-custom focus:outline-none focus:border-primary/50 transition-colors"
                      autoFocus={i === 0} />
                  ))}
                </div>
                {error && <p className="text-[11px] text-destructive text-center">{error}</p>}
                <button type="submit" disabled={loading || otp.length !== 6}
                  className="w-full h-11 bg-primary text-primary-foreground rounded-lg text-[12px] font-bold hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : "Verify & Login"}
                </button>
                <div className="text-center">
                  {countdown > 0 ? <p className="text-[11px] text-tertiary-custom">Resend in {countdown}s</p>
                    : <button onClick={() => handleSendOtp()} className="text-[11px] text-primary-custom font-semibold hover:underline">Resend OTP</button>}
                </div>
              </form>
            </>
          )}

          {step === "setup_profile" && (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-3"><Sparkles size={24} className="text-primary-custom" /></div>
                <h2 className="text-xl font-bold text-primary-custom mb-1 tracking-tight">Welcome! Set up your profile</h2>
                <p className="text-[12px] text-secondary-custom">Choose a display name and username</p>
              </div>
              <form onSubmit={handleSaveProfile} className="space-y-3">
                <div>
                  <label className="text-[10px] font-semibold text-tertiary-custom block mb-1.5 uppercase tracking-widest">Your Name</label>
                  <div className="relative">
                    <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary-custom" />
                    <input value={profileForm.display_name} onChange={(e) => { setProfileForm({ ...profileForm, display_name: e.target.value }); setError(""); }}
                      placeholder="What should we call you?"
                      className="w-full h-11 bg-secondary border border-border rounded-lg pl-9 pr-4 text-[12px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-primary/30 transition-colors" autoFocus />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-tertiary-custom block mb-1.5 uppercase tracking-widest">Username</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary-custom text-[12px] font-mono">@</span>
                    <input value={profileForm.username} onChange={(e) => { setProfileForm({ ...profileForm, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }); setError(""); }}
                      placeholder="username"
                      className="w-full h-11 bg-secondary border border-border rounded-lg pl-8 pr-4 text-[12px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-primary/30 transition-colors" />
                  </div>
                </div>
                {error && <p className="text-[11px] text-destructive">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full h-11 bg-primary text-primary-foreground rounded-lg text-[12px] font-bold hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <><ArrowRight size={14} />Get Started</>}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
