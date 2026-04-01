import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const fallbackColors = ["#CC4444", "#4488CC", "#44AA44", "#D17A00", "#7D4CC2", "#D14A8B"];
const isHexColor = (value: unknown): value is string => typeof value === "string" && /^#([0-9a-fA-F]{6})$/.test(value);
const normalizeToken = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const resolvePartName = (part: unknown, namedParts: string[]) => {
  if (typeof part !== "string" || !part.trim() || namedParts.length === 0) return "";
  const trimmed = part.trim();
  if (namedParts.includes(trimmed)) return trimmed;
  const normalizedPart = normalizeToken(trimmed);
  const exact = namedParts.find((c) => normalizeToken(c) === normalizedPart);
  if (exact) return exact;
  const partial = namedParts.find((c) => { const n = normalizeToken(c); return n.includes(normalizedPart) || normalizedPart.includes(n); });
  return partial || "";
};

const sanitizeSimulation = (raw: unknown, modelName: string, namedParts: string[]) => {
  const parsed = raw as { title?: unknown; steps?: unknown[] };
  const rawSteps = Array.isArray(parsed?.steps) ? parsed.steps : [];
  const steps = rawSteps.slice(0, 8).map((entry, index) => {
    const step = entry as Record<string, unknown>;
    const rawPart = typeof step.part === "string" ? step.part : "";
    const resolvedPart = namedParts.length > 0 ? resolvePartName(rawPart, namedParts) : rawPart;
    const camera = step.camera as { x?: unknown; y?: unknown; z?: unknown } | undefined;
    const safeCamera = {
      x: typeof camera?.x === "number" ? camera.x : 0,
      y: typeof camera?.y === "number" ? camera.y : 0,
      z: typeof camera?.z === "number" ? camera.z : 4,
    };
    return {
      title: typeof step.title === "string" && step.title.trim() ? step.title.trim() : `Step ${index + 1}`,
      part: resolvedPart,
      color: isHexColor(step.color) ? step.color : fallbackColors[index % fallbackColors.length],
      narration_en: typeof step.narration_en === "string" && step.narration_en.trim() ? step.narration_en.trim() : `${modelName}, step ${index + 1}.`,
      narration_hi: typeof step.narration_hi === "string" && step.narration_hi.trim() ? step.narration_hi.trim() : `${modelName} का चरण ${index + 1}।`,
      label_en: typeof step.label_en === "string" && step.label_en.trim() ? step.label_en.trim() : modelName,
      label_hi: typeof step.label_hi === "string" && step.label_hi.trim() ? step.label_hi.trim() : modelName,
      function_en: typeof step.function_en === "string" && step.function_en.trim() ? step.function_en.trim() : "",
      function_hi: typeof step.function_hi === "string" && step.function_hi.trim() ? step.function_hi.trim() : "",
      animation: typeof step.animation === "string" ? step.animation : "",
      isolate: typeof step.isolate === "boolean" ? step.isolate : true,
      camera: safeCamera,
    };
  });
  if (steps.length === 0) {
    return {
      title: modelName,
      steps: [{
        title: modelName, part: "", color: fallbackColors[0],
        narration_en: `This is ${modelName}. Let's break it down.`,
        narration_hi: `यह ${modelName} है। आइए समझते हैं।`,
        label_en: modelName, label_hi: modelName,
        function_en: "", function_hi: "",
        animation: "", isolate: false,
        camera: { x: 0, y: 0, z: 4 }
      }],
    };
  }
  return { title: typeof parsed?.title === "string" && parsed.title.trim() ? parsed.title.trim() : modelName, steps };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { modelName, subject, namedParts, language, tier } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const cleanModelName = typeof modelName === "string" && modelName.trim() ? modelName.trim() : "3D Model";
    const cleanSubject = typeof subject === "string" && subject.trim() ? subject.trim() : "science";
    const cleanNamedParts = Array.isArray(namedParts) ? namedParts.filter((p): p is string => typeof p === "string" && p.trim().length > 0) : [];
    const modelTier = tier === "D2" ? "D2" : "D1";

    const partsInfo = cleanNamedParts.length
      ? `Available mesh part names: ${cleanNamedParts.join(", ")}. Use ONLY these exact names for "part".`
      : 'No mesh names available. Set "part" to "" for all steps.';

    const stepCount = modelTier === "D2" ? 8 : 5;

    const systemPrompt = `You are Discoverse AI — an Instant Visual Understanding Engine.
Your job: Make users understand ANY concept in SECONDS through focused, visual micro-steps.

RULES:
- Each step focuses on EXACTLY ONE part or function
- Max 1 sentence per narration (8-15 words). Be direct.
- Every step must specify which part to ISOLATE (show only that part)
- Include animation type when motion is involved (pulse, breathe, rotate, vibrate)
- Think Instagram Reels: fast, visual, zero fluff
- For Hindi: use PROPER Devanagari (हिंदी), never Romanized
- "function_en" = what this part DOES in under 12 words
- "isolate": true means show ONLY this part, false means highlight within context

Return ONLY valid JSON. No markdown.`;

    const userPrompt = `Create ${stepCount} instant-understanding steps for "${cleanModelName}" (${cleanSubject}).
${partsInfo}

JSON format:
{
  "title": "${cleanModelName}",
  "steps": [
    {
      "title": "Part Name",
      "part": "exact_mesh_name",
      "color": "#RRGGBB",
      "narration_en": "One punchy sentence. What it is + what it does.",
      "narration_hi": "एक वाक्य। हिंदी देवनागरी में।",
      "label_en": "Part Name",
      "label_hi": "भाग नाम",
      "function_en": "Does X for Y (max 12 words)",
      "function_hi": "Y के लिए X करता है",
      "animation": "pulse|breathe|rotate|vibrate|none",
      "isolate": true,
      "camera": { "x": 0, "y": 0, "z": 4 }
    }
  ]
}

Rules:
- Step 1: Full overview (part="", isolate=false) — "This is X. It does Y."
- Steps 2-${stepCount - 1}: Each focuses on ONE specific part. Isolate it. Show its function.
- Step ${stepCount}: Quick summary (part="", isolate=false)
- Animation: "pulse" for pumping/beating, "breathe" for expanding/contracting, "rotate" for spinning parts, "vibrate" for electrical/nerve, "" for static
- Colors: distinct hex per step
- narration_en: MAX 15 words. Direct. "This is the left ventricle. It pumps oxygenated blood to your body."
- function_en: MAX 12 words. "Pumps oxygen-rich blood to the entire body"
- Make user understand the concept in under 30 seconds total`;

    const model = modelTier === "D2" ? "google/gemini-2.5-pro" : "google/gemini-3-flash-preview";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Payment required." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const firstBrace = content.indexOf("{");
    const lastBrace = content.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) content = content.slice(firstBrace, lastBrace + 1);

    const parsedSimulation = JSON.parse(content);
    const sanitized = sanitizeSimulation(parsedSimulation, cleanModelName, cleanNamedParts);

    return new Response(JSON.stringify(sanitized), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("enhance-model error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
