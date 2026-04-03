import { useState, useEffect } from "react";
import { MainLayout } from "@/components/MainLayout";
import {
  Database, Upload, BarChart3, Plus, X, CloudUpload, Check,
  AlertTriangle, Sparkles, Eye, EyeOff, Save, Trash2, ChevronRight,
  Users, Shield, Search, ToggleLeft, ToggleRight, Mail, Crown, Clock,
  Image, QrCode, Settings,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const adminNav = [
  { icon: Database, label: "Models", path: "/wedisni" },
  { icon: Users, label: "Users", path: "/wedisni/users" },
  { icon: Crown, label: "Pro Users", path: "/wedisni/pro" },
  { icon: Upload, label: "Upload", path: "/wedisni/upload" },
  { icon: QrCode, label: "Payments", path: "/wedisni/payments" },
  { icon: Clock, label: "Launch", path: "/wedisni/launch" },
  { icon: Mail, label: "Inquiries", path: "/wedisni/inquiries" },
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
    if (pwd === ADMIN_PASSWORD) { setUnlocked(true); sessionStorage.setItem("admin_unlocked", "true"); setError(false); }
    else setError(true);
  };

  if (!unlocked) {
    return (
      <MainLayout title="Admin">
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <AlertTriangle size={32} strokeWidth={1.5} className="text-accent" />
          <h2 className="text-lg font-semibold text-primary-custom">Admin Access</h2>
          <p className="text-[13px] text-secondary-custom">Enter password to continue</p>
          <input type="password" value={pwd} onChange={e => { setPwd(e.target.value); setError(false); }} onKeyDown={e => e.key === "Enter" && handleUnlock()} placeholder="Password"
            className="w-64 h-10 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          {error && <p className="text-xs text-red-500">Wrong password</p>}
          <button onClick={handleUnlock} className="px-6 h-9 rounded-lg bg-accent text-white text-sm font-medium">Unlock</button>
        </div>
      </MainLayout>
    );
  }

  const currentView = location.pathname.includes("/users") ? "users"
    : location.pathname.includes("/pro") ? "pro"
    : location.pathname.includes("/upload") ? "upload"
    : location.pathname.includes("/payments") ? "payments"
    : location.pathname.includes("/launch") ? "launch"
    : location.pathname.includes("/inquiries") ? "inquiries"
    : "models";

  return (
    <MainLayout title="Admin Panel">
      <div className="flex h-full">
        <div className="hidden md:block w-44 bg-background-secondary border-r border-border p-2.5 space-y-0.5 shrink-0">
          <p className="label-text text-tertiary-custom px-3 py-2">Admin</p>
          {adminNav.map((item) => (
            <button key={item.path} onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] transition-colors duration-150 ${location.pathname === item.path ? "bg-accent-subtle text-accent font-medium" : "text-secondary-custom hover:bg-border-subtle"}`}>
              <item.icon size={15} strokeWidth={1.5} />{item.label}
            </button>
          ))}
        </div>

        <div className="md:hidden absolute top-0 left-0 right-0 z-10 bg-card border-b border-border flex overflow-x-auto px-2 py-1.5 gap-1">
          {adminNav.map((item) => (
            <button key={item.path} onClick={() => navigate(item.path)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${location.pathname === item.path ? "bg-accent text-accent-foreground" : "text-secondary-custom bg-background-secondary"}`}>
              <item.icon size={12} strokeWidth={1.5} />{item.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-12 md:pt-8 pb-20 md:pb-8">
          {currentView === "users" ? <UsersView />
            : currentView === "pro" ? <ProUsersView />
            : currentView === "upload" ? <UploadView />
            : currentView === "payments" ? <PaymentsView />
            : currentView === "launch" ? <LaunchView />
            : currentView === "inquiries" ? <InquiriesView />
            : <ModelsTable />}
        </div>
      </div>
    </MainLayout>
  );
}

// ── PRO USERS VIEW ──
function ProUsersView() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [{ data: profs }, { data: subscriptions }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("*"),
    ]);
    
    // Merge: show all users from subscriptions, match with profiles
    const subUsers = (subscriptions || []).map(sub => {
      const profile = (profs || []).find(p => p.user_id === sub.user_id);
      return { ...sub, profile };
    });
    
    setProfiles(profs || []);
    setSubs(subUsers);
    setLoading(false);
  };

  const togglePro = async (userId: string, currentPlan: string) => {
    const newPlan = currentPlan === "pro" ? "free" : "pro";
    const newGens = newPlan === "pro" ? 15 : 3;
    const { data: existing } = await supabase.from("subscriptions").select("id").eq("user_id", userId).maybeSingle();
    if (existing) {
      await supabase.from("subscriptions").update({ plan: newPlan, monthly_generations: newGens, status: "active" }).eq("user_id", userId);
    } else {
      await supabase.from("subscriptions").insert({ user_id: userId, plan: newPlan, monthly_generations: newGens });
    }
    toast.success(newPlan === "pro" ? "User upgraded to Pro" : "User downgraded to Free");
    loadData();
  };

  const filtered = subs.filter(s => {
    const q = search.toLowerCase();
    if (!q) return true;
    const name = s.profile?.display_name || "";
    const uname = s.profile?.username || "";
    return name.toLowerCase().includes(q) || uname.toLowerCase().includes(q) || s.user_id.includes(q);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div><h1 className="text-[20px] font-semibold text-primary-custom">Pro User Management</h1>
          <p className="text-[12px] text-tertiary-custom mt-0.5">{subs.length} total users</p></div>
      </div>
      <div className="relative mb-4">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary-custom" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..."
          className="w-full bg-card border border-border rounded-xl h-10 pl-9 pr-3 text-[13px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-accent transition-colors" />
      </div>
      {loading ? <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" /></div> : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-background-secondary">
                {["User", "Plan", "Used/Limit", "Status", "Actions"].map(h => <th key={h} className="label-text text-tertiary-custom text-left px-4 py-2.5 font-medium">{h}</th>)}
              </tr></thead>
              <tbody>{filtered.map(s => {
                const plan = s.plan || "free";
                const displayName = s.profile?.display_name || s.user_id.slice(0, 8) + "...";
                return (
                  <tr key={s.user_id} className="border-t border-border hover:bg-background-secondary/50 transition-colors h-12">
                    <td className="px-4"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0"><Users size={12} className="text-tertiary-custom" /></div><div><span className="text-[13px] font-medium text-primary-custom block">{displayName}</span>{s.profile?.username && <span className="text-[10px] text-tertiary-custom">@{s.profile.username}</span>}</div></div></td>
                    <td className="px-4"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${plan === "pro" ? "bg-yellow-500/10 text-yellow-500" : "bg-secondary text-tertiary-custom"}`}>{plan}</span></td>
                    <td className="px-4 text-[12px] text-secondary-custom">{s.generations_used || 0}/{s.monthly_generations || 3}</td>
                    <td className="px-4"><span className="text-[10px] text-tertiary-custom">{s.status || "active"}</span></td>
                    <td className="px-4">
                      <button onClick={() => togglePro(s.user_id, plan)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all press ${plan === "pro" ? "bg-destructive/10 text-destructive" : "bg-yellow-500/10 text-yellow-500"}`}>
                        {plan === "pro" ? <><ToggleRight size={12} /> Revoke Pro</> : <><Crown size={12} /> Make Pro</>}
                      </button>
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PAYMENTS VIEW ──
function PaymentsView() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrForm, setQrForm] = useState({ esewa_qr_url: "", khalti_qr_url: "", manual_instructions: "Scan QR code and pay NPR 99" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadPayments(); loadQR(); }, []);

  const loadPayments = async () => {
    const { data } = await supabase.from("payment_requests").select("*").order("created_at", { ascending: false });
    setPayments(data || []);
    setLoading(false);
  };

  const loadQR = async () => {
    const { data } = await supabase.from("site_settings").select("value").eq("key", "payment_qr").maybeSingle();
    if (data?.value) {
      const val = data.value as any;
      setQrForm({
        esewa_qr_url: val.esewa_qr_url || "",
        khalti_qr_url: val.khalti_qr_url || "",
        manual_instructions: val.manual_instructions || "Scan QR code and pay NPR 99",
      });
    }
  };

  const saveQR = async () => {
    setSaving(true);
    const value = {
      esewa_qr_url: qrForm.esewa_qr_url || null,
      khalti_qr_url: qrForm.khalti_qr_url || null,
      manual_instructions: qrForm.manual_instructions,
    };
    const { error } = await supabase.from("site_settings").update({ value: value as any, updated_at: new Date().toISOString() }).eq("key", "payment_qr");
    if (error) {
      console.error("QR save error:", error);
      toast.error("Failed to save QR settings");
    } else {
      toast.success("QR settings saved!");
    }
    setSaving(false);
  };

  const handleQRUpload = async (file: File, type: "esewa" | "khalti") => {
    const path = `qr_${type}_${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const newQrForm = { ...qrForm, [`${type}_qr_url`]: data.publicUrl };
    setQrForm(newQrForm);
    
    // Auto-save after upload
    const value = {
      esewa_qr_url: type === "esewa" ? data.publicUrl : (qrForm.esewa_qr_url || null),
      khalti_qr_url: type === "khalti" ? data.publicUrl : (qrForm.khalti_qr_url || null),
      manual_instructions: qrForm.manual_instructions,
    };
    await supabase.from("site_settings").update({ value: value as any, updated_at: new Date().toISOString() }).eq("key", "payment_qr");
    toast.success(`${type === "esewa" ? "eSewa" : "Khalti"} QR uploaded & saved!`);
  };

  const approvePayment = async (paymentId: string, userId: string) => {
    await supabase.from("payment_requests").update({ status: "approved" }).eq("id", paymentId);
    const { data: existing } = await supabase.from("subscriptions").select("id").eq("user_id", userId).maybeSingle();
    if (existing) await supabase.from("subscriptions").update({ plan: "pro", monthly_generations: 15, status: "active" }).eq("user_id", userId);
    else await supabase.from("subscriptions").insert({ user_id: userId, plan: "pro", monthly_generations: 15 });
    toast.success("Payment approved & user upgraded to Pro!");
    loadPayments();
  };

  const rejectPayment = async (paymentId: string) => {
    await supabase.from("payment_requests").update({ status: "rejected" }).eq("id", paymentId);
    toast.success("Payment rejected");
    loadPayments();
  };

  return (
    <div>
      <h1 className="text-[20px] font-semibold text-primary-custom mb-5">Payment Management</h1>

      {/* QR Code Settings */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <h2 className="text-[14px] font-bold text-primary-custom mb-3 flex items-center gap-2"><QrCode size={16} /> QR Code Settings</h2>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[12px] font-medium text-primary-custom block mb-1">eSewa QR Code</label>
            {qrForm.esewa_qr_url && <img src={qrForm.esewa_qr_url} alt="eSewa QR" className="w-32 h-32 rounded-lg object-contain bg-white mb-2" />}
            <label className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg cursor-pointer hover:bg-secondary/80 transition-colors">
              <Image size={14} className="text-tertiary-custom" />
              <span className="text-[11px] text-secondary-custom">Upload eSewa QR</span>
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleQRUpload(e.target.files[0], "esewa")} />
            </label>
          </div>
          <div>
            <label className="text-[12px] font-medium text-primary-custom block mb-1">Khalti QR Code</label>
            {qrForm.khalti_qr_url && <img src={qrForm.khalti_qr_url} alt="Khalti QR" className="w-32 h-32 rounded-lg object-contain bg-white mb-2" />}
            <label className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg cursor-pointer hover:bg-secondary/80 transition-colors">
              <Image size={14} className="text-tertiary-custom" />
              <span className="text-[11px] text-secondary-custom">Upload Khalti QR</span>
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleQRUpload(e.target.files[0], "khalti")} />
            </label>
          </div>
        </div>
        <Field label="Instructions" value={qrForm.manual_instructions} onChange={v => setQrForm(prev => ({ ...prev, manual_instructions: v }))} placeholder="Payment instructions..." />
        <button onClick={saveQR} disabled={saving} className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-[12px] font-bold press disabled:opacity-50">
          <Save size={12} className="inline mr-1" /> {saving ? "Saving..." : "Save QR Settings"}
        </button>
      </div>

      {/* Payment Requests */}
      <h2 className="text-[14px] font-bold text-primary-custom mb-3">Payment Requests ({payments.length})</h2>
      {loading ? <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" /></div> : payments.length === 0 ? (
        <div className="flex flex-col items-center py-12 border border-border rounded-xl bg-card"><Mail size={32} strokeWidth={1} className="text-border mb-3" /><p className="text-[14px] text-secondary-custom">No payment requests yet</p></div>
      ) : (
        <div className="space-y-3">
          {payments.map(p => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${p.status === "approved" ? "bg-green-500/10 text-green-500" : p.status === "rejected" ? "bg-red-500/10 text-red-500" : "bg-yellow-500/10 text-yellow-500"}`}>{p.status}</span>
                <span className="text-[10px] text-tertiary-custom">{new Date(p.created_at).toLocaleString()}</span>
              </div>
              <p className="text-[13px] font-semibold text-primary-custom">{p.payment_method.toUpperCase()} — {p.currency} {p.amount}</p>
              <p className="text-[11px] text-tertiary-custom">User: {p.user_id.slice(0, 12)}...</p>
              {p.screenshot_url && (
                <a href={p.screenshot_url} target="_blank" rel="noopener" className="text-[11px] text-accent underline mt-1 inline-block">View Screenshot</a>
              )}
              {p.status === "pending" && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => approvePayment(p.id, p.user_id)} className="px-3 py-1.5 bg-green-500/10 text-green-500 rounded-lg text-[11px] font-medium press">Approve & Upgrade</button>
                  <button onClick={() => rejectPayment(p.id)} className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-[11px] font-medium press">Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── LAUNCH VIEW ──
function LaunchView() {
  const [config, setConfig] = useState({ enabled: false, launch_time: "", title: "Something Amazing is Coming", subtitle: "Discoverse AI is launching soon" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("site_settings").select("*").eq("key", "launch_screen").maybeSingle();
      if (data?.value) {
        const val = data.value as any;
        setConfig({ enabled: val.enabled || false, launch_time: val.launch_time || "", title: val.title || "", subtitle: val.subtitle || "" });
      }
      setLoading(false);
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    const value = { enabled: config.enabled, launch_time: config.launch_time || null, title: config.title, subtitle: config.subtitle };
    
    // Use upsert pattern - try update first, if no rows affected, insert
    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", "launch_screen").maybeSingle();
    
    if (existing) {
      const { error } = await supabase.from("site_settings").update({ value: value as any, updated_at: new Date().toISOString() }).eq("key", "launch_screen");
      if (error) {
        console.error("Launch save error:", error);
        toast.error("Failed to save: " + error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("site_settings").insert({ key: "launch_screen", value: value as any });
      if (error) {
        console.error("Launch insert error:", error);
        toast.error("Failed to save: " + error.message);
        setSaving(false);
        return;
      }
    }
    
    toast.success("Launch settings saved!");
    setSaving(false);
  };

  const handleTimeChange = (localTime: string) => {
    if (!localTime) { setConfig(prev => ({ ...prev, launch_time: "" })); return; }
    const [datePart, timePart] = localTime.split("T");
    const [y, mo, d] = datePart.split("-").map(Number);
    const [h, m] = timePart.split(":").map(Number);
    const nepalOffset = 5 * 60 + 45;
    const utcDate = new Date(Date.UTC(y, mo - 1, d, h, m) - nepalOffset * 60000);
    setConfig(prev => ({ ...prev, launch_time: utcDate.toISOString() }));
  };

  const getNepalLocalTime = () => {
    if (!config.launch_time) return "";
    const d = new Date(config.launch_time);
    const nepalOffset = 5 * 60 + 45;
    const nepalDate = new Date(d.getTime() + nepalOffset * 60000);
    return nepalDate.toISOString().slice(0, 16);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-lg">
      <h1 className="text-[20px] font-semibold text-primary-custom mb-5 flex items-center gap-2"><Clock size={20} /> Launch Screen</h1>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-bold text-primary-custom">Enable Launch Screen</p>
            <p className="text-[11px] text-tertiary-custom">Block site with countdown until launch time</p>
          </div>
          <button onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={`w-12 h-6 rounded-full transition-all ${config.enabled ? "bg-primary" : "bg-secondary"} relative`}>
            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${config.enabled ? "left-6" : "left-0.5"}`} />
          </button>
        </div>

        {config.enabled && (
          <>
            <div>
              <label className="text-[12px] font-medium text-primary-custom block mb-1">Launch Time (Nepal Time — UTC+5:45)</label>
              <input type="datetime-local" value={getNepalLocalTime()} onChange={e => handleTimeChange(e.target.value)}
                className="w-full bg-card border border-border rounded-xl h-10 px-3 text-[13px] text-primary-custom focus:outline-none focus:border-primary transition-colors" />
              {config.launch_time && <p className="text-[10px] text-tertiary-custom mt-1">UTC: {config.launch_time}</p>}
            </div>

            <Field label="Title" value={config.title} onChange={v => setConfig(prev => ({ ...prev, title: v }))} placeholder="Something Amazing is Coming" />
            <Field label="Subtitle" value={config.subtitle} onChange={v => setConfig(prev => ({ ...prev, subtitle: v }))} placeholder="Discoverse AI is launching soon" />
          </>
        )}

        <button onClick={save} disabled={saving} className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-[13px] font-bold press hover:bg-primary/90 disabled:opacity-50">
          <Save size={14} className="inline mr-1.5" /> {saving ? "Saving..." : "Save Launch Settings"}
        </button>
        
        {config.enabled && config.launch_time && (
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <p className="text-[10px] text-tertiary-custom">Launch countdown is <span className="text-primary-custom font-bold">ACTIVE</span></p>
            <p className="text-[11px] text-secondary-custom mt-1">Site will be blocked until: {new Date(config.launch_time).toLocaleString("en-US", { timeZone: "Asia/Kathmandu" })} NPT</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── USERS VIEW ──
function UsersView() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    // Get both profiles and subscriptions, merge them
    const [{ data: profiles }, { data: subs }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("*"),
    ]);
    
    // Build user map from subscriptions (most complete source since every user gets one)
    const userMap = new Map<string, any>();
    
    (subs || []).forEach(sub => {
      userMap.set(sub.user_id, {
        user_id: sub.user_id,
        plan: sub.plan,
        generations_used: sub.generations_used,
        monthly_generations: sub.monthly_generations,
        sub_created: sub.created_at,
      });
    });
    
    // Merge profile data
    (profiles || []).forEach(p => {
      const existing = userMap.get(p.user_id) || { user_id: p.user_id };
      userMap.set(p.user_id, {
        ...existing,
        display_name: p.display_name,
        username: p.username,
        avatar_url: p.avatar_url,
        profile_created: p.created_at,
      });
    });
    
    const allUsers = Array.from(userMap.values()).sort((a, b) => {
      const dateA = a.profile_created || a.sub_created || "";
      const dateB = b.profile_created || b.sub_created || "";
      return dateB.localeCompare(dateA);
    });
    
    setUsers(allUsers);
    setLoading(false);
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (u.display_name || "").toLowerCase().includes(q) || (u.username || "").toLowerCase().includes(q) || u.user_id.includes(q);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div><h1 className="text-[20px] font-semibold text-primary-custom">Users</h1><p className="text-[12px] text-tertiary-custom mt-0.5">{users.length} registered</p></div>
      </div>
      <div className="relative mb-4">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary-custom" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
          className="w-full bg-card border border-border rounded-xl h-10 pl-9 pr-3 text-[13px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-accent transition-colors" />
      </div>
      {loading ? <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" /></div> : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-background-secondary">{["User", "Plan", "Usage", "Joined"].map(h => <th key={h} className="label-text text-tertiary-custom text-left px-4 py-2.5 font-medium">{h}</th>)}</tr></thead>
              <tbody>{filtered.map(u => (
                <tr key={u.user_id} className="border-t border-border hover:bg-background-secondary/50 transition-colors h-12">
                  <td className="px-4"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">{u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full rounded-lg object-cover" /> : <Users size={12} className="text-tertiary-custom" />}</div><div><span className="text-[13px] font-medium text-primary-custom block">{u.display_name || u.user_id.slice(0,8) + "..."}</span>{u.username && <span className="text-[10px] text-tertiary-custom">@{u.username}</span>}</div></div></td>
                  <td className="px-4"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${u.plan === "pro" ? "bg-yellow-500/10 text-yellow-500" : "bg-secondary text-tertiary-custom"}`}>{u.plan || "free"}</span></td>
                  <td className="px-4 text-[12px] text-secondary-custom">{u.generations_used || 0}/{u.monthly_generations || 3}</td>
                  <td className="px-4 text-[11px] text-tertiary-custom">{new Date(u.profile_created || u.sub_created).toLocaleDateString()}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── INQUIRIES VIEW ──
function InquiriesView() {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { supabase.from("contact_inquiries").select("*").order("created_at", { ascending: false }).then(({ data }) => { setInquiries(data || []); setLoading(false); }); }, []);
  return (
    <div>
      <h1 className="text-[20px] font-semibold text-primary-custom mb-5">Inquiries ({inquiries.length})</h1>
      {loading ? <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" /></div> : inquiries.length === 0 ? (
        <div className="flex flex-col items-center py-16 border border-border rounded-xl bg-card"><Mail size={32} strokeWidth={1} className="text-border mb-3" /><p className="text-[14px] text-secondary-custom">No inquiries yet</p></div>
      ) : (
        <div className="space-y-3">{inquiries.map(inq => (
          <div key={inq.id} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${inq.type === "invest" ? "bg-secondary text-primary-custom" : "bg-secondary text-tertiary-custom"}`}>{inq.type}</span>
              <span className="text-[10px] text-tertiary-custom">{new Date(inq.created_at).toLocaleString()}</span>
            </div>
            <p className="text-[13px] font-semibold text-primary-custom">{inq.name}</p>
            <p className="text-[11px] text-secondary-custom">{inq.email}</p>
            {inq.message && <p className="text-[12px] text-secondary-custom mt-2 border-t border-border pt-2">{inq.message}</p>}
          </div>
        ))}</div>
      )}
    </div>
  );
}

// ── MODELS TABLE ──
function ModelsTable() {
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  useEffect(() => { supabase.from("models").select("*").order("created_at", { ascending: false }).then(({ data }) => { setModels(data || []); setLoading(false); }); }, []);
  const deleteModel = async (id: string) => { await supabase.from("models").delete().eq("id", id); setModels(models.filter(m => m.id !== id)); };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div><h1 className="text-[20px] font-semibold text-primary-custom">Models</h1><p className="text-[12px] text-tertiary-custom mt-0.5">{models.length} in database</p></div>
        <button onClick={() => navigate("/wedisni/upload")} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-[13px] font-medium hover:opacity-90 active:scale-[0.97]"><Plus size={15} strokeWidth={1.5} /> Upload</button>
      </div>
      {loading ? <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" /></div> : models.length === 0 ? (
        <div className="flex flex-col items-center py-16 border border-border rounded-xl bg-card"><Database size={32} strokeWidth={1} className="text-border mb-3" /><p className="text-[14px] text-secondary-custom">No models yet</p></div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full">
          <thead><tr className="bg-background-secondary">{["Name", "Subject", "Tier", "Status", ""].map(h => <th key={h} className="label-text text-tertiary-custom text-left px-4 py-2.5 font-medium">{h}</th>)}</tr></thead>
          <tbody>{models.map(m => (
            <tr key={m.id} className="border-t border-border hover:bg-background-secondary/50 transition-colors h-12">
              <td className="px-4 text-[13px] font-medium text-primary-custom">{m.name}</td>
              <td className="px-4"><span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${subjectColors[m.subject] || "bg-muted text-secondary-custom"}`}>{m.subject}</span></td>
              <td className="px-4 text-[12px] text-secondary-custom">T{m.tier}</td>
              <td className="px-4"><span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${m.status === "published" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>{m.status}</span></td>
              <td className="px-4"><button onClick={() => deleteModel(m.id)} className="p-1 hover:bg-destructive/10 rounded transition-colors"><X size={14} strokeWidth={1.5} className="text-tertiary-custom hover:text-destructive" /></button></td>
            </tr>
          ))}</tbody>
        </table></div></div>
      )}
    </div>
  );
}

// ── UPLOAD VIEW ──
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
      keywords_en: form.keywords_en.split(",").map(k => k.trim()).filter(Boolean),
      keywords_hi: form.keywords_hi.split(",").map(k => k.trim()).filter(Boolean),
      named_parts: form.named_parts.split(",").map(k => k.trim()).filter(Boolean),
      source: form.source || null, license: form.license || null, status, uploaded_by: user?.id,
    });
    if (insertError) alert("Save failed: " + insertError.message);
    else navigate("/wedisni");
    setUploading(false);
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-[20px] font-semibold text-primary-custom mb-5">Upload Model</h1>
      <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 cursor-pointer transition-colors ${file ? "border-accent bg-accent-subtle" : "border-border hover:border-accent"}`}>
        <input type="file" accept=".glb,.gltf,.fbx,.obj" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
        {file ? <><Check size={28} strokeWidth={1.5} className="text-accent mb-2" /><p className="text-[13px] font-medium text-primary-custom">{file.name}</p></> : <><CloudUpload size={28} strokeWidth={1.5} className="text-tertiary-custom mb-2" /><p className="text-[13px] text-secondary-custom">Drop 3D model or click to browse</p></>}
      </label>
      <div className="mt-6 space-y-4">
        <Field label="Model Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="e.g. Human Heart" />
        <div>
          <label className="text-[12px] font-medium text-primary-custom block mb-1">Subject</label>
          <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="w-full bg-card border border-border rounded-xl h-10 px-3 text-[13px] text-primary-custom focus:outline-none focus:border-primary">
            {["biology", "physics", "chemistry", "mathematics", "geography", "astronomy", "engineering"].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <Field label="Named Parts" value={form.named_parts} onChange={v => setForm({ ...form, named_parts: v })} placeholder="left_ventricle, aorta" helper="Must match mesh names" />
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
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-card border border-border rounded-xl h-10 px-3 text-[13px] text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-primary transition-colors" />
      {helper && <p className="text-[11px] text-tertiary-custom mt-0.5">{helper}</p>}
    </div>
  );
}
