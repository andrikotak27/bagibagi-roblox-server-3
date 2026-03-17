// api/webhook.js — MENGGUNAKAN VERCEL KV (persistent!)
// Donasi disimpan di database Vercel KV, bukan memory
// Jadi tidak hilang meski instance berbeda

const { kv } = require("@vercel/kv");

function normalize(raw) {
  let timestamp = Math.floor(Date.now() / 1000);
  if (raw.created_at) {
    const parsed = new Date(raw.created_at);
    if (!isNaN(parsed.getTime())) {
      timestamp = Math.floor(parsed.getTime() / 1000);
    }
  }
  return {
    id:        String(raw.transaction_id || raw.id || `bb_${Date.now()}_${Math.random().toString(36).slice(2)}`),
    name:      String(raw.donator_name || raw.name || raw.fullName || raw.username || "Anonymous").trim(),
    amount:    Number(raw.amount) || 0,
    message:   String(raw.message || raw.note || "").trim(),
    timestamp: timestamp,
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Bagibagi-Signature");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    // Tampilkan isi buffer dari KV untuk debug
    try {
      const donations = await kv.lrange("donations", 0, 19) || [];
      return res.status(200).json({
        ok:       true,
        status:   "BagiBagi webhook ready (KV)",
        buffered: donations.length,
        latest:   donations.slice(0, 5),
      });
    } catch {
      return res.status(200).json({ ok: true, status: "BagiBagi webhook ready" });
    }
  }

  if (req.method !== "POST") {
    return res.status(200).json({ ok: true });
  }

  console.log("[Webhook] Headers:", JSON.stringify(req.headers));

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body || typeof body !== "object") {
    return res.status(200).json({ ok: false, reason: "invalid body" });
  }

  console.log("[Webhook] Payload:", JSON.stringify(body));

  const donation = normalize(body);

  if (donation.amount <= 0) {
    return res.status(200).json({ ok: true, skipped: "amount <= 0" });
  }

  try {
    // Cek duplikat
    const isDup = await kv.sismember("processed_ids", donation.id);
    if (isDup) {
      console.log(`[Webhook] Duplikat: ${donation.id}`);
      return res.status(200).json({ ok: true, skipped: "duplicate" });
    }

    // Simpan ke KV dengan pipeline untuk efisiensi
    const pipe = kv.pipeline();
    pipe.lpush("donations", JSON.stringify(donation));   // tambah ke list
    pipe.ltrim("donations", 0, 499);                     // max 500 donasi
    pipe.sadd("processed_ids", donation.id);             // tandai sudah diproses
    pipe.expire("processed_ids", 86400 * 7);             // expire 7 hari
    await pipe.exec();

    console.log(`[Webhook] ✅ ${donation.name} Rp${donation.amount} → KV`);
    return res.status(200).json({ ok: true, received: true });
  } catch (err) {
    console.error("[Webhook] KV Error:", err.message);
    // Fallback: tetap return 200 agar BagiBagi tidak retry terus
    return res.status(200).json({ ok: true, error: err.message });
  }
};
