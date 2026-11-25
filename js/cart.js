/* Herd Report shared cart: hats and ad spots in one cart, one checkout.
   Needs js/app.js (window.HR). Pages listen for the "hr-cart" event to update their badges. */
(function(){
const KEY='hr-cart-v2';
let items=[];
try{items=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){items=null}
if(!Array.isArray(items)){items=[];try{const a=JSON.parse(localStorage.getItem('hr-ad-cart')||'[]');if(Array.isArray(a))items.push(...a)}catch(e){}}
let pkgs=[],st=null,ready=null,step='cart',authMode='new',notes='',files='';
const H=()=>window.HR;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>document.getElementById(id);
const emit=()=>window.dispatchEvent(new CustomEvent('hr-cart'));
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(items))}catch(e){}emit()};
const load=()=>ready||(ready=Promise.all([H().API.packages(),H().API.settings()]).then(([p,s])=>{pkgs=p;st=s}));
const pkg=id=>pkgs.find(p=>p.id===id)||{};
const presentDates=s=>{const out=[];const d=new Date(s+'T12:00:00');for(let i=0;i<52;i++){out.push(d.toISOString().slice(0,10));d.setDate(d.getDate()+7)}return out};
const isAd=it=>it.type!=='hat';

function price(it){
 if(it.type==='hat')return it.price*it.qty;
 if(it.type==='slot')return st?it.dates.length*st.rates[it.slot]:0;
 const p=pkg(it.type);return p.price==null||p.price===''?null:Number(p.price);
}
function label(it){return it.type==='hat'?`${it.name} Signature Hat`:it.type==='slot'?H().PLACE[it.slot]:(pkg(it.type).name||it.type)}
function desc(it){
 const {fmtDate,shortDate}=H();
 if(it.type==='hat')return `${H().money(it.price)} each`;
 if(it.type==='slot')return `${it.dates.length} episode${it.dates.length===1?'':'s'}: ${it.dates.map(shortDate).join(', ')}`;
 if(it.type==='presenting')return `52 weekly episodes starting ${fmtDate(it.start)}`;
 if(it.type==='spotlight')return [it.sale_date?'Sale '+fmtDate(it.sale_date):'Sale date to be confirmed',it.location].filter(Boolean).join(' · ');
 return [it.event?'Event '+fmtDate(it.event):'',it.qty?it.qty+' hats':''].filter(Boolean).join(' · ')||'Details to be confirmed';
}
function totals(){let sum=0,quotes=0;items.forEach(it=>{const p=price(it);p==null?quotes++:sum+=p});return{sum,quotes}}
const count=()=>items.reduce((t,it)=>t+(it.type==='hat'?it.qty:1),0);

