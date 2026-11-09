/* Stream Deck: the phone remote sends {op:"clip",id}; the clip plays at once, full screen, with sound.
   All clips are preloaded when the board opens, so a tap only has to travel phone -> ntfy -> laptop. */
(function(){
"use strict";
const css=document.createElement("style");
css.textContent=`
.clipov{position:fixed;left:0;top:0;width:100%;height:100%;z-index:80;background:#000;display:flex;align-items:center;justify-content:center;gap:4vw;opacity:0;transition:opacity .15s}
.clipov.on{opacity:1}
.clipov[hidden]{display:none}
.clipov .cbg{position:absolute;left:-5%;top:-5%;width:110%;height:110%;object-fit:cover;filter:blur(40px) brightness(.45) saturate(1.2);pointer-events:none}
.clipov .cv{position:relative;display:block;max-width:96%;max-height:94%;width:auto;height:auto;object-fit:contain;border-radius:1.2vw;box-shadow:0 3vh 8vh rgba(0,0,0,.8)}
.clipov.land .cv{width:96%;height:94%}
.clipov.port .cv{height:94%;width:auto;max-width:56%}
.clipov .ccap{position:relative;display:none;text-align:left;max-width:34vw}
.clipov.port .ccap{display:block}
.clipov .ccap .ey{font-family:var(--mono,monospace);font-size:1.6vw;letter-spacing:.3em;text-transform:uppercase;color:#e2b857}
.clipov .ccap h2{font-size:7vw;line-height:1;font-weight:800;color:#fff;margin-top:1vh;text-shadow:0 1vh 4vh rgba(0,0,0,.7)}
.clipov .ccap p{font-size:2.2vw;color:#f3d68f;margin-top:1.5vh;font-weight:650}
#clipUnlock{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:95;font:800 3vw/1.2 var(--sans,system-ui);padding:2.4vw 4vw;border-radius:1.6vw;border:2px solid #e2b857;background:rgba(10,10,10,.94);color:#f3d68f;box-shadow:0 2vh 6vh rgba(0,0,0,.8);cursor:pointer;text-align:center}
#clipUnlock small{display:block;font-size:1.4vw;font-weight:500;color:#bdbdb8;margin-top:.8vw}
#clipUnlock[hidden]{display:none}
`;
document.head.appendChild(css);
const ov=document.createElement("div");ov.className="clipov";ov.hidden=true;
ov.innerHTML='<video class="cbg" muted playsinline></video><div class="ccap"><div class="ey">Blue Chip Club</div><h2></h2><p></p></div>';
document.body.appendChild(ov);
const bgv=ov.querySelector(".cbg");
const ub=document.createElement("button");ub.id="clipUnlock";ub.type="button";ub.innerHTML="🔊 Einmal hier tippen für Ton<small>danach laufen die Clips mit Musik</small>";
document.body.appendChild(ub);
let CL={},cur=null,bgWas=false,hideT=null;
/* iPad/iPhone: only a video element that was started once by a finger tap may play sound later.
   So ALL clips play in this one element (pv); the tap on "Ton" unlocks it with a silent mini clip. */
const pv=document.createElement("video");pv.className="cv";pv.playsInline=true;pv.setAttribute("playsinline","");pv.setAttribute("webkit-playsinline","");pv.preload="auto";
ov.insertBefore(pv,ov.querySelector(".ccap"));
let pvOk=false;
const box=document.createElement("div");box.style.cssText="position:fixed;width:1px;height:1px;left:-9px;top:-9px;overflow:hidden;opacity:0;pointer-events:none";
document.body.appendChild(box);
function load(){   // hidden muted copies only warm the browser cache so a clip starts fast
  fetch("clips/clips.json?t="+Date.now(),{cache:"no-store"}).then(r=>r.json()).then(j=>{
    (j.clips||[]).forEach(c=>{
      if(CL[c.id]&&CL[c.id].src===c.src){CL[c.id].c=c;return;}
      const v=document.createElement("video");v.muted=true;v.src=c.src;v.preload="auto";v.playsInline=true;
      box.appendChild(v);try{v.load();}catch(e){}
      CL[c.id]={c,v,src:c.src};
    });
  }).catch(()=>{});
}
load();setInterval(load,5*60000);
function unlockAll(){
  try{if(typeof ac==="function")ac();}catch(e){}
  if(pvOk||cur)return;
  try{pv.src="clips/still.mp4";pv.dataset.src="";pv.muted=false;
    const p=pv.play();
    const ok=()=>{pvOk=true;ub.hidden=true;try{pv.pause();}catch(e){}};
    if(p&&p.then)p.then(ok).catch(()=>{});else ok();
  }catch(e){}
  try{bgv.muted=true;bgv.play().then(()=>bgv.pause()).catch(()=>{});}catch(e){}
}
["touchend","pointerdown","click","keydown"].forEach(t=>addEventListener(t,unlockAll,true));
const chime=new Audio("ton-test.mp3?v=1");chime.preload="auto";
ub.onclick=()=>{unlockAll();try{chime.currentTime=0;chime.play().catch(()=>{});}catch(e){}if(typeof toast==="function")toast("🔊 Ton ist an");};
setInterval(()=>{if(!pvOk&&!cur)ub.hidden=false;},4000);
function duckOn(){try{if(typeof bg!=="undefined"&&bg&&!bg.paused){bgWas=true;bg.pause();}else bgWas=false;}catch(e){}
  try{if(typeof annAudio!=="undefined"&&annAudio)annAudio.pause();}catch(e){}
  document.querySelectorAll("#lobby video,#intro video").forEach(v=>{if(!v.paused){v.dataset.clipPaused="1";v.pause();}});}
function duckOff(){try{if(bgWas&&typeof bgResume==="function")bgResume();}catch(e){}bgWas=false;
  document.querySelectorAll('video[data-clip-paused="1"]').forEach(v=>{delete v.dataset.clipPaused;v.play().catch(()=>{});});}
function stop(){
  if(!cur)return false;
  cur=null;clearTimeout(hideT);
  try{pv.pause();}catch(e){}try{bgv.pause();bgv.removeAttribute("src");}catch(e){}
  ov.classList.remove("on");setTimeout(()=>{if(!cur)ov.hidden=true;},160);
  duckOff();return true;
}
function play(id){
  const x=CL[id];if(!x){if(typeof toast==="function")toast("Clip „"+id+"“ nicht gefunden");return;}
  if(!cur)duckOn();
  cur=x;const c=x.c;clearTimeout(hideT);
  try{pv.pause();}catch(e){}
  if(pv.dataset.src!==c.src){pv.src=c.src;pv.dataset.src=c.src;}
  try{pv.currentTime=0;}catch(e){}
  pv.muted=false;pv.volume=1;
  ov.querySelector("h2").textContent=c.p==="Alle"?"":c.p;ov.querySelector("p").textContent=c.t||"";
  const setPort=()=>{const pt=pv.videoHeight>pv.videoWidth;ov.classList.toggle("port",pt);ov.classList.toggle("land",!pt&&pv.videoWidth>0);};setPort();pv.onloadedmetadata=setPort;
  ov.hidden=false;void ov.offsetWidth;ov.classList.add("on");
  pv.onended=()=>{if(cur===x)stop();};
  const p=pv.play();
  if(p&&p.catch)p.catch(()=>{ // browser blocked sound: play silent instead and ask for one tap
    if(cur!==x)return;pv.muted=true;pv.play().catch(()=>{});
    pvOk=false;ub.hidden=false;if(typeof toast==="function")toast("🔇 Einmal auf die Tafel tippen, dann kommt der Ton");});
  try{bgv.src=c.src;bgv.currentTime=0;bgv.play().catch(()=>{});}catch(e){}
  hideT=setTimeout(()=>{if(cur===x)stop();},((isFinite(pv.duration)&&pv.duration&&pv.dataset.src===c.src?pv.duration:60)+3)*1000);
}
window.clipStop=stop;
window.clipCmd=function(c){
  if(c._ts&&Date.now()/1000-c._ts>30)return;   // a tap from long ago (reconnect) is not played
  if(c.op==="clipstop"){stop();return;}
  play(c.id);
};
addEventListener("keydown",e=>{if(e.key==="Escape"&&cur)stop();});
ov.addEventListener("click",stop);
})();
