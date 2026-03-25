import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Phone, ArrowRight, Shield, User } from "lucide-react";
import { toast } from "sonner";

type AuthStep = "phone" | "otp" | "username";

export default function Auth() {
  const [step, setStep] = useState<AuthStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

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
      const { data, error: fnError } = await supabase.functions.invoke("send-otp", {
        body: { phone: cleanPhone },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setStep("otp");
      setCountdown(60);
      toast.success("OTP sent to " + cleanPhone);
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (otp.length !== 6) {
      setError("Enter the 6-digit OTP");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    setLoading(true);
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("verify-otp", {
        body: { phone: cleanPhone, otp },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setUserId(data.user_id);

      // Sign in using the magic link
      if (data.action_link) {
        // Extract the token from the action link
        const url = new URL(data.action_link);
        const token_hash = url.searchParams.get("token") || url.hash?.split("token=")[1];
        
        // Try to use the OTP verification to sign in
        const email = `${cleanPhone}@phone.discoverse.app`;
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: `phone_${cleanPhone}_initial`,
        });

        // If password doesn't work, try magic link approach
        if (signInError) {
          // Use verifyOtp with token_hash
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token_hash || "",
            type: "magiclink",
          });
          if (verifyError) {
            console.error("Magic link verify failed:", verifyError);
          }
        }
      }

      if (data.needs_username) {
        setStep("username");
      } else {
        toast.success("Welcome back!");
        // Session should auto-refresh via auth state change
      }
    } catch (err: any) {
      setError(err.message || "Verification failed");
    }
    setLoading(false);
  };

  const handleSetUsername = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!username.trim() || username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    setLoading(true);
    setError("");

    try {
      // Check username uniqueness
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username.toLowerCase().trim())
        .maybeSingle();

      if (existing) {
        setError("Username already taken");
        setLoading(false);
        return;
      }

      // Update profile
      if (userId) {
        await supabase
          .from("profiles")
          .update({
            username: username.toLowerCase().trim(),
            display_name: username.trim(),
          })
          .eq("user_id", userId);
      }

      toast.success("Welcome to Discoverse!");
    } catch (err: any) {
      setError(err.message || "Failed to set username");
    }
    setLoading(false);
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
            {["Phone OTP login — no password needed", "Interactive 3D simulations", "Voice narration in Hindi & English"].map((f) => (
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

          {step === "phone" && (
            <>
              <h2 className="text-xl font-bold text-primary-custom mb-1 tracking-tight">Login with Phone</h2>
              <p className="text-[12px] text-secondary-custom mb-7">We'll send you a one-time verification code</p>

              <form onSubmit={handleSendOtp} className="space-y-3">
                <div className="relative">
                  <Phone size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary-custom" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setError(""); }}
                    placeholder="98XXXXXXXX"
                    maxLength={10}
                    className="w-full h-11 bg-secondary border border-border rounded-lg pl-9 pr-4 text-[12px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-primary/30 transition-colors"
                    autoFocus
                  />
                </div>

                {error && <p className="text-[11px] text-destructive">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || phone.replace(/\D/g, "").length < 10}
                  className="w-full h-11 bg-primary text-primary-foreground rounded-lg text-[12px] font-bold hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      <Shield size={14} />
                      Send OTP
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-[10px] text-tertiary-custom mt-6">
                Powered by Aakash SMS · Nepal only
              </p>
            </>
          )}

          {step === "otp" && (
            <>
              <h2 className="text-xl font-bold text-primary-custom mb-1 tracking-tight">Enter OTP</h2>
              <p className="text-[12px] text-secondary-custom mb-7">
                Code sent to <span className="font-semibold text-primary-custom">{phone}</span>
                <button onClick={() => { setStep("phone"); setOtp(""); setError(""); }} className="ml-2 text-primary-custom underline text-[11px]">Change</button>
              </p>

              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <div className="flex justify-center gap-1.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <input
                      key={i}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={otp[i] || ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        const newOtp = otp.split("");
                        newOtp[i] = val;
                        setOtp(newOtp.join("").slice(0, 6));
                        setError("");
                        // Auto-focus next
                        if (val && e.target.nextElementSibling) {
                          (e.target.nextElementSibling as HTMLInputElement).focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !otp[i] && (e.target as HTMLElement).previousElementSibling) {
                          ((e.target as HTMLElement).previousElementSibling as HTMLInputElement).focus();
                        }
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                        setOtp(pasted);
                      }}
                      className="w-10 h-12 bg-secondary border border-border rounded-lg text-center text-[16px] font-bold text-primary-custom focus:outline-none focus:border-primary/50 transition-colors"
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                {error && <p className="text-[11px] text-destructive text-center">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full h-11 bg-primary text-primary-foreground rounded-lg text-[12px] font-bold hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : "Verify & Login"}
                </button>

                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-[11px] text-tertiary-custom">Resend in {countdown}s</p>
                  ) : (
                    <button onClick={() => handleSendOtp()} className="text-[11px] text-primary-custom font-semibold hover:underline">
                      Resend OTP
                    </button>
                  )}
                </div>
              </form>
            </>
          )}

          {step === "username" && (
            <>
              <h2 className="text-xl font-bold text-primary-custom mb-1 tracking-tight">Choose Username</h2>
              <p className="text-[12px] text-secondary-custom mb-7">This will be your display name on Discoverse</p>

              <form onSubmit={handleSetUsername} className="space-y-3">
                <div className="relative">
                  <User size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary-custom" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "")); setError(""); }}
                    placeholder="your_username"
                    maxLength={20}
                    className="w-full h-11 bg-secondary border border-border rounded-lg pl-9 pr-4 text-[12px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-primary/30 transition-colors"
                    autoFocus
                  />
                </div>

                {error && <p className="text-[11px] text-destructive">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || username.length < 3}
                  className="w-full h-11 bg-primary text-primary-foreground rounded-lg text-[12px] font-bold hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : "Continue"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
