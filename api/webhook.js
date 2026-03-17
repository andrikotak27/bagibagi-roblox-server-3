// api/webhook.js — FIXED: signature validation dinonaktifkan sementara
// BagiBagi push donations real-time ke endpoint ini
// POST /api/webhook

const { addToBuffer } = require("./_store");

function normalize(raw) {
  let timestamp = Math.floor(Date.now() / 1000);
  if (raw.created_at) {
    const parsed = new Date(raw.created_at);
    if (!isNaN(parsed.getTime())) {
      timestamp = Math.floor(parsed.getTime() / 1000);
    }
  }
  return {
    id:        String(raw.transaction_id || raw.id || `bb_${Date.now()}`),
    name:      String(raw.donator_name || raw.name || raw.fullName || raw.username || "Anonymous").trim(),
    amount:    Number(raw.amount) || 0,
    message:   String(raw.message || raw.note || "").trim(),
    timestamp: timestamp,
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Bagibagi-Signature, X-Webhook-Secret");

  if (req.method === "OPTIONS") return res.status(200).end();

  // GET — BagiBagi kadang cek endpoint dulu
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, status: "BagiBagi webhook ready" });
  }

  if (req.method !== "POST") {
    return res.status(200).json({ ok: true });
  }

  // Log semua header untuk debug
  console.log("[BagiBagi Webhook] Headers:", JSON.stringify(req.headers));

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body || typeof body !== "object") {
    return res.status(200).json({ ok: false, reason: "invalid body" });
  }

  // Log raw payload untuk debug
  console.log("[BagiBagi Webhook] Raw payload:", JSON.stringify(body));

  // Normalisasi donasi
  const donation = normalize(body);

  if (donation.amount <= 0) {
    console.log("[BagiBagi Webhook] Skipped: amount <= 0");
    return res.status(200).json({ ok: true, skipped: "amount <= 0" });
  }

  const added = addToBuffer(donation);

  if (added) {
    console.log(`[BagiBagi Webhook] ✅ ${donation.name} Rp${donation.amount} → buffer`);
  } else {
    console.log(`[BagiBagi Webhook] ⚠️ Duplikat: ${donation.id}`);
  }

  return res.status(200).json({ ok: true, received: added });
};
