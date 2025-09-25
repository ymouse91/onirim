
/* Onirim PWA – v4.4f */
const COLORS = ["red","blue","green","brown"];
const DOORS_TO_WIN = 8;
const HAND_SIZE = 5;
const $ = (s)=>document.querySelector(s);

function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]]; } return a; }
function makeCard(type,color=null){ return {type,color}; }
function colorAbbrFi(c){ return ({red:'pun', blue:'sin', green:'vih', brown:'rus'})[c]||''; }

const S = { deck:[], discard:[], limbo:[], hand:[], path:[], doors:[], selectedHand:null, prophecy:null, gameOver:false };
const D = {
  deckCount: $('#deckCount'),
  discardCount: $('#discardCount'),
  limboCount: $('#limboCount'),
  keysInHand: $('#keysInHand'),
  status: $('#status'),
  doorsArea: $('#doorsArea'),
  pathArea: $('#pathArea'),
  handArea: $('#handArea'),
  discardPeek: $('#discardPeek'),
  newBtn: $('#newBtn'),
  helpBtn: $('#helpBtn'),
  helpDlg: $('#helpDlg'),
  closeHelp: $('#closeHelp'),
  nightmareDlg: $('#nightmareDlg'),
  doorChoices: $('#doorChoices'),
  keyProphecyBtn: $('#keyProphecyBtn'),
  discardSelBtn: $('#discardSelBtn'),
  playSelBtn: $('#playSelBtn'),
  prophecyDlg: $('#prophecyDlg'),
  prophecyCards: $('#prophecyCards'),
  propLeft: $('#propLeft'),
  propRight: $('#propRight')
};


function buildDeck(){
  const d=[];
  for(const c of COLORS){ d.push(makeCard('door',c), makeCard('door',c)); }
  for(let i=0;i<10;i++) d.push(makeCard('nightmare'));
  for(const c of COLORS){ for(let i=0;i<3;i++) d.push(makeCard('key',c)); }
  for(const c of COLORS){ for(let i=0;i<4;i++) d.push(makeCard('moon',c)); }
  const suns={red:9, blue:8, green:7, brown:6};
  for(const c of COLORS){ for(let i=0;i<suns[c];i++) d.push(makeCard('sun',c)); }
  return d;
}

function newGame(){
  Object.assign(S,{ deck:shuffle(buildDeck()), discard:[], limbo:[], hand:[], path:[], doors:[], selectedHand:null, prophecy:null, gameOver:false });
  drawUpToFive(); refillHand();
  render('Uusi peli alkoi. Avaa 8 ovea ennen kuin pakka loppuu!');
}

function drawTop(){ return S.deck.pop()||null; }

function putOnTop(c){ S.deck.push(c); }
function toLimbo(card){
  S.limbo.push(card);
  const abbr = card.color ? ({red:'pun',blue:'sin',green:'vih',brown:'rus'})[card.color] : '';
  if(card.type==='door') D.status.textContent = `Ovi (${abbr}) meni limboon.`;
  else if(card.type==='nightmare') D.status.textContent = 'Painajainen meni limboon.';
}
function reshuffleLimbo(){ if(S.limbo.length){ S.deck.push(...S.limbo); S.limbo=[]; shuffle(S.deck); } }
function checkLossAfterDraw(){
  if(S.gameOver) return;
  if(S.hand.length<HAND_SIZE && S.deck.length===0 && S.limbo.length===0){
    S.gameOver=true; render('Hävisit – pakka loppui eikä kättä voi nostaa viiteen. 😵');
  }
}

