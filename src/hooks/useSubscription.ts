import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Subscription {
  plan: string;
  status: string;
  monthly_generations: number;
  generations_used: number;
  generation_reset_at: string;
  expires_at: string | null;
}

// Check if reset is needed (midnight UTC daily)
function needsReset(resetAt: string): boolean {
  const now = new Date();
  const lastReset = new Date(resetAt);
  // Compare dates in UTC
  return (
    now.getUTCFullYear() !== lastReset.getUTCFullYear() ||
    now.getUTCMonth() !== lastReset.getUTCMonth() ||
    now.getUTCDate() !== lastReset.getUTCDate()
  );
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSubscription = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("subscriptions")
      .select("plan, status, monthly_generations, generations_used, generation_reset_at, expires_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      // Check if daily reset is needed
      if (needsReset(data.generation_reset_at)) {
        const dailyLimit = data.plan === "pro" ? 15 : 3;
        await supabase.from("subscriptions").update({
          generations_used: 0,
          generation_reset_at: new Date().toISOString(),
          monthly_generations: dailyLimit,
        }).eq("user_id", user.id);
        setSubscription({ ...data, generations_used: 0, generation_reset_at: new Date().toISOString(), monthly_generations: dailyLimit });
      } else {
        setSubscription(data);
      }
    } else {
      await supabase.from("subscriptions").insert({
        user_id: user.id,
        plan: "free",
        monthly_generations: 3,
        generations_used: 0,
      });
      setSubscription({
        plan: "free",
        status: "active",
        monthly_generations: 3,
        generations_used: 0,
        generation_reset_at: new Date().toISOString(),
        expires_at: null,
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadSubscription(); }, [loadSubscription]);

  const isPro = subscription?.plan === "pro" && subscription.status === "active";
  const remaining = subscription ? Math.max(0, subscription.monthly_generations - subscription.generations_used) : 0;

  const incrementUsage = useCallback(async () => {
    if (!user || !subscription) return;
    const newUsed = subscription.generations_used + 1;
    const { error } = await supabase.from("subscriptions").update({ generations_used: newUsed }).eq("user_id", user.id);
    if (error) {
      console.error("Failed to update usage:", error);
      return;
    }
    setSubscription(prev => prev ? { ...prev, generations_used: newUsed } : prev);
  }, [user, subscription]);

  return { subscription, isPro, remaining, loading, incrementUsage, reload: loadSubscription };
}
