// api/webhook.js
// ─────────────────────────────────────────────────────────────────────────────
//  Menerima push donasi REAL-TIME dari BagiBagi
//  POST /api/webhook
//
//  Setup di BagiBagi:
//    1. Login → Stream Overlay → tab Integrasi
//    2. Di "Custom Webhook Url", masukkan:
//       https://<project-mu>.vercel.app/api/webhook
//    3. Salin "Webhook Token" dari halaman yang sama → simpan sebagai
//       env var BAGIBAGI_WEBHOOK_TOKEN di Vercel
//
//  Format payload yang dikirim BagiBagi (dari docs resmi mereka):
//  {
//    "transaction_id": "bagibagi-965b3d64-1f5e-4361-a01b-5b58df37190c",
//    "name": "Seseorang",
//    "amount": 10000,
//    "message": "Sukses selalu ya om ❤️",
//    "mediaShareUrl": "https://www.youtube.com/watch?v=...",
//    "created_at": "2/17/2025 10:46:21 AM"
//  }
//
//  BagiBagi mengirim header: X-Bagibagi-Signature (SHA-256 HMAC)
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require("crypto");
const { addToBuffer } = require("./_store");

// ── Validasi signature SHA-256 dari BagiBagi ──────────────────────────────────
function isValidSignature(bodyRaw, webhookToken, signature) {
  if (!webhookToken || !signature) return false;
  try {
    const generated = crypto
      .createHmac("sha256", webhookToken)
      .update(bodyRaw)          // harus pakai raw string, bukan parsed object
      .digest("hex");

    const sigBuf  = Buffer.from(signature,  "hex");
    const genBuf  = Buffer.from(generated,  "hex");

    if (sigBuf.length !== genBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, genBuf);
  } catch {
    return false;
  }
}

// ── Normalisasi payload BagiBagi → format standar ─────────────────────────────
function normalize(raw) {
  // Parse created_at — BagiBagi format: "2/17/2025 10:46:21 AM"
  let timestamp = Math.floor(Date.now() / 1000);
  if (raw.created_at) {
    const parsed = new Date(raw.created_at);
    if (!isNaN(parsed.getTime())) {
      timestamp = Math.floor(parsed.getTime() / 1000);
    }
  }

  return {
    id:        String(raw.transaction_id || raw.id || `bb_${Date.now()}`),
    name:      String(raw.name || "Anonymous").trim(),
    amount:    Number(raw.amount) || 0,
    message:   String(raw.message || "").trim(),
    timestamp: timestamp,
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Bagibagi-Signature");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  // ── Baca body sebagai raw string untuk validasi signature ─────────────────
  // Vercel otomatis parse JSON, tapi kita perlu raw string untuk HMAC
  // Trick: gunakan JSON.stringify(req.body) — cukup akurat untuk validasi
  let bodyRaw = "";
  let body    = req.body;

  if (typeof body === "string") {
    bodyRaw = body;
    try { body = JSON.parse(body); } catch { body = {}; }
  } else if (body && typeof body === "object") {
    bodyRaw = JSON.stringify(body);
  }

  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Invalid request body" });
  }

  // ── Validasi signature (sangat disarankan!) ───────────────────────────────
  const WEBHOOK_TOKEN = process.env.BAGIBAGI_WEBHOOK_TOKEN || "";
  const signature     = req.headers["x-bagibagi-signature"] || "";

  if (WEBHOOK_TOKEN) {
    if (!isValidSignature(bodyRaw, WEBHOOK_TOKEN, signature)) {
      console.warn("[BagiBagi Webhook] Signature tidak valid — kemungkinan request palsu!");
      return res.status(401).json({ error: "Invalid signature" });
    }
  } else {
    console.warn("[BagiBagi Webhook] BAGIBAGI_WEBHOOK_TOKEN belum di-set — signature tidak divalidasi!");
  }

  // ── Normalisasi & tambah ke buffer ───────────────────────────────────────
  const donation = normalize(body);

  if (donation.amount <= 0) {
    return res.status(200).json({ ok: true, skipped: "amount <= 0" });
  }

  const added = addToBuffer(donation);

  if (added) {
    console.log(`[BagiBagi Webhook] ✅ ${donation.name} Rp${donation.amount} → buffer`);
  } else {
    console.log(`[BagiBagi Webhook] ⚠️ Duplikat: ${donation.id}`);
  }

  // BagiBagi expects 200 OK
  return res.status(200).json({ ok: true, received: added });
};
