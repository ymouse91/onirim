/* Onirim PWA – auto-refill + stopper-loss + correct door supply + non-removing path + 12-path-render + hard cap discard + win-on-key (2025-09-25) */
const COLORS = ["red","blue","green","brown"];
const HAND_SIZE = 5;
const DOORS_TO_WIN = 8;
const $ = (sel)=>document.querySelector(sel);

/* ---------- Utilities ---------- */
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]]; } return a; }
function makeCard(type,color=null,symbol=null){ return {type,color,symbol}; }
function cardLabel(c){
  if(c.type==='sun'||c.type==='moon'||c.type==='key'){
    const sym=c.type==='sun'?'☼':(c.type==='moon'?'☾':'🗝️'); return `${sym} ${c.color||''}`;
  }
  if(c.type==='door') return `Ovi ${c.color||''}`;
  if(c.type==='nightmare') return 'Painajainen';
  return c.type;
}

/* ---------- State ---------- */
const S = {
  deck:[], discard:[], limbo:[], hand:[], path:[], doors:[],
  selectedHand:null, prophecy:null, gameOver:false,
  tailColor:null, tailRunLen:0, tailOpenedGroups:0
};

/* ---------- DOM ---------- */
const D = {
  deckCount: $('#deckCount'), discardCount: $('#discardCount'), limboCount: $('#limboCount'),
  keysInHand: $('#keysInHand'), nmCount: $('#nmCount'),
  status: $('#status'),
  doorsArea: $('#doorsArea'), pathArea: $('#pathArea'), handArea: $('#handArea'), discardPeek: $('#discardPeek'),
  newBtn: $('#newBtn'), helpBtn: $('#helpBtn'), helpDlg: $('#helpDlg'), closeHelp: $('#closeHelp'),
  nightmareDlg: $('#nightmareDlg'), pickDoorDlg: $('#pickDoorDlg'), doorChoices: $('#doorChoices'),
  keyProphecyBtn: $('#keyProphecyBtn'), discardSelBtn: $('#discardSelBtn'), playSelBtn: $('#playSelBtn'),
  prophecyDlg: $('#prophecyDlg'), prophecyCards: $('#prophecyCards'), propLeft: $('#propLeft'), propRight: $('#propRight'),
};

/* ---------- Deck ---------- */
function buildDeck(){
  const d=[];
  for(const c of COLORS) d.push(makeCard('door',c), makeCard('door',c));
  for(let i=0;i<10;i++) d.push(makeCard('nightmare'));
  for(const c of COLORS) for(let i=0;i<3;i++) d.push(makeCard('key',c,'key'));
  for(const c of COLORS) for(let i=0;i<4;i++) d.push(makeCard('moon',c,'moon'));
  const suns={red:9,blue:8,green:7,brown:6};
  for(const c of COLORS) for(let i=0;i<suns[c];i++) d.push(makeCard('sun',c,'sun'));
  return d; // 76
}

