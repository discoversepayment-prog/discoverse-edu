import { MessageSquare, BookOpen, Clock, User, LogOut, Shield, Plus } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function AppSidebar() {
  const { mode, setMode } = useApp();
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminRoute = location.pathname.startsWith("/wedisni");
  const [canCreateAgent, setCanCreateAgent] = useState(false);
  const [profile, setProfile] = useState<{ display_name?: string; username?: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("profiles").select("display_name, username, can_create_agent").eq("user_id", user.id).maybeSingle();
      if (data) {
        setProfile({ display_name: data.display_name, username: data.username });
        setCanCreateAgent(isAdmin || data.can_create_agent || false);
      }
    };
    load();
  }, [user, isAdmin]);

  const handleNav = (target: "chat" | "learn") => {
    setMode(target);
    if (location.pathname !== "/app") navigate("/app");
  };

  const displayName = profile?.display_name || profile?.username || "Explorer";

  return (
    <aside className="hidden md:flex flex-col w-56 bg-background border-r border-border shrink-0 h-screen sticky top-0">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2">
          <Logo size={22} />
          <span className="text-[15px] font-bold text-primary-custom tracking-tight">Discoverse</span>
        </div>
      </div>

      <nav className="px-2 space-y-0.5 flex-1">
        <SidebarItem icon={MessageSquare} label="Agents" active={mode === "chat" && !isAdminRoute && location.pathname === "/app"} onClick={() => handleNav("chat")} />
        <SidebarItem icon={BookOpen} label="Learn" active={mode === "learn" && !isAdminRoute && location.pathname === "/app"} onClick={() => handleNav("learn")} />
        <SidebarItem icon={Clock} label="Library" active={location.pathname === "/library"} onClick={() => navigate("/library")} />
        <SidebarItem icon={User} label="Profile" active={location.pathname === "/profile"} onClick={() => navigate("/profile")} />

        {canCreateAgent && (
          <SidebarItem icon={Plus} label="Create Agent" active={location.pathname === "/create-agent"} onClick={() => navigate("/create-agent")} />
        )}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="label-text text-tertiary-custom">System</p>
            </div>
            <SidebarItem icon={Shield} label="Admin" active={isAdminRoute} onClick={() => navigate("/wedisni")} />
          </>
        )}
      </nav>

      <div className="p-2 border-t border-border">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors group">
          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-[10px] font-bold text-tertiary-custom">
              {displayName[0]?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-primary-custom truncate">{displayName}</p>
            {profile?.username && <p className="text-[10px] text-tertiary-custom truncate">@{profile.username}</p>}
          </div>
          <button onClick={signOut} className="p-1 hover:bg-secondary rounded transition-colors opacity-0 group-hover:opacity-100" title="Sign out">
            <LogOut size={12} strokeWidth={1.5} className="text-tertiary-custom" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function SidebarItem({ icon: Icon, label, active, onClick }: {
  icon: React.ComponentType<any>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] transition-all duration-150 press ${
        active
          ? "bg-primary text-primary-foreground font-semibold"
          : "text-secondary-custom hover:bg-secondary/50 hover:text-primary-custom"
      }`}
    >
      <Icon size={14} strokeWidth={active ? 2 : 1.5} />
      {label}
    </button>
  );
}
