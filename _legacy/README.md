# Mech-Tech Machine Tool Specialists — MVP Homepage

Launch-ready, conversion-focused homepage redesign. Static HTML + CSS + vanilla JS — no build step, hosts anywhere (cPanel, Netlify, Vercel, shared hosting).

## Files

| File | Purpose |
|---|---|
| `index.html` | Full homepage (all 7 sections, SVG icon sprite, quote modal, JSON-LD) |
| `css/styles.css` | Design system + all components (tokens at the top of the file) |
| `js/main.js` | Sticky header, mobile nav, scroll reveal, video embed, quote modal |
| `images/favicon.svg` | Favicon — navy plate + wireframe gear from the logo |

## Run locally

```
npx serve .
```

## Before launch — checklist

1. **WhatsApp number** — currently uses the main line `+27 87 503 9801` (`wa.me/27875039801`).
   Confirm the dedicated WhatsApp line with the client and update it in **two places**:
   - `js/main.js` → `WHATSAPP_NUMBER`
   - `index.html` → the two `wa.me/...` links (CTA banner + floating button)
2. **Logo** — header/footer use `images/logo.png` (official logo, processed: background made
   transparent, trimmed, downscaled to 480×160 from the source file `mech-tech logo.png` in the
   project root). Favicon is `images/favicon.svg` (navy plate + gear drawn to match the logo).
3. **Product photography** — category/featured cards ship with branded SVG placeholders.
   To use real photos, drop optimized WebP images (~600×450, category) into `images/` and add inside each `.card__media`:
   ```html
   <img src="images/bandsaws.webp" alt="Industrial bandsaw" loading="lazy" width="600" height="450">
   ```
   The CSS already positions the `<img>` to cover the card; the SVG icon underneath simply gets covered.
4. **Quote form backend (optional)** — the form currently hands off to WhatsApp with a formatted message
   (zero-backend, works day one). To also capture leads by email, wire the `submit` handler in
   `js/main.js` to Formspree/Basin/your own endpoint.
5. **Featured machines** — the four featured products are representative examples; swap names/specs
   for actual current stock in `index.html` (`#featured` section).
6. **Western Cape phone** — the site lists `+27 87 503 9801` for CPT (shared national line); confirm
   if the branch has a direct number.

## Design system

Defined as CSS custom properties in `css/styles.css`:

- Primary `#0B2C6B` · Secondary `#154C9C` · Accent `#1E6BFF`
- Background `#071526` · Surface `#102845` · Text `#FFFFFF` · Muted `#B9C7D9`
- Radius `16px` · Card shadow `0 12px 40px rgba(0,0,0,.35)`
- Fonts: Barlow Condensed (display) / Barlow (body), Google Fonts

## Reusable components

- **Product/category card**: `.card` (+`.product-card`) — media area, title, spec line, quote button
- **CTA buttons**: `.btn` with `--primary`, `--ghost`, `--whatsapp`, `--sm`, `--block` modifiers
- **Quote trigger**: any element with `data-quote` (+ optional `data-machine="..."`) opens the modal pre-filled

## Accessibility & performance

- WCAG AA contrast throughout, visible focus rings, skip link, modal focus trap + Esc
- `prefers-reduced-motion` disables all animation
- YouTube embed loads only on play click (no third-party JS on page load)
- Single icon sprite, two font files, no frameworks — first paint is one HTML + one CSS request
