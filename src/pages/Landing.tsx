import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import {
  ArrowRight, Sparkles, Bot, BookOpen, Zap, Brain, Globe,
  ChevronRight, Users, TrendingUp, Award, Check, X, Mail,
  Shield, FileText, MessageSquare, Menu, Star, Play, Lock, Crown, Cpu, Eye
} from "lucide-react";

/* ── Reveal hook ── */
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
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `all 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
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

/* ── Data ── */
const AGENTS = [
  { name: "Saathi", role: "Science Guide", emoji: "🔬", users: "1.2k" },
  { name: "Thumbnail Pro", role: "YouTube Designer", emoji: "🎨", users: "890" },
  { name: "Research Buddy", role: "Paper Analyst", emoji: "📚", users: "2.1k" },
  { name: "Code Sensei", role: "Dev Helper", emoji: "💻", users: "1.8k" },
  { name: "PDF Master", role: "Document AI", emoji: "📄", users: "670" },
  { name: "Slide Pro", role: "PPTX Creator", emoji: "📊", users: "540" },
];

const COMPARE = [
  { feature: "Specialized AI Agents", us: true, them: false },
  { feature: "Creator-built personalities", us: true, them: false },
  { feature: "3D interactive simulations", us: true, them: false },
  { feature: "Voice narration (Hindi/EN)", us: true, them: false },
  { feature: "Step-by-step learning", us: true, them: false },
  { feature: "Agent marketplace", us: true, them: false },
  { feature: "Generic chat responses", us: false, them: true },
  { feature: "Text-only output", us: false, them: true },
  { feature: "One-size-fits-all", us: false, them: true },
];

const STATS = [
  { label: "Active Learners", target: 2847, icon: Users },
  { label: "Simulations Run", target: 14523, icon: TrendingUp },
  { label: "AI Agents", target: 36, icon: Award },
  { label: "Countries", target: 12, icon: Globe },
];

const FEATURES = [
  { icon: Bot, title: "Creator-Built AI Agents", desc: "Not generic chatbots — real personalities with deep knowledge, built by creators who care." },
  { icon: BookOpen, title: "3D Simulations", desc: "Real 3D models with step-by-step AI narration. Understand in seconds, not hours." },
  { icon: Brain, title: "Personalized Learning", desc: "Every agent has unique personality, knowledge base & voice. Like having your own tutor." },
  { icon: Zap, title: "Point-to-Point", desc: "No fluff. No essays. Direct explanations that make you go 'ohh, that's how it works!'" },
  { icon: Lock, title: "Privacy First", desc: "Your conversations stay private. No data selling. No tracking. Your learning, your business." },
  { icon: Crown, title: "Creator Economy", desc: "Build agents, grow audience, earn recognition. The AI creator economy starts here." },
];

const TESTIMONIALS = [
  { name: "Aarav S.", role: "Student, Nepal", text: "Discoverse agents explain physics like my best friend would. Finally understanding quantum mechanics!", avatar: "A" },
  { name: "Priya M.", role: "Creator", text: "Built my own Biology agent in 10 minutes. Already has 200+ users chatting with it daily.", avatar: "P" },
  { name: "Rahul K.", role: "Teacher", text: "The 3D simulations are game-changing. My students actually want to study now.", avatar: "R" },
];

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Agents", href: "#agents" },
  { label: "Compare", href: "#compare" },
  { label: "Contact", href: "#contact" },
];

export default function Landing() {
  const navigate = useNavigate();
  const [heroVisible, setHeroVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setHeroVisible(true)); }, []);
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenu(false);
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden relative noise-bg">
      <style>{`
        @keyframes float-y { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-16px)} }
        @keyframes rotate-slow { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes grid-move { from{transform:translate(0,0)} to{transform:translate(60px,60px)} }
      `}</style>

      {/* ═══ NAV ═══ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrollY > 50 ? "bg-background/80 backdrop-blur-2xl border-b border-border" : "bg-transparent"}`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-5">
          <div className="flex items-center gap-2">
            <Logo size={22} />
            <span className="text-[14px] font-bold text-primary-custom tracking-tight">Discoverse</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(l => (
              <button key={l.label} onClick={() => scrollTo(l.href)} className="text-[12px] text-tertiary-custom hover:text-primary-custom transition-colors font-medium uppercase tracking-widest">
                {l.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/auth")} className="hidden sm:block text-[12px] text-tertiary-custom hover:text-primary-custom transition-colors font-medium">
              Sign in
            </button>
            <button
              onClick={() => navigate("/auth")}
              className="bg-primary text-primary-foreground text-[12px] font-semibold px-5 py-2 rounded-lg hover:bg-primary/90 active:scale-[0.97] transition-all"
            >
              Get Started
            </button>
            <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-1">
              <Menu size={18} className="text-primary-custom" />
            </button>
          </div>
        </div>
        {mobileMenu && (
          <div className="md:hidden glass-dark mx-3 mb-2 rounded-xl px-5 py-3 space-y-2 animate-fade-in">
            {NAV_LINKS.map(l => (
              <button key={l.label} onClick={() => scrollTo(l.href)} className="block w-full text-left text-[13px] text-secondary-custom py-2 hover:text-primary-custom">{l.label}</button>
            ))}
            <button onClick={() => { setMobileMenu(false); navigate("/auth"); }} className="block w-full text-left text-[13px] text-primary-custom font-semibold py-2">Sign in →</button>
          </div>
        )}
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="pt-32 pb-24 px-5 relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }} />

        {/* Glow spots */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/[0.03] rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/[0.02] rounded-full blur-[120px]" />

        <div className="max-w-4xl mx-auto text-center w-full relative z-10">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 border border-border rounded-full px-4 py-1.5 mb-8"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? "translateY(0)" : "translateY(12px)",
              transition: "all 600ms cubic-bezier(0.16,1,0.3,1) 100ms",
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-medium text-secondary-custom">2,847 learners online now</span>
          </div>

          <h1
            className="text-[clamp(2.5rem,8vw,5.5rem)] font-black text-primary-custom leading-[0.95] tracking-tighter mb-6"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? "translateY(0)" : "translateY(20px)",
              transition: "all 800ms cubic-bezier(0.16,1,0.3,1) 200ms",
            }}
          >
            The Future of
            <br />
            <span className="gradient-text-white">AI Learning.</span>
          </h1>

          <p
            className="text-[clamp(0.95rem,2vw,1.2rem)] text-secondary-custom leading-relaxed max-w-xl mx-auto mb-10"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? "translateY(0)" : "translateY(14px)",
              transition: "all 700ms cubic-bezier(0.16,1,0.3,1) 400ms",
            }}
          >
            Creator-built AI agents with real personalities. 3D simulations with voice narration.
            <span className="text-primary-custom font-medium"> Understand anything in seconds.</span>
          </p>

          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? "translateY(0)" : "translateY(12px)",
              transition: "all 700ms cubic-bezier(0.16,1,0.3,1) 550ms",
            }}
          >
            <button
              onClick={() => navigate("/auth")}
              className="w-full sm:w-auto bg-primary text-primary-foreground text-[14px] font-bold px-8 py-3.5 rounded-xl hover:bg-primary/90 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
            >
              Start Learning Free <ArrowRight size={16} />
            </button>
            <button
              onClick={() => scrollTo("#agents")}
              className="w-full sm:w-auto border border-border text-[13px] font-medium text-secondary-custom px-7 py-3.5 rounded-xl hover:bg-secondary hover:text-primary-custom active:scale-[0.97] transition-all"
            >
              <span className="flex items-center justify-center gap-2">
                <Play size={12} /> Watch Demo
              </span>
            </button>
          </div>

          {/* Social proof */}
          <div
            className="mt-14 flex items-center gap-4 justify-center"
            style={{
              opacity: heroVisible ? 1 : 0,
              transition: "all 700ms cubic-bezier(0.16,1,0.3,1) 750ms",
            }}
          >
            <div className="flex -space-x-2">
              {["R","A","S","M","K"].map((l, i) => (
                <div key={l} className="w-7 h-7 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold bg-secondary text-secondary-foreground">
                  {l}
                </div>
              ))}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map(i => <Star key={i} size={10} fill="currentColor" className="text-primary-custom" />)}
              </div>
              <p className="text-[10px] text-tertiary-custom mt-0.5">
                <span className="text-primary-custom font-semibold">4.9/5</span> from 2,847 learners
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SCROLLING TRUST ═══ */}
      <section className="py-5 border-y border-border overflow-hidden">
        <div className="flex items-center" style={{ animation: "marquee 25s linear infinite" }}>
          {["🔬 Science", "📐 Mathematics", "💻 Coding", "🧬 Biology", "⚛️ Physics", "🌍 Geography", "📊 Data Science", "🎨 Design", "🔬 Science", "📐 Mathematics", "💻 Coding", "🧬 Biology", "⚛️ Physics", "🌍 Geography", "📊 Data Science", "🎨 Design"].map((item, i) => (
            <span key={i} className="text-[12px] text-tertiary-custom font-medium whitespace-nowrap mx-8 uppercase tracking-widest">{item}</span>
          ))}
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section className="py-16 px-5">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 100}>
              <div className="border border-border rounded-2xl p-6 text-center hover:border-primary/20 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mx-auto mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <stat.icon size={18} strokeWidth={1.5} />
                </div>
                <p className="text-[clamp(1.6rem,4vw,2.2rem)] font-black text-primary-custom tabular-nums tracking-tight">
                  <Counter target={stat.target} />
                </p>
                <p className="text-[10px] text-tertiary-custom mt-1 font-medium uppercase tracking-widest">{stat.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══ AGENTS ═══ */}
      <section id="agents" className="py-20 px-5">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-14">
            <p className="text-[10px] font-bold text-tertiary-custom uppercase tracking-[0.2em] mb-3">Agent Marketplace</p>
            <h2 className="text-[clamp(1.8rem,5vw,2.8rem)] font-black text-primary-custom tracking-tight">
              Specialized AI, not<br />generic chatbots
            </h2>
            <p className="text-[14px] text-secondary-custom mt-4 max-w-md mx-auto">Every agent is built by a creator with real expertise — not scraped from the internet.</p>
          </Reveal>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {AGENTS.map((agent, i) => (
              <Reveal key={agent.name} delay={i * 80}>
                <div className="border border-border rounded-2xl p-5 hover:border-primary/20 transition-all duration-300 group cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                    {agent.emoji}
                  </div>
                  <h3 className="text-[14px] font-bold text-primary-custom">{agent.name}</h3>
                  <p className="text-[11px] text-tertiary-custom mt-0.5">{agent.role}</p>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <span className="text-[10px] text-tertiary-custom flex items-center gap-1">
                      <Users size={10} /> {agent.users}
                    </span>
                    <span className="text-[11px] text-primary-custom opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-0.5 font-medium">
                      Chat <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-10 text-center" delay={500}>
            <button
              onClick={() => navigate("/auth")}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-[13px] font-bold px-7 py-3 rounded-xl hover:bg-primary/90 active:scale-[0.97] transition-all"
            >
              <Sparkles size={14} /> Create Your Own Agent
            </button>
          </Reveal>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="py-20 px-5">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-14">
            <p className="text-[10px] font-bold text-tertiary-custom uppercase tracking-[0.2em] mb-3">Why Discoverse</p>
            <h2 className="text-[clamp(1.8rem,5vw,2.8rem)] font-black text-primary-custom tracking-tight">
              Built for instant<br />understanding
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 100}>
                <div className="border border-border rounded-2xl p-6 hover:border-primary/20 transition-all duration-300 group">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <f.icon size={18} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-[14px] font-bold text-primary-custom mb-2">{f.title}</h3>
                  <p className="text-[12px] text-secondary-custom leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ COMPARISON ═══ */}
      <section id="compare" className="py-20 px-5">
        <div className="max-w-3xl mx-auto">
          <Reveal className="text-center mb-12">
            <p className="text-[10px] font-bold text-tertiary-custom uppercase tracking-[0.2em] mb-3">The Difference</p>
            <h2 className="text-[clamp(1.8rem,5vw,2.8rem)] font-black text-primary-custom tracking-tight">
              Discoverse vs Generic AI
            </h2>
            <p className="text-[13px] text-secondary-custom mt-3">ChatGPT, Gemini, Claude — they're great at text. We're built for <span className="text-primary-custom font-semibold">understanding</span>.</p>
          </Reveal>

          <Reveal>
            <div className="border border-border rounded-2xl overflow-hidden">
              <div className="grid grid-cols-3 border-b border-border bg-secondary/50">
                <div className="p-4 text-[11px] font-semibold text-tertiary-custom uppercase tracking-wider">Feature</div>
                <div className="p-4 text-center">
                  <div className="inline-flex items-center gap-1.5">
                    <Logo size={14} />
                    <span className="text-[11px] font-bold text-primary-custom">Discoverse</span>
                  </div>
                </div>
                <div className="p-4 text-center text-[11px] font-semibold text-tertiary-custom">Others</div>
              </div>
              {COMPARE.map((row, i) => (
                <div key={row.feature} className={`grid grid-cols-3 ${i < COMPARE.length - 1 ? "border-b border-border" : ""} hover:bg-secondary/30 transition-colors`}>
                  <div className="p-3 md:p-4 text-[11px] md:text-[12px] text-secondary-custom flex items-center font-medium">{row.feature}</div>
                  <div className="p-3 md:p-4 flex items-center justify-center">
                    {row.us ? (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check size={12} className="text-primary-foreground" strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                        <X size={12} className="text-tertiary-custom" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 md:p-4 flex items-center justify-center">
                    {row.them ? (
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                        <Check size={12} className="text-tertiary-custom" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                        <X size={12} className="text-tertiary-custom" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section className="py-20 px-5">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-12">
            <p className="text-[10px] font-bold text-tertiary-custom uppercase tracking-[0.2em] mb-3">Loved by Learners</p>
            <h2 className="text-[clamp(1.8rem,5vw,2.8rem)] font-black text-primary-custom tracking-tight">
              What our community says
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 120}>
                <div className="border border-border rounded-2xl p-6 hover:border-primary/20 transition-colors">
                  <div className="flex items-center gap-0.5 mb-4">
                    {[1,2,3,4,5].map(s => <Star key={s} size={11} fill="currentColor" className="text-primary-custom" />)}
                  </div>
                  <p className="text-[13px] text-secondary-custom leading-relaxed mb-5">"{t.text}"</p>
                  <div className="flex items-center gap-2.5 pt-4 border-t border-border">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[11px] font-bold text-primary-custom">{t.avatar}</div>
                    <div>
                      <p className="text-[12px] font-semibold text-primary-custom">{t.name}</p>
                      <p className="text-[10px] text-tertiary-custom">{t.role}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-24 px-5 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.02] rounded-full blur-[150px]" />
        <Reveal className="max-w-2xl mx-auto text-center relative z-10">
          <h2 className="text-[clamp(2rem,7vw,3.5rem)] font-black text-primary-custom tracking-tighter leading-[0.95] mb-5">
            Ready to learn
            <br />
            <span className="gradient-text-white">differently?</span>
          </h2>
          <p className="text-[14px] text-secondary-custom mb-10 leading-relaxed max-w-md mx-auto">
            Join thousands of students using specialized AI agents to understand complex topics instantly.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate("/auth")}
              className="w-full sm:w-auto bg-primary text-primary-foreground text-[14px] font-bold px-10 py-4 rounded-xl hover:bg-primary/90 active:scale-[0.97] transition-all"
            >
              Get Started Free
            </button>
            <button
              onClick={() => navigate("/auth")}
              className="w-full sm:w-auto border border-border text-[13px] font-medium text-secondary-custom px-8 py-4 rounded-xl hover:bg-secondary hover:text-primary-custom active:scale-[0.97] transition-all"
            >
              Create an Agent
            </button>
          </div>
          <p className="text-[10px] text-tertiary-custom mt-5 uppercase tracking-widest">No credit card required · 5 free generations/week</p>
        </Reveal>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer id="contact" className="border-t border-border">
        <div className="max-w-6xl mx-auto px-5 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <Logo size={20} />
                <span className="text-[14px] font-bold text-primary-custom">Discoverse</span>
              </div>
              <p className="text-[11px] text-tertiary-custom leading-relaxed mb-3">
                AI-powered learning platform with specialized agents and 3D simulations.
              </p>
              <p className="text-[10px] text-tertiary-custom font-mono">discoverseai.com</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-tertiary-custom uppercase tracking-[0.15em] mb-4">Product</p>
              <div className="space-y-2.5">
                {["AI Agents", "3D Simulations", "Learn Mode", "Create Agent"].map(l => (
                  <button key={l} onClick={() => navigate("/auth")} className="block text-[12px] text-secondary-custom hover:text-primary-custom transition-colors">{l}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-tertiary-custom uppercase tracking-[0.15em] mb-4">Company</p>
              <div className="space-y-2.5">
                <a href="mailto:iscillatechnologies@gmail.com" className="block text-[12px] text-secondary-custom hover:text-primary-custom transition-colors">Contact Us</a>
                <a href="mailto:iscillatechnologies@gmail.com?subject=Affiliate%20Partnership" className="block text-[12px] text-secondary-custom hover:text-primary-custom transition-colors">Become Affiliate</a>
                <a href="mailto:iscillatechnologies@gmail.com?subject=Partnership" className="block text-[12px] text-secondary-custom hover:text-primary-custom transition-colors">Partner With Us</a>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-tertiary-custom uppercase tracking-[0.15em] mb-4">Legal</p>
              <div className="space-y-2.5">
                <button onClick={() => navigate("/privacy")} className="block text-[12px] text-secondary-custom hover:text-primary-custom transition-colors">Privacy Policy</button>
                <button onClick={() => navigate("/terms")} className="block text-[12px] text-secondary-custom hover:text-primary-custom transition-colors">Terms of Service</button>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-tertiary-custom">
              © {new Date().getFullYear()} Discoverse AI · Iscilla Technologies
            </p>
            <div className="flex gap-5">
              <a href="mailto:iscillatechnologies@gmail.com" className="text-[11px] text-tertiary-custom hover:text-primary-custom transition-colors flex items-center gap-1.5">
                <Mail size={12} /> Email
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
