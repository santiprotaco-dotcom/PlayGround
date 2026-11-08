const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const reticle = document.getElementById('reticle');
const sceneAlert = document.getElementById('sceneAlert');
const alertText = document.getElementById('alertText');
const missionBar = document.getElementById('missionBar');
const missionProgress = document.getElementById('missionProgress');
const weaponsGrid = document.getElementById('weaponGrid');
const shopModal = document.getElementById('shopModal');
const helpModal = document.getElementById('helpModal');
const weaponName = document.getElementById('weaponName');
const weaponType = document.getElementById('weaponType');
const ammoCount = document.getElementById('ammoCount');
const ammoTrack = document.getElementById('ammoTrack');
const creditsEl = document.getElementById('credits');
const ducksDownEl = document.getElementById('ducksDown');
const accuracyEl = document.getElementById('accuracy');
const bestStreakEl = document.getElementById('bestStreak');
const resultTitle = document.getElementById('resultTitle');
const resultCopy = document.getElementById('resultCopy');
const roundResult = document.getElementById('roundResult');
const continueButton = document.getElementById('continueButton');
const clockEl = document.getElementById('clock');
const waveNumber = document.getElementById('waveNumber');
const distanceReadout = document.getElementById('distanceReadout');
const shotFlash = document.getElementById('shotFlash');
const reloadButton = document.getElementById('reloadButton');
const movePad = document.getElementById('movePad');
const fireTouch = document.getElementById('fireTouch');
const reloadTouch = document.getElementById('reloadTouch');

const weaponCatalog = [
  {
    id: 'field12',
    name: 'FIELD',
    variant: '/ 12',
    type: 'ESCOPETA SEMIAUTOMÁTICA',
    magazine: 6,
    ammo: 6,
    damage: 34,
    pellets: 7,
    spread: 0.28,
    fireRate: 0.55,
    reload: 1.1,
    range: 46,
    accuracy: 0.72,
    price: 0,
    owned: true,
  },
  {
    id: 'mk7',
    name: 'MK-7',
    variant: '/ 7',
    type: 'CARABINA DE PRECISIÓN',
    magazine: 5,
    ammo: 5,
    damage: 56,
    pellets: 1,
    spread: 0.12,
    fireRate: 0.35,
    reload: 1.4,
    range: 78,
    accuracy: 0.88,
    price: 350,
    owned: false,
  },
  {
    id: 'judge',
    name: 'JUDGE',
    variant: '/ 20',
    type: 'BASCULA DE CAMPO',
    magazine: 8,
    ammo: 8,
    damage: 29,
    pellets: 11,
    spread: 0.34,
    fireRate: 0.76,
    reload: 1.6,
    range: 38,
    accuracy: 0.63,
    price: 520,
    owned: false,
  },
  {
    id: 'razor',
    name: 'RAZOR',
    variant: '/ 9',
    type: 'RIFLE DE ASALTO',
    magazine: 10,
    ammo: 10,
    damage: 42,
    pellets: 1,
    spread: 0.16,
    fireRate: 0.22,
    reload: 1.3,
    range: 68,
    accuracy: 0.8,
    price: 710,
    owned: false,
  }
];

const state = {
  credits: 1250,
  missionGoal: 5,
  missionProgress: 0,
  currentWeapon: 0,
  shotsFired: 0,
  shotsHit: 0,
  ducksDown: 0,
  bestStreak: 0,
  currentStreak: 0,
  wave: 1,
  paused: false,
  gameOver: false,
  alertTimer: 0,
  spawnTimer: 0,
  time: 0,
  lastTs: 0,
  player: {
    x: 0,
    y: 0,
    speed: 280,
    radius: 20,
    currentAim: { x: 0, y: 0 },
  },
  mouse: {
    x: 0,
    y: 0,
    active: false,
  },
  keys: {
    w: false,
    a: false,
    s: false,
    d: false,
    arrowup: false,
    arrowleft: false,
    arrowdown: false,
    arrowright: false,
  },
  moveStick: { active: false, x: 0, y: 0 },
  ducks: [],
  message: '',
  flare: 0,
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const randomRange = (min, max) => min + (max - min) * Math.random();
const formatMoney = (n) => n.toLocaleString('es-ES');

function setCanvasSize() {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, rect.width || 640);
  const height = Math.max(300, rect.height || 420);
  canvas.width = width;
  canvas.height = height;
  state.player.x = canvas.width / 2;
  state.player.y = canvas.height * 0.75;
  state.player.currentAim.x = canvas.width / 2;
  state.player.currentAim.y = canvas.height * 0.3;
}

