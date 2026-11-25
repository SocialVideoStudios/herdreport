/* Herd Report ads: shared data layer and page chrome.
   Runs on Supabase when js/config.js has keys; otherwise a demo mode that keeps data in this browser. */
(function(){
const C=window.HR_CONFIG||{};
const LIVE=!!(C.supabaseUrl&&C.supabaseAnonKey&&window.supabase);

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>v==null||v===''?'Quote':'$'+Number(v).toLocaleString('en-US',{maximumFractionDigits:0});
const fmtDate=iso=>{if(!iso)return'';const d=new Date(iso+'T12:00:00');return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})};
const shortDate=iso=>{const d=new Date(iso+'T12:00:00');return d.toLocaleDateString('en-US',{month:'short',day:'numeric'})};
const iso=d=>d.toISOString().slice(0,10);
const SLOTS=['pre','mid1','mid2','mid3','post'];
const PLACE={pre:'Pre-roll',mid1:'Mid-roll 1',mid2:'Mid-roll 2',mid3:'Mid-roll 3',post:'Post-roll'};
const SLOT_INFO={pre:'Opens the episode, before the conversation starts.',mid1:'First break in the conversation.',mid2:'Second break, in the heart of the episode.',mid3:'Third break, later in the episode.',post:'Closes the episode as listeners wrap up.'};
const STATUS={pending:'Pending review',approved:'Approved, awaiting payment',paid:'Paid',live:'Live',completed:'Completed',declined:'Declined',cancelled:'Cancelled'};
const TAKEN=['approved','paid','live'];

const DEF_SETTINGS={rates:{pre:500,mid1:350,mid2:350,mid3:350,post:250},capacity:{pre:1,mid1:1,mid2:1,mid3:1,post:1},annualDiscount:10,weeksAhead:16,releaseDay:1,
 stats:{downloads:'',views:'',followers:''},contactEmail:''};
const DEF_PACKAGES=[
 {id:'spotlight',kind:'spotlight',sort:1,active:true,price:null,unit:'per episode',name:'Spotlight Series',
  description:'A full Herd Report episode recorded at your operation ahead of your sale, released on YouTube and every podcast app.',
  features:['Scott visits your ranch and walks the offering','Full episode on YouTube, Apple and Spotify','Shared on Herd Report social channels','Released ahead of your sale date']},
 {id:'presenting',kind:'presenting',sort:2,active:true,price:23400,unit:'per year',name:'Presenting sponsor',
  description:'Own the show for a year. Your brand opens every episode with a host-read "brought to you by" from Scott.',
  features:['Pre-roll on 52 weekly episodes','"Brought to you by" from Scott','Logo on the Herd Report website','Annual discount on the weekly rate']},
 {id:'ads',kind:'ad',sort:3,active:true,price:null,unit:'per episode',name:'Episode ads',
  description:'Host-read spots in the episodes you choose. Book a single week or a run of weeks from open slots.',
  features:['Read by Scott, in his own words','Five spots per episode: pre-roll, three mid-rolls and post-roll','Pick your weeks from the live calendar','Great for sale announcements']},
 {id:'merch',kind:'merch',sort:4,active:true,price:null,unit:'custom',name:'Merch partnership',
  description:'Co-branded Herd Report gear for your sale, field day or customer appreciation event.',
  features:['Co-branded Signature Hats','Giveaways for sale-day buyers','Mention on the show','Quantities and pricing on request']}
];

const mergeSet=v=>({...DEF_SETTINGS,...v,rates:{...DEF_SETTINGS.rates,...(v.rates||{})},capacity:{...DEF_SETTINGS.capacity,...(v.capacity||{})},stats:{...DEF_SETTINGS.stats,...(v.stats||{})}});
/* upcoming release dates (weekly) */
function upcoming(n,day){const out=[];const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+1);
 while(d.getDay()!==day)d.setDate(d.getDate()+1);for(let i=0;i<n;i++){out.push(iso(d));d.setDate(d.getDate()+7)}return out}

