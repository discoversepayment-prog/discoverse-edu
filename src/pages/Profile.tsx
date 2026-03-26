import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { User, Link2, Copy, Check, LogOut, Shield, Save, Bot, Trash2, Edit3, ExternalLink, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { shareUrl } from "@/lib/constants";

export default function Profile() {
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ display_name: "", username: "", bio: "" });
  const [stats, setStats] = useState({ simulations: 0, chats: 0 });
  const [myAgents, setMyAgents] = useState<any[]>([]);
  const [deletingAgent, setDeletingAgent] = useState<string | null>(null);
  const [togglingAgent, setTogglingAgent] = useState<string | null>(null);
  const [agentTab, setAgentTab] = useState<"active" | "drafts">("active");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  useEffect(() => {
    if (!user) return;
    loadProfile();
    loadStats();
    loadMyAgents();
  }, [user]);

  const loadProfile = async () => {
    const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
    if (error) console.error("Load profile error:", error);
    if (data) {
      setProfile(data);
      setForm({ display_name: data.display_name || "", username: data.username || "", bio: data.bio || "" });
    } else {
      setForm({
        display_name: "",
        username: "",
        bio: ""
      });
    }
    setLoading(false);
  };

  const loadStats = async () => {
    const { count: libCount } = await supabase.from("user_library").select("*", { count: "exact", head: true }).eq("user_id", user!.id);
    setStats({ simulations: libCount || 0, chats: 0 });
  };

  const loadMyAgents = async () => {
    const { data } = await supabase.from("ai_agents").select("id, name, slug, is_published, knowledge_areas, personality, avatar_url").eq("created_by", user!.id);
    if (data) setMyAgents(data);
  };

  const checkUsername = async (username: string) => {
    if (!username || username.length < 3) { setUsernameStatus("idle"); return; }
    setUsernameStatus("checking");
    const { data } = await supabase.from("profiles").select("user_id").eq("username", username).maybeSingle();
    if (data && data.user_id !== user!.id) setUsernameStatus("taken");
    else setUsernameStatus("available");
  };

  useEffect(() => {
    const timeout = setTimeout(() => { if (form.username) checkUsername(form.username); }, 500);
    return () => clearTimeout(timeout);
  }, [form.username]);

  const saveProfile = async () => {
    if (!user) return;
    if (usernameStatus === "taken") { toast.error("Username already taken"); return; }
    setSaving(true);
    const username = form.username.toLowerCase().replace(/[^a-z0-9_]/g, "");
    const link = username ? shareUrl(`/u/${username}`) : null;
    const { error } = await supabase.from("profiles").upsert({
      user_id: user.id, display_name: form.display_name || null,
      username: username || null, bio: form.bio || null, share_url: link,
    }, { onConflict: "user_id" });
    if (error) {
      if (error.code === "23505") toast.error("Username already taken");
      else toast.error("Failed to save: " + error.message);
    } else { toast.success("Profile updated!"); await loadProfile(); }
    setSaving(false);
  };

  const copyLink = (path: string) => {
    navigator.clipboard.writeText(shareUrl(path));
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleAgentPublish = async (agentId: string, currentStatus: boolean) => {
    setTogglingAgent(agentId);
    const { error } = await supabase.from("ai_agents").update({ is_published: !currentStatus }).eq("id", agentId).eq("created_by", user!.id);
    if (error) toast.error("Failed to update");
    else { toast.success(!currentStatus ? "Agent published!" : "Agent unpublished"); loadMyAgents(); }
    setTogglingAgent(null);
  };

  const deleteAgent = async (agentId: string) => {
    if (!confirm("Delete this agent permanently?")) return;
    setDeletingAgent(agentId);
    const { error } = await supabase.from("ai_agents").delete().eq("id", agentId).eq("created_by", user!.id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Agent deleted"); loadMyAgents(); }
    setDeletingAgent(null);
  };

  if (loading) {
    return (
      <MainLayout title="Profile">
        <div className="flex items-center justify-center h-full">
          <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  const displayName = form.display_name || form.username || "Explorer";
  const activeAgents = myAgents.filter(a => a.is_published);
  const draftAgents = myAgents.filter(a => !a.is_published);
  const shownAgents = agentTab === "active" ? activeAgents : draftAgents;

  return (
    <MainLayout title="Profile">
      <div className="p-5 md:p-8 overflow-y-auto h-full pb-20 md:pb-8 max-w-xl mx-auto">
        {/* Avatar & header — no phone number shown */}
        <div className="flex flex-col items-center text-center mb-8 animate-slide-up">
          <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-4 ring-2 ring-border hover-lift">
            <User size={32} strokeWidth={1} className="text-tertiary-custom" />
          </div>
          <h1 className="text-xl font-bold text-primary-custom tracking-tight">{displayName}</h1>
          {form.username && (
            <p className="text-[11px] text-tertiary-custom mt-0.5 font-mono">@{form.username}</p>
          )}
          <div className="flex gap-2 mt-3">
            {isAdmin && (
              <button onClick={() => navigate("/wedisni")}
                className="inline-flex items-center gap-1.5 text-[10px] bg-secondary text-primary-custom px-3 py-1.5 rounded-lg font-semibold hover-glow border border-border press uppercase tracking-wider">
                <Shield size={10} /> Admin
              </button>
            )}
            {form.username && (
              <button onClick={() => copyLink(`/u/${form.username}`)}
                className="inline-flex items-center gap-1.5 text-[10px] bg-secondary text-secondary-custom px-3 py-1.5 rounded-lg font-medium hover-glow border border-border press uppercase tracking-wider">
                <Share2 size={10} /> Share
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-8">
          {[
            { value: stats.simulations, label: "Simulations" },
            { value: myAgents.length, label: "My Agents" },
            { value: activeAgents.length, label: "Published" },
          ].map((s, i) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center hover-glow animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
              <p className="text-xl font-black text-primary-custom tabular-nums">{s.value}</p>
              <p className="text-[9px] text-tertiary-custom mt-0.5 uppercase tracking-widest font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* My Agents */}
        {myAgents.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-bold text-primary-custom uppercase tracking-wider">My Agents</h3>
              <div className="flex rounded-lg overflow-hidden border border-border h-7 bg-secondary">
                {(["active", "drafts"] as const).map((tab) => (
                  <button key={tab} onClick={() => setAgentTab(tab)}
                    className={`px-3 text-[10px] font-semibold transition-all ${agentTab === tab ? "bg-primary text-primary-foreground" : "text-tertiary-custom hover:text-primary-custom"}`}>
                    {tab === "active" ? `Live ${activeAgents.length}` : `Draft ${draftAgents.length}`}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {shownAgents.map((agent, i) => (
                <div key={agent.id} className="bg-card border border-border rounded-xl p-3 animate-slide-up hover-glow" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                      {agent.avatar_url ? (
                        <img src={agent.avatar_url} alt="" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Bot size={16} className="text-tertiary-custom" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[12px] font-bold text-primary-custom truncate">{agent.name}</p>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${agent.is_published ? "bg-secondary text-primary-custom" : "bg-secondary text-tertiary-custom"}`}>
                          {agent.is_published ? "live" : "draft"}
                        </span>
                      </div>
                      <p className="text-[10px] text-tertiary-custom truncate mt-0.5">{agent.personality}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Switch checked={agent.is_published} onCheckedChange={() => toggleAgentPublish(agent.id, agent.is_published)}
                        disabled={togglingAgent === agent.id} className="scale-75" />
                      <span className="text-[9px] text-tertiary-custom font-medium uppercase tracking-wider">{agent.is_published ? "Online" : "Offline"}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {agent.is_published && (
                        <button onClick={() => copyLink(`/agent/${agent.slug}`)}
                          className="p-1.5 hover:bg-secondary rounded-lg transition-colors press" title="Share">
                          <ExternalLink size={12} className="text-tertiary-custom" />
                        </button>
                      )}
                      <button onClick={() => navigate(`/create-agent?edit=${agent.id}`)}
                        className="p-1.5 hover:bg-secondary rounded-lg transition-colors press" title="Edit">
                        <Edit3 size={12} className="text-tertiary-custom" />
                      </button>
                      <button onClick={() => deleteAgent(agent.id)} disabled={deletingAgent === agent.id}
                        className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors press" title="Delete">
                        <Trash2 size={12} className={deletingAgent === agent.id ? "text-tertiary-custom animate-spin" : "text-destructive/60"} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {shownAgents.length === 0 && (
                <p className="text-[10px] text-tertiary-custom text-center py-6 uppercase tracking-widest">No {agentTab === "active" ? "live" : "draft"} agents</p>
              )}
            </div>
          </div>
        )}

        {/* Edit form */}
        <div className="space-y-3 mb-8">
          <div>
            <label className="text-[10px] font-semibold text-tertiary-custom block mb-1.5 uppercase tracking-widest">Display Name</label>
            <div className="relative">
              <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary-custom" />
              <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                className="w-full bg-card border border-border rounded-lg h-10 pl-9 pr-3 text-[12px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-primary/30 transition-all" placeholder="Your name" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-tertiary-custom block mb-1.5 uppercase tracking-widest">Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary-custom text-[12px] font-mono">@</span>
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                className={`w-full bg-card border rounded-lg h-10 pl-8 pr-10 text-[12px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:ring-1 transition-all ${
                  usernameStatus === "taken" ? "border-destructive focus:ring-destructive/30" : usernameStatus === "available" ? "border-emerald-500/50 focus:ring-emerald-500/30" : "border-border focus:ring-primary/20"
                }`} placeholder="username" />
              {usernameStatus === "checking" && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-border border-t-primary rounded-full animate-spin" />
              )}
              {usernameStatus === "available" && <Check size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />}
              {usernameStatus === "taken" && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive text-[10px] font-bold">Taken</span>}
            </div>
            {usernameStatus === "taken" && <p className="text-[10px] text-destructive mt-1">This username is already taken</p>}
          </div>
          <div>
            <label className="text-[10px] font-semibold text-tertiary-custom block mb-1.5 uppercase tracking-widest">Bio</label>
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3}
              className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-[12px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-primary/30 transition-all resize-none" placeholder="A little about yourself..." />
          </div>

          {form.username && (
            <div>
              <label className="text-[10px] font-semibold text-tertiary-custom block mb-1.5 uppercase tracking-widest">Share Link</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-secondary border border-border rounded-lg h-10 px-3 flex items-center">
                  <Link2 size={12} className="text-tertiary-custom mr-2 shrink-0" />
                  <span className="text-[10px] text-tertiary-custom truncate font-mono">discoverseai.com/u/{form.username}</span>
                </div>
                <button onClick={() => copyLink(`/u/${form.username}`)}
                  className="w-10 h-10 bg-card border border-border rounded-lg flex items-center justify-center hover-glow shrink-0 press">
                  {copied ? <Check size={13} className="text-primary-custom" /> : <Copy size={13} className="text-tertiary-custom" />}
                </button>
              </div>
            </div>
          )}

          <button onClick={saveProfile} disabled={saving || usernameStatus === "taken"}
            className="w-full bg-primary text-primary-foreground h-10 rounded-lg text-[12px] font-bold hover:bg-primary/90 press transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            <Save size={13} />
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>

        {/* Account info — no phone/email shown */}
        <div className="border-t border-border pt-4 space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><User size={12} className="text-tertiary-custom" /></div>
            <div>
              <p className="text-[9px] text-tertiary-custom uppercase tracking-widest font-medium">Member since</p>
              <p className="text-[12px] text-primary-custom">{new Date(user?.created_at || "").toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <button onClick={signOut}
          className="w-full mt-5 border border-border bg-card text-secondary-custom h-10 rounded-lg text-[12px] font-semibold hover-glow press transition-all flex items-center justify-center gap-2">
          <LogOut size={13} /> Sign Out
        </button>
      </div>
    </MainLayout>
  );
}
