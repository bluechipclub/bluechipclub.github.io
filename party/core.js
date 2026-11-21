/* Blue Chip Party – gemeinsamer Kern für Tafel (index.html) und Fernbedienung (fb.html).
   Eigenständig, nutzt keinen Code der Blue-Chip-Tafel. Sync: Supabase Realtime Broadcast + BroadcastChannel (gleiches Gerät). */
(function(){
"use strict";
var P = window.PARTY = {};
P.KEY = "bcparty-alex-2026-11-21";
P.CH = "bcparty-alex-2026-11-21";
var SB_URL="https://zquwffzeracrvpemlgtc.supabase.co", SB_KEY="sb_publishable_ExDEeB9yQOHJIOBF4zuBJA_nunxEoMK";

P.LEVELS = [
  {sb:100,bb:100},{sb:100,bb:200},{sb:200,bb:300},{sb:200,bb:400},{sb:300,bb:600},{sb:400,bb:800},
  {brk:15},
  {sb:500,bb:1000,a:1000},{sb:600,bb:1200,a:1200},{sb:800,bb:1600,a:1600},{sb:1000,bb:2000,a:2000},{sb:1500,bb:3000,a:3000},
  {brk:10},
  {sb:2000,bb:4000,a:4000},{sb:3000,bb:6000,a:6000},{sb:4000,bb:8000,a:8000},{sb:5000,bb:10000,a:10000},{sb:7000,bb:14000,a:14000},{sb:10000,bb:20000,a:20000}
];

/* Events nach Tims Auswahl (21.11.). n = wie viele zufällige Spieler gebraucht werden. */
P.EVENTS = [
  {id:"toast",k:"party",e:"🥂",t:"Toast auf Alex",d:"{1} hält eine Rede auf das Geburtstagskind. Danach stoßen alle an!",n:1},
  {id:"flip",k:"party",e:"🍾",t:"Flaschen-Flip",d:"Jeder hat EINEN Versuch, eine halbvolle Flasche zu flippen. Wer sie stehen lässt, bekommt 1 Big Blind von der Bank."},
  {id:"ssp",k:"party",e:"✊",t:"Schere-Stein-Papier",d:"Zwei Duelle: {1} gegen {2} und {3} gegen {4}. Wer zuerst 3 Runden gewinnt, bekommt 1 Big Blind vom Verlierer.",n:4},
  {id:"foto",k:"party",e:"📸",t:"Gruppenfoto",d:"Alle in Position, Alex in die Mitte. Gruppenfoto!"},
  {id:"muenze",k:"party",e:"🪙",t:"Münzwurf",d:"{1} sagt Kopf oder Zahl, dann wird geworfen. Richtig: 1 Big Blind von der Bank. Falsch: 1 Big Blind in den nächsten Pot.",n:1,off:true},
  {id:"blind",k:"poker",e:"🙈",t:"Blind-Hand",d:"Nächste Hand: KEINER schaut seine Karten an, bis zum Showdown. Pures Gefühl!"},
  {id:"indianer",k:"poker",e:"🪶",t:"Indianer-Poker",d:"Nächste Hand: jeder bekommt EINE Karte und hält sie an die Stirn, ohne sie zu sehen. Eine Setzrunde, höchste Karte gewinnt."},
  {id:"72",k:"poker",e:"7️⃣",t:"7-2 Bounty",d:"Bis zum nächsten Level: wer eine Hand mit 7-2 gewinnt und zeigt, bekommt von JEDEM 1 Big Blind."},
  {id:"bomb",k:"poker",e:"💣",t:"Bomb Pot",d:"Nächste Hand: jeder legt 1 Big Blind in die Mitte, keine Preflop-Runde, direkt der Flop!"},
  {id:"pineapple",k:"poker",e:"🍍",t:"Pineapple",d:"Nächste Hand: jeder bekommt 3 Karten und wirft nach dem Flop eine weg."},
  {id:"straddle",k:"poker",e:"🎲",t:"Straddle-Runde",d:"Eine Runde lang: der Spieler links vom Big Blind MUSS straddeln (2 Big Blinds)."},
  {id:"double",k:"poker",e:"🃏",t:"Doppel-Board",d:"Nächste Hand: zwei Boards! Jede Hälfte vom Pot gewinnt die beste Hand auf ihrem Board."},
  {id:"silent",k:"poker",e:"🤫",t:"Stille Hand",d:"Nächste Hand: wer redet, zahlt 1 Big Blind in den Pot. Auch Alex!"},
  {id:"swap",k:"poker",e:"🔄",t:"Kartentausch",d:"Nächste Hand: nach dem Flop gibt jeder eine seiner Karten an den linken Nachbarn."},
  {id:"show",k:"poker",e:"👀",t:"Zeig eine Karte",d:"Nächste Hand: jeder zeigt vor dem Flop eine seiner Karten offen."}
];
/* Fullport: genau EINMAL, früh (Level 2 bis 4), solange Rebuys noch lohnen. */
P.FULLPORT = {id:"fullport",k:"poker",e:"🚀",t:"FULLPORT-RUNDE",d:"Nächste Hand gehen ALLE automatisch all-in. Keiner darf folden. Rebuy ist ja noch offen!"};

P.IMGS = ["img/gta-portrait.jpg","img/gta-strasse.jpg","img/gta-thron.jpg","img/gta-collage.jpg","img/gta-karten.jpg","img/gta-yacht-torte.jpg","img/gta-allin.jpg","img/gta-cabrio.jpg"];

/* Zusagen 21.11. (Tim, nur Vornamen). Einer kommt noch, wird per Fernbedienung nachgetragen. */
P.SEED = ["Alex","Jonas","Dirk","Göki","Hannah","Jan","Lenka","Noce","Tim"];

P.defaults = function(){
  return {
    v:1, title:"BLUE CHIP PARTY", sub:"Alex' Birthday Edition", start:"19:00",
    entry:5, rebuy:5, bonus:50, unit:"P", stack:20000, rebuyLvl:6, min:20, seats:10,
    evMin:15, evMax:25, auto:1, pauseParty:1, off:{muenze:1},
    levels:JSON.parse(JSON.stringify(P.LEVELS)),
    li:0, left:20*60, running:false, endsAt:0,
    evLeft:15*60, evAt:0, played:{}, hist:[], ev:null,
    fp:{done:false, lvl:2+Math.floor(Math.random()*3), frac:.15+Math.random()*.6},
    players:P.SEED.map(function(n,i){ return {id:i+1,name:n,seat:n==="Tim"?10:i+1,buys:1,out:false,outTs:0}; }), nextId:P.SEED.length+1, seeded:1, log:[], fx:null
  };
};

/* --- Rechnungen --- */
P.playNo = function(S,i){ var n=0; for(var j=0;j<=i&&j<S.levels.length;j++) if(!S.levels[j].brk) n++; return n; };
P.lvlLen = function(S,i){ var l=S.levels[i]; return l&&l.brk? l.brk*60 : S.min*60; };
P.rebuyOpen = function(S){ return !S.levels[S.li].brk ? P.playNo(S,S.li)<=S.rebuyLvl : P.playNo(S,S.li)<S.rebuyLvl; };
P.buys = function(S){ return S.players.reduce(function(a,p){return a+p.buys},0); };
P.entries = function(S){ return S.players.length; };
P.rebuys = function(S){ return P.buys(S)-P.entries(S); };
P.pot = function(S){ return S.bonus + P.entries(S)*S.entry + P.rebuys(S)*S.rebuy; };
P.alive = function(S){ return S.players.filter(function(p){return !p.out}); };
P.payout = function(S){
  var p=P.pot(S), n=P.entries(S), sp;
  if(n<=4) sp=[70,30]; else if(n<=7) sp=[60,30,10]; else sp=[50,30,20];
  var out=[], rest=p;
  for(var i=0;i<sp.length;i++){ var v=i===sp.length-1? rest : Math.round(p*sp[i]/100); out.push(v); rest-=v; }
  return out;
};
/* Platzierungen: Ausgeschiedene nach Reihenfolge (spätester = bester) */
P.places = function(S){
  var outs=S.players.filter(function(p){return p.out}).sort(function(a,b){return b.outTs-a.outTs});
  var alive=P.alive(S), res={}, n=S.players.length;
  outs.forEach(function(p,i){ res[p.id]=alive.length+1+i; });
  if(alive.length===1) res[alive[0].id]=1;
  return res;
};
P.num = function(n){ return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,"."); };
P.fmt = function(sec){ sec=Math.max(0,Math.ceil(sec)); var h=Math.floor(sec/3600), m=Math.floor(sec%3600/60), s=sec%60; return (h? h+":"+(m<10?"0":""):"")+(m<10&&!h?"0":"")+m+":"+(s<10?"0":"")+s; };
P.esc = function(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]}); };