/* ---------- Render ---------- */
function el(tag, cls, text){ const e=document.createElement(tag); if(cls) e.className=cls; if(text!=null) e.textContent=text; return e; }
function renderCard(c, size='normal'){
  const cls=['card',c.type]; if(c.owned) cls.push('owned'); if(size==='small') cls.push('small'); if(size==='tiny') cls.push('tiny');
  const card=el('div', cls.join(' '));
  const sym=el('div', `sym ${c.type}`); card.appendChild(sym);
  if(c.color){ const stripe=el('div', `colorStripe ${c.color}`); card.appendChild(stripe); card.dataset.color=c.color; }
  if(c.symbol && (c.type==='sun'||c.type==='moon'||c.type==='key')){ card.classList.add('badge'); card.setAttribute('data-sym', c.symbol.toUpperCase()); }
  card.dataset.type=c.type; card.title=cardLabel(c); return card;
}
function renderStatusCounts(){
  if(D.deckCount) D.deckCount.textContent=S.deck.length;
  if(D.discardCount) D.discardCount.textContent=S.discard.length;
  if(D.limboCount) D.limboCount.textContent=S.limbo.length;
  if(D.keysInHand) D.keysInHand.textContent=S.hand.filter(c=>c.type==='key').length;
  if(D.nmCount) D.nmCount.textContent = S.deck.filter(c=>c.type==='nightmare').length;
}
function renderAreas(){
  D.doorsArea.innerHTML=''; S.doors.forEach(d=>D.doorsArea.appendChild(renderCard({...d,owned:true},'small')));

  D.pathArea.innerHTML='';
  const MAX_PATH_SHOWN=12;
  const hidden=Math.max(0,S.path.length-MAX_PATH_SHOWN);
  const start=Math.max(0,S.path.length-MAX_PATH_SHOWN);
  if(hidden>0){ const hint=el('div','pathHint',`(+${hidden} aiempaa)`); D.pathArea.appendChild(hint); }
  for(let i=start;i<S.path.length;i++) D.pathArea.appendChild(renderCard(S.path[i],'small'));

  D.handArea.innerHTML='';
  S.hand.forEach((c,i)=>{
    const n=renderCard(c);
    if(S.selectedHand===i) n.style.outline='3px solid #fff';
    n.addEventListener('click',()=>{ S.selectedHand=(S.selectedHand===i?null:i); renderAreas(); });
    D.handArea.appendChild(n);
  });

  D.discardPeek.innerHTML='';
  const n=Math.min(6,S.discard.length);
  for(let i=S.discard.length-n;i<S.discard.length;i++){
    if(i<0) continue;
    D.discardPeek.appendChild(renderCard(S.discard[i],'tiny'));
  }
}
function render(msg){ if(D.status && msg) D.status.textContent=msg; renderStatusCounts(); renderAreas(); }

/* ---------- Win/Loss ---------- */
function hasKeyInHand(){ return S.hand.some(c=>c.type==='key'); }
function checkWin(){
  if(S.doors.length>=DOORS_TO_WIN){
    S.gameOver=true;
    render('Voitto! Avasit kaikki 8 ovea.');
    return true;
  }
  return false;
}
function onlyStoppersLeft(){ return S.deck.length>0 && S.deck.every(c=>c.type==='door'||c.type==='nightmare'); }
function noMatchingKeysInHand(){
  const keyColors=new Set(S.hand.filter(c=>c.type==='key').map(c=>c.color));
  const doorColors=new Set(S.deck.filter(c=>c.type==='door').map(c=>c.color));
  for(const col of keyColors){ if(doorColors.has(col)) return false; }
  return true;
}
function checkLossAfterDraw(){
  if(S.hand.length<HAND_SIZE && S.deck.length===0){ S.gameOver=true; render('Et pysty täydentämään kättä 5:een – hävisit.'); return true; }
  if(onlyStoppersLeft() && noMatchingKeysInHand()){ S.gameOver=true; render('Pakka sisältää vain ovia/painajaisia eikä kädessä ole sopivia avaimia – hävisit.'); return true; }
  return false;
}

/* ---------- Limbo ---------- */
function toLimbo(card){ S.limbo.push(card); renderStatusCounts(); }
function reshuffleLimboIntoDeckTop(){
  if(!S.limbo.length) return;
  // Sekoita limbo koko pakan sekaan – ei pakan päälle
  S.deck = shuffle([...S.deck, ...S.limbo]);
  S.limbo.length = 0;
  renderStatusCounts();
}
/* ---------- Door supply helpers ---------- */
function takeDoorFromSupply(color){
  let idx=S.deck.findIndex(c=>c.type==='door'&&c.color===color);
  if(idx>=0){ const [d]=S.deck.splice(idx,1); return d; }
  idx=S.limbo.findIndex(c=>c.type==='door'&&c.color===color);
  if(idx>=0){ const [d]=S.limbo.splice(idx,1); return d; }
  return null;
}
function openedOfColor(color){ return S.doors.filter(d=>d.type==='door'&&d.color===color).length; }

