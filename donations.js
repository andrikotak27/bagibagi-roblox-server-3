// api/donations.js
// ─────────────────────────────────────────────────────────────────────────────
//  Endpoint yang di-polling oleh BagibagiServer.lua di Roblox
//  GET /api/donations?since=<unix_timestamp>
//
//  Donasi masuk dari BagiBagi via POST /api/webhook (push real-time)
//  lalu disimpan di buffer, dan endpoint ini yang mengambilnya ke Roblox.
// ─────────────────────────────────────────────────────────────────────────────

// Import shared buffer dari webhook.js
const { donationBuffer, processedIds, removeFromBuffer } = require("./_store");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  // Parameter ?since= dari Roblox (unix timestamp)
  const since = parseInt(req.query.since || "0", 10);

  const toSend   = [];
  const toRemove = [];

  for (const d of donationBuffer) {
    // Donasi lebih lama dari `since` → sudah pernah dikirim, hapus dari buffer
    if (since > 0 && d.timestamp <= since) {
      toRemove.push(d);
      continue;
    }
    toSend.push(d);
  }

  // Bersihkan donasi lama dari buffer
  for (const d of toRemove) removeFromBuffer(d.id);

  // Sort terlama → terbaru agar Roblox proses berurutan
  toSend.sort((a, b) => a.timestamp - b.timestamp);

  console.log(`[GET /donations] since=${since} → ${toSend.length} donasi dikirim ke Roblox`);

  return res.status(200).json({
    donations:  toSend,
    total:      toSend.length,
    fetched_at: Math.floor(Date.now() / 1000),
  });
};
