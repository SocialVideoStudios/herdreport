// Fetches Herd Report's public audience numbers and writes data/stats.json.
// Runs daily from .github/workflows/update-stats.yml. Any source that fails keeps its last known value.
import { readFile, writeFile } from 'node:fs/promises';

const FILE = new URL('../data/stats.json', import.meta.url);
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const now = new Date().toISOString();

const prev = JSON.parse(await readFile(FILE, 'utf8').catch(() => '{"platforms":{}}'));
const out = { updated: now, platforms: { ...prev.platforms } };

async function get(url, headers = {}) {
  const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9', ...headers }, redirect: 'follow' });
  if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
  return r.text();
}
// "24K" -> 24000, "5.78K" -> 5780, "9,159" -> 9159
function num(s) {
  if (s == null) return null;
  const m = String(s).replace(/,/g, '').match(/([\d.]+)\s*([KMB])?/i);
  if (!m) return null;
  const mult = { K: 1e3, M: 1e6, B: 1e9 }[(m[2] || '').toUpperCase()] || 1;
  return Math.round(parseFloat(m[1]) * mult);
}
function save(key, data) {
  const old = out.platforms[key] || {};
  const clean = Object.fromEntries(Object.entries(data).filter(([k, v]) => {
    if (v == null || Number.isNaN(v) || v === 0) return false;
    if (typeof old[k] === 'number' && old[k] > 20 && v < old[k] * 0.5) { console.log('skip', key, k, v, '(was', old[k] + ')'); return false; }
    return true;
  }));
  if (!Object.keys(clean).length) throw new Error('no numbers found');
  out.platforms[key] = { ...(out.platforms[key] || {}), ...clean, updated: now };
  console.log('ok  ', key, JSON.stringify(clean));
}

const sources = {
  async youtube() {
    if (process.env.YT_API_KEY) {
      const j = JSON.parse(await get(`https://www.googleapis.com/youtube/v3/channels?part=statistics&forHandle=herdreportpodcast&key=${process.env.YT_API_KEY}`));
      const s = j.items?.[0]?.statistics;
      return save('youtube', { subscribers: +s.subscriberCount, views: +s.viewCount, videos: +s.videoCount });
    }
    const h = await get('https://www.youtube.com/@herdreportpodcast/about', { cookie: 'CONSENT=YES+1; SOCS=CAI' });
    const subs = h.match(/"([\d.,]+[KMB]?) subscribers"/)?.[1];
    // The channel total is in "viewCountText"; individual videos also have "N views", so prefer that field, else take the largest.
    const views = h.match(/"viewCountText"\s*:\s*\{?[^}]*?"?([\d,]+) views/)?.[1]
      ?? [...h.matchAll(/"([\d,]+) views"/g)].map(m => num(m[1])).sort((a, b) => b - a)[0];
    save('youtube', { subscribers: num(subs), views: num(views) });
  },
  async instagram() {
    try {
      const j = JSON.parse(await get('https://i.instagram.com/api/v1/users/web_profile_info/?username=herdreport', { 'x-ig-app-id': '936619743392459' }));
      return save('instagram', { followers: j.data.user.edge_followed_by.count, posts: j.data.user.edge_owner_to_timeline_media.count });
    } catch (e) {
      const h = await get('https://www.instagram.com/herdreport/');
      const m = h.match(/([\d.,]+[KM]?) Followers/i);
      save('instagram', { followers: num(m?.[1]) });
    }
  },
  async facebook() {
    const h = await get('https://www.facebook.com/theherdreport', { 'user-agent': 'facebookexternalhit/1.1' });
    const m = h.match(/([\d.,]+[KM]?) followers/i);
    save('facebook', { followers: num(m?.[1]) });
  },
  async tiktok() {
    const h = await get('https://www.tiktok.com/@herd.report');
    const f = h.match(/"followerCount":(\d+)/)?.[1];
    const l = h.match(/"heartCount":(\d+)/)?.[1] || h.match(/"heart":(\d+)/)?.[1];
    save('tiktok', { followers: num(f), likes: num(l) });
  },
  async apple() {
    const h = await get('https://podcasts.apple.com/us/podcast/herd-report/id1835474334');
    const avg = h.match(/"ratingAverage":([\d.]+)/)?.[1] || h.match(/([\d.]+)\s*out of 5/)?.[1];
    const counts = [h.match(/([\d,]+)\s*Ratings?\b/)?.[1], h.match(/"ratingCount":(\d+)/)?.[1], h.match(/"totalNumberOfReviews":(\d+)/)?.[1]]
      .map(num).filter(n => n > 0);
    save('apple', { rating: avg ? +avg : null, ratings: counts.length ? Math.max(...counts) : null });
  },
  async spotify() {
    const h = await get('https://open.spotify.com/show/37IlQvHObaNPHxXoUcjEyz');
    const m = h.match(/"averageRating"\s*:\s*\{[^}]*?"average"\s*:\s*([\d.]+)[^}]*?"count"\s*:\s*(\d+)/)
      || h.match(/(\d(?:\.\d)?) stars, (\d+) ratings/);
    save('spotify', { rating: m ? +m[1] : null, ratings: m ? +m[2] : null });
  }
};

for (const [name, fn] of Object.entries(sources)) {
  try { await fn(); } catch (e) { console.log('keep', name, '-', e.message); }
}

const p = out.platforms;
out.totalFollowers = ['instagram', 'facebook', 'youtube', 'tiktok']
  .map(k => k === 'youtube' ? p.youtube?.subscribers : p[k]?.followers)
  .reduce((t, v) => t + (v || 0), 0);

// Only rewrite the file when a number actually changed, so the site isn't redeployed for nothing.
const strip = o => JSON.stringify(o, (k, v) => (k === 'updated' ? undefined : v));
if (strip(out) !== strip(prev)) {
  await writeFile(FILE, JSON.stringify(out, null, 2) + '\n');
  console.log('stats.json updated');
} else {
  console.log('no changes');
}