/* ---------- demo backend (browser storage) ---------- */
const K='hr-ads-demo-v2';let mem=null;
function seed(){const w=upcoming(6,1);const now=new Date().toISOString();
 return{session:null,settings:DEF_SETTINGS,packages:DEF_PACKAGES,
 users:[{id:'u-admin',email:'admin@herdreport.com',pw:'herdadmin2026',role:'admin',company:'Herd Report',contact_name:'Scott Beck',phone:'',created_at:now},
  {id:'u-prairie',email:'demo@prairieline.co',pw:'sponsor2026',role:'client',company:'Prairie Line Feed Co.',contact_name:'Demo Sponsor',phone:'',created_at:now},
  {id:'u-bigsky',email:'demo@bigskygenetics.com',pw:'sponsor2026',role:'client',company:'Big Sky Genetics',contact_name:'Demo Buyer',phone:'',created_at:now}],
 bookings:[
  {id:'b1',client_id:'u-prairie',package_id:'ads',kind:'ad',placement:'mid1',episode_dates:[w[0],w[1]],amount:700,status:'paid',notes:'Fall mineral program, 60-second read.',creative_url:'',admin_note:'',created_at:now},
  {id:'b2',client_id:'u-bigsky',package_id:'spotlight',kind:'spotlight',placement:null,episode_dates:[],sale_date:w[5],location:'Billings, MT',amount:null,status:'pending',notes:'Bull sale preview, 80 head.',creative_url:'',admin_note:'',created_at:now},
  {id:'b3',client_id:'u-bigsky',package_id:'ads',kind:'ad',placement:'pre',episode_dates:[w[2]],amount:500,status:'approved',notes:'Sale reminder.',creative_url:'',admin_note:'Invoice sent.',created_at:now}]}}
function db(){if(mem)return mem;try{const d=JSON.parse(localStorage.getItem(K));if(d&&d.users){mem=d;return d}}catch(e){}mem=seed();put();return mem}
function put(){try{localStorage.setItem(K,JSON.stringify(mem))}catch(e){}}
const strip=u=>u&&({id:u.id,email:u.email,role:u.role,company:u.company,contact_name:u.contact_name,phone:u.phone,created_at:u.created_at});
const uid=()=>Math.random().toString(36).slice(2,10);
const wait=v=>new Promise(r=>setTimeout(()=>r(v),80));
const fail=m=>Promise.reject(new Error(m));

const Demo={
 async current(){const d=db();return wait(strip(d.users.find(u=>u.id===d.session)))},
 async signIn(email,pw){const d=db();const u=d.users.find(u=>u.email.toLowerCase()===String(email).trim().toLowerCase()&&u.pw===pw);if(!u)return fail('That email and password do not match.');d.session=u.id;put();return wait(strip(u))},
 async signUp(f){const d=db();const e=String(f.email).trim().toLowerCase();if(d.users.some(u=>u.email===e))return fail('An account with that email already exists. Sign in instead.');
  const u={id:'u-'+uid(),email:e,pw:f.password,role:'client',company:f.company,contact_name:f.contact_name,phone:f.phone||'',created_at:new Date().toISOString()};d.users.push(u);d.session=u.id;put();return wait({user:strip(u)})},
 async signOut(){const d=db();d.session=null;put();return wait()},
 async saveProfile(p){const d=db();const u=d.users.find(u=>u.id===d.session);Object.assign(u,{company:p.company,contact_name:p.contact_name,phone:p.phone});put();return wait(strip(u))},
 async packages(){return wait(structuredClone(db().packages).sort((a,b)=>a.sort-b.sort))},
 async savePackage(p){const d=db();const i=d.packages.findIndex(x=>x.id===p.id);if(i>=0)d.packages[i]=p;else d.packages.push(p);put();return wait(p)},
 async settings(){return wait(mergeSet(structuredClone(db().settings)))},
 async saveSettings(s){db().settings=s;put();return wait(s)},
 async myBookings(){const d=db();return wait(structuredClone(d.bookings.filter(b=>b.client_id===d.session)).reverse())},
 async allBookings(){const d=db();return wait(d.bookings.map(b=>({...structuredClone(b),client:strip(d.users.find(u=>u.id===b.client_id))||{}})).reverse())},
 async createBooking(b){const d=db();const nb={...b,id:'b-'+uid(),client_id:d.session,status:'pending',admin_note:'',created_at:new Date().toISOString()};d.bookings.push(nb);put();return wait(nb)},
 async updateBooking(id,patch){const d=db();const b=d.bookings.find(b=>b.id===id);Object.assign(b,patch);put();return wait(b)},
 async cancelBooking(id){const d=db();const b=d.bookings.find(b=>b.id===id&&b.client_id===d.session);if(!b||b.status!=='pending')return fail('Only pending requests can be cancelled.');b.status='cancelled';put();return wait(b)},
 async usage(){const m={};db().bookings.filter(b=>TAKEN.includes(b.status)&&b.placement).forEach(b=>b.episode_dates.forEach(dt=>{const k=dt+'|'+b.placement;m[k]=(m[k]||0)+1}));return wait(m)},
 async clients(){return wait(db().users.filter(u=>u.role==='client').map(strip))},
 reset(){mem=seed();put()}
};

