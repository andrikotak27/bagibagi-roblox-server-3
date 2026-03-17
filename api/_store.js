// api/_store.js
// ─────────────────────────────────────────────────────────────────────────────
//  Shared in-memory store — dipakai oleh webhook.js dan donations.js
//  Karena Vercel serverless, buffer ini ada selama instance hidup.
//  Roblox punya ProcessedIds di DataStore sebagai backup permanen.
// ─────────────────────────────────────────────────────────────────────────────

const donationBuffer = [];
const processedIds   = new Set();
const MAX_BUFFER     = 500;
const MAX_IDS        = 2000;

function addToBuffer(donation) {
  // Cegah duplikat
  if (processedIds.has(donation.id)) return false;

  // Prune jika penuh
  if (processedIds.size >= MAX_IDS) {
    const iter = processedIds.values();
    for (let i = 0; i < 500; i++) processedIds.delete(iter.next().value);
  }
  if (donationBuffer.length >= MAX_BUFFER) {
    const removed = donationBuffer.shift();
    processedIds.delete(removed.id);
  }

  donationBuffer.push(donation);
  processedIds.add(donation.id);
  return true;
}

function removeFromBuffer(id) {
  const idx = donationBuffer.findIndex(d => d.id === id);
  if (idx !== -1) donationBuffer.splice(idx, 1);
  // Jangan hapus dari processedIds — biarkan sebagai guard duplikat
}

module.exports = { donationBuffer, processedIds, addToBuffer, removeFromBuffer };
