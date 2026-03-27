import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MESHY_BASE = "https://api.meshy.ai/openapi/v2/text-to-3d";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const MESHY_API_KEY = Deno.env.get("MESHY_API_KEY");
    if (!MESHY_API_KEY) throw new Error("MESHY_API_KEY is not configured");

    const meshyHeaders = { Authorization: `Bearer ${MESHY_API_KEY}`, "Content-Type": "application/json" };
    const body = await req.json();
    const { action } = body;

    // Action: create_preview — start a preview generation task
    if (action === "create_preview") {
      const { prompt, negativePrompt } = body;
      if (!prompt?.trim()) throw new Error("prompt is required");

      const res = await fetch(MESHY_BASE, {
        method: "POST",
        headers: meshyHeaders,
        body: JSON.stringify({
          mode: "preview",
          prompt: prompt.trim(),
          negative_prompt: negativePrompt || "low quality, low resolution, low poly, ugly, blurry",
          should_remesh: true,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error("Meshy preview create error:", res.status, err);
        throw new Error(`Meshy API error: ${res.status}`);
      }
      const data = await res.json();
      return new Response(JSON.stringify({ task_id: data.result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: check_status — poll a task's status
    if (action === "check_status") {
      const { task_id } = body;
      if (!task_id) throw new Error("task_id is required");

      const res = await fetch(`${MESHY_BASE}/${task_id}`, { headers: meshyHeaders });
      if (!res.ok) {
        const err = await res.text();
        console.error("Meshy status error:", res.status, err);
        throw new Error(`Meshy status error: ${res.status}`);
      }
      const data = await res.json();
      return new Response(JSON.stringify({
        status: data.status,
        progress: data.progress || 0,
        model_urls: data.model_urls || null,
        thumbnail_url: data.thumbnail_url || null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: create_refine — start a refine task from a preview
    if (action === "create_refine") {
      const { preview_task_id } = body;
      if (!preview_task_id) throw new Error("preview_task_id is required");

      const res = await fetch(MESHY_BASE, {
        method: "POST",
        headers: meshyHeaders,
        body: JSON.stringify({
          mode: "refine",
          preview_task_id,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error("Meshy refine create error:", res.status, err);
        throw new Error(`Meshy refine error: ${res.status}`);
      }
      const data = await res.json();
      return new Response(JSON.stringify({ task_id: data.result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: save_model — download GLB from Meshy URL and save to storage + models table
    if (action === "save_model") {
      const { glb_url, topic, subject } = body;
      if (!glb_url || !topic) throw new Error("glb_url and topic are required");

      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Download the GLB file
      const glbRes = await fetch(glb_url);
      if (!glbRes.ok) throw new Error("Failed to download GLB from Meshy");
      const glbBuffer = await glbRes.arrayBuffer();
      const glbBytes = new Uint8Array(glbBuffer);

      const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      const fileName = `meshy_${slug}_${Date.now()}.glb`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("models")
        .upload(fileName, glbBytes, { contentType: "model/gltf-binary", upsert: true });
      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw new Error("Failed to upload model to storage");
      }

      const { data: publicUrlData } = supabase.storage.from("models").getPublicUrl(fileName);
      const publicUrl = publicUrlData.publicUrl;

      // Upsert into models table
      const { data: existingModel } = await supabase
        .from("models")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      let modelId: string;
      if (existingModel) {
        await supabase.from("models").update({
          file_url: publicUrl,
          file_size_bytes: glbBytes.length,
          status: "published",
          updated_at: new Date().toISOString(),
        }).eq("id", existingModel.id);
        modelId = existingModel.id;
      } else {
        const { data: newModel, error: insertError } = await supabase.from("models").insert({
          name: topic.trim(),
          slug,
          file_url: publicUrl,
          file_format: "glb",
          file_size_bytes: glbBytes.length,
          subject: subject || "science",
          status: "published",
          source: "meshy_ai",
          tier: 2,
        }).select("id").single();
        if (insertError) {
          console.error("Model insert error:", insertError);
          throw new Error("Failed to save model record");
        }
        modelId = newModel.id;
      }

      return new Response(JSON.stringify({ model_id: modelId, file_url: publicUrl, slug }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e) {
    console.error("meshy-3d error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
