/* Stream Deck: the phone remote sends {op:"clip",id}; the clip plays at once, full screen, with sound.
   All clips are preloaded when the board opens, so a tap only has to travel phone -> ntfy -> laptop. */
(function(){
"use strict";
const css=document.createElement("style");
css.textContent=`
.clipov{position:fixed;inset:0;z-index:80;background:#000;display:flex;align-items:center;justify-content:center;gap:4vw;opacity:0;transition:opacity .15s}
.clipov.on{opacity:1}
.clipov[hidden]{display:none}
.clipov .cbg{position:absolute;inset:-6vh;width:calc(100% + 12vh);height:calc(100% + 12vh);object-fit:cover;filter:blur(40px) brightness(.45) saturate(1.2);pointer-events:none}
.clipov .cv{position:relative;max-width:96vw;max-height:94vh;width:auto;height:auto;border-radius:1.2vw;box-shadow:0 3vh 8vh rgba(0,0,0,.8)}
.clipov.port .cv{height:94vh}
.clipov .ccap{position:relative;display:none;text-align:left;max-width:34vw}
.clipov.port .ccap{display:block}
.clipov .ccap .ey{font-family:var(--mono,monospace);font-size:1.6vw;letter-spacing:.3em;text-transform:uppercase;color:#e2b857}
.clipov .ccap h2{font-size:7vw;line-height:1;font-weight:800;color:#fff;margin-top:1vh;text-shadow:0 1vh 4vh rgba(0,0,0,.7)}
.clipov .ccap p{font-size:2.2vw;color:#f3d68f;margin-top:1.5vh;font-weight:650}
`;
document.head.appendChild(css);
const ov=document.createElement("div");ov.className="clipov";ov.hidden=true;
ov.innerHTML='<video class="cbg" muted playsinline></video><div class="ccap"><div class="ey">Blue Chip Club</div><h2></h2><p></p></div>';
document.body.appendChild(ov);
const bgv=ov.querySelector(".cbg");
let CL={},cur=null,bgWas=false,hideT=null;
const box=document.createElement("div");box.style.cssText="position:fixed;width:1px;height:1px;left:-9px;top:-9px;overflow:hidden;opacity:0;pointer-events:none";
document.body.appendChild(box);
function load(){
  fetch("clips/clips.json?t="+Date.now(),{cache:"no-store"}).then(r=>r.json()).then(j=>{
    (j.clips||[]).forEach(c=>{
      if(CL[c.id]&&CL[c.id].src===c.src){CL[c.id].c=c;return;}
      const v=document.createElement("video");v.src=c.src;v.preload="auto";v.playsInline=true;v.className="cv";
      box.appendChild(v);try{v.load();}catch(e){}
      CL[c.id]={c,v,src:c.src};
    });
  }).catch(()=>{});
}
load();setInterval(load,5*60000);
function duckOn(){try{if(typeof bg!=="undefined"&&bg&&!bg.paused){bgWas=true;bg.pause();}else bgWas=false;}catch(e){}
  try{if(typeof annAudio!=="undefined"&&annAudio)annAudio.pause();}catch(e){}
  document.querySelectorAll("#lobby video,#intro video").forEach(v=>{if(!v.paused){v.dataset.clipPaused="1";v.pause();}});}
function duckOff(){try{if(bgWas&&typeof bgResume==="function")bgResume();}catch(e){}bgWas=false;
  document.querySelectorAll('video[data-clip-paused="1"]').forEach(v=>{delete v.dataset.clipPaused;v.play().catch(()=>{});});}
function stop(){
  if(!cur)return false;
  const v=cur.v;cur=null;clearTimeout(hideT);
  try{v.pause();}catch(e){}try{bgv.pause();bgv.removeAttribute("src");}catch(e){}
  ov.classList.remove("on");setTimeout(()=>{if(!cur){ov.hidden=true;box.appendChild(v);try{v.currentTime=0;}catch(e){}}},160);
  duckOff();return true;
}
function play(id){
  const x=CL[id];if(!x){if(typeof toast==="function")toast("Clip „"+id+"“ nicht gefunden");return;}
  if(cur){const old=cur.v;cur=null;try{old.pause();}catch(e){}box.appendChild(old);}else duckOn();
  cur=x;const v=x.v,c=x.c;clearTimeout(hideT);
  try{v.currentTime=0;}catch(e){}
  v.muted=false;v.volume=1;
  ov.querySelector("h2").textContent=c.p==="Alle"?"":c.p;ov.querySelector("p").textContent=c.t||"";
  ov.insertBefore(v,ov.querySelector(".ccap"));
  const setPort=()=>ov.classList.toggle("port",v.videoHeight>v.videoWidth);setPort();v.onloadedmetadata=setPort;
  ov.hidden=false;void ov.offsetWidth;ov.classList.add("on");
  v.onended=()=>{if(cur===x)stop();};
  const p=v.play();
  if(p&&p.catch)p.catch(()=>{ // browser blocked sound: play silent instead and show the sound hint
    if(cur!==x)return;v.muted=true;v.play().catch(()=>{});
    try{$("snd").hidden=false;}catch(e){}if(typeof toast==="function")toast("🔇 Einmal auf die Tafel klicken, dann kommt der Ton");});
  try{bgv.src=c.src;bgv.currentTime=0;bgv.play().catch(()=>{});}catch(e){}
  hideT=setTimeout(()=>{if(cur===x)stop();},((isFinite(v.duration)&&v.duration?v.duration:60)+3)*1000);
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
