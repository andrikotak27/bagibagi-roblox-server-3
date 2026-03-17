// api/donations.js — FIXED v2
// Kirim SEMUA donasi di buffer ke Roblox, lalu hapus dari buffer setelah dikirim
// Roblox yang handle deduplikasi via ProcessedIds di DataStore

const { donationBuffer, removeFromBuffer } = require("./_store");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  // Ambil SEMUA donasi di buffer
  const toSend = [...donationBuffer];

  // Hapus dari buffer setelah diambil Roblox
  for (const d of toSend) {
    removeFromBuffer(d.id);
  }

  // Sort terlama → terbaru
  toSend.sort((a, b) => a.timestamp - b.timestamp);

  console.log(`[GET /donations] → ${toSend.length} donasi dikirim ke Roblox`);

  return res.status(200).json({
    donations:  toSend,
    total:      toSend.length,
    fetched_at: Math.floor(Date.now() / 1000),
  });
};