function updateClock() {
  const date = new Date();
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = ((hours + 11) % 12 + 1);
  clockEl.textContent = `${String(displayHour).padStart(2, '0')}:${minutes} ${suffix}`;
}

function showAlert(text) {
  alertText.textContent = text;
  sceneAlert.classList.add('show');
  state.alertTimer = 1.2;
}

function updateMissionUI() {
  const progress = clamp(state.missionProgress / state.missionGoal, 0, 1);
  missionBar.style.width = `${progress * 100}%`;
  missionProgress.textContent = `${state.missionProgress} / ${state.missionGoal}`;
  ducksDownEl.textContent = state.ducksDown;
  const accuracy = state.shotsFired ? Math.round((state.shotsHit / state.shotsFired) * 100) : 0;
  accuracyEl.innerHTML = `${accuracy}<small>%</small>`;
  bestStreakEl.innerHTML = `${state.bestStreak}<span class="streak-star">✦</span>`;
}

function getActiveWeapon() {
  return weaponCatalog[state.currentWeapon];
}

function updateWeaponUI() {
  const weapon = getActiveWeapon();
  weaponName.innerHTML = `${weapon.name}<span> ${weapon.variant}</span>`;
  weaponType.textContent = weapon.type;
  const mag = weapon.ammo;
  ammoCount.textContent = String(mag);
  ammoTrack.innerHTML = '';
  for (let i = 0; i < weapon.magazine; i += 1) {
    const pellet = document.createElement('i');
    pellet.className = i < mag ? '' : 'empty';
    ammoTrack.appendChild(pellet);
  }
  const accuracy = Math.round(weapon.accuracy * 100);
  const rangePercent = Math.min(100, Math.round((weapon.range / 90) * 100));
  const cadencePercent = Math.min(100, Math.round((1 / weapon.fireRate) * 95));
  const meterBars = document.querySelectorAll('.meter i');
  meterBars[0].style.width = `${rangePercent}%`;
  meterBars[1].style.width = `${cadencePercent}%`;
  meterBars[2].style.width = `${accuracy}%`;
}

function updateCreditsUI() {
  creditsEl.textContent = formatMoney(state.credits);
}

function spawnDuck() {
  const side = Math.floor(Math.random() * 4);
  const margin = 20;
  let x; let y; let vx; let vy;

  if (side === 0) {
    x = randomRange(-30, canvas.width + 30);
    y = canvas.height + 40;
    vx = randomRange(-80, 80);
    vy = -randomRange(55, 110);
  } else if (side === 1) {
    x = -40;
    y = randomRange(80, canvas.height - 80);
    vx = randomRange(55, 120);
    vy = randomRange(-40, 40);
  } else if (side === 2) {
    x = randomRange(-30, canvas.width + 30);
    y = -40;
    vx = randomRange(-80, 80);
    vy = randomRange(55, 105);
  } else {
    x = canvas.width + 40;
    y = randomRange(60, canvas.height - 60);
    vx = -randomRange(55, 120);
    vy = randomRange(-40, 40);
  }

  state.ducks.push({
    x,
    y,
    vx,
    vy,
    radius: randomRange(18, 28),
    wing: Math.random() * Math.PI * 2,
    phase: randomRange(0.6, 1.8),
    health: 1,
    alive: true,
    bob: randomRange(0, Math.PI * 2),
    targetY: randomRange(70, canvas.height * 0.7),
  });
}

function initializeDucks() {
  state.ducks = [];
  const count = 7 + state.wave;
  for (let i = 0; i < count; i += 1) {
    spawnDuck();
  }
}

