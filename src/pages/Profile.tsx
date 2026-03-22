import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { User, Mail, Link2, Copy, Check, LogOut, Shield, Save, Bot, Trash2, Edit3, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

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
      // No profile exists yet - pre-fill from user metadata
      setForm({
        display_name: user!.user_metadata?.full_name || user!.email?.split("@")[0] || "",
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

  // Username availability check
  const checkUsername = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    const { data } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("username", username)
      .maybeSingle();
    
    if (data && data.user_id !== user!.id) {
      setUsernameStatus("taken");
    } else {
      setUsernameStatus("available");
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (form.username) checkUsername(form.username);
    }, 500);
    return () => clearTimeout(timeout);
  }, [form.username]);

  const saveProfile = async () => {
    if (!user) return;
    if (usernameStatus === "taken") {
      toast.error("Username already taken");
      return;
    }
    setSaving(true);
    const username = form.username.toLowerCase().replace(/[^a-z0-9_]/g, "");
    const shareUrl = username ? `discoverseai.com/u/${username}` : null;
    
    // Use upsert so it works whether profile exists or not
    const { error } = await supabase.from("profiles").upsert({
      user_id: user.id,
      display_name: form.display_name || null,
      username: username || null,
      bio: form.bio || null,
      share_url: shareUrl,
    }, { onConflict: "user_id" });
    
    if (error) {
      console.error("Profile save error:", error);
      if (error.code === "23505") toast.error("Username already taken");
      else toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Profile updated!");
      await loadProfile();
    }
    setSaving(false);
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(`https://${url}`);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleAgentPublish = async (agentId: string, currentStatus: boolean) => {
    setTogglingAgent(agentId);
    const { error } = await supabase.from("ai_agents").update({ is_published: !currentStatus }).eq("id", agentId).eq("created_by", user!.id);
    if (error) toast.error("Failed to update");
    else {
      toast.success(!currentStatus ? "Agent published!" : "Agent unpublished");
      loadMyAgents();
    }
    setTogglingAgent(null);
  };

  const deleteAgent = async (agentId: string) => {
    if (!confirm("Delete this agent permanently?")) return;
    setDeletingAgent(agentId);
    const { error } = await supabase.from("ai_agents").delete().eq("id", agentId).eq("created_by", user!.id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Agent deleted");
      loadMyAgents();
    }
    setDeletingAgent(null);
  };

  if (loading) {
    return (
      <MainLayout title="Profile">
        <div className="flex items-center justify-center h-full">
          <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName = form.display_name || user?.email?.split("@")[0] || "Explorer";
  const activeAgents = myAgents.filter(a => a.is_published);
  const draftAgents = myAgents.filter(a => !a.is_published);
  const shownAgents = agentTab === "active" ? activeAgents : draftAgents;

  return (
    <MainLayout title="Profile">
      <div className="p-5 md:p-8 overflow-y-auto h-full pb-20 md:pb-8 max-w-xl mx-auto">
        {/* Avatar & header */}
        <div className="flex flex-col items-center text-center mb-6">
          {avatarUrl ? (
            <img src={avatarUrl} className="w-20 h-20 rounded-full object-cover border-2 border-border mb-3" alt="" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-3">
              <User size={32} strokeWidth={1.5} className="text-accent" />
            </div>
          )}
          <h1 className="text-[20px] font-bold text-primary-custom">{displayName}</h1>
          <p className="text-[13px] text-tertiary-custom">{user?.email}</p>
          <div className="flex gap-2 mt-2">
            {isAdmin && (
              <button onClick={() => navigate("/admin")}
                className="inline-flex items-center gap-1 text-[11px] bg-accent/10 text-accent px-2.5 py-1 rounded-full font-medium hover:bg-accent/20 transition-colors active:scale-[0.97]">
                <Shield size={10} /> Admin Panel
              </button>
            )}
            {form.username && (
              <button onClick={() => copyLink(`discoverseai.com/u/${form.username}`)}
                className="inline-flex items-center gap-1 text-[11px] bg-background-secondary text-secondary-custom px-2.5 py-1 rounded-full font-medium hover:bg-border transition-colors active:scale-[0.97]">
                <Link2 size={10} /> Share Profile
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-[20px] font-bold text-primary-custom">{stats.simulations}</p>
            <p className="text-[10px] text-tertiary-custom mt-0.5">Simulations</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-[20px] font-bold text-primary-custom">{myAgents.length}</p>
            <p className="text-[10px] text-tertiary-custom mt-0.5">My Agents</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-[20px] font-bold text-primary-custom">{activeAgents.length}</p>
            <p className="text-[10px] text-tertiary-custom mt-0.5">Published</p>
          </div>
        </div>

        {/* My Agents */}
        {myAgents.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-bold text-primary-custom">My Agents</h3>
              <div className="flex rounded-full overflow-hidden border border-border h-7">
                <button onClick={() => setAgentTab("active")}
                  className={`px-3 text-[10px] font-medium transition-colors ${agentTab === "active" ? "bg-accent text-accent-foreground" : "text-secondary-custom"}`}>
                  Live ({activeAgents.length})
                </button>
                <button onClick={() => setAgentTab("drafts")}
                  className={`px-3 text-[10px] font-medium transition-colors ${agentTab === "drafts" ? "bg-accent text-accent-foreground" : "text-secondary-custom"}`}>
                  Drafts ({draftAgents.length})
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {shownAgents.map(agent => (
                <div key={agent.id} className="bg-card border border-border rounded-xl p-3 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {agent.avatar_url ? (
                        <img src={agent.avatar_url} alt="" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Bot size={16} className="text-accent" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-semibold text-primary-custom truncate">{agent.name}</p>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${agent.is_published ? "bg-green-500/10 text-green-600" : "bg-background-secondary text-tertiary-custom"}`}>
                          {agent.is_published ? "live" : "draft"}
                        </span>
                      </div>
                      <p className="text-[10px] text-tertiary-custom truncate">{agent.personality}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-subtle">
                    <div className="flex items-center gap-2">
                      <Switch checked={agent.is_published} onCheckedChange={() => toggleAgentPublish(agent.id, agent.is_published)}
                        disabled={togglingAgent === agent.id} className="scale-75" />
                      <span className="text-[10px] text-tertiary-custom">{agent.is_published ? "Online" : "Offline"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {agent.is_published && (
                        <button onClick={() => copyLink(`discoverseai.com/agent/${agent.slug}`)}
                          className="p-1.5 hover:bg-background-secondary rounded-lg transition-colors" title="Copy share link">
                          <ExternalLink size={12} className="text-tertiary-custom" />
                        </button>
                      )}
                      <button onClick={() => navigate(`/create-agent?edit=${agent.id}`)}
                        className="p-1.5 hover:bg-background-secondary rounded-lg transition-colors" title="Edit">
                        <Edit3 size={12} className="text-tertiary-custom" />
                      </button>
                      <button onClick={() => deleteAgent(agent.id)} disabled={deletingAgent === agent.id}
                        className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors" title="Delete">
                        <Trash2 size={12} className={deletingAgent === agent.id ? "text-tertiary-custom animate-spin" : "text-destructive/60"} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {shownAgents.length === 0 && (
                <p className="text-[12px] text-tertiary-custom text-center py-4">No {agentTab === "active" ? "live" : "draft"} agents</p>
              )}
            </div>
          </div>
        )}

        {/* Edit form */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-[12px] font-medium text-primary-custom block mb-1">Display Name</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary-custom" />
              <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                className="w-full bg-card border border-border rounded-xl h-10 pl-9 pr-3 text-[13px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-accent transition-colors" placeholder="Your name" />
            </div>
          </div>
          <div>
            <label className="text-[12px] font-medium text-primary-custom block mb-1">Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary-custom text-[13px]">@</span>
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                className={`w-full bg-card border rounded-xl h-10 pl-8 pr-10 text-[13px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none transition-colors ${
                  usernameStatus === "taken" ? "border-destructive" : usernameStatus === "available" ? "border-green-500" : "border-border focus:border-accent"
                }`} placeholder="username" />
              {usernameStatus === "checking" && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
              )}
              {usernameStatus === "available" && (
                <Check size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
              )}
              {usernameStatus === "taken" && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive text-[11px] font-medium">Taken</span>
              )}
            </div>
            {usernameStatus === "taken" && (
              <p className="text-[11px] text-destructive mt-1">This username is already taken</p>
            )}
          </div>
          <div>
            <label className="text-[12px] font-medium text-primary-custom block mb-1">Bio</label>
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3}
              className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-[13px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-accent transition-colors resize-none" placeholder="A little about yourself..." />
          </div>

          {form.username && (
            <div>
              <label className="text-[12px] font-medium text-primary-custom block mb-1">Share Link</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-background-secondary border border-border rounded-xl h-10 px-3 flex items-center">
                  <Link2 size={13} className="text-tertiary-custom mr-2 shrink-0" />
                  <span className="text-[12px] text-secondary-custom truncate">discoverseai.com/u/{form.username}</span>
                </div>
                <button onClick={() => copyLink(`discoverseai.com/u/${form.username}`)}
                  className="w-10 h-10 bg-card border border-border rounded-xl flex items-center justify-center hover:bg-background-secondary transition-colors shrink-0">
                  {copied ? <Check size={14} className="text-accent" /> : <Copy size={14} className="text-tertiary-custom" />}
                </button>
              </div>
            </div>
          )}

          <button onClick={saveProfile} disabled={saving || usernameStatus === "taken"}
            className="w-full bg-accent text-accent-foreground h-10 rounded-xl text-[13px] font-medium hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            <Save size={14} />
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>

        {/* Account info */}
        <div className="border-t border-border pt-4 space-y-3">
          <div className="flex items-center gap-3">
            <Mail size={14} className="text-tertiary-custom" />
            <div>
              <p className="text-[12px] text-tertiary-custom">Email</p>
              <p className="text-[13px] text-primary-custom">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <User size={14} className="text-tertiary-custom" />
            <div>
              <p className="text-[12px] text-tertiary-custom">Member since</p>
              <p className="text-[13px] text-primary-custom">{new Date(user?.created_at || "").toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <button onClick={signOut}
          className="w-full mt-6 border border-border bg-card text-secondary-custom h-10 rounded-xl text-[13px] font-medium hover:bg-background-secondary active:scale-[0.97] transition-all flex items-center justify-center gap-2">
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </MainLayout>
  );
}
