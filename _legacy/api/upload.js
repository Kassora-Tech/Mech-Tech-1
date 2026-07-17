const { put } = require("@vercel/blob");
const { requireAdmin } = require("./_lib/auth");

const ALLOWED_TYPES = ["image/webp", "image/png", "image/jpeg"];
const MAX_BYTES = 4 * 1024 * 1024; // 4MB — admin.js resizes images before sending

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireAdmin(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { filename, contentType, dataUrl } = req.body || {};

  if (!contentType || !ALLOWED_TYPES.includes(contentType)) {
    return res.status(400).json({ error: "Only WebP, PNG or JPEG images are allowed." });
  }
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
    return res.status(400).json({ error: "Missing image data." });
  }

  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length > MAX_BYTES) {
    return res.status(400).json({ error: "Image is too large (max 4MB)." });
  }

  const ext = contentType.split("/")[1];
  const safeName = String(filename || "product")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/(^-|-$)/g, "") || "product";
  const pathname = `products/${Date.now()}-${safeName}.${ext}`;

  const blob = await put(pathname, buffer, {
    access: "public",
    contentType,
    addRandomSuffix: false,
  });

  return res.status(200).json({ url: blob.url });
};