function buyWeapon(id) {
  const index = weaponCatalog.findIndex((w) => w.id === id);
  if (index < 0) return;
  const weapon = weaponCatalog[index];
  if (weapon.owned) {
    state.currentWeapon = index;
    updateWeaponUI();
    shopModal.classList.remove('open');
    showAlert('ARMA SELECCIONADA');
    return;
  }
  if (state.credits < weapon.price) {
    showAlert('CRÉDITOS INSUFICIENTES');
    return;
  }
  state.credits -= weapon.price;
  weapon.owned = true;
  state.currentWeapon = index;
  updateCreditsUI();
  renderShop();
  updateWeaponUI();
  shopModal.classList.remove('open');
  showAlert('ARMA ADQUIRIDA');
}

function renderShop() {
  weaponsGrid.innerHTML = '';
  weaponCatalog.forEach((weapon) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `weapon-card ${weapon.owned && state.currentWeapon === weaponCatalog.indexOf(weapon) ? 'selected' : ''}`;
    card.innerHTML = `
      <div class="weapon-mini">
        <div class="gun-art">
          <i class="gun-barrel"></i>
          <i class="gun-upper"></i>
          <i class="gun-stock"></i>
          <i class="gun-grip"></i>
          <i class="gun-trigger"></i>
          <i class="gun-mag"></i>
          <i class="gun-sight"></i>
          <i class="gun-detail"></i>
        </div>
      </div>
      <div class="card-title">${weapon.name}</div>
      <div class="card-type">${weapon.type}</div>
      <div class="card-price ${weapon.owned ? 'owned' : ''}">${weapon.owned ? 'ADQUIRIDA' : `${formatMoney(weapon.price)} CR`}</div>
    `;
    card.addEventListener('click', () => buyWeapon(weapon.id));
    weaponsGrid.appendChild(card);
  });
}

function setActiveWeapon(index) {
  state.currentWeapon = index;
  updateWeaponUI();
  renderShop();
}

function reloadWeapon() {
  const weapon = getActiveWeapon();
  if (weapon.ammo >= weapon.magazine) return;
  weapon.ammo = weapon.magazine;
  showAlert('RECARGADO');
  updateWeaponUI();
}

function fireWeapon() {
  const weapon = getActiveWeapon();
  if (state.paused || state.gameOver || weapon.ammo <= 0) {
    if (!state.paused && !state.gameOver && weapon.ammo <= 0) showAlert('CARGADOR VACÍO');
    return;
  }

  state.shotsFired += 1;
  weapon.ammo -= 1;
  updateWeaponUI();
  shotFlash.classList.remove('bang');
  void shotFlash.offsetWidth;
  shotFlash.classList.add('bang');

  const shotX = state.player.currentAim.x;
  const shotY = state.player.currentAim.y;
  let hitCount = 0;
  let streakBonus = 0;

  for (const duck of state.ducks) {
    if (!duck.alive) continue;
    const dx = duck.x - shotX;
    const dy = duck.y - shotY;
    const dist = Math.hypot(dx, dy);
    const expectedRadius = duck.radius + 8;
    const spread = weapon.spread * 80;
    if (dist <= expectedRadius + spread) {
      const hitChance = clamp(1 - dist / (expectedRadius + 100), 0.2, 1);
      const toss = Math.random();
      if (toss < hitChance || weapon.pellets === 1) {
        hitCount += 1;
        duck.alive = false;
        continue;
      }
    }
  }

  if (hitCount > 0) {
    state.shotsHit += 1;
    const hitBonus = 80 + hitCount * 25 + state.wave * 10;
    state.credits += hitBonus;
    state.missionProgress = Math.min(state.missionGoal, state.missionProgress + hitCount);
    state.currentStreak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.currentStreak);
    showAlert(`${hitCount} IMPACTO${hitCount > 1 ? 'S' : ''}`);
    state.ducks = state.ducks.filter((d) => d.alive || Math.random() > 0.9);
    state.ducksDown += hitCount;
    updateCreditsUI();
    updateMissionUI();
    if (state.missionProgress === state.missionGoal) {
      state.gameOver = true;
      resultTitle.textContent = 'BUEN TRABAJO';
      resultCopy.textContent = 'Has completado la misión del día. Sube a la siguiente salida.';
      roundResult.classList.add('show');
      showAlert('MISIÓN CUMPLIDA');
      state.credits += 350;
      updateCreditsUI();
    }
  } else {
    state.currentStreak = 0;
    showAlert('FALLO');
  }

  if (weapon.ammo === 0) {
    setTimeout(() => reloadWeapon(), 120);
  }
  updateMissionUI();
}

