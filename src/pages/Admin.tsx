import { useState, useEffect } from "react";
import { MainLayout } from "@/components/MainLayout";
import {
  Database, Upload, BarChart3, Layers, Plus, X, CloudUpload, Check,
  AlertTriangle, Bot, Sparkles, Eye, EyeOff, Save, Trash2, ChevronRight,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const adminNav = [
  { icon: Database, label: "Models", path: "/admin" },
  { icon: Bot, label: "AI Agents", path: "/admin/agents" },
  { icon: Upload, label: "Upload", path: "/admin/upload" },
  { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
  { icon: Layers, label: "Cache", path: "/admin/cache" },
];

const subjectColors: Record<string, string> = {
  biology: "bg-green-50 text-green-700",
  physics: "bg-blue-50 text-blue-700",
  chemistry: "bg-purple-50 text-purple-700",
  astronomy: "bg-indigo-50 text-indigo-700",
  engineering: "bg-orange-50 text-orange-700",
  mathematics: "bg-pink-50 text-pink-700",
};

const ADMIN_PASSWORD = "nishant@123";

export default function Admin() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("admin_unlocked") === "true");
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleUnlock = () => {
    if (pwd === ADMIN_PASSWORD) {
      setUnlocked(true);
      sessionStorage.setItem("admin_unlocked", "true");
      setError(false);
    } else {
      setError(true);
    }
  };

  if (!unlocked) {
    return (
      <MainLayout title="Admin">
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <AlertTriangle size={32} strokeWidth={1.5} className="text-accent" />
          <h2 className="text-lg font-semibold text-primary-custom">Admin Access</h2>
          <p className="text-[13px] text-secondary-custom">Enter password to continue</p>
          <input
            type="password"
            value={pwd}
            onChange={e => { setPwd(e.target.value); setError(false); }}
            onKeyDown={e => e.key === "Enter" && handleUnlock()}
            placeholder="Password"
            className="w-64 h-10 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {error && <p className="text-xs text-red-500">Wrong password</p>}
          <button onClick={handleUnlock} className="px-6 h-9 rounded-lg bg-accent text-white text-sm font-medium">
            Unlock
          </button>
        </div>
      </MainLayout>
    );
  }

  const currentView = location.pathname.includes("/agents") ? "agents" : location.pathname.includes("/upload") ? "upload" : "models";

  return (
    <MainLayout title="Admin Panel">
      <div className="flex h-full">
        {/* Sidebar nav - hidden on mobile, shown as top tabs on mobile */}
        <div className="hidden md:block w-44 bg-background-secondary border-r border-border p-2.5 space-y-0.5 shrink-0">
          <p className="label-text text-tertiary-custom px-3 py-2">Admin</p>
          {adminNav.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] transition-colors duration-150 ${
                location.pathname === item.path ? "bg-accent-subtle text-accent font-medium" : "text-secondary-custom hover:bg-border-subtle"
              }`}
            >
              <item.icon size={15} strokeWidth={1.5} />
              {item.label}
            </button>
          ))}
        </div>

        {/* Mobile top tabs */}
        <div className="md:hidden absolute top-0 left-0 right-0 z-10 bg-card border-b border-border flex overflow-x-auto px-2 py-1.5 gap-1">
          {adminNav.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
                location.pathname === item.path ? "bg-accent text-accent-foreground" : "text-secondary-custom bg-background-secondary"
              }`}
            >
              <item.icon size={12} strokeWidth={1.5} />
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-12 md:pt-8 pb-20 md:pb-8">
          {currentView === "agents" ? <AgentsView /> : currentView === "upload" ? <UploadView /> : <ModelsTable />}
        </div>
      </div>
    </MainLayout>
  );
}

