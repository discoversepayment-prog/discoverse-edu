import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { phone } = await req.json();
    if (!phone || !/^(97|98)\d{8}$/.test(phone)) {
      return new Response(JSON.stringify({ error: "Invalid Nepali phone number" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const AAKASH_SMS_TOKEN = Deno.env.get("AAKASH_SMS_TOKEN");
    if (!AAKASH_SMS_TOKEN) throw new Error("AAKASH_SMS_TOKEN not configured");

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Store OTP in a simple way using Supabase
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Store OTP with expiry (5 min) in a temp table or use the existing approach
    // We'll use a simple KV approach via the database
    const storeRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/store_otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ _phone: phone, _otp: otp }),
    });

    if (!storeRes.ok) {
      const errText = await storeRes.text();
      console.error("Failed to store OTP:", errText);
      throw new Error("Failed to store OTP");
    }

    // Send via Aakash SMS API
    const smsUrl = `https://sms.aakashsms.com/sms/v3/send`;
    const smsRes = await fetch(smsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: AAKASH_SMS_TOKEN,
        to: phone,
        text: `Your Discoverse OTP is: ${otp}. Valid for 5 minutes.`,
      }),
    });

    const smsData = await smsRes.json();
    if (smsData.error) {
      console.error("Aakash SMS error:", smsData);
      return new Response(JSON.stringify({ error: "Failed to send SMS" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "OTP sent" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-otp error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