function movePlayer(dx, dy, delta) {
  const magnitude = Math.hypot(dx, dy) || 1;
  const speed = state.player.speed * delta;
  state.player.x += (dx / magnitude) * speed;
  state.player.y += (dy / magnitude) * speed;
  state.player.x = clamp(state.player.x, 40, canvas.width - 40);
  state.player.y = clamp(state.player.y, 110, canvas.height - 20);
}

function updateControls(delta) {
  let moveX = 0;
  let moveY = 0;
  if (state.keys.w || state.keys.arrowup) moveY -= 1;
  if (state.keys.s || state.keys.arrowdown) moveY += 1;
  if (state.keys.a || state.keys.arrowleft) moveX -= 1;
  if (state.keys.d || state.keys.arrowright) moveX += 1;

  if (state.moveStick.active) {
    moveX += state.moveStick.x;
    moveY += state.moveStick.y;
  }

  if (moveX || moveY) {
    movePlayer(moveX, moveY, delta);
  }

  if (state.mouse.active) {
    state.player.currentAim.x = state.mouse.x;
    state.player.currentAim.y = state.mouse.y;
  }

  const aimX = clamp(state.player.currentAim.x, 0, canvas.width);
  const aimY = clamp(state.player.currentAim.y, 0, canvas.height);
  reticle.style.left = `${aimX}px`;
  reticle.style.top = `${aimY}px`;
}

function updateDucks(delta) {
  state.ducks.forEach((duck) => {
    if (!duck.alive) return;
    duck.x += duck.vx * delta;
    duck.y += duck.vy * delta + Math.sin(state.time * 2 + duck.bob) * 12 * delta;
    duck.vx *= 0.998;
    duck.vy += Math.sin(state.time + duck.phase) * 7 * delta;
    duck.wing += 11 * delta;

    if (duck.x < -80 || duck.x > canvas.width + 80 || duck.y < -80 || duck.y > canvas.height + 80) {
      duck.alive = false;
    }
  });

  state.ducks = state.ducks.filter((duck) => duck.alive);

  while (state.ducks.length < 7 + state.wave) {
    spawnDuck();
  }
}