/* ---------- drawer ---------- */
function inject(){
 if($('hrcDrawer'))return;
 const css=document.createElement('style');css.textContent=`
.hrc-scrim{position:fixed;inset:0;background:rgb(0 0 0/.45);z-index:60;opacity:0;pointer-events:none;transition:opacity .2s}
.hrc-drawer{position:fixed;top:0;right:0;bottom:0;width:min(480px,100%);background:var(--bg,#F3EFE7);color:var(--ink,#0B0B0D);border-left:2px solid var(--line,#0B0B0D);z-index:61;transform:translateX(100%);transition:transform .25s;display:flex;flex-direction:column;font:16px/1.5 "IBM Plex Sans",system-ui,sans-serif}
body.hrc-open .hrc-scrim{opacity:1;pointer-events:auto}body.hrc-open .hrc-drawer{transform:none}
.hrc-top{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:2px solid var(--line,#0B0B0D)}
.hrc-top h2{font:900 28px/1 Archivo,sans-serif;text-transform:uppercase;margin:0}
.hrc-x{width:44px;height:44px;border-radius:50%;border:2px solid var(--line,#0B0B0D);background:none;color:inherit;font-size:22px;cursor:pointer}
.hrc-body{flex:1;overflow:auto;padding:12px 20px}
.hrc-foot{padding:16px 20px 22px;border-top:2px solid var(--line,#0B0B0D)}
.hrc-grp{font:700 12px Archivo,sans-serif;text-transform:uppercase;color:var(--soft,#5a5450);margin:14px 0 2px}
.hrc-line{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:2px 12px;align-items:center;padding:12px 0;border-bottom:1px solid rgb(11 11 13/.12)}
.hrc-th{grid-row:span 3;width:56px;height:46px;border-radius:10px;overflow:hidden;background:#fff}
.hrc-th img{width:100%;height:100%;object-fit:contain}
.hrc-th.ad{background:#85272C;color:#F3EFE7;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px}
.hrc-th.ad svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.hrc-th.ad i{font:900 9px Archivo,sans-serif;font-style:normal;text-transform:uppercase;letter-spacing:.04em;line-height:1}
.hrc-line b{font:900 16px Archivo,sans-serif;text-transform:uppercase}
.hrc-line .p{font:900 16px Archivo,sans-serif;white-space:nowrap;text-align:right}
.hrc-line .d{grid-column:2/-1;font-size:14px;color:var(--soft,#5a5450)}
.hrc-line .a{grid-column:2/-1;display:flex;gap:14px;align-items:center}
.hrc-line.noimg{grid-template-columns:minmax(0,1fr) auto}.hrc-line.noimg .d,.hrc-line.noimg .a{grid-column:1/-1}
.hrc-q{display:inline-flex;align-items:center;gap:2px}
.hrc-q button{width:32px;height:32px;border-radius:50%;border:2px solid var(--line,#0B0B0D);background:none;color:inherit;font-size:16px;cursor:pointer}
.hrc-q output{min-width:22px;text-align:center;font-weight:600}
.hrc-link{background:none;border:0;padding:0;font:inherit;font-size:14px;color:var(--red,#85272C);text-decoration:underline;cursor:pointer}
.hrc-tot{display:flex;justify-content:space-between;align-items:baseline;font:900 24px Archivo,sans-serif;text-transform:uppercase;margin-bottom:4px}
.hrc-foot small{display:block;color:var(--soft,#5a5450);font-size:13px;margin:0 0 12px}
.hrc-btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 22px;border-radius:999px;font:700 15px Archivo,sans-serif;text-transform:uppercase;border:2px solid var(--line,#0B0B0D);background:none;color:inherit;cursor:pointer;text-decoration:none;width:100%}
.hrc-btn.solid{background:var(--red,#85272C);border-color:var(--red,#85272C);color:var(--cream,#F3EFE7)}
.hrc-btn[disabled]{opacity:.5;cursor:not-allowed}
.hrc-row{display:flex;gap:10px}.hrc-row .hrc-btn:first-child{width:auto}
.hrc-f{margin:12px 0}
.hrc-f label{display:block;font-weight:600;font-size:14px;margin:0 0 6px}
.hrc-f input,.hrc-f textarea{width:100%;box-sizing:border-box;font:16px "IBM Plex Sans",sans-serif;color:inherit;background:var(--bg,#F3EFE7);border:2px solid var(--line,#0B0B0D);border-radius:12px;padding:10px 14px;min-height:46px}
.hrc-f textarea{min-height:84px;resize:vertical}
.hrc-2{display:grid;grid-template-columns:1fr 1fr;gap:0 12px}
.hrc-err{color:#a3141c;font-size:14px;min-height:1em;margin:6px 0 0}
.hrc-note{font-size:14px;color:var(--soft,#5a5450);margin:10px 0}
.hrc-card{border:2px solid var(--line,#0B0B0D);border-radius:14px;padding:14px;margin-top:16px;font-size:14px}
.hrc-done{text-align:center;padding:36px 6px}.hrc-done h3{font:900 28px Archivo,sans-serif;text-transform:uppercase;margin:0 0 10px}
.hrc-empty{color:var(--soft,#5a5450);padding:20px 0}
@media(max-width:420px){.hrc-2{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){.hrc-drawer,.hrc-scrim{transition:none}}`;
 document.head.appendChild(css);
 document.body.insertAdjacentHTML('beforeend',`<div class="hrc-scrim" id="hrcScrim"></div>
 <aside class="hrc-drawer" id="hrcDrawer" aria-label="Cart" aria-hidden="true"><div class="hrc-top"><h2 id="hrcTitle">Your cart</h2><button class="hrc-x" id="hrcClose" aria-label="Close cart">×</button></div>
 <div class="hrc-body" id="hrcBody"></div><div class="hrc-foot" id="hrcFoot"></div></aside>`);
 $('hrcClose').onclick=close;$('hrcScrim').onclick=close;
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('hrc-open')&&!document.querySelector('.modal.open'))close()});
}
function open(){inject();step='cart';document.body.classList.add('hrc-open');$('hrcDrawer').setAttribute('aria-hidden','false');load().then(draw);draw();$('hrcClose').focus();emit()}
function close(){if(!$('hrcDrawer'))return;document.body.classList.remove('hrc-open');$('hrcDrawer').setAttribute('aria-hidden','true');emit()}
const isOpen=()=>document.body.classList.contains('hrc-open');