// ---- Robust refill pipeline + impossible-state detection
let _refilling=false;
function onlyStoppersLeft(){
  const left=S.deck.concat(S.limbo);
  return left.length>0 && left.every(c=>c.type==='door'||c.type==='nightmare');
}
function noMatchingKeys(){
  const doorColors=new Set(S.deck.concat(S.limbo).filter(c=>c.type==='door').map(c=>c.color));
  const handKeyColors=new Set(S.hand.filter(c=>c.type==='key').map(c=>c.color));
  for(const col of handKeyColors){ if(doorColors.has(col)) return false; }
  return true;
}
function refillHand(){
  if(S.gameOver||_refilling) return; _refilling=true;
  const step=()=>{
    if(S.gameOver){ _refilling=false; return; }
    if(S.hand.length>=HAND_SIZE){ reshuffleLimbo(); _refilling=false; renderStatusCounts(); return; }
    if(S.hand.length < HAND_SIZE && onlyStoppersLeft() && noMatchingKeys()){
      S.gameOver=true; render('Pakka sisältää vain ovia/painajaisia eikä kädessä ole sopivia avaimia – peli päättyi tappiolla.');
      _refilling=false; return;
    }
    const c=drawTop();
    if(!c){ reshuffleLimbo(); if(S.hand.length < HAND_SIZE && onlyStoppersLeft() && noMatchingKeys()){ S.gameOver=true; render('Pakka sisältää vain ovia/painajaisia eikä kädessä ole sopivia avaimia – peli päättyi tappiolla.'); _refilling=false; return; } checkLossAfterDraw(); _refilling=false; renderStatusCounts(); return; }
    if(c.type==='door'){
      const idx=S.hand.findIndex(k=>k.type==='key'&&k.color===c.color);
      if(idx>=0){ S.discard.push(S.hand.splice(idx,1)[0]); S.doors.push({color:c.color}); renderStatusCounts(`Avasit ${colorAbbrFi(c.color)} oven Avaimella.`); setTimeout(step,0); }
      else { toLimbo(c); setTimeout(step,0); }
      return;
    }
    if(c.type==='nightmare'){
      const after=()=>{ setTimeout(step,0); };
      D.nightmareDlg.addEventListener('close', after, {once:true});
      resolveNightmare();
      return;
    }
    S.hand.push(c); setTimeout(step,0);
  };
  setTimeout(step,0);
}

function drawUpToFive(){
  while(S.hand.length < HAND_SIZE){
    const c=drawTop(); if(!c) break;
    if(c.type==='door'||c.type==='nightmare'){ toLimbo(c); continue; }
    S.hand.push(c);
  }
  reshuffleLimbo(); checkLossAfterDraw();
}

// ---- Door discovery on path
function checkDiscoverDoor(){
  if(S.path.length<3) return;
  const a=S.path[S.path.length-3], b=S.path[S.path.length-2], c=S.path[S.path.length-1];
  if(a.color===b.color && b.color===c.color){
    const color=a.color, owned=S.doors.filter(d=>d.color===color).length;
    if(owned<2){
      const idx=S.deck.findIndex(k=>k.type==='door'&&k.color===color);
      if(idx>=0){ S.deck.splice(idx,1); S.doors.push({color}); shuffle(S.deck); renderStatusCounts(`Löysit ${colorAbbrFi(color)} oven polkusarjalla – pakka sekoitettiin.`); }
    }
  }
}

