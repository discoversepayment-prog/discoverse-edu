import { useState, useEffect } from "react";
import { Search, Play, Trash2, BookOpen, Crown, Zap } from "lucide-react";
import { MainLayout } from "@/components/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const SUBJECT_MAP: Record<string, string> = {
  biology: "Biology",
  physics: "Physics",
  chemistry: "Chemistry",
  astronomy: "Astronomy",
  engineering: "Engineering",
  mathematics: "Mathematics",
  science: "Science",
  anatomy: "Biology",
  botany: "Biology",
  mechanics: "Physics",
  electronics: "Engineering",
  vehicles: "Engineering",
  automotive: "Engineering",
};

function detectCategory(name: string, subject: string): string {
  const lower = `${name} ${subject}`.toLowerCase();
  for (const [keyword, category] of Object.entries(SUBJECT_MAP)) {
    if (lower.includes(keyword)) return category;
  }
  // AI-style heuristic detection
  if (/heart|brain|cell|dna|organ|body|blood|lung|eye|muscle|skeleton|bone/i.test(lower)) return "Biology";
  if (/car|engine|motor|gear|wheel|vehicle|jeep|truck|machine|robot|circuit/i.test(lower)) return "Engineering";
  if (/atom|force|energy|wave|light|magnet|gravity|electric|quantum/i.test(lower)) return "Physics";
  if (/molecule|reaction|acid|base|element|compound|chemical/i.test(lower)) return "Chemistry";
  if (/planet|star|solar|galaxy|moon|orbit|space|earth/i.test(lower)) return "Astronomy";
  if (/number|equation|geometry|algebra|calculus|math/i.test(lower)) return "Mathematics";
  return "Science";
}

const MAX_FREE_GENERATIONS = 3;

interface LibraryItem {
  id: string;
  model_id: string;
  last_step: number | null;
  created_at: string;
  models: {
    name: string;
    subject: string;
    slug: string;
    named_parts: string[] | null;
    file_url: string;
  } | null;
}

