// api/health.js
// Buka di browser untuk cek apakah server jalan dan env sudah benar
// GET /api/health

const { donationBuffer } = require("./_store");

module.exports = function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json({
    status:       "ok",
    service:      "BagiBagi → Roblox Bridge v2",
    timestamp:    new Date().toISOString(),
    buffer_count: donationBuffer.length,
    env_check: {
      BAGIBAGI_WEBHOOK_TOKEN: !!process.env.BAGIBAGI_WEBHOOK_TOKEN,
    },
  });
};
