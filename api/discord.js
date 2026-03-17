// api/discord.js — Forward Discord webhook dari Roblox ke Discord
// Roblox tidak bisa POST langsung ke discord.com, jadi lewat Vercel dulu

const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1483298694391664702/3flhLEdabBBYWvYhsNkZ4WLvV1T4ZixUj13y8PELMh2xM2WSF28Li0x7NheZymEwz11z";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Invalid body" });
  }

  try {
    const response = await fetch(DISCORD_WEBHOOK, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Discord] Error ${response.status}: ${text}`);
      return res.status(200).json({ ok: false, status: response.status, error: text });
    }

    console.log("[Discord] ✅ Webhook forwarded successfully");
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error("[Discord] Fetch error:", err.message);
    return res.status(200).json({ ok: false, error: err.message });
  }
};
discord.js
