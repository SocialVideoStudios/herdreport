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
@media(max-width:480px){.hrp-2,.hrp-plat{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){.hrp-wrap.open{animation:none}}`;
 document.head.appendChild(css);
 document.body.insertAdjacentHTML('beforeend','<div class="hrp-wrap" id="hrpop" role="dialog" aria-modal="true" aria-labelledby="hrpT"><div class="hrp" id="hrpBox"></div></div>');
 $('hrpop').addEventListener('click',e=>{if(e.target.id==='hrpop')close()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('hrpop').classList.contains('open'))close()});
}
function close(){$('hrpop').classList.remove('open');document.documentElement.style.overflow='';if(last)last.focus()}
function show(html){inject();$('hrpBox').innerHTML='<button class="hrp-x" id="hrpX" aria-label="Close">×</button>'+html;$('hrpX').onclick=close;$('hrpop').classList.add('open');document.documentElement.style.overflow='hidden';setTimeout(()=>{const f=$('hrpBox').querySelector('input,textarea,button:not(.hrp-x)');f&&f.focus()},30)}
const okMsg=(t,b)=>`<div class="hrp-done"><p class="k">${t}</p><h2 id="hrpT">${b}</h2><p class="sub">Let's get to it!!</p><button class="hrp-btn solid" id="hrpDone">Close</button></div>`;

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
  try{await HR.API.submitMessage({topic:'Review',rating,name:v('hpN'),company:v('hpC'),email:v('hpE')||'(not given)',phone:'',message:v('hpM')});
   $('hrpBox').innerHTML=okMsg('Review received',`Thanks, ${esc(v('hpN').split(' ')[0])}!`);$('hrpDone').onclick=close}
  catch(x){er.textContent=x.message;b.disabled=false;b.textContent='Submit review'}};
}

document.addEventListener('click',e=>{
 if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||!window.HR)return;
 const el=e.target.closest('[data-pop],a[href]');if(!el)return;
 const pop=el.dataset.pop||(/(^|\/)contact\.html(\?|$)/.test(el.getAttribute('href')||'')?'contact':/reviews\/new/.test(el.getAttribute('href')||'')?'review':'');
 if(!pop)return;
 if(document.body.dataset.page==='contact'&&pop==='contact')return;
 e.preventDefault();last=el;
 if(pop==='review')review();else contact(new URL(el.href||location.href,location.href).searchParams.get('topic'));
});
window.HRPop={contact,review};
})();
