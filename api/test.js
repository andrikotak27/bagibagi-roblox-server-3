// api/test.js
// ─────────────────────────────────────────────────────────────────────────────
//  Inject donasi test manual — untuk ngecek apakah pipeline ke Roblox jalan
//  POST /api/test?secret=<BAGIBAGI_WEBHOOK_TOKEN>
//  Body: { "name": "TestBudi", "amount": 50000, "message": "Test!" }
// ─────────────────────────────────────────────────────────────────────────────

const { addToBuffer, donationBuffer } = require("./_store");

module.exports = function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // Wajib ada secret yang cocok dengan BAGIBAGI_WEBHOOK_TOKEN
  const TOKEN = process.env.BAGIBAGI_WEBHOOK_TOKEN || "";
  const secret = req.query.secret || req.headers["x-secret"] || "";
  if (TOKEN && secret !== TOKEN) {
    return res.status(401).json({ error: "Unauthorized — tambahkan ?secret=TOKEN_mu" });
  }

  if (req.method === "GET") {
    return res.status(200).json({
      info:         "POST ke sini untuk inject donasi test",
      buffer_count: donationBuffer.length,
      latest:       donationBuffer.slice(-5),
      example: {
        method: "POST",
        url:    "/api/test?secret=TOKEN_MU",
        body:   { name: "TestBudi", amount: 50000, message: "Test!" },
      },
    });
  }

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const donation = {
    id:        "test_" + Date.now(),
    name:      String(body.name    || "TestUser"),
    amount:    Number(body.amount  || 10000),
    message:   String(body.message || "Test donation"),
    timestamp: Math.floor(Date.now() / 1000),
  };

  const added = addToBuffer(donation);
  console.log(`[Test] Injected: ${donation.name} Rp${donation.amount} | added=${added}`);

  return res.status(200).json({ ok: true, added, donation });
};