// ---- Nightmare
function resolveNightmare(){
  const hasDoor = S.doors.length > 0;
  const hasKey  = S.hand.some(c=>c.type==='key');
  const loseDoorBtn = D.nightmareDlg.querySelector('button[value=\"loseDoor\"]');
  const discardKeyBtn = D.nightmareDlg.querySelector('button[value=\"discardKey\"]');
  if(loseDoorBtn) loseDoorBtn.disabled = !hasDoor;
  if(discardKeyBtn) discardKeyBtn.disabled = !hasKey;
  D.nightmareDlg.returnValue=''; D.nightmareDlg.showModal();
  D.nightmareDlg.addEventListener('close', ()=>{
    const choice=D.nightmareDlg.returnValue||'';
    if(choice==='loseDoor' && !S.doors.length){ render('Et voi siirtää ovea Limboon, koska ovia ei ole avattu.'); resolveNightmare(); return; }
    if(choice==='discardKey' && !S.hand.some(c=>c.type==='key')){ render('Et voi heittää Avainta, koska kädessä ei ole avaimia.'); resolveNightmare(); return; }
    applyNightmareChoice(choice);
  }, {once:true});
}
function applyNightmareChoice(choice){
  S.discard.push(makeCard('nightmare'));										
  switch(choice){
    case 'loseDoor':{
      // handled via door picker; it will reshuffle & refill in its close handler
      openDoorPickDialog(); return;
    }
    case 'discardKey':{
      if(!discardOneKeyFromHand()){
        if (millTop5()){
        reshuffleLimbo(); drawUpToFive();
        render('Painajainen: 5 korttia paljastettu.');
        return;
      }
        // fallback to discard hand
        if (typeof _refilling!=='undefined') _refilling=false;
      S.discard.push(...S.hand);
      S.hand = [];
      drawUpToFive();
      render('Painajainen: käsi heitetty ja uusi 5 kortin käsi nostettu.');
      return;
      }
      reshuffleLimbo(); refillHand(); render('Painajainen: avain heitetty.'); return;
    }
    case 'mill5':{
      millTop5(); reshuffleLimbo(); drawUpToFive(); render('Painajainen: 5 korttia paljastettu.'); return;
    }
    case 'discardHand':{
      if (typeof _refilling!=='undefined') _refilling=false;
      S.discard.push(...S.hand);
      S.hand = [];
      drawUpToFive(); // opening-hand rule; no nightmare resolution here
      render('Painajainen: käsi heitetty ja uusi 5 kortin käsi nostettu.');
      return;
    }
    default:{
      // default order: discard key -> mill5 -> discard hand
      if (discardOneKeyFromHand()){ reshuffleLimbo(); refillHand(); render('Painajainen: avain heitetty.'); return; }
      if (millTop5()){
        reshuffleLimbo(); drawUpToFive();
        render('Painajainen: 5 korttia paljastettu.');
        return;
      }
      if (typeof _refilling!=='undefined') _refilling=false;
      S.discard.push(...S.hand);
      S.hand = [];
      drawUpToFive();
      render('Painajainen: käsi heitetty ja uusi 5 kortin käsi nostettu.');
      return;
    }
  }
}

function openDoorPickDialog(){
  D.doorChoices.innerHTML='';
  S.doors.forEach((d,idx)=>{
    const n=uiCard('door',d.color,'tiny');
    n.addEventListener('click',()=>{ const [rm]=S.doors.splice(idx,1); toLimbo(makeCard('door',rm.color)); D.pickDoorDlg.close('ok'); });
    D.doorChoices.appendChild(n);
  });
  D.pickDoorDlg.returnValue=''; D.pickDoorDlg.showModal();
  D.pickDoorDlg.addEventListener('close',()=>{ if(!S.limbo.some(k=>k.type==='door') && !S.doors.length){ if(millTop5()){} else discardWholeHandAndRefill(); } reshuffleLimbo(); refillHand(); render('Painajainen ratkaistu.'); }, {once:true});
}
function discardOneKeyFromHand(){ const i=S.hand.findIndex(c=>c.type==='key'); if(i>=0){ S.discard.push(S.hand.splice(i,1)[0]); return true; } return false; }
function millTop5(){ let any=false; for(let i=0;i<5;i++){ const c=drawTop(); if(!c) break; any=true; if(c.type==='door'||c.type==='nightmare'){ toLimbo(c);} else { S.discard.push(c);} } return any; }
function discardWholeHandAndRefill(){ S.discard.push(...S.hand); S.hand=[]; refillHand(); }

// ---- Prophecy (Key)
function useKeyProphecy(){
  try{ if(typeof _refilling!=='undefined') _refilling=false; }catch(e){}
  const selected = (S.selectedHand!=null) ? S.hand[S.selectedHand] : null;
  let idx = -1;
  if (selected && selected.type==='key') idx = S.selectedHand;
  else idx = S.hand.findIndex(c=>c.type==='key');
  const keysInHand = S.hand.filter(c=>c.type==='key').length;
  if(idx < 0){ renderStatusCounts(keysInHand===0 ? 'Kädessä ei ole Avainta.' : `Avaimia havaittu ${keysInHand}, mutta yksikään ei ole valittuna.`); return; }
  const key = S.hand.splice(idx,1)[0]; S.selectedHand=null; S.discard.push(key);
  const cards=[]; for(let i=0;i<5;i++){ const c=drawTop(); if(!c) break; cards.push(c); }
  S.prophecy={cards, removeIndex:null};
  openProphecyDialog();
}

