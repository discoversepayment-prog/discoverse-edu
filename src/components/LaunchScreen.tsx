import { useState, useEffect } from "react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

interface LaunchConfig {
  enabled: boolean;
  launch_time: string | null;
  title: string;
  subtitle: string;
}

export function LaunchScreen({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<LaunchConfig | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  const [launched, setLaunched] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "launch_screen").maybeSingle();
      if (data?.value) {
        const cfg = data.value as unknown as LaunchConfig;
        setConfig(cfg);
        if (!cfg.enabled || !cfg.launch_time) {
          setLaunched(true);
        }
      } else {
        setLaunched(true);
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!config?.enabled || !config.launch_time || launched) return;

    const tick = () => {
      const now = new Date();
      const target = new Date(config.launch_time!);
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        setLaunched(true);
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ d, h, m, s });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [config, launched]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (launched) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      <style>{`
        @keyframes countdown-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.03)} }
        @keyframes float-particle { 0%{transform:translateY(100vh) scale(0)} 50%{opacity:1} 100%{transform:translateY(-10vh) scale(1);opacity:0} }
      `}</style>

      {/* Background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/20"
            style={{
              left: `${Math.random() * 100}%`,
              animation: `float-particle ${8 + Math.random() * 12}s linear infinite`,
              animationDelay: `${Math.random() * 8}s`,
            }}
          />
        ))}
      </div>

      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-[200px]" />

      <div className="relative z-10 text-center px-6 max-w-lg">
        <div className="mb-8" style={{ animation: "countdown-pulse 3s ease-in-out infinite" }}>
          <Logo size={48} />
        </div>

        <h1 className="text-[clamp(1.8rem,6vw,3rem)] font-black text-primary-custom tracking-tighter leading-tight mb-3">
          {config?.title || "Something Amazing is Coming"}
        </h1>
        <p className="text-[14px] text-secondary-custom mb-10">
          {config?.subtitle || "Discoverse AI is launching soon"}
        </p>

        {timeLeft && (
          <div className="flex items-center justify-center gap-3 mb-10">
            {[
              { val: timeLeft.d, label: "Days" },
              { val: timeLeft.h, label: "Hours" },
              { val: timeLeft.m, label: "Min" },
              { val: timeLeft.s, label: "Sec" },
            ].map((unit) => (
              <div key={unit.label} className="bg-card border border-border rounded-xl p-4 min-w-[72px]">
                <p className="text-[28px] font-black text-primary-custom tabular-nums leading-none">{String(unit.val).padStart(2, "0")}</p>
                <p className="text-[9px] text-tertiary-custom mt-1 uppercase tracking-widest font-medium">{unit.label}</p>
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-tertiary-custom">
          Instant Visual Understanding Engine
        </p>
      </div>
    </div>
  );
}
