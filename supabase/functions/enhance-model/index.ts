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
  const steps = rawSteps.slice(0, 6).map((entry, index) => {
    const step = entry as Record<string, unknown>;
    const rawPart = typeof step.part === "string" ? step.part : "";
    const resolvedPart = namedParts.length > 0 ? resolvePartName(rawPart, namedParts) : "";
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
      narration_en: typeof step.narration_en === "string" && step.narration_en.trim() ? step.narration_en.trim() : `Point: ${modelName}, step ${index + 1}.`,
      narration_hi: typeof step.narration_hi === "string" && step.narration_hi.trim() ? step.narration_hi.trim() : `${modelName} का चरण ${index + 1}।`,
      label_en: typeof step.label_en === "string" && step.label_en.trim() ? step.label_en.trim() : modelName,
      label_hi: typeof step.label_hi === "string" && step.label_hi.trim() ? step.label_hi.trim() : modelName,
      camera: safeCamera,
    };
  });
  if (steps.length === 0) {
    return {
      title: modelName,
      steps: [{ title: `${modelName}`, part: "", color: fallbackColors[0], narration_en: `This is ${modelName}. Let's understand it.`, narration_hi: `यह ${modelName} है। आइए इसे समझते हैं।`, label_en: modelName, label_hi: modelName, camera: { x: 0, y: 0, z: 4 } }],
    };
  }
  return { title: typeof parsed?.title === "string" && parsed.title.trim() ? parsed.title.trim() : modelName, steps };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { modelName, subject, namedParts, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const cleanModelName = typeof modelName === "string" && modelName.trim() ? modelName.trim() : "3D Model";
    const cleanSubject = typeof subject === "string" && subject.trim() ? subject.trim() : "science";
    const cleanNamedParts = Array.isArray(namedParts) ? namedParts.filter((p): p is string => typeof p === "string" && p.trim().length > 0) : [];

    const partsInfo = cleanNamedParts.length
      ? `Use ONLY these exact mesh names for "part": ${cleanNamedParts.join(", ")}.`
      : 'No mesh names available. Set "part" to empty string for all steps.';

    const systemPrompt = `You are a point-to-point science narrator. NOT a teacher — you are a GUIDE. 
Your narration style:
- Direct, punchy, 1-2 sentences MAX per step
- "This is the left ventricle. It pumps oxygenated blood to your body." — NOT long explanations
- Think Instagram Reels narration: fast, clear, memorable
- For Hindi narration (narration_hi): use PROPER HINDI in Devanagari script (हिंदी). Example: "यह बायाँ निलय है। यह ऑक्सीजन युक्त रक्त को शरीर में पंप करता है।"
- DO NOT use Romanized Nepali or Romanized Hindi. Always use proper Devanagari Hindi script for narration_hi and label_hi fields.
- Make it feel warm, like a friend explaining quickly
Return ONLY valid JSON (no markdown, no code block).`;

    const userPrompt = `Create a point-to-point simulation for "${cleanModelName}" (subject: ${cleanSubject}).
${partsInfo}

Return JSON:
{
  "title": "Title",
  "steps": [
    {
      "title": "Short title",
      "part": "exact mesh name or empty",
      "color": "#RRGGBB",
      "narration_en": "1-2 punchy sentences. Direct. Not teacher-like.",
      "narration_hi": "हिंदी में 1-2 वाक्य। Devanagari script only. Warm and friendly.",
      "label_en": "short label",
      "label_hi": "हिंदी लेबल (Devanagari)",
      "camera": { "x": 0, "y": 0, "z": 4 }
    }
  ]
}

Rules:
- Exactly 6 steps
- Step 1: overview (part = "")
- Step 6: summary (part = "")
- Middle steps: point to specific parts, 1-2 sentences each
- Colors: valid 6-digit hex, visually distinct
- narration_hi and label_hi MUST be in proper Hindi Devanagari script (e.g. "यह हृदय का दायाँ आलिंद है। यह अशुद्ध रक्त को एकत्र करता है।")
- DO NOT use Romanized text for Hindi fields. Only Devanagari.
- Keep it SHORT. Students should understand in SECONDS, not minutes.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