/* ---------- Draw ---------- */
function drawTop(){ return S.deck.pop()||null; }
function drawUpToFive(){
  while(S.hand.length<HAND_SIZE){
    const c=drawTop(); if(!c) break;
    if(c.type==='door'||c.type==='nightmare'){ toLimbo(c); continue; }
    S.hand.push(c);
  }
  reshuffleLimboIntoDeckTop(); renderAreas(); checkLossAfterDraw();
}

/* ---------- Refill loop ---------- */
let _refilling=false;
function refillHand(){
  if(_refilling||S.gameOver) return;
  _refilling=true;

  const step=()=>{
    if(S.gameOver){ _refilling=false; return; }
    if(onlyStoppersLeft() && noMatchingKeysInHand()){ _refilling=false; checkLossAfterDraw(); return; }

    if(S.hand.length>=HAND_SIZE){
      reshuffleLimboIntoDeckTop();
      _refilling=false;
      renderAreas();
      checkWin();
      return;
    }

    const c=drawTop();
    if(!c){
      reshuffleLimboIntoDeckTop();
      _refilling=false;
      renderAreas();
      checkLossAfterDraw();
      return;
    }

    if(c.type==='door'){
      if(openedOfColor(c.color) >= 2){
        S.discard.push(c); // ylimääräinen ovi poistoon, ei limboon
        render(`Ylimääräinen ${c.color} ovi poistettiin pakasta.`);
        setTimeout(step,0);
        return;
      }
      const k=S.hand.findIndex(x=>x.type==='key' && x.color===c.color);
      if(k>=0){
        const key=S.hand.splice(k,1)[0];
        S.discard.push(key);
        S.doors.push({...c,owned:true});
        render(`Avasit oven (${c.color}) Avaimella.`);
        if(checkWin()){ _refilling=false; return; }   // <-- ratkaiseva lisäys
        setTimeout(step,0);
      }else{
        toLimbo(c);
        setTimeout(step,0);
      }
      return;
    }

    if(c.type==='nightmare'){
      S.discard.push(makeCard('nightmare'));
      showNightmareDialog().then(choice=>{
        resolveNightmare(choice).then(()=>setTimeout(step,0));
      });
      return;
    }

    S.hand.push(c);
    renderAreas();
    setTimeout(step,0);
  };

  step();
}

