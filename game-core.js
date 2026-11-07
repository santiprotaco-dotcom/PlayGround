const TYPES={K:{name:'Rey',glyph:'♔',black:'♚',hp:42,mp:18,atk:7,ability:'Mandato real',skill:'Ordena a su guardia y recupera 8 PV.',cost:5},Q:{name:'Reina',glyph:'♕',black:'♛',hp:34,mp:26,atk:10,ability:'Lanza astral',skill:'Golpe mágico devastador.',cost:9},R:{name:'Torre',glyph:'♖',black:'♜',hp:38,mp:18,atk:8,ability:'Bastión',skill:'Se protege y restaura 10 PV.',cost:5},B:{name:'Alfil',glyph:'♗',black:'♝',hp:28,mp:26,atk:7,ability:'Luz sanadora',skill:'Recupera 12 PV y 3 de éter.',cost:4},N:{name:'Caballo',glyph:'♘',black:'♞',hp:31,mp:20,atk:9,ability:'Estocada',skill:'Ataque rápido con probabilidad de crítico.',cost:4},P:{name:'Peón',glyph:'♙',black:'♟',hp:22,mp:14,atk:5,ability:'Espíritu tenaz',skill:'Golpea con fuerza creciente.',cost:2}};
const SHOP=[{id:'potion',name:'Poción',icon:'⚗',price:35,desc:'Restaura 18 PV a una pieza.'},{id:'ether',name:'Éter',icon:'✧',price:30,desc:'Restaura 12 puntos de esencia.'},{id:'revive',name:'Revivir',icon:'✦',price:70,desc:'Devuelve a una pieza caída con la mitad de sus PV.'}];const STORE='reinos-eter-v1';let state,selected=null,legal=[],flipped=false,battle=null,toastTimer,aiTimer,rosterSelected=null;function makePiece(type,color,x,y,n){const t=TYPES[type];return{id:`${color}-${type}-${n}`,type,color,x,y,hp:t.hp,maxHp:t.hp,mp:t.mp,maxMp:t.mp,level:1,xp:0,alive:true,moved:false}}function freshState(){const pieces=[];let n=0;for(let x=0;x<8;x++)pieces.push(makePiece('P','b',x,1,n++),makePiece('P','w',x,6,n++));['R','N','B','Q','K','B','N','R'].forEach((t,x)=>pieces.push(makePiece(t,'b',x,0,n++),makePiece(t,'w',x,7,n++)));return{pieces,turn:'w',move:1,gold:120,inventory:{potion:2,ether:1,revive:1},selected:null,lastMove:null,log:[],gameOver:false,winner:null,undoSnapshot:null}}function load(){try{const d=JSON.parse(localStorage.getItem(STORE));if(d&&Array.isArray(d.pieces))return d}catch(e){}return freshState()}state=load();const $=id=>document.getElementById(id),boardEl=$('board');function save(){try{localStorage.setItem(STORE,JSON.stringify(state))}catch(e){}}function pieceAt(x,y){return state.pieces.find(p=>p.alive&&p.x===x&&p.y===y)}function own(p){return p&&p.color==='w'}function label(p){return TYPES[p.type].name}function inBounds(x,y){return x>=0&&x<8&&y>=0&&y<8}function addLog(text){state.log.unshift({text,time:new Date().toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})});state.log=state.log.slice(0,20);renderLog();save()}function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2300)}
function pseudo(p){const out=[],{x,y,type,color}=p,dir=color==='w'?-1:1;const add=(a,b)=>{if(!inBounds(a,b))return false;const q=pieceAt(a,b);if(!q)out.push([a,b]);else if(q.color!==color)out.push([a,b]);return !q};if(type==='P'){if(inBounds(x,y+dir)&&!pieceAt(x,y+dir)){out.push([x,y+dir]);if(!p.moved&&!pieceAt(x,y+2*dir))out.push([x,y+2*dir])}for(const dx of [-1,1]){const q=pieceAt(x+dx,y+dir);if(q&&q.color!==color)out.push([x+dx,y+dir])}}else if(type==='N'){for(const[dx,dy]of [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]]){const q=pieceAt(x+dx,y+dy);if(inBounds(x+dx,y+dy)&&(!q||q.color!==color))out.push([x+dx,y+dy])}}else if(type==='K'){for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)if(dx||dy){const q=pieceAt(x+dx,y+dy);if(inBounds(x+dx,y+dy)&&(!q||q.color!==color))out.push([x+dx,y+dy])}}else{const dirs=[];if(type==='R'||type==='Q')dirs.push([1,0],[-1,0],[0,1],[0,-1]);if(type==='B'||type==='Q')dirs.push([1,1],[1,-1],[-1,1],[-1,-1]);for(const[dx,dy]of dirs){let a=x+dx,b=y+dy;while(add(a,b)){a+=dx;b+=dy}}}return out}function isAttacked(x,y,by){return state.pieces.some(p=>{if(!p.alive||p.color!==by)return false;if(p.type==='P')return Math.abs(p.x-x)===1&&p.y+(by==='w'?-1:1)===y;return pseudo(p).some(([a,b])=>a===x&&b===y)})}function king(color){return state.pieces.find(p=>p.alive&&p.color===color&&p.type==='K')}function inCheck(color){const k=king(color);return k?isAttacked(k.x,k.y,color==='w'?'b':'w'):true}function legalMoves(p){return pseudo(p).filter(([x,y])=>{const target=pieceAt(x,y);if(target?.type==='K')return false;const ox=p.x,oy=p.y;p.x=x;p.y=y;if(target)target.alive=false;const safe=!inCheck(p.color);p.x=ox;p.y=oy;if(target)target.alive=true;return safe})}function allMoves(color){return state.pieces.filter(p=>p.alive&&p.color===color).flatMap(p=>legalMoves(p).map(([x,y])=>({p,x,y,capture:!!pieceAt(x,y)})))}
function renderBoard(){boardEl.innerHTML='';const ranks=flipped?[...Array(8).keys()]:[...Array(8).keys()].reverse(),files=flipped?[...Array(8).keys()].reverse():[...Array(8).keys()];for(const y of ranks)for(const x of files){const sq=document.createElement('div');sq.className=`square ${(x+y)%2?'dark':'light'}`;sq.setAttribute('role','gridcell');sq.dataset.x=x;sq.dataset.y=y;const p=pieceAt(x,y);if(state.lastMove&&((state.lastMove.from[0]===x&&state.lastMove.from[1]===y)||(state.lastMove.to[0]===x&&state.lastMove.to[1]===y)))sq.classList.add('last-move');if(p?.type==='K'&&inCheck(p.color))sq.classList.add('check');if(selected===p)sq.classList.add('selected');if(legal.some(m=>m[0]===x&&m[1]===y)){sq.classList.add('legal');if(p)sq.classList.add('capture')}if(p){const span=document.createElement('span');span.className=`piece ${p.color==='w'?'white':'black'}`;span.textContent=p.color==='w'?TYPES[p.type].glyph:TYPES[p.type].black;sq.append(span);if(own(p)&&p.level>1){const lev=document.createElement('span');lev.className='piece-level';lev.textContent=p.level;sq.append(lev)}}sq.onclick=()=>onSquare(x,y);boardEl.append(sq)}$('rankLabels').innerHTML=(flipped?'12345678':'87654321').split('').map(v=>`<span>${v}</span>`).join('');$('fileLabels').innerHTML=(flipped?'hgfedcba':'abcdefgh').split('').map(v=>`<span>${v}</span>`).join('')}
function onSquare(x,y){if(battle||state.gameOver||state.turn!=='w')return;const p=pieceAt(x,y);if(selected&&legal.some(m=>m[0]===x&&m[1]===y)){state.undoSnapshot=JSON.stringify({...state,undoSnapshot:null});const mover=selected,target=pieceAt(x,y);selected=null;legal=[];if(target)startBattle(mover,target,x,y);else applyMove(mover,x,y);return}if(p&&p.color==='w'){selected=p;legal=legalMoves(p)}else{selected=null;legal=[]}renderBoard()}function applyMove(p,x,y){const from=[p.x,p.y];p.x=x;p.y=y;p.moved=true;if(p.type==='P'&&(y===0||y===7)){p.type='Q';p.maxHp=TYPES.Q.hp+5*(p.level-1);p.hp=Math.min(p.maxHp,p.hp+8);p.maxMp=TYPES.Q.mp+4*(p.level-1);toast('¡Tu peón ha ascendido a Reina!');addLog(`<strong>${label(p)}</strong> asciende por el tablero.`)}state.lastMove={from,to:[x,y]};endTurn(p.color);renderAll()}function endTurn(movedColor){state.turn=movedColor==='w'?'b':'w';if(movedColor==='b')state.move++;selected=null;legal=[];const moves=allMoves(state.turn);if(!moves.length){state.gameOver=true;state.winner=inCheck(state.turn)?movedColor:null;addLog(state.winner?`<strong>${state.winner==='w'?'Guardia del Alba':'La Sombra'}</strong> gana la partida por jaque mate.`:'La partida termina en tablas.');toast(state.winner?(state.winner==='w'?'¡Jaque mate! Has ganado':'Jaque mate. La Sombra gana'):'Tablas.')}else if(inCheck(state.turn))addLog(`<strong>¡Jaque!</strong> El rey ${state.turn==='w'?'del Alba':'de la Sombra'} está amenazado.`);save();renderBoard();renderHud();if(state.turn==='b'&&!state.gameOver&&!battle)aiTimer=setTimeout(aiMove,650)}