export default function Library() {
  const [activeSubject, setActiveSubject] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { setMode } = useApp();
  const navigate = useNavigate();

  // Count today's generations
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    loadLibrary();
    loadTodayCount();
  }, [user]);

  const loadLibrary = async () => {
    const { data } = await supabase
      .from("user_library")
      .select("*, models(name, subject, slug, named_parts, file_url)")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setItems((data as LibraryItem[]) || []);
    setLoading(false);
  };

  const loadTodayCount = async () => {
    // Reset at 6 AM instead of midnight
    const now = new Date();
    const resetTime = new Date();
    resetTime.setHours(6, 0, 0, 0);
    if (now.getHours() < 6) {
      resetTime.setDate(resetTime.getDate() - 1);
    }
    const { count } = await supabase
      .from("user_library")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user!.id)
      .gte("created_at", resetTime.toISOString());
    setTodayCount(count || 0);
  };

  const removeItem = async (id: string) => {
    await supabase.from("user_library").delete().eq("id", id);
    setItems(items.filter((i) => i.id !== id));
    toast.success("Removed from library");
  };

  const resumeItem = (item: LibraryItem) => {
    if (!item.models) return;
    // Navigate to learn mode and trigger the topic
    setMode("learn");
    navigate("/app", { state: { resumeTopic: item.models.name, resumeStep: item.last_step || 0 } });
  };

  // Build dynamic subject tabs from actual items
  const categorizedItems = items.map(item => ({
    ...item,
    category: item.models ? detectCategory(item.models.name, item.models.subject) : "Science"
  }));

  const uniqueCategories = ["All", ...Array.from(new Set(categorizedItems.map(i => i.category))).sort()];

  const filtered = categorizedItems.filter((item) => {
    const model = item.models;
    if (!model) return false;
    const matchesSubject = activeSubject === "All" || item.category === activeSubject;
    const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  const remaining = Math.max(0, MAX_FREE_GENERATIONS - todayCount);

  return (
    <MainLayout title="Library">
      <div className="p-4 md:p-8 overflow-y-auto h-full pb-20 md:pb-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5 animate-slide-up">
          <div>
            <h1 className="text-lg font-bold text-primary-custom tracking-tight">Library</h1>
            <p className="text-[10px] text-tertiary-custom mt-0.5 uppercase tracking-widest">Your saved simulations</p>
          </div>
          <div className="relative w-full md:w-56">
            <Search size={13} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary-custom" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-card border border-border rounded-lg h-9 pl-9 pr-3 text-[11px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-primary/30 transition-all"
            />
          </div>
        </div>

        {/* Generation limit banner */}
        <div className="mb-4 bg-card border border-border rounded-xl p-3 flex items-center justify-between animate-slide-up" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
              <Zap size={14} className={remaining > 0 ? "text-primary-custom" : "text-tertiary-custom"} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-primary-custom">
                {remaining > 0 ? `${remaining} generation${remaining !== 1 ? "s" : ""} remaining today` : "Daily limit reached"}
              </p>
              <p className="text-[9px] text-tertiary-custom">{MAX_FREE_GENERATIONS} free per day · Resets at midnight</p>
            </div>
          </div>
          {remaining === 0 && (
            <button className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-[10px] font-bold press hover:bg-primary/90 transition-all">
              <Crown size={10} /> Upgrade
            </button>
          )}
        </div>

        {/* Subject tabs - AI detected categories */}
        <div className="flex gap-1 mb-5 overflow-x-auto scrollbar-none pb-1 animate-slide-up" style={{ animationDelay: "120ms" }}>
          {uniqueCategories.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSubject(s)}
              className={`px-3 py-1.5 text-[10px] font-semibold whitespace-nowrap rounded-lg transition-all duration-200 press ${
                activeSubject === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-tertiary-custom hover:text-primary-custom"
              }`}
            >
              {s}
              {s !== "All" && (
                <span className="ml-1 opacity-60">
                  {categorizedItems.filter(i => i.category === s).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="h-[140px] shimmer" />
                <div className="p-3 space-y-2">
                  <div className="h-3 w-2/3 shimmer rounded" />
                  <div className="h-2 w-1/2 shimmer rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center animate-fade-in">
            <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center mb-3">
              <BookOpen size={24} strokeWidth={1} className="text-tertiary-custom" />
            </div>
            <p className="text-[12px] font-medium text-secondary-custom">No simulations saved yet</p>
            <p className="text-[10px] text-tertiary-custom mt-1">Explore topics in Learn mode to save them here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((item, i) => (
              <div
                key={item.id}
                className="bg-card border border-border rounded-xl hover-lift hover-glow overflow-hidden group animate-slide-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="h-[130px] bg-secondary/50 flex items-center justify-center relative overflow-hidden">
                  {/* Geometric placeholder */}
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-lg bg-border/50 rotate-45 group-hover:rotate-[55deg] transition-transform duration-500" />
                    <div className="absolute inset-2 rounded-md bg-secondary rotate-12 group-hover:rotate-[22deg] transition-transform duration-500" />
                    <div className="absolute inset-4 rounded bg-card group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <span className="absolute top-2.5 right-2.5 bg-card/90 backdrop-blur-sm text-[9px] text-tertiary-custom px-2 py-0.5 rounded-md font-bold uppercase tracking-widest border border-border">
                    {item.category}
                  </span>
                </div>
                <div className="p-3">
                  <h3 className="text-[12px] font-bold text-primary-custom group-hover:text-primary-custom/80 transition-colors truncate">{item.models?.name}</h3>
                  <p className="text-[9px] text-tertiary-custom mt-0.5 font-mono">
                    {new Date(item.created_at).toLocaleDateString()} · Step {(item.last_step || 0) + 1}
                  </p>
                  <div className="flex gap-1.5 mt-2.5">
                    <button
                      onClick={() => resumeItem(item)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-[10px] font-bold py-2 rounded-lg hover:bg-primary/90 transition-all press"
                    >
                      <Play size={11} strokeWidth={2} /> Resume
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 border border-border rounded-lg text-tertiary-custom hover:text-destructive hover:border-destructive/30 transition-colors press"
                    >
                      <Trash2 size={12} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