function openProphecyDialog(){
  const P=S.prophecy; if(!P){ render(); return; }
  function renderProphecyCards(){
    D.prophecyCards.innerHTML='';
    P.cards.forEach((c,idx)=>{
      const n=uiCard(c.type,c.color,'tiny');
      n.addEventListener('click',()=>{ P.removeIndex=(P.removeIndex===idx?null:idx); renderProphecyCards(); wireProphecyArrows(renderProphecyCards); });
      if(idx===P.removeIndex) n.style.outline='3px solid #ff66ff';
      D.prophecyCards.appendChild(n);
    });
  }
  renderProphecyCards();
  wireProphecyArrows(renderProphecyCards);
  D.prophecyDlg.returnValue=''; D.prophecyDlg.showModal();
  D.prophecyDlg.addEventListener('close',()=>{
    const val=D.prophecyDlg.returnValue;
    if(val==='confirm'){
      if(P.removeIndex==null){ D.status.textContent='Valitse ensin poistettava kortti Ennustuksessa.'; openProphecyDialog(); return; }
      commitProphecy();
    } else {
      for(let i=P.cards.length-1;i>=0;i--) putOnTop(P.cards[i]);
      S.prophecy=null; refillHand(); render('Ennustus peruttu.');
    }
  }, {once:true});
}
function wireProphecyArrows(rerender){
  function setArrowState(){
    const P=S.prophecy, L=$('#propLeft'), R=$('#propRight');
    const hasSel = !!(P && P.removeIndex!=null);
    if(L) L.disabled = !hasSel || (P.removeIndex===0);
    if(R) R.disabled = !hasSel || (P.removeIndex===P.cards.length-1);
  }
  const L=$('#propLeft'), R=$('#propRight');
  if(L){ L.onclick=()=>{ const P=S.prophecy; if(!P||P.removeIndex==null) return; if(P.removeIndex>0){ const i=P.removeIndex; [P.cards[i-1],P.cards[i]]=[P.cards[i],P.cards[i-1]]; P.removeIndex=i-1; rerender(); setArrowState(); } }; }
  if(R){ R.onclick=()=>{ const P=S.prophecy; if(!P||P.removeIndex==null) return; if(P.removeIndex<P.cards.length-1){ const i=P.removeIndex; [P.cards[i+1],P.cards[i]]=[P.cards[i],P.cards[i+1]]; P.removeIndex=i+1; rerender(); setArrowState(); } }; }
  setArrowState();
}
function commitProphecy(){
  const P=S.prophecy; if(!P) return;
  const removed=P.cards.splice(P.removeIndex,1)[0];
  const abbr = (c)=> c.type==='door' ? `ovi-${colorAbbrFi(c.color)}`
              : c.type==='nightmare' ? 'painajainen'
              : c.type==='key' ? `avain-${colorAbbrFi(c.color)}`
              : `${(c.type==='sun'?'aur':'kuu')}-${colorAbbrFi(c.color)}`;
  if(removed.type==='door') toLimbo(removed); else S.discard.push(removed);
  // Return remaining in reverse so that leftmost ends up on top
  for(let i=P.cards.length-1;i>=0;i--){ putOnTop(P.cards[i]); }
  const orderTxt=P.cards.map(abbr).join(' → ');
  S.prophecy=null; refillHand(); render(`Ennustus: poistit ${abbr(removed)}; palautit järjestyksessä ${orderTxt} pakan päälle.`);
}