/* ---------- Nightmares ---------- */
function prepareNightmareButtons(dlg){
  const btnLose=dlg.querySelector('button[value="loseDoor"]');
  const btnKey=dlg.querySelector('button[value="discardKey"]');
  if(btnLose) btnLose.disabled=(S.doors.length===0);
  if(btnKey) btnKey.disabled=!hasKeyInHand();
}
function showNightmareDialog(){
  return new Promise(resolve=>{
    const dlg=D.nightmareDlg;
    prepareNightmareButtons(dlg);
    dlg.returnValue='';
    dlg.showModal();
    dlg.addEventListener('close', function onClose(){
      dlg.removeEventListener('close', onClose);
      resolve(dlg.returnValue||'cancel');
    }, {once:true});
  });
}
function showPickDoorDialog(){
  return new Promise(resolve=>{
    D.doorChoices.innerHTML='';
    S.doors.forEach((d,i)=>{
      const n=renderCard(d,'small');
      n.style.cursor='pointer';
      n.addEventListener('click', ()=>{ resolve(i); D.pickDoorDlg.close('pick'); });
      D.doorChoices.appendChild(n);
    });
    D.pickDoorDlg.returnValue='';
    D.pickDoorDlg.showModal();
    D.pickDoorDlg.addEventListener('close', function onClose(){
      D.pickDoorDlg.removeEventListener('close', onClose);
      if(D.pickDoorDlg.returnValue!=='pick') resolve(null);
    }, {once:true});
  });
}
function discardOneKeyFromHand(){
  const i=S.hand.findIndex(c=>c.type==='key');
  if(i>=0){ S.discard.push(S.hand.splice(i,1)[0]); return true; }
  return false;
}
function millTop5(){
  const revealed=[];
  for(let i=0;i<5;i++){ const c=drawTop(); if(!c) break; revealed.push(c); }
  let any=false;
  for(const c of revealed){
    if(c.type==='door'||c.type==='nightmare'){ toLimbo(c); any=true; }
    else S.discard.push(c);
  }
  render('Paljastettu 5 korttia.');
  return any;
}
async function resolveNightmare(choice){
  if(choice==='loseDoor'){
    if(S.doors.length){
      const idx=await showPickDoorDialog();
      if(idx!=null){
        const d=S.doors.splice(idx,1)[0];
        toLimbo(d);
        reshuffleLimboIntoDeckTop();
        render('Painajainen: yksi ovi siirrettiin limboon.');
        return;
      }
    }
    choice='discardKey';
  }

  if(choice==='discardKey'){
    if(discardOneKeyFromHand()){
      reshuffleLimboIntoDeckTop();
      render('Painajainen: avain heitetty.');
      return;
    }
    choice='mill5';
  }

  if(choice==='mill5'){
    millTop5();
    reshuffleLimboIntoDeckTop();
    drawUpToFive();
    render('Painajainen: 5 korttia paljastettu; ovet/painajaiset limboon, muut poistoon.');
    return;
  }

  if(choice==='discardHand'){
    S.discard.push(...S.hand);
    S.hand=[];
    drawUpToFive();
    render('Painajainen: käsi heitetty ja uusi 5 kortin käsi nostettu.');
    return;
  }
}

/* ---------- Path & Doors (ei siivousta) ---------- */
function updateTailRunAndMaybeOpenDoors(newCard){
  const c=newCard;
  if(!c || !c.color){ S.tailColor=null; S.tailRunLen=0; S.tailOpenedGroups=0; return; }

  if(S.tailColor===c.color) S.tailRunLen += 1;
  else { S.tailColor=c.color; S.tailRunLen=1; S.tailOpenedGroups=0; }

  const groupsNow = Math.floor(S.tailRunLen/3);

  while(S.tailOpenedGroups < groupsNow){
    if(openedOfColor(S.tailColor) >= 2) break;
    const doorCard = takeDoorFromSupply(S.tailColor);
    if(!doorCard) break;
    S.doors.push({...doorCard, owned:true});
    S.tailOpenedGroups += 1;
    render(`Kolmikko samaa väriä – ${S.tailColor} ovi avautui!`);
    renderAreas();
    if(checkWin()) return;
  }
}

/* ---------- Actions ---------- */
function playSelectedToPath(){
  if(S.gameOver) return false;
  const i=S.selectedHand; if(i==null) return false;
  const card=S.hand[i];
  if(card.type==='door'||card.type==='nightmare'){ render('Et voi pelata tätä korttia polulle.'); return false; }

  // ei samaa symbolia peräkkäin
  if(S.path.length){
    const last=S.path[S.path.length-1];
    const symLast=(last.type==='key'?'key':last.type);
    const symThis=(card.type==='key'?'key':card.type);
    if(symLast===symThis){ render('Et saa pelata samaa symbolia peräkkäin polkuun.'); return false; }
  }

  S.path.push(card);
  S.hand.splice(i,1);
  S.selectedHand=null;

  updateTailRunAndMaybeOpenDoors(card);

  render('Kortti pelattu polulle.');
  refillHand();
  return true;
}

function discardSelectedFromHand(){
  if(S.gameOver) return false;
  const i=S.selectedHand; if(i==null) return false;
  const card=S.hand.splice(i,1)[0];
  S.selectedHand=null;
  S.discard.push(card);
  render('Kortti heitetty poistopakkaan.');
  refillHand();
  return true;
}

