import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/MainLayout";
import { Bot, X, Save, Sparkles, ArrowLeft, Camera, Image, FileText, Presentation, Globe, Youtube } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const TOOL_OPTIONS = [
  { key: "image_generation", label: "Image Generation", icon: Image, desc: "Generate AI images" },
  { key: "pdf_maker", label: "PDF Maker", icon: FileText, desc: "Create PDF documents" },
  { key: "pptx_maker", label: "Slides / PPTX", icon: Presentation, desc: "Create presentations" },
  { key: "web_search", label: "Web Search", icon: Globe, desc: "Search the internet" },
  { key: "youtube_summary", label: "YouTube Summary", icon: Youtube, desc: "Summarize YouTube videos" },
] as const;

const IMAGE_STYLES = [
  { value: "photorealistic", label: "Photorealistic" },
  { value: "illustration", label: "Illustration" },
  { value: "anime", label: "Anime / Manga" },
  { value: "3d_render", label: "3D Render" },
  { value: "watercolor", label: "Watercolor" },
];

const DEFAULT_FORM = {
  name: "",
  slug: "",
  personality: "warm, friendly guide who explains things like a close friend",
  system_prompt: `You are a warm, experienced learning companion. Your style:
- Talk like a close friend, not a teacher
- Use simple language mixed with relevant technical terms
- Be encouraging and supportive
- Keep answers SHORT: 2-3 sentences max
- Use analogies from daily life
- Never sound like a generic chatbot
- End with a follow-up question to keep them curious`,
  greeting_message: "Hey! 👋 I'm here to help you learn. What topic are you curious about today?",
  language_style: "mixed",
  knowledge_areas: [] as string[],
  research_papers: [] as string[],
  voice_id: "EXAVITQu4vr4xnSDxMaL",
  tools_enabled: {
    image_generation: false,
    pdf_maker: false,
    pptx_maker: false,
    web_search: false,
    youtube_summary: false,
  } as Record<string, boolean>,
  image_gen_style: "photorealistic",
};

