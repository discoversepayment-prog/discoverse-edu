import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import {
  ArrowRight, Sparkles, BookOpen, Zap, Brain, Globe,
  ChevronRight, Users, TrendingUp, Check, X, Mail,
  Shield, Menu, Star, Play, Crown, Eye,
  Rocket, Heart, DollarSign, Send, Atom, GraduationCap, Target, Layers, ArrowUpRight, Box, Cpu,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useInView();
  return (
    <div ref={ref} className={className} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)", transition: `all 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms` }}>
      {children}
    </div>
  );
}

function Counter({ target, suffix = "+", duration = 2200 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useInView(0.3);
  useEffect(() => {
    if (!visible) return;
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [visible, target, duration]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

const COMPARE = [
  { feature: "3D interactive simulations", us: true, them: false },
  { feature: "Instant visual understanding", us: true, them: false },
  { feature: "Part-by-part breakdowns", us: true, them: false },
  { feature: "Voice narration (Hindi/EN)", us: true, them: false },
  { feature: "Step-by-step auto-play", us: true, them: false },
  { feature: "Tap-to-identify parts", us: true, them: false },
  { feature: "Generic chat responses", us: false, them: true },
  { feature: "Text-only output", us: false, them: true },
  { feature: "One-size-fits-all", us: false, them: true },
];

const STATS = [
  { label: "Active Learners", target: 2847, icon: Users },
  { label: "Simulations Run", target: 14523, icon: TrendingUp },
  { label: "3D Models", target: 120, icon: Box },
  { label: "Countries", target: 12, icon: Globe },
];

const FEATURES = [
  { icon: Eye, title: "Instant Understanding", desc: "See any concept broken down visually in seconds. No reading, no effort — just clarity." },
  { icon: BookOpen, title: "3D Simulations", desc: "Real 3D models with step-by-step AI narration. Understand in seconds, not hours." },
  { icon: Brain, title: "Part Isolation", desc: "Each step isolates the exact part — zoom, highlight, animate. Focus on what matters." },
  { icon: Zap, title: "Point-to-Point", desc: "No fluff. No essays. Direct explanations that make you go 'ohh, that's how it works!'" },
  { icon: Shield, title: "Privacy First", desc: "Your learning stays private. No data selling. No tracking." },
  { icon: Crown, title: "D2 Pro Models", desc: "Premium users get HD textures, deeper breakdowns, faster generation, and 15 models/day." },
];

const SIMULATIONS = [
  { name: "Human Heart", subject: "Biology", icon: Heart },
  { name: "DNA Structure", subject: "Biology", icon: Atom },
  { name: "Solar System", subject: "Astronomy", icon: Globe },
  { name: "Atom Model", subject: "Physics", icon: Atom },
  { name: "Cell Division", subject: "Biology", icon: Layers },
  { name: "Water Molecule", subject: "Chemistry", icon: Atom },
];

const NAV_LINKS = [
  { label: "3D Simulations", href: "#simulations" },
  { label: "Features", href: "#features" },
  { label: "Pro", href: "#pricing" },
  { label: "Invest", href: "#invest" },
  { label: "Contact", href: "#company" },
];

export default function Landing() {
  const navigate = useNavigate();
  const [heroVisible, setHeroVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [investForm, setInvestForm] = useState({ name: "", email: "", message: "" });
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setHeroVisible(true)); }, []);
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => { setMobileMenu(false); document.querySelector(id)?.scrollIntoView({ behavior: "smooth" }); };

  const submitInquiry = async (type: "invest" | "contact", form: { name: string; email: string; message: string }) => {
    if (!form.name || !form.email) { toast.error("Name and email required"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("contact_inquiries").insert({ name: form.name, email: form.email, message: form.message || null, type });
    if (error) toast.error("Failed to submit");
    else {
      toast.success(type === "invest" ? "Thank you! We'll be in touch." : "Message sent!");
      if (type === "invest") setInvestForm({ name: "", email: "", message: "" });
      else setContactForm({ name: "", email: "", message: "" });
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden relative noise-bg">
      <style>{`
        @keyframes float-y { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-16px)} }
        @keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
      `}</style>

      {/* NAV */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrollY > 50 ? "bg-background/80 backdrop-blur-2xl border-b border-border" : "bg-transparent"}`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-5">
          <div className="flex items-center gap-2">
            <Logo size={22} />
            <span className="text-[14px] font-bold text-primary-custom tracking-tight">Discoverse</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(l => (
              <button key={l.label} onClick={() => scrollTo(l.href)} className="text-[12px] text-tertiary-custom hover:text-primary-custom transition-colors font-medium uppercase tracking-widest">{l.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/auth")} className="hidden sm:block text-[12px] text-tertiary-custom hover:text-primary-custom transition-colors font-medium">Sign in</button>
            <button onClick={() => navigate("/auth")} className="bg-primary text-primary-foreground text-[12px] font-semibold px-5 py-2 rounded-lg hover:bg-primary/90 active:scale-[0.97] transition-all">Get Started</button>
            <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-1"><Menu size={18} className="text-primary-custom" /></button>
          </div>
        </div>
        {mobileMenu && (
          <div className="md:hidden glass-dark mx-3 mb-2 rounded-xl px-5 py-3 space-y-2 animate-fade-in">
            {NAV_LINKS.map(l => (<button key={l.label} onClick={() => scrollTo(l.href)} className="block w-full text-left text-[13px] text-secondary-custom py-2 hover:text-primary-custom">{l.label}</button>))}
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="pt-32 pb-24 px-5 relative overflow-hidden min-h-[90vh] flex items-center">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "80px 80px" }} />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/[0.03] rounded-full blur-[150px]" />

        <div className="max-w-4xl mx-auto text-center w-full relative z-10">
          <div className="inline-flex items-center gap-2 border border-border rounded-full px-4 py-1.5 mb-8" style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(12px)", transition: "all 600ms cubic-bezier(0.16,1,0.3,1) 100ms" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-medium text-secondary-custom">Instant Visual Understanding Engine</span>
          </div>

          <h1 className="text-[clamp(2.5rem,8vw,5.5rem)] font-black text-primary-custom leading-[0.95] tracking-tighter mb-6" style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(20px)", transition: "all 800ms cubic-bezier(0.16,1,0.3,1) 200ms" }}>
            Understand
            <br />
            <span className="gradient-text-white">Anything. Instantly.</span>
          </h1>

          <p className="text-[clamp(0.95rem,2vw,1.2rem)] text-secondary-custom leading-relaxed max-w-xl mx-auto mb-10" style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(14px)", transition: "all 700ms cubic-bezier(0.16,1,0.3,1) 400ms" }}>
            Type any topic. Get an interactive 3D model with step-by-step breakdowns.
            <span className="text-primary-custom font-medium"> See it. Touch it. Understand it in seconds.</span>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3" style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(12px)", transition: "all 700ms cubic-bezier(0.16,1,0.3,1) 550ms" }}>
            <button onClick={() => navigate("/auth")} className="w-full sm:w-auto bg-primary text-primary-foreground text-[14px] font-bold px-8 py-3.5 rounded-xl hover:bg-primary/90 active:scale-[0.97] transition-all flex items-center justify-center gap-2">
              Start Exploring Free <ArrowRight size={16} />
            </button>
            <button onClick={() => scrollTo("#simulations")} className="w-full sm:w-auto border border-border text-[13px] font-medium text-secondary-custom px-7 py-3.5 rounded-xl hover:bg-secondary hover:text-primary-custom active:scale-[0.97] transition-all">
              <span className="flex items-center justify-center gap-2"><Play size={12} /> See 3D Demos</span>
            </button>
          </div>

          <div className="mt-14 flex items-center gap-4 justify-center" style={{ opacity: heroVisible ? 1 : 0, transition: "all 700ms cubic-bezier(0.16,1,0.3,1) 750ms" }}>
            <div className="flex -space-x-2">
              {["R","A","S","M","K"].map((l) => (
                <div key={l} className="w-7 h-7 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold bg-secondary text-secondary-foreground">{l}</div>
              ))}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-0.5">{[1,2,3,4,5].map(i => <Star key={i} size={10} fill="currentColor" className="text-primary-custom" />)}</div>
              <p className="text-[10px] text-tertiary-custom mt-0.5"><span className="text-primary-custom font-semibold">4.9/5</span> from 2,847 learners</p>
            </div>
          </div>
        </div>
      </section>

      {/* SCROLLING TRUST */}
      <section className="py-5 border-y border-border overflow-hidden">
        <div className="flex items-center" style={{ animation: "marquee 25s linear infinite" }}>
          {["🔬 Science", "📐 Mathematics", "💻 Coding", "🧬 Biology", "⚛️ Physics", "🌍 Geography", "🫀 Anatomy", "🧪 Chemistry", "🔬 Science", "📐 Mathematics", "💻 Coding", "🧬 Biology", "⚛️ Physics", "🌍 Geography", "🫀 Anatomy", "🧪 Chemistry"].map((item, i) => (
            <span key={i} className="text-[12px] text-tertiary-custom font-medium whitespace-nowrap mx-8 uppercase tracking-widest">{item}</span>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="py-16 px-5">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 100}>
              <div className="border border-border rounded-2xl p-6 text-center hover:border-primary/20 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mx-auto mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <stat.icon size={18} strokeWidth={1.5} />
                </div>
                <p className="text-[clamp(1.6rem,4vw,2.2rem)] font-black text-primary-custom tabular-nums tracking-tight"><Counter target={stat.target} /></p>
                <p className="text-[10px] text-tertiary-custom mt-1 font-medium uppercase tracking-widest">{stat.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 3D SIMULATIONS */}
      <section id="simulations" className="py-20 px-5 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-14">
            <p className="text-[10px] font-bold text-tertiary-custom uppercase tracking-[0.2em] mb-3">Interactive 3D Learning</p>
            <h2 className="text-[clamp(1.8rem,5vw,2.8rem)] font-black text-primary-custom tracking-tight">See it. Touch it.<br />Understand it.</h2>
            <p className="text-[14px] text-secondary-custom mt-4 max-w-lg mx-auto">Type any topic → AI generates a 3D model → Auto-play step-by-step breakdown. Tap any part to learn what it does.</p>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {SIMULATIONS.map((sim, i) => (
              <Reveal key={sim.name} delay={i * 80}>
                <div className="border border-border rounded-2xl p-5 hover:border-primary/20 transition-all duration-300 group cursor-pointer" onClick={() => navigate("/auth")}>
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"><sim.icon size={20} strokeWidth={1.5} /></div>
                  <h3 className="text-[14px] font-bold text-primary-custom">{sim.name}</h3>
                  <p className="text-[11px] text-tertiary-custom mt-0.5">{sim.subject}</p>
                  <div className="flex items-center gap-1 mt-3 text-[10px] text-primary-custom opacity-0 group-hover:opacity-100 transition-all font-medium">Explore in 3D <ArrowUpRight size={10} /></div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 px-5">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-14">
            <p className="text-[10px] font-bold text-tertiary-custom uppercase tracking-[0.2em] mb-3">How It Works</p>
            <h2 className="text-[clamp(1.8rem,5vw,2.8rem)] font-black text-primary-custom tracking-tight">Built for instant<br />understanding</h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 100}>
                <div className="border border-border rounded-2xl p-6 hover:border-primary/20 transition-all duration-300 group">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"><f.icon size={18} strokeWidth={1.5} /></div>
                  <h3 className="text-[14px] font-bold text-primary-custom mb-2">{f.title}</h3>
                  <p className="text-[12px] text-secondary-custom leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 px-5 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-14">
            <p className="text-[10px] font-bold text-tertiary-custom uppercase tracking-[0.2em] mb-3">Simple Pricing</p>
            <h2 className="text-[clamp(1.8rem,5vw,2.8rem)] font-black text-primary-custom tracking-tight">Free to start.<br />Pro to master.</h2>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <Reveal>
              <div className="border border-border rounded-2xl p-6">
                <h3 className="text-[16px] font-bold text-primary-custom mb-1">Free</h3>
                <p className="text-[28px] font-black text-primary-custom">NPR 0</p>
                <p className="text-[11px] text-tertiary-custom mb-4">Forever free</p>
                <div className="space-y-2 mb-6">
                  {["3 generations per day", "D1 Standard models", "5-step breakdowns", "Hindi, English & Nepali narration"].map(f => (
                    <div key={f} className="flex items-center gap-2"><Check size={12} className="text-primary-custom" /><span className="text-[12px] text-secondary-custom">{f}</span></div>
                  ))}
                </div>
                <button onClick={() => navigate("/auth")} className="w-full border border-border py-2.5 rounded-lg text-[12px] font-bold text-secondary-custom hover:bg-secondary transition-all press">Get Started</button>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div className="border-2 border-primary rounded-2xl p-6 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-0.5 rounded-full text-[10px] font-bold">LAUNCH OFFER</div>
                <h3 className="text-[16px] font-bold text-primary-custom mb-1 flex items-center gap-2"><Crown size={16} className="text-yellow-500" /> Pro</h3>
                <div className="flex items-baseline gap-2">
                  <p className="text-[28px] font-black text-primary-custom">NPR 99</p>
                  <p className="text-[14px] text-tertiary-custom line-through">299</p>
                </div>
                <p className="text-[11px] text-tertiary-custom mb-4">per month · resets daily</p>
                <div className="space-y-2 mb-6">
                  {["15 generations per day", "D2 Enhanced AI models", "HD textures & photorealistic detail", "8-step deep breakdowns", "Priority speed", "Early access features"].map(f => (
                    <div key={f} className="flex items-center gap-2"><Zap size={12} className="text-yellow-500" /><span className="text-[12px] text-secondary-custom">{f}</span></div>
                  ))}
                </div>
                <button onClick={() => navigate("/auth")} className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-[12px] font-bold hover:bg-primary/90 transition-all press">Upgrade to Pro</button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="py-20 px-5 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <Reveal className="text-center mb-12">
            <p className="text-[10px] font-bold text-tertiary-custom uppercase tracking-[0.2em] mb-3">The Difference</p>
            <h2 className="text-[clamp(1.8rem,5vw,2.8rem)] font-black text-primary-custom tracking-tight">Discoverse vs Generic AI</h2>
          </Reveal>
          <Reveal>
            <div className="border border-border rounded-2xl overflow-hidden">
              <div className="grid grid-cols-3 border-b border-border bg-secondary/50">
                <div className="p-4 text-[11px] font-semibold text-tertiary-custom uppercase tracking-wider">Feature</div>
                <div className="p-4 text-center"><div className="inline-flex items-center gap-1.5"><Logo size={14} /><span className="text-[11px] font-bold text-primary-custom">Discoverse</span></div></div>
                <div className="p-4 text-center text-[11px] font-semibold text-tertiary-custom">Others</div>
              </div>
              {COMPARE.map((row, i) => (
                <div key={row.feature} className={`grid grid-cols-3 ${i < COMPARE.length - 1 ? "border-b border-border" : ""} hover:bg-secondary/30 transition-colors`}>
                  <div className="p-3 md:p-4 text-[11px] md:text-[12px] text-secondary-custom flex items-center font-medium">{row.feature}</div>
                  <div className="p-3 md:p-4 flex items-center justify-center">
                    {row.us ? <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"><Check size={12} className="text-primary-foreground" strokeWidth={3} /></div>
                      : <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center"><X size={12} className="text-tertiary-custom" /></div>}
                  </div>
                  <div className="p-3 md:p-4 flex items-center justify-center">
                    {row.them ? <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center"><Check size={12} className="text-tertiary-custom" /></div>
                      : <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center"><X size={12} className="text-tertiary-custom" /></div>}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* INVEST */}
      <section id="invest" className="py-20 px-5 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-14">
            <p className="text-[10px] font-bold text-tertiary-custom uppercase tracking-[0.2em] mb-3">Invest in the Future</p>
            <h2 className="text-[clamp(1.8rem,5vw,2.8rem)] font-black text-primary-custom tracking-tight">Join the Discoverse<br />journey</h2>
            <p className="text-[14px] text-secondary-custom mt-4 max-w-lg mx-auto">Building the future of visual AI education. Interested in investing or partnering?</p>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-6">
            <Reveal>
              <div className="border border-border rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2"><DollarSign size={18} className="text-primary-custom" /><h3 className="text-[16px] font-bold text-primary-custom">Investor Interest</h3></div>
                <input value={investForm.name} onChange={e => setInvestForm({...investForm, name: e.target.value})} placeholder="Your name" className="w-full bg-secondary border border-border rounded-lg h-10 px-3 text-[12px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-primary/30" />
                <input value={investForm.email} onChange={e => setInvestForm({...investForm, email: e.target.value})} placeholder="Email address" className="w-full bg-secondary border border-border rounded-lg h-10 px-3 text-[12px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-primary/30" />
                <textarea value={investForm.message} onChange={e => setInvestForm({...investForm, message: e.target.value})} placeholder="Tell us about your interest..." rows={3} className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-[12px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-primary/30 resize-none" />
                <button onClick={() => submitInquiry("invest", investForm)} disabled={submitting} className="w-full bg-primary text-primary-foreground h-10 rounded-lg text-[12px] font-bold hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"><Rocket size={14} /> Submit Interest</button>
              </div>
            </Reveal>
            <Reveal delay={150}>
              <div className="space-y-4">
                {[
                  { icon: Target, title: "Our Mission", desc: "Making quality education accessible to every student in South Asia through AI and 3D technology." },
                  { icon: TrendingUp, title: "Traction", desc: "2,800+ active learners, 14,500+ simulations run, growing 40% month-over-month." },
                  { icon: GraduationCap, title: "Market", desc: "500M+ students in South Asia. $100B+ EdTech market. We're just getting started." },
                ].map((item) => (
                  <div key={item.title} className="border border-border rounded-2xl p-5 hover:border-primary/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0"><item.icon size={18} className="text-primary-custom" /></div>
                      <div><h4 className="text-[13px] font-bold text-primary-custom">{item.title}</h4><p className="text-[11px] text-secondary-custom mt-0.5">{item.desc}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* COMPANY */}
      <section id="company" className="py-20 px-5 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-14">
            <p className="text-[10px] font-bold text-tertiary-custom uppercase tracking-[0.2em] mb-3">Company</p>
            <h2 className="text-[clamp(1.8rem,5vw,2.8rem)] font-black text-primary-custom tracking-tight">Built by Iscilla Technologies</h2>
            <p className="text-[14px] text-secondary-custom mt-4 max-w-lg mx-auto">A Nepal-based AI startup on a mission to democratize education through cutting-edge technology.</p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-3 mb-12">
            {[
              { icon: Globe, title: "Nepal-First", desc: "Built for South Asian students. Nepali language support, local context." },
              { icon: Shield, title: "Privacy-Focused", desc: "No data selling, no tracking. Your learning journey is yours alone." },
              { icon: Cpu, title: "AI-Native", desc: "Every feature is powered by AI. From 3D generation to visual breakdowns." },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 100}>
                <div className="border border-border rounded-2xl p-6 hover:border-primary/20 transition-colors text-center">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-4"><item.icon size={20} className="text-primary-custom" /></div>
                  <h3 className="text-[14px] font-bold text-primary-custom mb-2">{item.title}</h3>
                  <p className="text-[12px] text-secondary-custom leading-relaxed">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div className="max-w-lg mx-auto border border-border rounded-2xl p-6">
              <h3 className="text-[16px] font-bold text-primary-custom mb-4 flex items-center gap-2"><Mail size={18} /> Contact Us</h3>
              <div className="space-y-3">
                <input value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} placeholder="Your name" className="w-full bg-secondary border border-border rounded-lg h-10 px-3 text-[12px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-primary/30" />
                <input value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} placeholder="Email address" className="w-full bg-secondary border border-border rounded-lg h-10 px-3 text-[12px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-primary/30" />
                <textarea value={contactForm.message} onChange={e => setContactForm({...contactForm, message: e.target.value})} placeholder="Your message..." rows={4} className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-[12px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-primary/30 resize-none" />
                <button onClick={() => submitInquiry("contact", contactForm)} disabled={submitting} className="w-full bg-primary text-primary-foreground h-10 rounded-lg text-[12px] font-bold hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"><Send size={14} /> Send Message</button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-5 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.02] rounded-full blur-[150px]" />
        <Reveal className="max-w-2xl mx-auto text-center relative z-10">
          <h2 className="text-[clamp(2rem,7vw,3.5rem)] font-black text-primary-custom tracking-tighter leading-[0.95] mb-5">
            Ready to understand<br /><span className="gradient-text-white">everything?</span>
          </h2>
          <p className="text-[14px] text-secondary-custom mb-10 leading-relaxed max-w-md mx-auto">
            Type any topic. Get an interactive 3D model. Understand it in seconds. No reading required.
          </p>
          <button onClick={() => navigate("/auth")} className="bg-primary text-primary-foreground text-[14px] font-bold px-10 py-4 rounded-xl hover:bg-primary/90 active:scale-[0.97] transition-all">Start Exploring Free</button>
          <p className="text-[10px] text-tertiary-custom mt-5 uppercase tracking-widest">No credit card · 3 free generations every day · Resets at midnight</p>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-5 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-3"><Logo size={20} /><span className="text-[14px] font-bold text-primary-custom">Discoverse AI</span></div>
              <p className="text-[11px] text-tertiary-custom leading-relaxed mb-4">Instant Visual Understanding Engine. Type any topic, see it in 3D, understand it in seconds.</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-tertiary-custom uppercase tracking-widest mb-3">Product</p>
              <div className="space-y-2">
                <button onClick={() => scrollTo("#simulations")} className="block text-[12px] text-secondary-custom hover:text-primary-custom transition-colors">3D Simulations</button>
                <button onClick={() => scrollTo("#features")} className="block text-[12px] text-secondary-custom hover:text-primary-custom transition-colors">Features</button>
                <button onClick={() => scrollTo("#pricing")} className="block text-[12px] text-secondary-custom hover:text-primary-custom transition-colors">Pricing</button>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-tertiary-custom uppercase tracking-widest mb-3">Legal</p>
              <div className="space-y-2">
                <button onClick={() => navigate("/privacy")} className="block text-[12px] text-secondary-custom hover:text-primary-custom transition-colors">Privacy Policy</button>
                <button onClick={() => navigate("/terms")} className="block text-[12px] text-secondary-custom hover:text-primary-custom transition-colors">Terms of Service</button>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-tertiary-custom">© 2025 Iscilla Technologies Pvt. Ltd. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