function line(it,i){
 const p=price(it);const money=H().money;
 if(it.type==='hat')return `<div class="hrc-line"><span class="hrc-th">${it.img?`<img src="${esc(it.img)}" alt="">`:''}</span><b>${esc(label(it))}</b><span class="p">${money(p)}</span>
  <span class="d">${esc(desc(it))}</span><span class="a"><span class="hrc-q"><button data-q="-1" data-i="${i}" aria-label="One fewer">−</button><output>${it.qty}</output><button data-q="1" data-i="${i}" aria-label="One more">+</button></span><button class="hrc-link" data-rm="${i}">Remove</button></span></div>`;
 const tag=it.type==='slot'?({pre:'Pre',mid1:'Mid 1',mid2:'Mid 2',mid3:'Mid 3',post:'Post'}[it.slot]||'Ad'):'Package';
 return `<div class="hrc-line"><span class="hrc-th ad" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/></svg><i>${tag}</i></span><b>${esc(label(it))}</b><span class="p">${p==null?'Quote':money(p)}</span><span class="d">${esc(desc(it))}</span>
  <span class="a">${Cart.onEdit?`<button class="hrc-link" data-ed="${i}">Edit</button>`:''}<button class="hrc-link" data-rm="${i}">Remove</button></span></div>`;
}
function draw(){
 if(!$('hrcDrawer'))return;
 const money=H().money;const {sum,quotes}=totals();const hasAd=items.some(isAd);
 if(step==='done')return;
 if(step==='cart'){
  $('hrcTitle').textContent='Your cart';
  const hats=items.map((it,i)=>[it,i]).filter(([it])=>it.type==='hat'),ads=items.map((it,i)=>[it,i]).filter(([it])=>isAd(it));
  $('hrcBody').innerHTML=items.length?
   (hats.length?`<p class="hrc-grp">Merch</p>${hats.map(([it,i])=>line(it,i)).join('')}`:'')+
   (ads.length?`<p class="hrc-grp">Advertising</p>${ads.map(([it,i])=>line(it,i)).join('')}
    <div class="hrc-f"><label for="hrcN">Talking points for Scott</label><textarea id="hrcN" placeholder="Products, sale details, offers, website.">${esc(notes)}</textarea></div>
    <div class="hrc-f"><label for="hrcF">Link to logos or files (optional)</label><input id="hrcF" type="url" placeholder="https://" value="${esc(files)}"></div>`:'')
   :`<p class="hrc-empty">Your cart is empty.</p><p><a class="hrc-btn" href="index.html#store">Shop hats</a></p><p><a class="hrc-btn" href="advertise.html#shop">Shop ad spots</a></p>`;
  $('hrcFoot').innerHTML=`<div class="hrc-tot"><span>Total</span><span>${money(sum)}${quotes?' + quote':''}</span></div>
   <small>${quotes?'Items marked Quote are priced by Scott, and you pay for them once he sends your quote. ':''}${hats.length?'Hats ship to the address you give at checkout. ':''}Secure card payment at checkout.</small>
   <button class="hrc-btn solid" id="hrcGo" ${items.length?'':'disabled'}>Checkout</button>`;
  $('hrcBody').oninput=e=>{if(e.target.id==='hrcN')notes=e.target.value;if(e.target.id==='hrcF')files=e.target.value};
  $('hrcBody').onclick=e=>{const t=e.target;
   if(t.dataset.rm!=null){items.splice(+t.dataset.rm,1);save();draw();return}
   if(t.dataset.q!=null){const it=items[+t.dataset.i];it.qty=Math.max(0,it.qty+Number(t.dataset.q));if(!it.qty)items.splice(+t.dataset.i,1);save();draw();return}
   if(t.dataset.ed!=null&&Cart.onEdit)Cart.onEdit(items[+t.dataset.ed])};
  $('hrcGo').onclick=async()=>{const me=await H().API.current();step=me?'pay':'account';draw()};
  return;
 }
 $('hrcBody').onclick=null;$('hrcBody').oninput=null;
 const hasHat=items.some(it=>it.type==='hat');
 if(step==='pay'){
  $('hrcTitle').textContent='Payment';
  $('hrcBody').innerHTML=`<p class="hrc-note">Review and pay for your order.</p>${items.map(it=>`<div class="hrc-line noimg"><b>${esc(label(it))}${it.type==='hat'?' × '+it.qty:''}</b><span class="p">${price(it)==null?'Quote':money(price(it))}</span><span class="d">${esc(it.type==='hat'?'Merch':desc(it))}</span></div>`).join('')}
   ${hasHat?`<div class="hrc-f"><label for="hrcAddr">Shipping address for hats</label><textarea id="hrcAddr" placeholder="Name, street, city, state, ZIP" style="min-height:70px"></textarea></div>`:''}
   ${quotes?`<p class="hrc-note">${quotes===1?'One item is':quotes+' items are'} priced by quote. Scott will send the quote, and you'll pay for ${quotes===1?'it':'them'} from your account.</p>`:''}
   <div class="hrc-card"><b>Card payment</b><br>Secure checkout by Stripe. Your card details go straight to Stripe and are never stored by Herd Report.</div>`;
  $('hrcFoot').innerHTML=`<div class="hrc-tot"><span>Due today</span><span>${money(sum)}</span></div><small>${quotes?'Plus quoted items, billed later. ':''}${hasAd?'Ad cancellations are refunded minus a $50 fee.':''}</small><p class="hrc-err" id="hrcPErr"></p>
   <div class="hrc-row"><button class="hrc-btn" id="hrcBack">Back</button><button class="hrc-btn solid" id="hrcPay">${sum?'Pay '+money(sum):'Send request'}</button></div>`;
  $('hrcBack').onclick=()=>{step='cart';draw()};
  $('hrcPay').onclick=()=>{const a=$('hrcAddr');if(a&&!a.value.trim()){$('hrcPErr').textContent='Add a shipping address for your hats.';a.focus();return}submit(a?a.value.trim():'')};
  return;
 }
 /* account */
 $('hrcTitle').textContent='Checkout';
 $('hrcBody').innerHTML=`<p class="hrc-note">${authMode==='new'?'Create your free account so you can track your order.':'Sign in to finish your order.'}</p>
  <form id="hrcAF" novalidate>
   ${authMode==='new'?`<div class="hrc-f"><label for="hrcC">Ranch or company</label><input id="hrcC" autocomplete="organization"></div>
   <div class="hrc-2"><div class="hrc-f"><label for="hrcName">Your name</label><input id="hrcName" autocomplete="name"></div><div class="hrc-f"><label for="hrcPh">Phone</label><input id="hrcPh" type="tel" autocomplete="tel"></div></div>`:''}
   <div class="hrc-f"><label for="hrcE">Email</label><input id="hrcE" type="email" autocomplete="email"></div>
   <div class="hrc-f"><label for="hrcP">Password</label><input id="hrcP" type="password" autocomplete="${authMode==='new'?'new-password':'current-password'}"></div>
   <p class="hrc-err" id="hrcErr"></p><button type="submit" hidden></button></form>
  <p class="hrc-note">${authMode==='new'?'Already have an account? <button class="hrc-link" id="hrcSw" type="button">Sign in</button>':'New here? <button class="hrc-link" id="hrcSw" type="button">Create an account</button>'}</p>`;
 $('hrcFoot').innerHTML=`<div class="hrc-tot"><span>Total</span><span>${money(sum)}${quotes?' + quote':''}</span></div><small>Next: payment.</small>
  <div class="hrc-row"><button class="hrc-btn" id="hrcBack">Back</button><button class="hrc-btn solid" id="hrcAuth">${authMode==='new'?'Create account':'Sign in'}</button></div>`;
 $('hrcSw').onclick=()=>{authMode=authMode==='new'?'in':'new';draw()};
 $('hrcBack').onclick=()=>{step='cart';draw()};
 const go=async()=>{const er=$('hrcErr'),b=$('hrcAuth');er.textContent='';
  try{
   if(authMode==='new'){
    if(!$('hrcC').value.trim()||!$('hrcName').value.trim()||!$('hrcE').value.trim()){er.textContent='Add your company, name and email.';return}
    if($('hrcP').value.length<8){er.textContent='Use a password with at least 8 characters.';return}
    b.disabled=true;b.textContent='Creating account…';
    const r=await H().API.signUp({company:$('hrcC').value.trim(),contact_name:$('hrcName').value.trim(),phone:$('hrcPh').value.trim(),email:$('hrcE').value,password:$('hrcP').value});
    if(r.confirm){$('hrcBody').innerHTML='<div class="hrc-done"><h3>Check your email</h3><p>Confirm your email, then sign in here to finish. Your cart is saved.</p></div>';$('hrcFoot').innerHTML='<button class="hrc-btn solid" id="hrcAgain">Sign in</button>';$('hrcAgain').onclick=()=>{authMode='in';draw()};return}
   }else{b.disabled=true;b.textContent='Signing in…';await H().API.signIn($('hrcE').value,$('hrcP').value)}
   if(H().chrome&&document.getElementById('hdr'))H().chrome(document.body.dataset.page||'');
   step='pay';draw();
  }catch(x){er.textContent=x.message;b.disabled=false;b.textContent=authMode==='new'?'Create account':'Sign in'}};
 $('hrcAuth').onclick=go;$('hrcAF').onsubmit=e=>{e.preventDefault();go()};
}

async function submit(address){
 const b=$('hrcPay');b.disabled=true;b.textContent='Processing…';
 try{
  await load();
  const ads=items.filter(isAd),hats=items.filter(it=>it.type==='hat');
  for(const it of ads){
   const base={notes:notes.trim(),creative_url:files.trim(),amount:price(it),placement:null,episode_dates:[],status:price(it)==null?'pending':'paid'};
   if(it.type==='slot')Object.assign(base,{package_id:'ads',kind:'ad',placement:it.slot,episode_dates:it.dates});
   else{const p=pkg(it.type);Object.assign(base,{package_id:p.id,kind:p.kind});
    if(p.kind==='presenting')Object.assign(base,{placement:'pre',episode_dates:presentDates(it.start)});
    if(p.kind==='spotlight')Object.assign(base,{sale_date:it.sale_date||null,location:it.location||''});
    if(p.kind==='merch'){base.sale_date=it.event||null;if(it.qty)base.notes=`Estimated hats: ${it.qty}\n`+base.notes}}
   await H().API.createBooking(base);
  }
  if(hats.length){
   const amt=hats.reduce((t,h)=>t+h.price*h.qty,0);
   await H().API.createBooking({package_id:'store',kind:'store',placement:null,episode_dates:[],amount:amt,status:'paid',
    notes:hats.map(h=>`${h.qty} × ${h.name} Signature Hat`).join('\n')+(address?`\nShip to: ${address}`:''),creative_url:''});
  }
  const {sum,quotes}=totals();const nh=hats.reduce((t,h)=>t+h.qty,0),na=ads.length;
  items=[];notes='';files='';save();step='done';
  $('hrcTitle').textContent='Thank you';
  $('hrcBody').innerHTML=`<div class="hrc-done"><h3>You're all set</h3><p>${sum?`Payment of ${H().money(sum)} received. `:''}${nh?`Your ${nh===1?'hat ships':nh+' hats ship'} soon. `:''}${na?`Scott has your ad details${quotes?' and will send a quote for the sponsorship items':''}. `:''}Track everything in your account.</p></div>`;
  $('hrcFoot').innerHTML=`<a class="hrc-btn solid" href="account.html">View my orders</a>`;
  if(Cart.afterSubmit)Cart.afterSubmit();
 }catch(x){b.disabled=false;b.textContent='Try again';$('hrcPErr').textContent=x.message}
}

const Cart={
 items:()=>items,count,totals,price,label,desc,open,close,isOpen,ready:load,onEdit:null,afterSubmit:null,
 save,
 set(list){items=list;save();if(isOpen())draw()},
 addHat(h){const ex=items.find(it=>it.type==='hat'&&String(it.id)===String(h.id));ex?ex.qty++:items.push({type:'hat',id:h.id,name:h.n,price:h.price,img:h.img||'',qty:1});save();if(isOpen())draw()},
 refresh(){if(isOpen()&&step==='cart')draw()}
};
window.Cart=Cart;
emit();
})();
