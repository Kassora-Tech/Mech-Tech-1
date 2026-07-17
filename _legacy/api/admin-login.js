const crypto = require("crypto");
const { setSessionCookie } = require("./_lib/auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return res.status(500).json({ error: "Admin password is not configured on the server." });
  }

  const password = (req.body || {}).password;
  const a = Buffer.from(typeof password === "string" ? password : "");
  const b = Buffer.from(expected);
  const match = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!match) {
    return res.status(401).json({ error: "Incorrect password." });
  }

  setSessionCookie(res);
  return res.status(200).json({ ok: true });
};