export default function CreateAgent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const { user, isAdmin } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [canCreate, setCanCreate] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [knowledgeInput, setKnowledgeInput] = useState("");
  const [paperInput, setPaperInput] = useState("");

  // Check if user has permission to create agents
  useEffect(() => {
    if (!user) return;
    const checkPermission = async () => {
      if (isAdmin) {
        setCanCreate(true);
        setCheckingPermission(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("can_create_agent")
        .eq("user_id", user.id)
        .maybeSingle();
      setCanCreate(data?.can_create_agent || false);
      setCheckingPermission(false);
    };
    checkPermission();
  }, [user, isAdmin]);

  // Load existing agent for editing
  useEffect(() => {
    if (!editId || !user) return;
    const load = async () => {
      const { data } = await supabase
        .from("ai_agents")
        .select("*")
        .eq("id", editId)
        .eq("created_by", user.id)
        .maybeSingle();
      if (data) {
        const tools = (data.tools_enabled as Record<string, boolean>) || DEFAULT_FORM.tools_enabled;
        setForm({
          name: data.name || "",
          slug: data.slug || "",
          personality: data.personality || "",
          system_prompt: data.system_prompt || "",
          greeting_message: data.greeting_message || "",
          language_style: data.language_style || "mixed",
          knowledge_areas: data.knowledge_areas || [],
          research_papers: data.research_papers || [],
          voice_id: data.voice_id || "",
          tools_enabled: { ...DEFAULT_FORM.tools_enabled, ...tools },
          image_gen_style: data.image_gen_style || "photorealistic",
        });
        if (data.avatar_url) setAvatarPreview(data.avatar_url);
      } else {
        toast.error("Agent not found");
        navigate("/profile");
      }
      setLoadingEdit(false);
    };
    load();
  }, [editId, user]);

  const update = (key: string, val: any) => setForm((prev) => ({ ...prev, [key]: val }));

  const toggleTool = (toolKey: string) => {
    setForm((prev) => ({
      ...prev,
      tools_enabled: { ...prev.tools_enabled, [toolKey]: !prev.tools_enabled[toolKey] },
    }));
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const addKnowledge = () => {
    if (!knowledgeInput.trim()) return;
    update("knowledge_areas", [...form.knowledge_areas, knowledgeInput.trim()]);
    setKnowledgeInput("");
  };

  const addPaper = () => {
    if (!paperInput.trim()) return;
    update("research_papers", [...form.research_papers, paperInput.trim()]);
    setPaperInput("");
  };

  const handleSave = async (publish: boolean) => {
    if (!form.name.trim() || !form.system_prompt.trim() || !user) return;
    setSaving(true);

    let avatarUrl: string | null = avatarPreview?.startsWith("http") ? avatarPreview : null;
    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop() || "png";
      const path = `agents/${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, avatarFile);
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }
    }

    const slug = form.slug || form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const payload = {
      name: form.name,
      slug,
      personality: form.personality,
      system_prompt: form.system_prompt,
      greeting_message: form.greeting_message,
      language_style: form.language_style,
      knowledge_areas: form.knowledge_areas,
      research_papers: form.research_papers,
      voice_id: form.voice_id || null,
      is_published: publish,
      avatar_url: avatarUrl,
      tools_enabled: form.tools_enabled as any,
      image_gen_style: form.image_gen_style,
    };

    let error;
    if (editId) {
      // UPDATE existing agent
      ({ error } = await supabase.from("ai_agents").update(payload).eq("id", editId).eq("created_by", user.id));
    } else {
      // INSERT new agent
      ({ error } = await supabase.from("ai_agents").insert({ ...payload, created_by: user.id }));
    }

    setSaving(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
      return;
    }
    toast.success(editId ? "Agent updated!" : publish ? "Agent published!" : "Draft saved!");
    navigate("/profile");
  };

  if (checkingPermission || loadingEdit) {
    return (
      <MainLayout title="Agent">
        <div className="flex items-center justify-center h-full">
          <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!canCreate && !editId) {
    return (
      <MainLayout title="Create Agent">
        <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
          <Shield size={36} strokeWidth={1} className="text-tertiary-custom" />
          <h2 className="text-lg font-bold text-primary-custom">Agent Creation Restricted</h2>
          <p className="text-[13px] text-secondary-custom max-w-sm">
            Agent creation is currently available only for approved creators. Contact the admin to get access.
          </p>
          <button onClick={() => navigate(-1)} className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-[12px] font-bold">
            Go Back
          </button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={editId ? "Edit Agent" : "Create Agent"}>
      <div className="h-full overflow-y-auto pb-20 md:pb-8">
        <div className="max-w-xl mx-auto px-4 py-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[12px] text-secondary-custom hover:text-primary-custom mb-4">
            <ArrowLeft size={14} /> Back
          </button>

          {/* Header with avatar upload */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 overflow-hidden border-2 border-dashed border-border hover:border-accent transition-colors relative group"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <Camera size={20} className="text-accent" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                <Camera size={14} className="text-white" />
              </div>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
            <div>
              <h1 className="text-[18px] font-semibold text-primary-custom">{editId ? "Edit Agent" : "Create Your Agent"}</h1>
              <p className="text-[12px] text-tertiary-custom">Build a specialized AI with personality & tools</p>
            </div>
          </div>

          <div className="space-y-4">
            <Field label="Agent Name" value={form.name} onChange={(v) => update("name", v)} placeholder="e.g. Physics Pro, Math Buddy" />
            <Field label="Personality" value={form.personality} onChange={(v) => update("personality", v)} placeholder="warm, friendly guide who..." />

            <div>
              <label className="text-[12px] font-medium text-primary-custom block mb-1">System Prompt</label>
              <textarea
                value={form.system_prompt}
                onChange={(e) => update("system_prompt", e.target.value)}
                rows={5}
                className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-[13px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-accent transition-colors resize-none"
                placeholder="Define the agent's behavior, tone, and expertise..."
              />
            </div>

            <div>
              <label className="text-[12px] font-medium text-primary-custom block mb-1">Greeting Message</label>
              <textarea
                value={form.greeting_message}
                onChange={(e) => update("greeting_message", e.target.value)}
                rows={2}
                className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-[13px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-accent transition-colors resize-none"
              />
            </div>

            {/* Tools & Capabilities */}
            <div>
              <label className="text-[12px] font-medium text-primary-custom block mb-2">Agent Tools & Capabilities</label>
              <div className="space-y-2">
                {TOOL_OPTIONS.map(({ key, label, icon: Icon, desc }) => (
                  <div key={key} className="flex items-center justify-between bg-card border border-border rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Icon size={14} className="text-accent" />
                      </div>
                      <div>
                        <p className="text-[12px] font-medium text-primary-custom">{label}</p>
                        <p className="text-[10px] text-tertiary-custom">{desc}</p>
                      </div>
                    </div>
                    <Switch
                      checked={form.tools_enabled[key] || false}
                      onCheckedChange={() => toggleTool(key)}
                      className="scale-75"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Image gen style */}
            {form.tools_enabled.image_generation && (
              <div>
                <label className="text-[12px] font-medium text-primary-custom block mb-1">Image Style</label>
                <select
                  value={form.image_gen_style}
                  onChange={(e) => update("image_gen_style", e.target.value)}
                  className="w-full bg-card border border-border rounded-xl h-10 px-3 text-[13px] text-primary-custom focus:outline-none focus:border-accent"
                >
                  {IMAGE_STYLES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-[12px] font-medium text-primary-custom block mb-1">Language Style</label>
              <select
                value={form.language_style}
                onChange={(e) => update("language_style", e.target.value)}
                className="w-full bg-card border border-border rounded-xl h-10 px-3 text-[13px] text-primary-custom focus:outline-none focus:border-accent"
              >
                <option value="mixed">Mixed English + Romanized Nepali</option>
                <option value="romanized_nepali">Romanized Nepali</option>
                <option value="english">English</option>
                <option value="hindi">Hindi (Devanagari)</option>
              </select>
            </div>

            {/* Knowledge areas */}
            <div>
              <label className="text-[12px] font-medium text-primary-custom block mb-1">Knowledge Areas</label>
              <div className="flex gap-1.5 flex-wrap mb-2">
                {form.knowledge_areas.map((area, i) => (
                  <span key={i} className="text-[11px] bg-accent/10 text-accent px-2.5 py-1 rounded-full flex items-center gap-1">
                    {area}
                    <button onClick={() => update("knowledge_areas", form.knowledge_areas.filter((_, j) => j !== i))}><X size={10} /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={knowledgeInput} onChange={(e) => setKnowledgeInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKnowledge())}
                  placeholder="e.g. Biology, Physics..."
                  className="flex-1 bg-card border border-border rounded-xl h-9 px-3 text-[12px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-accent" />
                <button onClick={addKnowledge} className="px-3 bg-background-secondary rounded-xl text-[12px] text-secondary-custom hover:text-primary-custom">Add</button>
              </div>
            </div>

            {/* Research papers */}
            <div>
              <label className="text-[12px] font-medium text-primary-custom block mb-1">References (URLs, Papers, YouTube)</label>
              <div className="space-y-1 mb-2">
                {form.research_papers.map((paper, i) => (
                  <div key={i} className="text-[11px] bg-card border border-border px-3 py-1.5 rounded-lg flex items-center justify-between">
                    <span className="text-secondary-custom truncate">{paper}</span>
                    <button onClick={() => update("research_papers", form.research_papers.filter((_, j) => j !== i))}><X size={10} className="text-tertiary-custom" /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={paperInput} onChange={(e) => setPaperInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPaper())}
                  placeholder="Paste URL, paper title, YouTube link..."
                  className="flex-1 bg-card border border-border rounded-xl h-9 px-3 text-[12px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-accent" />
                <button onClick={addPaper} className="px-3 bg-background-secondary rounded-xl text-[12px] text-secondary-custom hover:text-primary-custom">Add</button>
              </div>
            </div>

            <div className="flex gap-2.5 pt-3 pb-4">
              <button onClick={() => handleSave(false)} disabled={!form.name || !form.system_prompt || saving}
                className="flex-1 px-5 py-2.5 border border-border rounded-xl text-[13px] font-medium text-secondary-custom hover:bg-background-secondary disabled:opacity-40 flex items-center justify-center gap-1.5 active:scale-[0.97]">
                <Save size={14} /> Save Draft
              </button>
              <button onClick={() => handleSave(true)} disabled={!form.name || !form.system_prompt || saving}
                className="flex-1 px-5 py-2.5 bg-accent text-accent-foreground rounded-xl text-[13px] font-medium hover:opacity-90 active:scale-[0.97] disabled:opacity-40 flex items-center justify-center gap-1.5">
                <Sparkles size={14} /> {saving ? "Saving..." : editId ? "Update & Publish" : "Publish"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-[12px] font-medium text-primary-custom block mb-1">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-card border border-border rounded-xl h-10 px-3 text-[13px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-accent transition-colors" />
    </div>
  );
}