function drawDuck(duck) {
  const body = duck.radius;
  const wingLift = Math.sin(duck.wing) * 6;
  ctx.save();
  ctx.translate(duck.x, duck.y);
  ctx.rotate(Math.atan2(duck.vy, duck.vx) + Math.PI / 2);

  ctx.fillStyle = '#1f321b';
  ctx.beginPath();
  ctx.ellipse(0, 0, body, body * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#b0c77b';
  ctx.beginPath();
  ctx.ellipse(-body * 0.25, -body * 0.08, body * 0.5, body * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1d2c1c';
  ctx.beginPath();
  ctx.ellipse(-body * 0.7, -body * 0.18, body * 0.22, body * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#d7eb8d';
  ctx.beginPath();
  ctx.moveTo(-body * 0.25, 0);
  ctx.lineTo(body * 0.95, -body * 0.12 + wingLift);
  ctx.lineTo(body * 0.95, body * 0.12 + wingLift);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#eff8cb';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(body * 0.25, 0);
  ctx.lineTo(body * 0.9, 0);
  ctx.stroke();

  ctx.restore();
}

function drawBackground() {
  const w = canvas.width;
  const h = canvas.height;
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#9ab88c');
  sky.addColorStop(0.38, '#d8d9b3');
  sky.addColorStop(0.47, '#e4e0c5');
  sky.addColorStop(1, '#4f6b49');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  for (let i = 0; i < 12; i += 1) {
    const x = ((i * 83) + state.time * 6) % (w + 100) - 20;
    const y = 48 + (i % 4) * 18;
    ctx.beginPath();
    ctx.arc(x, y, 8 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#607d4f';
  ctx.fillRect(0, h * 0.72, w, h * 0.28);

  for (let i = 0; i < 30; i += 1) {
    const x = (i * 59) % w;
    const y = h * 0.72 + ((i * 17) % 34);
    ctx.fillStyle = i % 2 ? '#37553d' : '#52774d';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 12, y - 20);
    ctx.lineTo(x + 26, y);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = '#2c3d2d';
  ctx.fillRect(0, h * 0.9, w, h * 0.1);
}

function drawPlayer() {
  const x = state.player.x;
  const y = state.player.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#f4f8f0';
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#2d3a30';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 12);
  ctx.lineTo(0, 42);
  ctx.moveTo(-8, 24);
  ctx.lineTo(8, 24);
  ctx.stroke();

  ctx.fillStyle = '#1d2a20';
  ctx.fillRect(-8, 42, 16, 18);

  const angle = Math.atan2(state.player.currentAim.y - y, state.player.currentAim.x - x);
  ctx.rotate(angle);
  ctx.fillStyle = '#b9c68d';
  ctx.fillRect(12, -3, 22, 6);
  ctx.fillStyle = '#2f392d';
  ctx.fillRect(18, -1, 12, 2);
  ctx.restore();
}

function drawAimLine() {
  const x = state.player.currentAim.x;
  const y = state.player.currentAim.y;
  const playerX = state.player.x;
  const playerY = state.player.y;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(playerX, playerY);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.restore();
}

function drawHud() {
  const weapon = getActiveWeapon();
  ctx.save();
  ctx.fillStyle = '#eff4e9';
  ctx.font = '14px "DM Mono", monospace';
  ctx.fillText(`ARMA ${weapon.name}`, 18, 28);
  ctx.fillText(`PLOTEO ${weapon.ammo}/${weapon.magazine}`, 18, 48);
  ctx.restore();
}

function render() {
  drawBackground();
  drawAimLine();
  state.ducks.forEach(drawDuck);
  drawPlayer();
  drawHud();
}

function step(timestamp) {
  const deltaSeconds = Math.min((timestamp - (state.lastTs || timestamp)) / 1000, 0.033);
  state.lastTs = timestamp;
  state.time += deltaSeconds;

  if (state.alertTimer > 0) {
    state.alertTimer -= deltaSeconds;
    if (state.alertTimer <= 0) {
      sceneAlert.classList.remove('show');
    }
  }

  if (!state.paused && !state.gameOver) {
    updateControls(deltaSeconds);
    updateDucks(deltaSeconds);
  }
  render();

  requestAnimationFrame(step);
}

function bindPointerEvents() {
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    state.mouse.x = event.clientX - rect.left;
    state.mouse.y = event.clientY - rect.top;
    state.mouse.active = true;
    state.player.currentAim.x = state.mouse.x;
    state.player.currentAim.y = state.mouse.y;
  });

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    state.mouse.x = event.clientX - rect.left;
    state.mouse.y = event.clientY - rect.top;
    state.mouse.active = true;
    fireWeapon();
  });
}

function setupTouchJoystick() {
  const padButtons = [...movePad.querySelectorAll('.pad-arrow')];
  let pointerId = null;

  const updateStick = (x, y) => {
    const dx = clamp(x, -1, 1);
    const dy = clamp(y, -1, 1);
    state.moveStick.x = dx;
    state.moveStick.y = dy;
    state.moveStick.active = true;
  };

  const resetStick = () => {
    state.moveStick.x = 0;
    state.moveStick.y = 0;
    state.moveStick.active = false;
    pointerId = null;
  };

  movePad.addEventListener('pointerdown', (event) => {
    pointerId = event.pointerId;
    movePad.setPointerCapture(pointerId);
    const rect = movePad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (event.clientX - cx) / (rect.width * 0.32);
    const dy = (event.clientY - cy) / (rect.height * 0.32);
    updateStick(dx, dy);
  });

  movePad.addEventListener('pointermove', (event) => {
    if (pointerId !== event.pointerId) return;
    const rect = movePad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (event.clientX - cx) / (rect.width * 0.32);
    const dy = (event.clientY - cy) / (rect.height * 0.32);
    updateStick(dx, dy);
  });

  movePad.addEventListener('pointerup', resetStick);
  movePad.addEventListener('pointercancel', resetStick);

  padButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.moveStick.x = button.classList.contains('pad-left') ? -1 : button.classList.contains('pad-right') ? 1 : 0;
      state.moveStick.y = button.classList.contains('pad-up') ? -1 : button.classList.contains('pad-down') ? 1 : 0;
      state.moveStick.active = true;
      setTimeout(resetStick, 80);
    });
  });
}

