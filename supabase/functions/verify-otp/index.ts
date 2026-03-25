import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { phone, otp } = await req.json();
    if (!phone || !otp) {
      return new Response(JSON.stringify({ error: "Phone and OTP required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify OTP via database function
    const verifyRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/verify_otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ _phone: phone, _otp: otp }),
    });

    const isValid = await verifyRes.json();
    if (!isValid) {
      return new Response(JSON.stringify({ error: "Invalid or expired OTP" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if user exists with this phone
    const email = `${phone}@phone.discoverse.app`;
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email || u.phone === phone);

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new user
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        phone,
        email_confirm: true,
        phone_confirm: true,
        password: `phone_${phone}_${Date.now()}`,
        user_metadata: { phone_number: phone, auth_method: "phone_otp" },
      });
      if (createErr || !newUser.user) {
        console.error("Create user error:", createErr);
        throw new Error("Failed to create user");
      }
      userId = newUser.user.id;
      isNewUser = true;
    }

    // Generate session token for the user
    const { data: sessionData, error: signInErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (signInErr) {
      console.error("Generate link error:", signInErr);
      throw new Error("Failed to generate session");
    }

    // Check if user has a username set
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("username, display_name")
      .eq("user_id", userId)
      .maybeSingle();

    const needsUsername = !profile?.username;

    // Check if user has agent creation permission
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const canCreateAgent = roleData?.some(r => r.role === "admin") || false;

    return new Response(JSON.stringify({
      success: true,
      user_id: userId,
      is_new_user: isNewUser,
      needs_username: needsUsername,
      can_create_agent: canCreateAgent,
      // Return the magic link properties for client to use
      action_link: sessionData?.properties?.action_link,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-otp error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