/* --- Sync --- */
P.sync = function(role, onMsg, onStatus){
  var api={ok:false, bc:null, chan:null};
  var dev=role+"-"+Math.random().toString(36).slice(2,8);
  try{ api.bc=new BroadcastChannel(P.CH); api.bc.onmessage=function(e){ var m=e.data; if(m&&m.ev) onMsg(m.ev,m.p,"bc"); }; }catch(e){}
  function status(){ onStatus&&onStatus(api.ok); }
  function loadSb(){ return window.supabase? Promise.resolve() : new Promise(function(ok,no){ var s=document.createElement("script"); s.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"; s.onload=ok; s.onerror=no; document.head.appendChild(s); }); }
  var sbc=null;
  function connect(){
    loadSb().then(function(){
      try{
        if(!sbc) sbc=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
        if(api.chan){ try{ sbc.removeChannel(api.chan); }catch(e){} }
        var ch=sbc.channel(P.CH,{config:{broadcast:{self:false}}});
        ["state","op","ack","hello"].forEach(function(evn){ ch.on("broadcast",{event:evn},function(m){ onMsg(evn,m.payload,"sb"); }); });
        ch.subscribe(function(st){
          api.ok= st==="SUBSCRIBED"; status();
          if(api.ok&&api.onUp) api.onUp();
          if(st==="CHANNEL_ERROR"||st==="TIMED_OUT"||st==="CLOSED"){ api.ok=false; status(); clearTimeout(connect.t); connect.t=setTimeout(connect,4000); }
        });
        api.chan=ch;
      }catch(e){ setTimeout(connect,8000); }
    }).catch(function(){ setTimeout(connect,8000); });
  }
  api.send=function(ev,p){
    try{ api.bc&&api.bc.postMessage({ev:ev,p:p}); }catch(e){}
    if(api.chan&&api.ok){ try{ api.chan.send({type:"broadcast",event:ev,payload:p}); }catch(e){} }
  };
  api.dev=dev;
  if(location.protocol!=="file:" && !/[?&]offline/.test(location.search)) connect();
  document.addEventListener("visibilitychange",function(){ if(document.visibilityState==="visible"&&!api.ok&&location.protocol!=="file:") connect(); });
  return api;
};
})();
