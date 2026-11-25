// One-time (re-runnable) import of blog posts and past guests from the current Podpage site.
// Writes data/blog.json, data/guests.json and downloads guest photos to img/guests/.
// Run from GitHub: Actions -> "Import blog and guests" -> Run workflow.
import { writeFile, mkdir } from 'node:fs/promises';
import { parse } from 'node-html-parser';

const BASE = 'https://www.herdreportpodcast.com';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(u) {
  const url = u.startsWith('http') ? u : BASE + u;
  for (let i = 0; i < 6; i++) {
    await sleep(2500);
    const r = await fetch(url, { headers: { 'user-agent': UA } });
    if (r.ok) return r.text();
    if (r.status !== 429 && r.status < 500) throw new Error(`${u} ${r.status}`);
    const wait = (Number(r.headers.get('retry-after')) || 15 * (i + 1)) * 1000;
    console.log('waiting', wait / 1000, 's for', u); await sleep(wait);
  }
  throw new Error(`${u} gave up`);
}
const ALLOWED = new Set(['p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'a', 'blockquote', 'br']);

// Keep only simple formatting tags; drop every attribute except a safe href.
function clean(node) {
  let out = '';
  for (const c of node.childNodes) {
    if (c.nodeType === 3) { out += c.rawText.replace(/</g, '&lt;'); continue; }
    if (c.nodeType !== 1) continue;
    const tag = c.rawTagName?.toLowerCase();
    const inner = clean(c);
    if (!ALLOWED.has(tag)) { out += inner; continue; }
    if (tag === 'br') { out += '<br>'; continue; }
    if (tag === 'a') {
      let href = c.getAttribute('href') || '';
      if (href.startsWith('/')) href = BASE + href;
      out += /^https?:\/\//.test(href) ? `<a href="${href.replace(/"/g, '&quot;')}" target="_blank" rel="noopener">${inner}</a>` : inner;
      continue;
    }
    const t = tag === 'b' ? 'strong' : tag === 'i' ? 'em' : tag;
    if (inner.trim()) out += `<${t}>${inner}</${t}>`;
  }
  return out;
}
const text = h => h.replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/\s+/g, ' ').trim();

function parseDate(s) {
  const m = String(s).replace('Sept.', 'Sep').replace(/\./g, '').trim();
  const d = new Date(m);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

async function blog() {
  const doc = parse(await get('/blog/'));
  const slugs = [...new Set(doc.querySelectorAll('a').map(a => a.getAttribute('href') || '')
    .map(h => h.replace(BASE, '')).filter(h => /^\/blog\/[^/]+\/$/.test(h)))];
  const posts = [];
  for (const s of slugs) {
    try {
      const d = parse(await get(s));
      const body = d.querySelector('.post-content-body') || d.querySelector('.content-body');
      if (!body) throw new Error('no body');
      const html = clean(body);
      posts.push({
        slug: s.split('/')[2],
        title: d.querySelector('h1')?.text.trim(),
        date: parseDate(d.querySelector('.content-publish-date')?.text || ''),
        excerpt: text(html).slice(0, 260).replace(/\s\S*$/, '') + '…',
        minutes: Math.max(1, Math.round(text(html).split(' ').length / 220)),
        html
      });
      console.log('post', s);
    } catch (e) { console.log('skip post', s, e.message); }
  }
  posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return posts;
}

async function guests() {
  const doc = parse(await get('/guests/'));
  const cards = new Map();
  for (const a of doc.querySelectorAll('a')) {
    const h = (a.getAttribute('href') || '').replace(BASE, '');
    if (!/^\/guests\/[^/]+\/$/.test(h) || /intake/.test(h)) continue;
    const img = a.querySelector('img');
    if (img && !cards.has(h)) {
      const set = (img.getAttribute('srcset') || '').split(',').map(x => x.trim().split(' ')[0]).filter(Boolean);
      cards.set(h, set.find(u => /768/.test(u)) || set[0] || img.getAttribute('src'));
    } else if (!cards.has(h)) cards.set(h, null);
  }
  await mkdir(new URL('../img/guests/', import.meta.url), { recursive: true });
  const epTitles = {};
  const out = [];
  for (const [h, imgUrl] of cards) {
    try {
      const d = parse(await get(h));
      const slug = h.split('/')[2];
      const body = d.querySelector('.bio') || d.querySelector('.content-body');
      const bioHtml = body ? clean(body).replace(/<p>\s*\d+ \/ \d+\s*<\/p>/g, '').replace(/([a-z])\.([A-Z][a-z])/g, '$1. $2').replace(/\s{2,}/g, ' ').trim() : '';
      const eps = [...new Set(d.querySelectorAll('a').map(a => (a.getAttribute('href') || '').replace(BASE, ''))
        .filter(x => /^\/[a-z0-9-]+\/$/.test(x) && !/^\/(guests|blog|episodes|contact|about|follow|reviews|search)\//.test(x)))];
      const episodes = [];
      for (const e of eps) {
        if (!epTitles[e]) { try { epTitles[e] = parse(await get(e)).querySelector('h1')?.text.trim(); } catch { epTitles[e] = null; } }
        if (epTitles[e]) episodes.push({ title: epTitles[e], url: BASE + e });
      }
      let photo = '';
      if (imgUrl) {
        try {
          await sleep(1000); const r = await fetch(imgUrl, { headers: { 'user-agent': UA } });
          if (r.ok) { const ext = /webp/.test(imgUrl) ? 'webp' : 'jpg'; photo = `img/guests/${slug}.${ext}`; await writeFile(new URL('../' + photo, import.meta.url), Buffer.from(await r.arrayBuffer())); }
        } catch (e) { console.log('no photo', slug, e.message); }
      }
      let name = d.querySelector('h1')?.text.trim() || slug;
      if (name === name.toLowerCase()) name = name.replace(/\b\w/g, c => c.toUpperCase());
      out.push({ slug, name, photo, bio: bioHtml, summary: text(bioHtml).slice(0, 200).replace(/\s\S*$/, '') + (text(bioHtml).length > 200 ? '…' : ''), episodes });
      console.log('guest', slug, photo ? 'with photo' : 'no photo', episodes.length, 'episodes');
    } catch (e) { console.log('skip guest', h, e.message); }
  }
  return out;
}

const [posts, people] = [await blog(), await guests()];
if (posts.length) await writeFile(new URL('../data/blog.json', import.meta.url), JSON.stringify(posts, null, 2) + '\n');
if (people.length) await writeFile(new URL('../data/guests.json', import.meta.url), JSON.stringify(people, null, 2) + '\n');
console.log(`done: ${posts.length} posts, ${people.length} guests`);
