const { readProducts, writeProducts } = require("./_lib/store");
const { requireAdmin } = require("./_lib/auth");

const CATEGORIES = ["cutting", "forming", "drilling", "turning", "cnc", "finishing"];

function slugify(title) {
  return String(title)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function validate(body) {
  const errors = {};
  if (!body.title || !String(body.title).trim()) errors.title = "Title is required.";
  if (!CATEGORIES.includes(body.category)) errors.category = "Choose a valid category.";
  if (!body.quoteMachine || !String(body.quoteMachine).trim()) {
    errors.quoteMachine = "Quote machine name is required.";
  }
  const specs = Array.isArray(body.specs)
    ? body.specs
        .filter((s) => s && String(s.label || "").trim() && String(s.value || "").trim())
        .slice(0, 3)
        .map((s) => ({ label: String(s.label).trim(), value: String(s.value).trim() }))
    : [];
  return { errors, specs };
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    const products = await readProducts();
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(products);
  }

  if (!requireAdmin(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const products = await readProducts();
  const body = req.body || {};

  if (req.method === "POST") {
    const { errors, specs } = validate(body);
    if (Object.keys(errors).length) return res.status(400).json({ errors });

    const baseId = slugify(body.title) || "product";
    let id = baseId;
    let n = 2;
    while (products.some((p) => p.id === id)) {
      id = `${baseId}-${n++}`;
    }

    const product = {
      id,
      category: body.category,
      title: String(body.title).trim(),
      image: body.image || null,
      badge: body.badge ? String(body.badge).trim() : "",
      specs,
      quoteMachine: String(body.quoteMachine).trim(),
    };
    products.push(product);
    await writeProducts(products);
    return res.status(201).json(product);
  }

  const id = req.query.id;

  if (req.method === "PUT") {
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) return res.status(404).json({ error: "Product not found." });

    const { errors, specs } = validate(body);
    if (Object.keys(errors).length) return res.status(400).json({ errors });

    products[idx] = {
      ...products[idx],
      category: body.category,
      title: String(body.title).trim(),
      image: body.image !== undefined ? body.image || null : products[idx].image,
      badge: body.badge !== undefined ? String(body.badge).trim() : products[idx].badge,
      specs,
      quoteMachine: String(body.quoteMachine).trim(),
    };
    await writeProducts(products);
    return res.status(200).json(products[idx]);
  }

  if (req.method === "DELETE") {
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) return res.status(404).json({ error: "Product not found." });
    products.splice(idx, 1);
    await writeProducts(products);
    return res.status(204).end();
  }

  res.setHeader("Allow", "GET, POST, PUT, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
};
