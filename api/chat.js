// /api/chat.js — Vercel Serverless Function
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userMessage } = req.body || {};
    if (!userMessage) {
      return res.status(400).json({ error: "Missing userMessage" });
    }

    const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!API_KEY) {
      // Helpful message so we know if env var wasn’t picked up
      return res.status(500).json({ error: "Missing GEMINI_API_KEY on server" });
    }

    const SYSTEM_PROMPT = `
You are a careful, supportive yoga and Ayurveda educator.
- Suggest 1–3 gentle asanas with steps, hold time, props/mods, and contraindications.
- Always list "Avoid" if unsafe; include an Ayurveda tip (no diagnosis or dosages).
- Flag risks (pregnancy, hypertension, glaucoma, recent surgery, severe pain).
- If red flags (trauma, fever+back pain, bowel/bladder loss, weakness, chest pain, severe eye pressure, pregnancy complications) → stop and advise urgent care.
- Warm, concise tone. Use short sections and bullet points.
`;

    // Current model
    const model = "gemini-1.5-flash";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

    const payload = {
      contents: [
        { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
        { role: "user", parts: [{ text: userMessage }] }
      ]
    };

    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await r.json();

    if (!r.ok) {
      // Log full error in function logs, surface the message to client
      console.error("Gemini API error:", data);
      return res
        .status(r.status)
        .json({ error: data?.error?.message || "Upstream error" });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "I couldn't generate a response.";
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
