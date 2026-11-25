# Herd Report website

The Herd Report podcast homepage and hat store, modeled on newheightshow.com.

It's a static site: open `index.html`, or serve the folder from any static host (GitHub Pages, Netlify, Vercel).

## Files
- `index.html`: the whole site (markup, styles and scripts)
- `logo.png`, `logo-light.png`: full Herd Report logo (dark and light versions)
- `mark.png`, `mark-light.png`: HR monogram
- `hats/`: Signature Hat product photos, one per colorway

## Notes
- Episode cards play YouTube videos in place on a real web host. Opened as a local file, they link out to YouTube instead.
- Checkout is a placeholder until Stripe is connected; it links to a prefilled Shopify cart in the meantime.
- The cart is saved in the visitor's browser.
