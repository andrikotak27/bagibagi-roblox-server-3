// api/health.js
const { kv } = require("@vercel/kv");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  let kvStatus = "unknown";
  let buffered = 0;
  try {
    buffered = await kv.llen("donations") || 0;
    kvStatus = "connected";
  } catch (err) {
    kvStatus = "error: " + err.message;
  }

  res.status(200).json({
    status:    "ok",
    service:   "BagiBagi → Roblox Bridge v3 (KV)",
    timestamp: new Date().toISOString(),
    kv_status: kvStatus,
    buffered:  buffered,
    env_check: {
      BAGIBAGI_WEBHOOK_TOKEN: !!process.env.BAGIBAGI_WEBHOOK_TOKEN,
      KV_REST_API_URL:        !!process.env.KV_REST_API_URL,
      KV_REST_API_TOKEN:      !!process.env.KV_REST_API_TOKEN,
    },
  });
};