/* ---------- Supabase backend ---------- */
let sb=null;
const ok=({data,error})=>{if(error)throw new Error(error.message);return data};
const Live={
 async current(){const{data:{session}}=await sb.auth.getSession();if(!session)return null;return ok(await sb.from('profiles').select('*').eq('id',session.user.id).single())},
 async signIn(email,password){ok(await sb.auth.signInWithPassword({email:String(email).trim(),password}));return Live.current()},
 async signUp(f){const r=ok(await sb.auth.signUp({email:String(f.email).trim(),password:f.password,options:{data:{company:f.company,contact_name:f.contact_name,phone:f.phone||''}}}));
  return r.session?{user:await Live.current()}:{confirm:true}},
 async signOut(){await sb.auth.signOut()},
 async saveProfile(p){const me=await Live.current();return ok(await sb.from('profiles').update({company:p.company,contact_name:p.contact_name,phone:p.phone}).eq('id',me.id).select().single())},
 async packages(){const r=ok(await sb.from('packages').select('*').order('sort'));return r.length?r:DEF_PACKAGES},
 async savePackage(p){return ok(await sb.from('packages').upsert(p).select().single())},
 async settings(){const r=ok(await sb.from('settings').select('value').eq('key','main').maybeSingle());return mergeSet(r?.value||{})},
 async saveSettings(s){ok(await sb.from('settings').upsert({key:'main',value:s}));return s},
 async myBookings(){const me=await Live.current();return ok(await sb.from('bookings').select('*').eq('client_id',me.id).order('created_at',{ascending:false}))},
 async allBookings(){const r=ok(await sb.from('bookings').select('*, client:profiles(id,email,company,contact_name,phone)').order('created_at',{ascending:false}));return r.map(b=>({...b,client:b.client||{}}))},
 async createBooking(b){const me=await Live.current();return ok(await sb.from('bookings').insert({...b,client_id:me.id,status:'pending'}).select().single())},
 async updateBooking(id,patch){return ok(await sb.from('bookings').update(patch).eq('id',id).select().single())},
 async cancelBooking(id){return ok(await sb.rpc('cancel_booking',{bid:id}))},
 async usage(){const r=ok(await sb.rpc('slot_usage'));const m={};(r||[]).forEach(x=>{m[x.episode_date+'|'+x.placement]=Number(x.n)});return m},
 async clients(){return ok(await sb.from('profiles').select('*').eq('role','client').order('created_at',{ascending:false}))}
};
if(LIVE)sb=window.supabase.createClient(C.supabaseUrl,C.supabaseAnonKey);
const API=LIVE?Live:Demo;

/* ---------- page chrome ---------- */
function chrome(active){
 const h=document.getElementById('hdr'),f=document.getElementById('ftr');
 if(h)h.innerHTML=`${LIVE?'':`<div class="demo"><b>Demo mode.</b> Accounts and bookings are saved only in this browser until the database is connected.</div>`}
 <header class="top"><div class="wrap">
  <a class="logo" href="index.html" aria-label="Herd Report home"><img class="lt" src="mark.png" alt=""><img class="dk" src="mark-light.png" alt=""><b>Herd Report</b></a>
  <nav class="nav" aria-label="Main"><a href="index.html#episodes">Episodes</a><a href="index.html#store">Shop</a><a href="advertise.html" class="${active==='advertise'?'on':''}">Advertise</a></nav>
  <a class="btn sm ${active==='account'?'solid':''}" href="account.html" id="acctbtn">Client login</a>
 </div></header>`;
 if(f)f.innerHTML=`<footer class="foot"><div class="wrap">
  <nav aria-label="Footer"><a href="index.html">Home</a><a href="index.html#episodes">Episodes</a><a href="advertise.html">Advertise</a><a href="account.html">Client login</a><a href="https://www.herdreportpodcast.com/contact/">Contact</a></nav>
  <small>© ${new Date().getFullYear()} Herd Report Podcast</small></div></footer>`;
 API.current().then(u=>{const b=document.getElementById('acctbtn');if(!b||!u)return;
  if(u.role==='admin'){b.textContent='Admin';b.href='admin.html'}else b.textContent='My account'}).catch(()=>{});
}

window.HR={API,LIVE,esc,money,fmtDate,shortDate,upcoming,SLOTS,PLACE,SLOT_INFO,STATUS,TAKEN,DEF_SETTINGS,DEF_PACKAGES,chrome};
})();