function startBattle(attacker,defender,x,y){
  clearTimeout(aiTimer);
  battle={attacker,defender,x,y,guard:{w:0,b:0},over:false,playerBusy:false};
  $('battleModal').classList.remove('hidden');
  $('battleTitle').textContent=`${label(attacker)} contra ${label(defender)}`;
  $('battleSubtitle').textContent=attacker.color==='w'?'Tu pieza desafía a una esencia rival.':'¡La Sombra ha iniciado un duelo!';
  $('battleMessage').textContent=attacker.color==='w'?'Elige una acción para comenzar.':'La Sombra prepara su ataque…';
  updateBattle();
  renderHud();
  if(attacker.color==='b')setTimeout(enemyBattleTurn,650);
}
function battlePiece(color){return battle&&(battle.attacker.color===color?battle.attacker:battle.defender)}
function battleGlyph(piece){return piece.color==='w'?TYPES[piece.type].glyph:TYPES[piece.type].black}
function updateBattle(){
  if(!battle)return;
  for(const [piece,prefix] of [[battle.attacker,'attacker'],[battle.defender,'defender']]){
    const type=TYPES[piece.type];
    $(`${prefix}Glyph`).textContent=battleGlyph(piece);
    $(`${prefix}Name`).textContent=label(piece);
    $(`${prefix}Meta`).textContent=`Nv. ${piece.level} · ${piece.color==='w'?'Guardia del Alba':'La Sombra'}`;
    $(`${prefix}HpBar`).style.width=`${Math.max(0,piece.hp)/piece.maxHp*100}%`;
    $(`${prefix}HpText`).textContent=`${Math.max(0,piece.hp)} / ${piece.maxHp} PV`;
    $(`${prefix}MpBar`).style.width=`${Math.max(0,piece.mp)/piece.maxMp*100}%`;
    $(`${prefix}MpText`).textContent=`${Math.max(0,piece.mp)} / ${piece.maxMp} ÉTER`;
    $(`${prefix}Card`).classList.toggle('active-combatant',piece.color==='w');
  }
  $('battleTurn').textContent=battle.over?'DUELO RESUELTO':battlePiece('w')?.color==='w'?'TU ACCIÓN':'TURNO RIVAL';
  if(battle.over)return;
  const actions=$('battleActions');
  actions.innerHTML='';
  const hero=battlePiece('w'),canAct=hero&&hero.hp>0&&!battle.playerBusy;
  const addAction=(title,desc,fn,disabled=false,cls='')=>{
    const button=document.createElement('button');button.className=`battle-action ${cls}`;button.disabled=disabled;
    button.innerHTML=`<strong>${title}</strong><small>${desc}</small>`;button.onclick=fn;actions.append(button);
  };
  addAction('⚔ Atacar',`Daño ${Math.max(2,Math.round(TYPES[hero.type].atk*(1+hero.level*.08)))} PV`,()=>playerBattleAction('attack'),!canAct);
  const cost=hero.type==='B'?5:hero.type==='K'||hero.type==='R'?6:8;
  addAction(`✧ ${TYPES[hero.type].ability}`,`${TYPES[hero.type].skill} · ${cost} éter`,()=>playerBattleAction('skill'),!canAct||hero.mp<cost,'special');
  addAction('◈ Defender','Reduce el próximo golpe y recupera 2 éter',()=>playerBattleAction('guard'),!canAct,'special');
  addAction(`⚗ Poción ×${state.inventory.potion}`,'+18 PV · objeto de un uso',()=>playerBattleAction('potion'),!canAct||!state.inventory.potion||hero.hp>=hero.maxHp,'item-action');
}
function battleDamage(source,target,multiplier=1){
  const base=TYPES[source.type].atk+Math.floor(source.level*1.4);
  const critical=Math.random()<(.08+(source.type==='N'?.18:0));
  const raw=Math.max(2,Math.round(base*multiplier*(critical?1.7:1)));
  const blocked=battle.guard[target.color]||0;
  battle.guard[target.color]=0;
  const damage=Math.max(1,raw-blocked);
  target.hp=Math.max(0,target.hp-damage);
  return `${label(source)} inflige ${damage} PV${critical?' (¡crítico!)':''}${blocked?`; la guardia absorbe ${Math.min(raw,blocked)}.`:'.'}`;
}
function playerBattleAction(action){
  if(!battle||battle.over||battle.playerBusy)return;
  const hero=battlePiece('w'),foe=battlePiece('b');
  if(!hero||hero.hp<=0)return;
  let message='';
  if(action==='attack')message=battleDamage(hero,foe);
  else if(action==='guard'){battle.guard.w=8;hero.mp=Math.min(hero.maxMp,hero.mp+2);message=`${label(hero)} adopta una guardia firme y recupera 2 de éter.`}
  else if(action==='potion'){
    if(!state.inventory.potion||hero.hp>=hero.maxHp)return;
    state.inventory.potion--;const restored=Math.min(18,hero.maxHp-hero.hp);hero.hp+=restored;message=`La Poción restaura ${restored} PV a ${label(hero)}.`;
  }else if(action==='skill')message=useBattleSkill(hero,foe);
  $('battleMessage').textContent=message;
  if(foe.hp<=0){updateBattle();finishBattle(hero);return}
  battle.playerBusy=true;updateBattle();
  setTimeout(()=>{if(!battle||battle.over)return;enemyBattleTurn()},700);
}
function useBattleSkill(user,target){
  const cost=user.type==='B'?5:user.type==='K'||user.type==='R'?6:8;
  if(user.mp<cost)return 'No hay suficiente éter.';
  user.mp-=cost;
  if(user.type==='K'){
    const damage=battleDamage(user,target,1.15);const healed=Math.min(8,user.maxHp-user.hp);user.hp+=healed;return `${damage} Mandato real restaura ${healed} PV.`;
  }
  if(user.type==='R'){
    const healed=Math.min(10,user.maxHp-user.hp);user.hp+=healed;battle.guard[user.color]=9;return `Bastión restaura ${healed} PV y absorbe hasta 9 de daño.`;
  }
  if(user.type==='B'){
    const healed=Math.min(12,user.maxHp-user.hp);user.hp+=healed;user.mp=Math.min(user.maxMp,user.mp+3);return `Luz sanadora restaura ${healed} PV y 3 de éter.`;
  }
  if(user.type==='N')return battleDamage(user,target,1.65);
  if(user.type==='P')return battleDamage(user,target,1.25+Math.min(user.level,5)*.08);
  return battleDamage(user,target,1.8);
}
function enemyBattleTurn(){
  if(!battle||battle.over)return;
  const enemy=battlePiece('b'),hero=battlePiece('w');
  if(!enemy||enemy.hp<=0){finishBattle(hero);return}
  battle.playerBusy=false;
  let message;
  const hurt=enemy.hp<enemy.maxHp*.45,canHeal=enemy.type==='B'||enemy.type==='K'||enemy.type==='R';
  if(hurt&&canHeal&&enemy.mp>=5&&Math.random()<.48)message=useBattleSkill(enemy,hero);
  else if(enemy.mp>=8&&Math.random()<.28)message=useBattleSkill(enemy,hero);
  else if(Math.random()<.16){battle.guard.b=7;enemy.mp=Math.min(enemy.maxMp,enemy.mp+2);message=`La Sombra protege a ${label(enemy)}.`}
  else message=battleDamage(enemy,hero);
  $('battleMessage').textContent=message;
  updateBattle();
  if(hero.hp<=0)finishBattle(enemy);
  else {battle.playerBusy=false;updateBattle()}
}
function finishBattle(winner){
  if(!battle||battle.over)return;
  battle.over=true;
  const {attacker,defender,x,y}=battle,attackerWon=winner===attacker;
  const loser=attackerWon?defender:attacker;
  loser.alive=false;loser.hp=0;
  if(attackerWon){attacker.x=x;attacker.y=y;attacker.moved=true}
  const winnerColor=winner.color;
  if(winnerColor==='w'){
    const gained=30+TYPES[loser.type].cost*4;state.gold+=gained;
    winner.xp+=35+TYPES[loser.type].cost*3;
    let levelMessage='';
    while(winner.xp>=winner.level*50){winner.xp-=winner.level*50;winner.level++;winner.maxHp+=5;winner.hp=Math.min(winner.maxHp,winner.hp+5);winner.maxMp+=3;winner.mp=Math.min(winner.maxMp,winner.mp+3);levelMessage=` ¡${label(winner)} alcanza el nivel ${winner.level}!`}
    state.inventory.potion=(state.inventory.potion||0)+1;
    $('battleResult').innerHTML=`¡Victoria! ${label(winner)} gana ${gained} de oro, una Poción y experiencia.${levelMessage}<button id="battleContinue">Continuar</button>`;
    addLog(`<strong>${label(winner)}</strong> vence el duelo y obtiene ${gained} de oro.`);
  }else{
    const gained=15;state.gold+=gained;winner.xp+=15;
    $('battleResult').innerHTML=`Derrota. ${label(winner)} resiste y recibe ${gained} de oro por su valor.<button id="battleContinue">Continuar</button>`;
    addLog(`<strong>${label(winner)}</strong> sobrevive al duelo, pero el ejército pierde ${label(loser)}.`);
  }
  $('battleActions').innerHTML='';$('battleResult').classList.remove('hidden');$('battleContinue').onclick=closeBattle;
  $('battleMessage').textContent=attackerWon?`${label(attacker)} prevalece en el duelo.`:`${label(defender)} resiste y cambia el rumbo del combate.`;
  updateBattle();
  renderHud();save();
}
function closeBattle(){
  if(!battle||!battle.over)return;
  const movedColor=battle.attacker.color;
  $('battleModal').classList.add('hidden');$('battleResult').classList.add('hidden');
  $('battleActions').innerHTML='';battle=null;selected=null;legal=[];
  endTurn(movedColor);renderAll();
}