// ── AI AGENTS VIEW ──
function AgentsView() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);

  useEffect(() => { loadAgents(); }, []);

  const loadAgents = async () => {
    const { data } = await supabase.from("ai_agents").select("*").order("created_at", { ascending: false });
    setAgents(data || []);
    setLoading(false);
  };

  const createNew = () => {
    setEditing({
      name: "",
      slug: "",
      personality: "warm, friendly Nepali science guide who explains things like a close friend",
      system_prompt: `You are a warm, experienced Nepali science guide. Your style:
- Talk like a close friend, not a teacher
- Use Romanized Nepali naturally mixed with English science terms
- Be encouraging: "Ramro question!" "Sahi sochirachau!"
- Keep answers SHORT: 2-3 sentences max
- Point to specific things: "Yo part herau — yo mitochondria ho"
- Use analogies from daily Nepali life
- Never sound like ChatGPT or a textbook
- End with a follow-up question to keep them curious`,
      greeting_message: "Namaste! 🙏 Ma timro science companion ho. Aaja k explore garne? Heart, DNA, Solar System — jun topic man lagcha bhanau!",
      language_style: "romanized_nepali",
      knowledge_areas: [],
      research_papers: [],
      voice_id: "EXAVITQu4vr4xnSDxMaL",
      is_published: false,
    });
  };

  const saveAgent = async (agent: any) => {
    const slug = agent.slug || agent.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const payload = { ...agent, slug };
    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;

    if (agent.id) {
      await supabase.from("ai_agents").update(payload).eq("id", agent.id);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("ai_agents").insert({ ...payload, created_by: user?.id });
    }
    setEditing(null);
    loadAgents();
  };

  const deleteAgent = async (id: string) => {
    await supabase.from("ai_agents").delete().eq("id", id);
    loadAgents();
  };

  const togglePublish = async (id: string, current: boolean) => {
    await supabase.from("ai_agents").update({ is_published: !current }).eq("id", id);
    loadAgents();
  };

  if (editing) {
    return <AgentEditor agent={editing} onSave={saveAgent} onCancel={() => setEditing(null)} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[20px] font-semibold text-primary-custom">AI Agents</h1>
          <p className="text-[12px] text-tertiary-custom mt-0.5">Create personalized learning companions</p>
        </div>
        <button onClick={createNew} className="flex items-center gap-1.5 bg-accent text-accent-foreground px-4 py-2 rounded-xl text-[13px] font-medium hover:opacity-90 active:scale-[0.97]">
          <Plus size={15} strokeWidth={1.5} /> New Agent
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-border rounded-xl bg-card">
          <Bot size={36} strokeWidth={1} className="text-border mb-3" />
          <p className="text-[14px] text-secondary-custom">No AI agents yet</p>
          <p className="text-[12px] text-tertiary-custom mt-1">Create your first personalized learning companion</p>
          <button onClick={createNew} className="mt-4 flex items-center gap-1.5 bg-accent text-accent-foreground px-4 py-2 rounded-xl text-[13px] font-medium">
            <Sparkles size={14} /> Create Agent
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {agents.map((agent) => (
            <div key={agent.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <Bot size={20} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[14px] font-semibold text-primary-custom truncate">{agent.name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${agent.is_published ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
                    {agent.is_published ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="text-[12px] text-secondary-custom mt-0.5 line-clamp-2">{agent.personality}</p>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {(agent.knowledge_areas || []).slice(0, 3).map((area: string) => (
                    <span key={area} className="text-[10px] bg-background-secondary text-tertiary-custom px-2 py-0.5 rounded-full">{area}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button onClick={() => togglePublish(agent.id, agent.is_published)} className="p-1.5 hover:bg-background-secondary rounded-lg transition-colors" title={agent.is_published ? "Unpublish" : "Publish"}>
                  {agent.is_published ? <EyeOff size={14} className="text-tertiary-custom" /> : <Eye size={14} className="text-accent" />}
                </button>
                <button onClick={() => setEditing(agent)} className="p-1.5 hover:bg-background-secondary rounded-lg transition-colors">
                  <ChevronRight size={14} className="text-tertiary-custom" />
                </button>
                <button onClick={() => deleteAgent(agent.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors">
                  <Trash2 size={14} className="text-tertiary-custom hover:text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AgentEditor({ agent, onSave, onCancel }: { agent: any; onSave: (a: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState(agent);
  const [knowledgeInput, setKnowledgeInput] = useState("");
  const [paperInput, setPaperInput] = useState("");

  const update = (key: string, val: any) => setForm((prev: any) => ({ ...prev, [key]: val }));

  const addKnowledge = () => {
    if (!knowledgeInput.trim()) return;
    update("knowledge_areas", [...(form.knowledge_areas || []), knowledgeInput.trim()]);
    setKnowledgeInput("");
  };

  const addPaper = () => {
    if (!paperInput.trim()) return;
    update("research_papers", [...(form.research_papers || []), paperInput.trim()]);
    setPaperInput("");
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[20px] font-semibold text-primary-custom">{agent.id ? "Edit Agent" : "Create Agent"}</h1>
        <button onClick={onCancel} className="text-[13px] text-secondary-custom hover:text-primary-custom">Cancel</button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Agent Name" value={form.name} onChange={(v) => update("name", v)} placeholder="e.g. Saathi (साथी)" />
          <Field label="Slug" value={form.slug} onChange={(v) => update("slug", v)} placeholder="auto-generated" helper="URL-friendly name" />
        </div>

        <Field label="Personality" value={form.personality} onChange={(v) => update("personality", v)} placeholder="warm, friendly Nepali guide..." />

        <div>
          <label className="text-[12px] font-medium text-primary-custom block mb-1">System Prompt</label>
          <textarea
            value={form.system_prompt}
            onChange={(e) => update("system_prompt", e.target.value)}
            rows={8}
            className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-[13px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-accent transition-colors resize-none"
            placeholder="Define the agent's behavior, tone, and expertise..."
          />
          <p className="text-[10px] text-tertiary-custom mt-1">This is the core personality. Make it specific and warm.</p>
        </div>

        <div>
          <label className="text-[12px] font-medium text-primary-custom block mb-1">Greeting Message</label>
          <textarea
            value={form.greeting_message}
            onChange={(e) => update("greeting_message", e.target.value)}
            rows={3}
            className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-[13px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-accent transition-colors resize-none"
          />
        </div>

        <div>
          <label className="text-[12px] font-medium text-primary-custom block mb-1">Language Style</label>
          <select
            value={form.language_style}
            onChange={(e) => update("language_style", e.target.value)}
            className="w-full bg-card border border-border rounded-xl h-10 px-3 text-[13px] text-primary-custom focus:outline-none focus:border-accent"
          >
            <option value="romanized_nepali">Romanized Nepali (default)</option>
            <option value="english">English</option>
            <option value="hindi">Hindi (Devanagari)</option>
            <option value="mixed">Mixed English + Romanized Nepali</option>
          </select>
        </div>

        {/* Knowledge areas */}
        <div>
          <label className="text-[12px] font-medium text-primary-custom block mb-1">Knowledge Areas</label>
          <div className="flex gap-1.5 flex-wrap mb-2">
            {(form.knowledge_areas || []).map((area: string, i: number) => (
              <span key={i} className="text-[11px] bg-accent/10 text-accent px-2.5 py-1 rounded-full flex items-center gap-1">
                {area}
                <button onClick={() => update("knowledge_areas", form.knowledge_areas.filter((_: string, j: number) => j !== i))}>
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={knowledgeInput}
              onChange={(e) => setKnowledgeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKnowledge())}
              placeholder="e.g. Biology, Physics, NCERT Class 10..."
              className="flex-1 bg-card border border-border rounded-xl h-9 px-3 text-[12px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-accent"
            />
            <button onClick={addKnowledge} className="px-3 bg-background-secondary rounded-xl text-[12px] text-secondary-custom hover:text-primary-custom">Add</button>
          </div>
        </div>

        {/* Research papers */}
        <div>
          <label className="text-[12px] font-medium text-primary-custom block mb-1">Research Papers / References</label>
          <div className="space-y-1 mb-2">
            {(form.research_papers || []).map((paper: string, i: number) => (
              <div key={i} className="text-[11px] bg-card border border-border px-3 py-1.5 rounded-lg flex items-center justify-between">
                <span className="text-secondary-custom truncate">{paper}</span>
                <button onClick={() => update("research_papers", form.research_papers.filter((_: string, j: number) => j !== i))}>
                  <X size={10} className="text-tertiary-custom" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={paperInput}
              onChange={(e) => setPaperInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPaper())}
              placeholder="Paste paper URL or title..."
              className="flex-1 bg-card border border-border rounded-xl h-9 px-3 text-[12px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-accent"
            />
            <button onClick={addPaper} className="px-3 bg-background-secondary rounded-xl text-[12px] text-secondary-custom hover:text-primary-custom">Add</button>
          </div>
        </div>

        <Field label="ElevenLabs Voice ID" value={form.voice_id || ""} onChange={(v) => update("voice_id", v)} placeholder="EXAVITQu4vr4xnSDxMaL" helper="Sarah (warm female) is default. Find more at ElevenLabs Voice Library." />

        <div className="flex gap-2.5 pt-3">
          <button
            onClick={() => onSave({ ...form, is_published: false })}
            disabled={!form.name || !form.system_prompt}
            className="px-5 py-2.5 border border-border rounded-xl text-[13px] font-medium text-secondary-custom hover:bg-background-secondary disabled:opacity-40 flex items-center gap-1.5"
          >
            <Save size={14} /> Save Draft
          </button>
          <button
            onClick={() => onSave({ ...form, is_published: true })}
            disabled={!form.name || !form.system_prompt}
            className="px-5 py-2.5 bg-accent text-accent-foreground rounded-xl text-[13px] font-medium hover:opacity-90 active:scale-[0.97] disabled:opacity-40 flex items-center gap-1.5"
          >
            <Sparkles size={14} /> Publish
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MODELS TABLE (unchanged) ──
function ModelsTable() {
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadModels(); }, []);
  const loadModels = async () => {
    const { data } = await supabase.from("models").select("*").order("created_at", { ascending: false });
    setModels(data || []);
    setLoading(false);
  };
  const deleteModel = async (id: string) => {
    await supabase.from("models").delete().eq("id", id);
    setModels(models.filter((m) => m.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[20px] font-semibold text-primary-custom">Models</h1>
          <p className="text-[12px] text-tertiary-custom mt-0.5">{models.length} models in database</p>
        </div>
        <button onClick={() => navigate("/admin/upload")} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-[13px] font-medium hover:opacity-90 active:scale-[0.97]">
          <Plus size={15} strokeWidth={1.5} /> Upload
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" /></div>
      ) : models.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-border rounded-xl bg-card">
          <Database size={32} strokeWidth={1} className="text-border mb-3" />
          <p className="text-[14px] text-secondary-custom">No models uploaded yet</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-background-secondary">
                  {["Name", "Subject", "Tier", "Viral", "Status", ""].map((h) => (
                    <th key={h} className="label-text text-tertiary-custom text-left px-4 py-2.5 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.id} className="border-t border-border hover:bg-background-secondary/50 transition-colors h-12">
                    <td className="px-4 text-[13px] font-medium text-primary-custom">{m.name}</td>
                    <td className="px-4"><span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${subjectColors[m.subject] || "bg-muted text-secondary-custom"}`}>{m.subject}</span></td>
                    <td className="px-4 text-[12px] text-secondary-custom">T{m.tier}</td>
                    <td className="px-4 text-[12px] text-secondary-custom">{m.viral_score}</td>
                    <td className="px-4"><span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${m.status === "published" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>{m.status}</span></td>
                    <td className="px-4"><button onClick={() => deleteModel(m.id)} className="p-1 hover:bg-destructive/10 rounded transition-colors"><X size={14} strokeWidth={1.5} className="text-tertiary-custom hover:text-destructive" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── UPLOAD VIEW (unchanged) ──
function UploadView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "biology", tier: 2, viral_score: 50, keywords_en: "", keywords_hi: "", named_parts: "", source: "", license: "CC0" });

  const handleUpload = async (status: "draft" | "published") => {
    if (!file || !form.name.trim()) return;
    setUploading(true);
    const slug = form.name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const ext = file.name.split(".").pop() || "glb";
    const path = `${slug}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("models").upload(path, file, { upsert: true });
    if (uploadError) { alert("Upload failed: " + uploadError.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("models").getPublicUrl(path);
    const { error: insertError } = await supabase.from("models").insert({
      name: form.name, slug, subject: form.subject, tier: form.tier, viral_score: form.viral_score,
      file_url: publicUrl, file_format: ext, file_size_bytes: file.size,
      keywords_en: form.keywords_en.split(",").map((k) => k.trim()).filter(Boolean),
      keywords_hi: form.keywords_hi.split(",").map((k) => k.trim()).filter(Boolean),
      named_parts: form.named_parts.split(",").map((k) => k.trim()).filter(Boolean),
      source: form.source || null, license: form.license || null, status, uploaded_by: user?.id,
    });
    if (insertError) { alert("Save failed: " + insertError.message); } else { navigate("/admin"); }
    setUploading(false);
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-[20px] font-semibold text-primary-custom mb-5">Upload Model</h1>
      <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 cursor-pointer transition-colors ${file ? "border-accent bg-accent-subtle" : "border-border hover:border-accent"}`}>
        <input type="file" accept=".glb,.gltf,.fbx,.obj" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        {file ? (<><Check size={28} strokeWidth={1.5} className="text-accent mb-2" /><p className="text-[13px] font-medium text-primary-custom">{file.name}</p><p className="text-[11px] text-tertiary-custom mt-0.5">{(file.size / 1024 / 1024).toFixed(1)} MB</p></>) : (<><CloudUpload size={28} strokeWidth={1.5} className="text-tertiary-custom mb-2" /><p className="text-[13px] text-secondary-custom">Drop 3D model or click to browse</p></>)}
      </label>
      <div className="mt-6 space-y-4">
        <Field label="Model Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Human Heart" />
        <div>
          <label className="text-[12px] font-medium text-primary-custom block mb-1">Subject</label>
          <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full bg-card border border-border rounded-xl h-10 px-3 text-[13px] text-primary-custom focus:outline-none focus:border-primary">
            {["biology", "physics", "chemistry", "mathematics", "geography", "astronomy", "engineering", "vehicles"].map((s) => (<option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tier (1-3)" value={String(form.tier)} onChange={(v) => setForm({ ...form, tier: Number(v) || 2 })} type="number" />
          <Field label="Viral Score" value={String(form.viral_score)} onChange={(v) => setForm({ ...form, viral_score: Number(v) || 50 })} type="number" />
        </div>
        <Field label="English Keywords" value={form.keywords_en} onChange={(v) => setForm({ ...form, keywords_en: v })} placeholder="heart, cardiac" helper="Comma-separated" />
        <Field label="Hindi Keywords" value={form.keywords_hi} onChange={(v) => setForm({ ...form, keywords_hi: v })} placeholder="हृदय, दिल" />
        <Field label="Named Parts" value={form.named_parts} onChange={(v) => setForm({ ...form, named_parts: v })} placeholder="left_ventricle, aorta" helper="Must match mesh names" />
        <Field label="Source" value={form.source} onChange={(v) => setForm({ ...form, source: v })} placeholder="NIH, Sketchfab" />
        <div className="flex gap-2.5 pt-3">
          <button onClick={() => handleUpload("draft")} disabled={uploading || !file || !form.name} className="px-5 py-2.5 border border-border rounded-xl text-[13px] font-medium text-secondary-custom hover:bg-background-secondary disabled:opacity-40">Save Draft</button>
          <button onClick={() => handleUpload("published")} disabled={uploading || !file || !form.name} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-[13px] font-medium hover:opacity-90 active:scale-[0.97] disabled:opacity-40">{uploading ? "Uploading..." : "Publish"}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, helper, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; helper?: string; type?: string }) {
  return (
    <div>
      <label className="text-[12px] font-medium text-primary-custom block mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-card border border-border rounded-xl h-10 px-3 text-[13px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-primary transition-colors" />
      {helper && <p className="text-[11px] text-tertiary-custom mt-0.5">{helper}</p>}
    </div>
  );
}
