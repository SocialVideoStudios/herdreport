/* Contact and Leave a review pop-ups. Any link to contact.html, or any element with data-pop="contact" / data-pop="review",
   opens the matching pop-up. Needs js/app.js (window.HR). */
(function(){
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>document.getElementById(id);
let last=null;
function inject(){
 if($('hrpop'))return;
 const css=document.createElement('style');css.textContent=`
.hrp-wrap{position:fixed;inset:0;z-index:80;display:none;place-items:center;padding:16px;background:rgb(0 0 0/.5)}
.hrp-wrap.open{display:grid;animation:hrpIn .2s}
@keyframes hrpIn{from{opacity:0}to{opacity:1}}
.hrp{position:relative;width:min(560px,100%);max-height:calc(100vh - 32px);overflow:auto;background:var(--bg,#F3EFE7);color:var(--ink,#0B0B0D);border:2px solid var(--line,#0B0B0D);border-radius:24px;padding:clamp(20px,3vw,30px);font:16px/1.5 "IBM Plex Sans",system-ui,sans-serif;box-shadow:0 30px 60px -20px rgb(0 0 0/.4)}
.hrp h2{font:900 clamp(28px,4vw,36px)/1.02 Archivo,sans-serif;text-transform:uppercase;margin:0 44px 8px 0}
.hrp .k{font:700 14px Archivo,sans-serif;color:var(--red,#85272C);margin:0 0 6px}
.hrp .sub{color:var(--soft,#5a5450);margin:0 0 18px}
.hrp-x{position:absolute;top:16px;right:16px;width:42px;height:42px;border-radius:50%;border:2px solid var(--line,#0B0B0D);background:none;color:inherit;font-size:20px;cursor:pointer}
.hrp-f{margin:0 0 14px}.hrp-f label,.hrp-l{display:block;font-weight:600;font-size:14px;margin:0 0 6px}
.hrp-f input,.hrp-f textarea{width:100%;box-sizing:border-box;font:16px "IBM Plex Sans",sans-serif;color:inherit;background:var(--bg,#F3EFE7);border:2px solid var(--line,#0B0B0D);border-radius:12px;padding:10px 14px;min-height:46px}
.hrp-f textarea{min-height:120px;resize:vertical}
.hrp-2{display:grid;grid-template-columns:1fr 1fr;gap:0 12px}
.hrp-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}
.hrp-chips label{position:relative;display:inline-flex;align-items:center;border:2px solid var(--line,#0B0B0D);border-radius:999px;padding:6px 12px;font-weight:600;font-size:14px;cursor:pointer;min-height:40px}
.hrp-chips input{position:absolute;inset:0;width:1px;height:1px;opacity:0;pointer-events:none}
.hrp-chips label:has(input:checked){background:var(--red,#85272C);border-color:var(--red,#85272C);color:var(--cream,#F3EFE7)}
.hrp-chips label:has(input:focus-visible){outline:3px solid var(--red,#85272C);outline-offset:3px}
.hrp-stars{display:flex;gap:4px;margin:0 0 16px}
.hrp-stars button{width:48px;height:48px;border:0;background:none;cursor:pointer;padding:0;color:rgb(11 11 13/.2)}
.hrp-stars button svg{width:40px;height:40px;fill:currentColor}
.hrp-stars button.on{color:var(--red,#85272C)}
.hrp-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 20px;border-radius:999px;font:700 15px Archivo,sans-serif;text-transform:uppercase;border:2px solid var(--line,#0B0B0D);background:none;color:inherit;cursor:pointer;text-decoration:none}
.hrp-btn.solid{background:var(--red,#85272C);border-color:var(--red,#85272C);color:var(--cream,#F3EFE7);width:100%}
.hrp-btn[disabled]{opacity:.5}
.hrp-err{color:#a3141c;font-size:14px;min-height:1em;margin:0 0 8px}
.hrp-plat{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px;padding-top:18px;border-top:1px solid rgb(11 11 13/.15)}
.hrp-plat p{grid-column:1/-1;margin:0;font-size:14px;color:var(--soft,#5a5450)}
.hrp-plat a{font-size:13px}
.hrp-done{text-align:center;padding:20px 0}
.hrp-slide{overflow:hidden;margin:0 -2px;padding:0 2px;transition:height .35s cubic-bezier(.4,0,.2,1)}
.hrp-track{display:flex;align-items:flex-start;width:200%;transition:transform .35s cubic-bezier(.4,0,.2,1)}
.hrp-track>section{width:50%;flex:none;padding:2px}
.hrp-track.new{transform:translateX(-50%)}
.hrp-or{display:flex;align-items:center;gap:12px;color:var(--soft,#5a5450);font-size:14px;margin:18px 0}
.hrp-or::before,.hrp-or::after{content:"";flex:1;height:1px;background:rgb(11 11 13/.15)}
.hrp-btn.wide{width:100%}
.hrp-back{background:none;border:0;padding:0;margin:0 0 10px;font:600 14px "IBM Plex Sans",sans-serif;color:var(--red,#85272C);cursor:pointer}
@media(max-width:480px){.hrp-2,.hrp-plat{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){.hrp-wrap.open{animation:none}.hrp-track{transition:none}}`;
 document.head.appendChild(css);
 document.body.insertAdjacentHTML('beforeend','<div class="hrp-wrap" id="hrpop" role="dialog" aria-modal="true" aria-labelledby="hrpT"><div class="hrp" id="hrpBox"></div></div>');
 $('hrpop').addEventListener('click',e=>{if(e.target.id==='hrpop')close()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('hrpop').classList.contains('open'))close()});
}
function close(){$('hrpop').classList.remove('open');document.documentElement.style.overflow='';if(last)last.focus()}
function show(html){inject();$('hrpBox').innerHTML='<button class="hrp-x" id="hrpX" aria-label="Close">×</button>'+html;$('hrpX').onclick=close;$('hrpop').classList.add('open');document.documentElement.style.overflow='hidden';setTimeout(()=>{const f=$('hrpBox').querySelector('input,textarea,button:not(.hrp-x)');f&&f.focus()},30)}
const okMsg=(t,b,sub)=>`<div class="hrp-done"><p class="k">${t}</p><h2 id="hrpT">${b}</h2><p class="sub">${sub||"Let's get to it!!"}</p><button class="hrp-btn solid" id="hrpDone">Close</button></div>`;

function contact(topic){
 const topics=['General','Advertising','Be a guest','Hat order','Press'];
 show(`<p class="k">Contact</p><h2 id="hrpT">Let's talk cattle</h2><p class="sub">Send Scott a note and he'll get back to you.</p>
 <form id="hrpF" novalidate>
  <div class="hrp-chips">${topics.map((t,i)=>`<label><input type="radio" name="t" value="${t}" ${(topic?t.toLowerCase()===topic.toLowerCase():i===0)?'checked':''}>${t}</label>`).join('')}</div>
  <div class="hrp-2"><div class="hrp-f"><label for="hpN">Your name</label><input id="hpN" autocomplete="name"></div><div class="hrp-f"><label for="hpC">Ranch or company</label><input id="hpC" autocomplete="organization"></div></div>
  <div class="hrp-2"><div class="hrp-f"><label for="hpE">Email</label><input id="hpE" type="email" autocomplete="email"></div><div class="hrp-f"><label for="hpP">Phone</label><input id="hpP" type="tel" autocomplete="tel"></div></div>
  <div class="hrp-f"><label for="hpM">Message</label><textarea id="hpM"></textarea></div>
  <p class="hrp-err" id="hpErr"></p><button class="hrp-btn solid" type="submit" id="hpGo">Send message</button></form>`);
 $('hrpF').onsubmit=async e=>{e.preventDefault();const v=id=>$(id).value.trim(),er=$('hpErr');er.textContent='';
  if(!v('hpN')||!v('hpE')||!v('hpM')){er.textContent='Add your name, email and a message.';return}
  if(!/^\S+@\S+\.\S+$/.test(v('hpE'))){er.textContent="That email address doesn't look right.";return}
  const b=$('hpGo');b.disabled=true;b.textContent='Sending…';
  try{await HR.API.submitMessage({topic:document.querySelector('#hrpF input[name=t]:checked').value,name:v('hpN'),company:v('hpC'),email:v('hpE'),phone:v('hpP'),message:v('hpM')});
   $('hrpBox').innerHTML=okMsg('Message sent',`Thanks, ${esc(v('hpN').split(' ')[0])}!`);$('hrpDone').onclick=close}
  catch(x){er.textContent=x.message;b.disabled=false;b.textContent='Send message'}};
}

function review(){
 const star='<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';
 let rating=0;
 show(`<p class="k">Leave a review</p><h2 id="hrpT">How's the show?</h2><p class="sub">Your review helps other cattlemen find Herd Report.</p>
 <form id="hrpF" novalidate>
  <span class="hrp-l" id="hpRL">Your rating</span>
  <div class="hrp-stars" role="radiogroup" aria-labelledby="hpRL">${[1,2,3,4,5].map(n=>`<button type="button" role="radio" aria-checked="false" aria-label="${n} star${n>1?'s':''}" data-r="${n}">${star}</button>`).join('')}</div>
  <div class="hrp-2"><div class="hrp-f"><label for="hpN">Your name</label><input id="hpN" autocomplete="name"></div><div class="hrp-f"><label for="hpC">Ranch or town</label><input id="hpC"></div></div>
  <div class="hrp-f"><label for="hpE">Email (not shown)</label><input id="hpE" type="email" autocomplete="email"></div>
  <div class="hrp-f"><label for="hpM">Your review</label><textarea id="hpM" placeholder="What do you like about the show? A favorite episode?"></textarea></div>
  <p class="hrp-err" id="hpErr"></p><button class="hrp-btn solid" type="submit" id="hpGo">Submit review</button>
  <div class="hrp-plat"><p>Also rate us where you listen:</p>
   <a class="hrp-btn" href="https://podcasts.apple.com/us/podcast/id1835474334" target="_blank" rel="noopener">Apple Podcasts</a>
   <a class="hrp-btn" href="https://open.spotify.com/show/37IlQvHObaNPHxXoUcjEyz" target="_blank" rel="noopener">Spotify</a></div>
 </form>`);
 const stars=[...document.querySelectorAll('.hrp-stars button')];
 const paint=n=>stars.forEach((b,i)=>{b.classList.toggle('on',i<n);b.setAttribute('aria-checked',i+1===rating)});
 stars.forEach(b=>{b.onclick=()=>{rating=+b.dataset.r;paint(rating)};b.onmouseenter=()=>paint(+b.dataset.r);b.onmouseleave=()=>paint(rating)});
 $('hrpF').onsubmit=async e=>{e.preventDefault();const v=id=>$(id).value.trim(),er=$('hpErr');er.textContent='';
  if(!rating){er.textContent='Pick a star rating.';return}
  if(!v('hpN')||!v('hpM')){er.textContent='Add your name and a few words.';return}
  if(v('hpE')&&!/^\S+@\S+\.\S+$/.test(v('hpE'))){er.textContent="That email address doesn't look right.";return}
  const b=$('hpGo');b.disabled=true;b.textContent='Sending…';
  try{await HR.API.submitReview({rating,name:v('hpN'),place:v('hpC'),email:v('hpE'),text:v('hpM')});
   $('hrpBox').innerHTML=okMsg('Review received',`Thanks, ${esc(v('hpN').split(' ')[0])}!`,'Your review will show on the site once Scott approves it.');$('hrpDone').onclick=close}
  catch(x){er.textContent=x.message;b.disabled=false;b.textContent='Submit review'}};
}

function login(startNew){
 show(`<div class="hrp-slide"><div class="hrp-track${startNew?' new':''}" id="hpTrack">
  <section aria-label="Sign in" id="hpIn">
   <p class="k">Client login</p><h2 id="hrpT">Welcome back</h2><p class="sub">Sign in to track your bookings and orders.</p>
   <form id="hpSI" novalidate>
    <div class="hrp-f"><label for="hpE1">Email</label><input id="hpE1" type="email" autocomplete="email"></div>
    <div class="hrp-f"><label for="hpP1">Password</label><input id="hpP1" type="password" autocomplete="current-password"></div>
    <p class="hrp-err" id="hpErr1"></p><button class="hrp-btn solid" type="submit" id="hpGo1">Sign in</button>
    ${HR.LIVE?'':'<button class="hrp-btn wide" type="button" id="hpPrev" style="margin-top:8px">Preview sign in</button>'}
   </form>
   <div class="hrp-or">Not a client yet?</div>
   <button class="hrp-btn wide" type="button" id="hpToNew">Create an account</button>
  </section>
  <section aria-label="Create an account" id="hpNew">
   <button class="hrp-back" type="button" id="hpToIn">← Back to sign in</button>
   <p class="k">New client</p><h2>Create your account</h2><p class="sub">Book ad spots, order hats and track everything in one place.</p>
   <form id="hpSU" novalidate>
    <div class="hrp-f"><label for="hpC2">Ranch or company</label><input id="hpC2" autocomplete="organization"></div>
    <div class="hrp-2"><div class="hrp-f"><label for="hpN2">Your name</label><input id="hpN2" autocomplete="name"></div><div class="hrp-f"><label for="hpPh2">Phone</label><input id="hpPh2" type="tel" autocomplete="tel"></div></div>
    <div class="hrp-f"><label for="hpE2">Email</label><input id="hpE2" type="email" autocomplete="email"></div>
    <div class="hrp-f"><label for="hpP2">Password</label><input id="hpP2" type="password" autocomplete="new-password" placeholder="At least 8 characters"></div>
    <p class="hrp-err" id="hpErr2"></p><button class="hrp-btn solid" type="submit" id="hpGo2">Create account</button>
   </form>
  </section></div></div>`);
 const tr=$('hpTrack'),inS=$('hpIn'),nwS=$('hpNew');
 const sl=tr.parentElement,fit=()=>{sl.style.height=(tr.classList.contains('new')?nwS:inS).offsetHeight+4+'px'};
 const sideTo=n=>{tr.classList.toggle('new',n);inS.inert=n;nwS.inert=!n;fit();setTimeout(()=>(n?$('hpC2'):$('hpE1')).focus({preventScroll:true}),360)};
 inS.inert=!!startNew;nwS.inert=!startNew;fit();new ResizeObserver(fit).observe(tr);
 $('hpToNew').onclick=()=>sideTo(true);$('hpToIn').onclick=()=>sideTo(false);
 const done=u=>{const to=u&&u.role==='admin'?'admin.html':'account.html';if(document.body.dataset.page==='account'&&to==='account.html')location.reload();else location.href=to};
 $('hpSI').onsubmit=async e=>{e.preventDefault();const er=$('hpErr1'),b=$('hpGo1');er.textContent='';
  if(!$('hpE1').value.trim()||!$('hpP1').value){er.textContent='Enter your email and password.';return}
  b.disabled=true;b.textContent='Signing in…';
  try{done(await HR.API.signIn($('hpE1').value,$('hpP1').value))}catch(x){er.textContent=x.message;b.disabled=false;b.textContent='Sign in'}};
 if($('hpPrev'))$('hpPrev').onclick=async()=>{try{done(await HR.API.signIn('demo@prairieline.co','sponsor2026'))}catch(x){$('hpErr1').textContent=x.message}};
 $('hpSU').onsubmit=async e=>{e.preventDefault();const v=id=>$(id).value.trim(),er=$('hpErr2'),b=$('hpGo2');er.textContent='';
  if(!v('hpC2')||!v('hpN2')||!v('hpE2')){er.textContent='Add your company, name and email.';return}
  if(!/^\S+@\S+\.\S+$/.test(v('hpE2'))){er.textContent="That email address doesn't look right.";return}
  if($('hpP2').value.length<8){er.textContent='Use a password with at least 8 characters.';return}
  b.disabled=true;b.textContent='Creating account…';
  try{const r=await HR.API.signUp({company:v('hpC2'),contact_name:v('hpN2'),phone:v('hpPh2'),email:v('hpE2'),password:$('hpP2').value});
   if(r.confirm){$('hrpBox').innerHTML=okMsg('Almost there','Check your email');$('hrpBox').querySelector('.sub').textContent='Confirm your email address, then sign in.';$('hrpDone').onclick=close;return}
   done(r.user)}catch(x){er.textContent=x.message;b.disabled=false;b.textContent='Create account'}};
}

document.addEventListener('click',e=>{
 if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||!window.HR)return;
 const el=e.target.closest('[data-pop],a[href]');if(!el)return;
 const href=el.getAttribute('href')||'';
 const pop=el.dataset.pop||(/(^|\/)contact\.html(\?|$)/.test(href)?'contact':/reviews\/new/.test(href)?'review':/(^|\/)account\.html(\?|#|$)/.test(href)?'login':'');
 if(!pop)return;
 if(document.body.dataset.page==='contact'&&pop==='contact')return;
 if(pop==='login'&&document.body.dataset.page==='account')return;
 e.preventDefault();last=el;
 if(pop==='login'){HR.API.current().then(u=>{if(u)location.href=u.role==='admin'?'admin.html':href;else login(el.dataset.new==='1')}).catch(()=>login());return}
 if(pop==='review')review();else contact(new URL(el.href||location.href,location.href).searchParams.get('topic'));
});
window.HRPop={contact,review,login};
})();