// ---- UI
function uiCard(type,color=null,size='small'){
  const d=document.createElement('div'); d.className=`card ${size} ${type} ${color||''} badge`; d.dataset.sym=color?colorAbbrFi(color):'';
  const sym=document.createElement('div'); sym.className=`sym ${type}`; d.appendChild(sym);
  const stripe=document.createElement('div'); stripe.className=`colorStripe ${color||''}`; d.appendChild(stripe);
  return d;
}
function renderStatusCounts(msg){
  D.deckCount.textContent=S.deck.length; D.discardCount.textContent=S.discard.length; D.keysInHand.textContent=S.hand.filter(c=>c.type==='key').length;
  if(msg) D.status.textContent=msg;
}
function render(msg){
  renderStatusCounts(msg);
  D.doorsArea.innerHTML=''; for(const c of COLORS){ const owned=S.doors.filter(d=>d.color===c).length; for(let i=0;i<2;i++){ const n=uiCard('door',c); if(i<owned) n.classList.add('owned'); D.doorsArea.appendChild(n);} }
  D.pathArea.innerHTML=''; S.path.forEach(c=> D.pathArea.appendChild(uiCard(c.type,c.color)));
  D.handArea.innerHTML=''; S.hand.forEach((c,idx)=>{ const n=uiCard(c.type,c.color); if(idx===S.selectedHand) n.style.outline='3px solid #f8f'; n.addEventListener('click',()=>onHandClick(idx)); D.handArea.appendChild(n); });
  D.discardPeek.innerHTML=''; S.discard.slice(-6).forEach(c=> D.discardPeek.appendChild(uiCard(c.type,c.color,'tiny')));
  const sel=(S.selectedHand!=null)?S.hand[S.selectedHand]:null;
  D.playSelBtn.disabled = !(sel && canPlayOnPath(sel));
  D.keyProphecyBtn.disabled = !S.hand.some(c=>c.type==='key');
  D.discardSelBtn.disabled = (S.selectedHand==null);
  if(D.resumeDrawBtn) D.resumeDrawBtn.style.display = (!S.gameOver && S.hand.length < HAND_SIZE) ? '' : 'none';
  if(S.doors.length===DOORS_TO_WIN){ S.gameOver=true; D.status.textContent='Voitit! Kaikki 8 ovea avattu. 🎉'; }
  else if(S.deck.length===0 && S.hand.length===0){ S.gameOver=true; D.status.textContent='Hävisit – pakka loppui. 😵'; }
}
function canPlayOnPath(card){
  if(!card) return false;
  if(!(card.type==='sun'||card.type==='moon'||card.type==='key')) return false;
  const last=S.path[S.path.length-1];
  if(last && last.type===card.type) return false;
  return true;
}
function onHandClick(idx){
  if(S.gameOver) return;
  const c=S.hand[idx]; if(!c) return;
  S.selectedHand = (S.selectedHand===idx?null:idx);
  render(S.selectedHand!=null ? 'Kortti valittu. Paina: Sijoita polulle / Heitä / (Avaimella) Ennustus.' : undefined);
}
function playSelected(){
  if(S.gameOver) return;
  const i=S.selectedHand; if(i==null){ render('Valitse ensin kortti.'); return; }
  const c=S.hand[i]; if(!canPlayOnPath(c)){ render('Tätä symbolia ei voi pelata peräkkäin.'); return; }
  S.path.push(c); S.hand.splice(i,1); S.selectedHand=null; checkDiscoverDoor(); refillHand(); render('Kortti pelattu polkuun.');
}
function discardSelected(){
  if(S.gameOver) return;
  const i=S.selectedHand; if(i==null) return;
  const c=S.hand[i]; S.hand.splice(i,1); S.selectedHand=null; S.discard.push(c); refillHand(); render('Kortti heitetty poistopakkaan.');
}
function bindUI(){
  D.newBtn.addEventListener('click', newGame);
  D.helpBtn.addEventListener('click', ()=>D.helpDlg.showModal());
  D.closeHelp.addEventListener('click', ()=>D.helpDlg.close());
  D.keyProphecyBtn.addEventListener('click', useKeyProphecy);
  D.discardSelBtn.addEventListener('click', discardSelected);
  D.playSelBtn.addEventListener('click', playSelected);
 
}

// ---- Boot
function boot(){ bindUI(); newGame(); }
if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
window.addEventListener('pageshow', ()=>{ if(!S.deck || (S.deck.length===0 && S.hand.length===0 && !S.gameOver)) newGame(); });