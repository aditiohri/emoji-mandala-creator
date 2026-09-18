# Roadmap

Shipped: easier palette building (native emoji keyboard entry + full
emoji-library browser), on-screen zoom (desktop only), a clearer
desktop save flow, and a separate Share button.

Still open, roughly in the order we'd tackle them:

## 1. Ring-direction / rotate-outward bug

"Alternate ring direction" and "Rotate emoji outward" don't visibly do
what they're supposed to. Needs debugging (not a redesign) — the
`faceOutward` rotation math in `draw()` checks out on paper, so the
actual cause is still unknown and needs to be found by testing in the
browser, not just reading the code.

## 2. Default to most-used emoji on phone

On phone, default the palette to whichever emoji the person actually
uses most, instead of the fixed `DEFAULT_PALETTE`. Needs: a way to
detect "on phone" (already have a touch-device check in `index.html`),
and persistence of usage counts across sessions (`localStorage`).

## 3. Paid tier: personal gallery + PDF export

Biggest unknown, not yet scoped. Open questions before this can get a
real design:

- A gallery of saved mandalas means *somewhere to save them* — this
  app has no backend today. Per-device (`localStorage`/IndexedDB,
  free but not synced across devices) vs. real accounts + storage
  (synced, but a real backend to build and pay for)?
- What does "paid" actually gate, and how — a one-time unlock, a
  subscription, a simple client-side flag? Needs a payment processor
  either way (e.g. Stripe), which is new infrastructure for a
  currently static, serverless site.
- PDF export is more self-contained (can likely be done client-side,
  e.g. rendering the canvas into a PDF via a small library) and could
  ship independently of the gallery/accounts question.