/* ---------- Prophecy (Key) ---------- */
function renderProphecy(){
  D.prophecyCards.innerHTML='';
  if(!S.prophecy) return;
  S.prophecy.list.forEach((c,idx)=>{
    const n=renderCard(c,'small');
    if(idx===S.prophecy.sel) n.style.outline='3px solid #fff';
    n.addEventListener('click',()=>{ S.prophecy.sel=idx; renderProphecy(); });
    D.prophecyCards.appendChild(n);
  });
}
function useKeyProphecy(){
  if(S.gameOver) return;
  const idx=S.hand.findIndex(c=>c.type==='key');
  if(idx<0){ render('Kädessä ei ole Avain-korttia.'); return; }

  const key=S.hand.splice(idx,1)[0];
  S.discard.push(key);

  const peek=[]; for(let i=0;i<5;i++){ const c=drawTop(); if(!c) break; peek.push(c); }
  S.prophecy={list:peek, sel:0};
  renderProphecy();

  D.propLeft.onclick=()=>{ if(!S.prophecy) return; if(S.prophecy.sel>0){ const s=S.prophecy.sel-1; [S.prophecy.list[s],S.prophecy.list[s+1]]=[S.prophecy.list[s+1],S.prophecy.list[s]]; S.prophecy.sel=s; renderProphecy(); } };
  D.propRight.onclick=()=>{ if(!S.prophecy) return; if(S.prophecy.sel<S.prophecy.list.length-1){ const s=S.prophecy.sel; [S.prophecy.list[s],S.prophecy.list[s+1]]=[S.prophecy.list[s+1],S.prophecy.list[s]]; S.prophecy.sel=s+1; renderProphecy(); } };

  D.prophecyDlg.returnValue='';
  D.prophecyDlg.showModal();

  const onClose=()=>{
    D.prophecyDlg.removeEventListener('close', onClose);
    if(!S.prophecy){ renderAreas(); return; }
    const rv=D.prophecyDlg.returnValue;
    if(rv==='confirm'){
      const removed=S.prophecy.list.splice(S.prophecy.sel,1)[0];
      if(removed.type==='door') toLimbo(removed);
      else S.discard.push(removed); // nightmare & muut
      for(let i=S.prophecy.list.length-1;i>=0;i--) S.deck.push(S.prophecy.list[i]);
      S.prophecy=null;
      render('Ennustus vahvistettu.');
      refillHand();
    }else{
      for(let i=S.prophecy.list.length-1;i>=0;i--) S.deck.push(S.prophecy.list[i]);
      S.prophecy=null;
      render('Ennustus peruttu.');
      refillHand();
    }
  };
  D.prophecyDlg.addEventListener('close', onClose, {once:true});
}

/* ---------- Boot ---------- */
function bindUI(){
  if(D.newBtn) D.newBtn.addEventListener('click', newGame);
  if(D.helpBtn) D.helpBtn.addEventListener('click', ()=>D.helpDlg.showModal());
  if(D.closeHelp) D.closeHelp.addEventListener('click', ()=>D.helpDlg.close());
  if(D.playSelBtn) D.playSelBtn.addEventListener('click', playSelectedToPath);
  if(D.discardSelBtn) D.discardSelBtn.addEventListener('click', discardSelectedFromHand);
  if(D.keyProphecyBtn) D.keyProphecyBtn.addEventListener('click', useKeyProphecy);
}
function newGame(){
  Object.assign(S,{
    deck:shuffle(buildDeck()), discard:[], limbo:[], hand:[], path:[], doors:[],
    selectedHand:null, prophecy:null, gameOver:false,
    tailColor:null, tailRunLen:0, tailOpenedGroups:0
  });
  drawUpToFive();
  render('Uusi peli: avaa 8 ovea ennen kuin pakka loppuu.');
}
function boot(){ bindUI(); newGame(); }
if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