function setupKeyboard() {
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key in state.keys) state.keys[key] = true;
    if (event.code === 'Space') {
      event.preventDefault();
      fireWeapon();
    }
    if (key === 'r') {
      reloadWeapon();
    }
  });

  window.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if (key in state.keys) state.keys[key] = false;
  });
}

function setupModals() {
  const shopButton = document.getElementById('shopButton');
  const helpButton = document.getElementById('helpButton');
  const pauseButton = document.getElementById('pauseButton');
  const soundButton = document.getElementById('soundButton');
  const resetButton = document.getElementById('resetButton');

  shopButton.addEventListener('click', () => shopModal.classList.add('open'));
  helpButton.addEventListener('click', () => helpModal.classList.add('open'));
  pauseButton.addEventListener('click', () => {
    if (state.gameOver) return;
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? '▶' : 'Ⅱ';
    pauseButton.setAttribute('aria-label', state.paused ? 'Reanudar' : 'Pausa');
    showAlert(state.paused ? 'PAUSA' : 'LISTO');
  });
  soundButton.addEventListener('click', () => {
    soundButton.textContent = soundButton.textContent === '◖' ? '◉' : '◖';
  });
  resetButton.addEventListener('click', () => {
    state.missionProgress = 0;
    state.ducksDown = 0;
    state.shotsFired = 0;
    state.shotsHit = 0;
    state.bestStreak = 0;
    state.currentStreak = 0;
    state.paused = false;
    state.gameOver = false;
    pauseButton.textContent = 'Ⅱ';
    pauseButton.setAttribute('aria-label', 'Pausa');
    state.wave = 1;
    waveNumber.textContent = '01';
    distanceReadout.textContent = '42';
    initializeDucks();
    updateMissionUI();
    roundResult.classList.remove('show');
    showAlert('NUEVA JORNADA');
  });

  document.querySelectorAll('[data-close]').forEach((button) => {
    button.addEventListener('click', () => {
      shopModal.classList.remove('open');
      helpModal.classList.remove('open');
    });
  });

  continueButton.addEventListener('click', () => {
    state.gameOver = false;
    state.missionProgress = 0;
    roundResult.classList.remove('show');
    state.wave += 1;
    waveNumber.textContent = String(String(state.wave).padStart(2, '0'));
    distanceReadout.textContent = String(42 - (state.wave * 2));
    initializeDucks();
    updateMissionUI();
    showAlert('VUELO SIGUIENTE');
  });
}

function bindWeaponButtons() {
  fireTouch.addEventListener('click', fireWeapon);
  reloadTouch.addEventListener('click', reloadWeapon);
  reloadButton.addEventListener('click', reloadWeapon);
}

function init() {
  updateClock();
  setInterval(updateClock, 60000);
  setCanvasSize();
  window.addEventListener('resize', setCanvasSize);
  updateCreditsUI();
  renderShop();
  updateWeaponUI();
  initializeDucks();
  updateMissionUI();
  bindPointerEvents();
  setupKeyboard();
  setupTouchJoystick();
  setupModals();
  bindWeaponButtons();
  requestAnimationFrame(step);
}

init();
