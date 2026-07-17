const { list, put } = require("@vercel/blob");
const seed = require("../../data/products-seed.json");

const PATH = "data/products.json";

async function readProducts() {
  const { blobs } = await list({ prefix: PATH, limit: 1 });
  const blob = blobs.find((b) => b.pathname === PATH);
  if (!blob) return seed;
  const res = await fetch(blob.url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to read products blob");
  return res.json();
}

async function writeProducts(products) {
  await put(PATH, JSON.stringify(products, null, 2), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    cacheControlMaxAge: 0,
    allowOverwrite: true,
  });
}

module.exports = { readProducts, writeProducts };
