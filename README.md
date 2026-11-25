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

## Advertising, client accounts and admin

- `advertise.html`: the ad shop. Five episode ad spots (Pre-roll, Mid-roll 1, 2 and 3, Post-roll), each its own product with its own weeks, plus Spotlight Series, Presenting sponsor and Merch partnership. Visitors fill a cart first and only create an account at checkout.
- `account.html`: client login. Clients track their requests, approvals and invoices.
- `guest.html`: Be a guest application. No account needed; applications land in the admin **Guests** tab.
- `admin.html`: Scott's dashboard. Review and approve requests, set quotes, mark paid, see the ad calendar, manage clients, edit packages, prices and audience numbers.

### Demo mode
Until a database is connected, everything runs in **demo mode**: accounts and bookings are saved only in the visitor's own browser, and a yellow banner says so. Demo logins:
- Client: `demo@prairieline.co` / `sponsor2026`
- Admin: `admin@herdreport.com` / `herdadmin2026`

The sample sponsors (Prairie Line Feed Co., Big Sky Genetics) are made-up demo data.

### Going live with Supabase (free tier is enough to start)
1. Create a project at supabase.com.
2. In the project, open **SQL Editor**, paste all of `supabase/schema.sql`, and run it. This creates the tables, security rules, starting packages and prices.
3. Open **Project Settings → API**, copy the **Project URL** and **anon public key** into `js/config.js`, and push. The demo banner disappears and real accounts take over.
4. Under **Authentication → URL Configuration**, set the Site URL to the live site (for example `https://socialvideostudios.github.io/herdreport/`).
5. Scott signs up on `account.html`, then in the SQL Editor run:
   `update public.profiles set role = 'admin' where email = 'SCOTTS EMAIL';`
   He can then sign in at `admin.html`.

The anon key is designed to be public. The row-level security rules in `schema.sql` make sure clients only ever see their own bookings and only admins can approve, price or edit anything.

### Not built yet
- Card payments: the "Pay invoice" button is disabled until Stripe is connected. For now Scott invoices outside the site and marks bookings paid in the dashboard.
- Email notifications for new requests and approvals (Supabase can send these with a database webhook or an Edge Function).
- File uploads: clients share a link to their logo or files instead.

## Audience numbers (updated automatically)
The homepage stats (Instagram, Facebook, YouTube, TikTok, Apple Podcasts, Spotify) come from `data/stats.json`.
A GitHub Action (`.github/workflows/update-stats.yml`) runs `scripts/update-stats.mjs` every day, reads each platform's public page and commits new numbers when they change. The site then redeploys on its own.
- Run it any time: GitHub → **Actions** → **Update audience stats** → **Run workflow**.
- If a platform blocks the lookup, the last known number stays on the site; the job log shows `keep` for that platform.
- For exact YouTube numbers, add a free YouTube Data API key as a repository secret named `YT_API_KEY`.
