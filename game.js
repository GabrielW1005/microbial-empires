import { Game, WORLD, GOODS, UNITS, STRUCTURES, MODES, clamp, distance, info, makePoint, seeded } from './engine.js';

const $ = id => document.getElementById(id);
const field = $('field');
const ctx = field.getContext('2d');
const minimap = $('minimap');
const mapCtx = minimap.getContext('2d');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const teams = ['#99edbf', '#ff948f'];
const tints = ['#265a52', '#6c3f50'];
const camera = { x: 0, y: 0, width: 0, height: 0, zoom: 1 };
const heldKeys = new Set();
const pointers = new Map();
let game;
let terrain;
let selection = [];
let groups = {};
let command = null;
let speed = 1;
let paused = false;
let needsPanel = true;
let previousFrame = 0;
let updateCounter = 0;
let viewPointer = null;
let isMinimapDragging = false;
let marker = null;
let statusTimer = 0;
let reportedNews = -1;
let shownResult = false;
let commandPointer = null;
let lastDoubleClick = null;
let panelQueue = 0;

const show = (message, duration = 4) => { $('message').textContent = message; statusTimer = duration; };
const resetTransform = (g, canvas, width, height) => g.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
const selected = () => selection.map(id => game.entity(id)).filter(Boolean);
const units = () => selected().filter(u => u.type === 'unit');
const workers = () => units().filter(u => u.kind === 'collector');
const fighters = () => units().filter(u => u.kind !== 'collector');
const activeBuilding = () => selected().find(b => b.type === 'structure');

function constrainCamera() {
  camera.x = clamp(camera.x, 0, Math.max(0, WORLD.width - camera.width / camera.zoom));
  camera.y = clamp(camera.y, 0, Math.max(0, WORLD.height - camera.height / camera.zoom));
}

function centerOn(point) {
  camera.x = point.x - camera.width / camera.zoom / 2;
  camera.y = point.y - camera.height / camera.zoom / 2;
  constrainCamera();
}

function resize() {
  const dimensions = field.getBoundingClientRect();
  const pixelRatio = Math.min(devicePixelRatio || 1, 1.65);
  field.width = Math.max(1, Math.round(dimensions.width * pixelRatio));
  field.height = Math.max(1, Math.round(dimensions.height * pixelRatio));
  camera.width = dimensions.width;
  camera.height = dimensions.height;
  const mini = minimap.getBoundingClientRect();
  minimap.width = Math.max(1, Math.round(mini.width * pixelRatio));
  minimap.height = Math.max(1, Math.round(mini.height * pixelRatio));
  constrainCamera();
}

function makeTerrain(map) {
  const background = document.createElement('canvas');
  background.width = WORLD.width;
  background.height = WORLD.height;
  const g = background.getContext('2d');
  const rand = seeded(map.seed);
  const [base, mid, light] = map.palette;
  const water = g.createLinearGradient(0, 0, WORLD.width, WORLD.height);
  water.addColorStop(0, mid);
  water.addColorStop(0.41, base);
  water.addColorStop(0.74, mid);
  water.addColorStop(1, base);
  g.fillStyle = water;
  g.fillRect(0, 0, WORLD.width, WORLD.height);
  for (let i = 0; i < 50; i++) {
    const x = rand() * WORLD.width;
    const y = rand() * WORLD.height;
    const dx = 75 + rand() * 240;
    const halo = g.createRadialGradient(x, y, 0, x, y, dx);
    halo.addColorStop(0, `${light}63`);
    halo.addColorStop(1, `${light}00`);
    g.fillStyle = halo;
    g.fillRect(x - dx, y - dx, dx * 2, dx * 2);
  }
  for (let i = 0; i < 2500; i++) {
    const x = rand() * WORLD.width;
    const y = rand() * WORLD.height;
    const a = 1 + rand() * 3;
    g.globalAlpha = 0.15 + rand() * 0.28;
    g.fillStyle = i % 8 ? light : '#b1ce9d';
    g.beginPath();
    g.ellipse(x, y, a, a / 2, rand() * 6, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 120; i++) {
    const x = rand() * WORLD.width;
    const y = rand() * WORLD.height;
    const r = 19 + rand() * 92;
    g.save();
    g.translate(x, y);
    g.rotate(rand() * 6);
    g.strokeStyle = `${light}50`;
    g.fillStyle = `${base}80`;
    g.beginPath();
    g.ellipse(0, 0, r, r * 0.49, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.strokeStyle = `${light}44`;
    g.beginPath();
    g.ellipse(0, 0, r * 0.65, r * 0.35, 0, 0, Math.PI * 2);
    g.stroke();
    g.restore();
  }
  g.strokeStyle = `${light}3a`;
  g.lineWidth = 3;
  g.strokeRect(3, 3, WORLD.width - 6, WORLD.height - 6);
  return background;
}

function start(map = 'basin', difficulty = 'standard', mode = 'conquest') {
  game = new Game(map, difficulty, mode);
  terrain = makeTerrain(game.map);
  selection = game.units.filter(u => u.team === 0 && u.kind === 'collector').map(u => u.id);
  groups = {};
  command = null;
  camera.zoom = 1;
  centerOn({ x: game.home(0).x + Math.min(camera.width * 0.12, 110), y: game.home(0).y });
  paused = false;
  speed = 1;
  shownResult = false;
  reportedNews = -1;
  $('end-panel').hidden = true;
  $('map-name').textContent = game.map.name;
  document.querySelector('.mission h1').textContent = MODES[mode];
  $('speed').textContent = '1×';
  $('pause').textContent = 'Pause';
  $('map-choice').value = map;
  $('difficulty').value = difficulty;
  $('mission-mode').value = mode;
  show('Collectors selected. Right-click a glowing deposit to gather.');
  needsPanel = true;
  updateInterface();
  drawMini();
}

function lens(event) {
  const rect = field.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  return { x, y, world: makePoint(camera.x + x / camera.zoom, camera.y + y / camera.zoom, 0) };
}

function targetAt(point) {
  const found = game.units.filter(u => u.hp > 0 && distance(u, point) <= info(u).size + 7).sort((a, b) => distance(a, point) - distance(b, point))[0];
  return found || game.structures.find(b => b.hp > 0 && distance(b, point) <= info(b).size + 8) || game.deposits.find(d => d.amount > 0 && distance(d, point) <= d.size + 13);
}

function targetOrder(point) {
  const target = targetAt(point);
  const work = workers().length;
  const army = fighters().length;
  const building = activeBuilding();
  const rally = building && ['core', 'foundry'].includes(building.kind) && building.progress >= 1;
  if (command?.type === 'build') return { type: 'build', label: game.canPlace(command.kind, point) ? `Place ${STRUCTURES[command.kind].name}` : 'Choose open ground', valid: game.canPlace(command.kind, point), kind: command.kind };
  if (command?.type === 'gather') return target?.type === 'deposit' && work ? { type: 'gather', label: `Gather ${GOODS[target.kind].name}`, target } : { type: 'blocked', label: 'Choose a glowing deposit', valid: false };
  if (command?.type === 'move') return { type: 'move', label: 'Move here' };
  if (command?.type === 'attack') return target?.team === 1 ? { type: 'attack', label: `Attack ${info(target).name}`, target } : { type: 'attackMove', label: 'Attack-move here' };
  if (rally) return { type: 'rally', label: target?.type === 'deposit' && building.kind === 'core' ? `Rally to ${GOODS[target.kind].name}` : 'Set rally point', target };
  if (target?.team === 1) return army ? { type: 'attack', label: `Attack rival ${info(target).name}`, target } : work ? { type: 'blocked', label: 'Collectors do not attack', valid: false } : null;
  if (target?.type === 'deposit' && work) return { type: 'gather', label: `Gather ${GOODS[target.kind].name}`, target };
  if (target?.team === 0 && target.type === 'structure' && work) {
    if (target.progress < 1) return { type: 'construct', label: `Finish ${info(target).name}`, target };
    if (['core', 'depot'].includes(target.kind) && workers().some(u => u.carry > 0)) return { type: 'deposit', label: `Unload at ${info(target).name}`, target };
  }
  return units().length ? { type: 'move', label: 'Move here' } : null;
}

const cursorCodes = { gather: ['#f2c674', 'M4 5h12l-2 9H6z M8 5V2 M11 5V1 M14 5V3'], attack: ['#ff978c', 'M3 3l13 13 M16 3L3 16 M2 7h3V2 M14 16h4v-4'], build: ['#a5edc9', 'M3 15V6h12v9z M9 3v4 M7 5h4'], rally: ['#a5edc9', 'M4 17V2l12 4-12 4'], blocked: ['#d6a1a2', 'M3 3l12 12M15 3L3 15'] };
const cursors = Object.fromEntries(Object.entries(cursorCodes).map(([name, [color, symbol]]) => {
  const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 20 20"><path d="${symbol}" fill="none" stroke="#071319" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="${symbol}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return [name, `url("data:image/svg+xml,${encodeURIComponent(icon)}") 12 12, crosshair`];
}));

function updateCursor() {
  const note = $('cursor-note');
  if (!viewPointer || viewPointer.pointerType === 'touch' || pointers.size) {
    note.hidden = true;
    field.style.cursor = pointers.size && [...pointers.values()].some(p => p.pan) ? 'grabbing' : 'default';
    return;
  }
  const point = lens(viewPointer);
  const target = targetAt(point.world);
  const order = targetOrder(point.world);
  const cursorMode = order?.valid === false ? 'blocked' : ({ attackMove: 'attack', construct: 'build', deposit: 'gather' }[order?.type] || order?.type);
  const friendly = target?.team === 0;
  const visibleHint = order && order.type !== 'move' && (!friendly || ['build', 'construct', 'deposit'].includes(order.type)) ? `${order.label}${command ? '' : ' · right-click'}` : null;
  field.style.cursor = cursors[cursorMode] && (visibleHint || command) ? cursors[cursorMode] : friendly ? 'pointer' : command ? 'crosshair' : units().length ? 'crosshair' : 'default';
  note.hidden = !visibleHint;
  if (visibleHint) {
    note.textContent = visibleHint;
    note.dataset.mode = cursorMode;
    note.style.left = `${clamp(point.x + 15, 4, camera.width - note.offsetWidth - 5)}px`;
    note.style.top = `${clamp(point.y + 15, 4, camera.height - 31)}px`;
  }
}

function pick(target, additive = false, includeSameKind = false) {
  if (includeSameKind && target?.type === 'unit') {
    const matches = game.units.filter(u => u.team === 0 && u.kind === target.kind && u.x >= camera.x && u.x < camera.x + camera.width / camera.zoom && u.y >= camera.y && u.y < camera.y + camera.height / camera.zoom).map(u => u.id);
    selection = additive ? [...new Set([...selection, ...matches])] : matches;
  } else if (target?.team === 0) {
    if (!additive || target.type !== 'unit' || activeBuilding()) selection = [target.id];
    else if (selection.includes(target.id)) selection = selection.filter(id => id !== target.id);
    else selection.push(target.id);
  } else if (!additive) selection = [];
  command = null;
  needsPanel = true;
  updateInterface();
  updateCursor();
}

function selectBox(area, additive) {
  const [left, right] = [Math.min(area.origin.world.x, area.end.world.x), Math.max(area.origin.world.x, area.end.world.x)];
  const [top, bottom] = [Math.min(area.origin.world.y, area.end.world.y), Math.max(area.origin.world.y, area.end.world.y)];
  const ids = game.units.filter(u => u.team === 0 && u.x >= left && u.x <= right && u.y >= top && u.y <= bottom).map(u => u.id);
  selection = additive ? [...new Set([...units().map(u => u.id), ...ids])] : ids;
  command = null;
  needsPanel = true;
  updateInterface();
}

function issueOrder(point, additive = false) {
  const order = targetOrder(point);
  if (!order) return;
  if (order.valid === false) { show(order.label); return; }
  const location = order.target || point;
  if (order.type === 'build') {
    const failure = game.build(workers(), order.kind, point);
    if (failure) { show(failure); return; }
  } else if (order.type === 'rally') {
    const building = activeBuilding();
    const gatherRally = order.target?.type === 'deposit' && building.kind === 'core';
    building.rally = { x: location.x, y: location.y, type: gatherRally ? 'gather' : 'move', target: gatherRally ? location.id : undefined };
  } else {
    let type = order.type;
    if (type === 'construct') type = 'build';
    const assigned = ['gather', 'deposit', 'build'].includes(type) ? workers() : type === 'attack' ? fighters() : units();
    game.order(assigned, { type, x: location.x, y: location.y, target: order.target?.id }, additive);
  }
  marker = { x: location.x, y: location.y, color: order.type.startsWith('attack') ? teams[1] : order.type === 'gather' ? GOODS[order.target.kind].color : teams[0], life: 0.85 };
  show(order.label, 2.4);
  if (!additive || command?.type === 'build') command = null;
  needsPanel = true;
  updateInterface();
  updateCursor();
}

function formatPrice(cost) {
  return Object.entries(cost).map(([resource, amount]) => `${amount} ${GOODS[resource].name}`).join(' · ');
}

function addButton(actions, name, icon, summary, callback, mode = null) {
  const btn = document.createElement('button');
  btn.className = 'order';
  btn.type = 'button';
  btn.innerHTML = `<i aria-hidden="true">${icon}</i><span>${name}</span>${summary ? `<small>${summary}</small>` : ''}`;
  if (mode) btn.setAttribute('aria-pressed', String(command?.type === mode.type && command?.kind === mode.kind));
  btn.addEventListener('click', (event) => { callback(event); if (event.detail) field.focus({ preventScroll: true }); });
  actions.append(btn);
}

function chooseMode(type, kind) {
  command = command?.type === type && command?.kind === kind ? null : { type, kind };
  needsPanel = true;
  updateInterface();
  updateCursor();
  if (command) show(type === 'build' ? `Choose open ground for the ${STRUCTURES[kind].name}.` : type === 'attack' ? 'Choose a rival or a direction.' : type === 'gather' ? 'Choose a glowing resource deposit.' : 'Choose a destination.');
}

function selectIdle() {
  const idle = game.units.filter(u => u.team === 0 && u.kind === 'collector' && !u.orders.length && !u.carry);
  if (!idle.length) { show('All Collectors have orders.'); return; }
  const next = idle[(idle.findIndex(u => selection.includes(u.id)) + 1) % idle.length];
  pick(next);
  centerOn(next);
}

function updatePanel() {
  const chosen = selected();
  const building = activeBuilding();
  const icons = $('unit-icons');
  const actions = $('orders');
  icons.replaceChildren();
  actions.replaceChildren();
  const defaultHint = 'Right-click targets · Shift queues orders';
  if (!chosen.length) {
    $('selection-title').textContent = 'Choose a unit';
    $('selection-details').textContent = 'Click one unit or drag a box around a group.';
    addButton(actions, 'Idle Collector', '▰', '.', selectIdle);
    return;
  }
  $('selection-title').textContent = chosen.length === 1 ? info(chosen[0]).name : chosen.every(u => u.kind === chosen[0].kind) ? `${chosen.length} ${info(chosen[0]).name}s` : `${chosen.length} units`;
  $('selection-details').textContent = chosen.length === 1 ? info(chosen[0]).role : `${workers().length} Collectors · ${fighters().length} combat units`;
  for (const unit of chosen.slice(0, 12)) {
    const badge = document.createElement('span');
    badge.className = 'unit-icon';
    badge.title = info(unit).name;
    badge.textContent = info(unit).icon;
    icons.append(badge);
  }
  const modeButton = (label, icon, summary, type, kind) => addButton(actions, label, icon, summary, () => chooseMode(type, kind), { type, kind });
  if (building) {
    const choices = building.kind === 'core' ? ['collector', 'scout'] : building.kind === 'foundry' ? ['guard', 'spark', 'warden'] : [];
    for (const kind of choices) {
      const def = UNITS[kind];
      addButton(actions, `Train ${def.name}`, def.icon, formatPrice(def.cost), () => {
        const failure = game.train(building, kind);
        show(failure || `${def.name} added to the production queue.`, 2.8);
        needsPanel = true;
        updateInterface();
      });
    }
    if (building.queue.length) addButton(actions, 'Cancel last', '×', 'Refund resources', () => { game.cancelTrain(building); needsPanel = true; updateInterface(); });
    addButton(actions, 'Idle Collector', '▰', '.', selectIdle);
  } else {
    modeButton('Move', '↗', 'M', 'move');
    if (fighters().length) modeButton('Attack', '✦', 'A · click a target', 'attack');
    if (workers().length) modeButton('Gather', '⬢', 'G · click a deposit', 'gather');
    addButton(actions, 'Hold', '□', '', () => { game.order(units(), { type: 'hold' }); show('Hold position.', 2); });
    for (const kind of (workers().length ? ['foundry', 'depot', 'tower', 'shelter'] : [])) {
      const def = STRUCTURES[kind];
      modeButton(def.name, def.icon, formatPrice(def.cost), 'build', kind);
    }
  }
  $('orders').setAttribute('title', defaultHint);
}

function updateInterface() {
  for (const key of Object.keys(GOODS)) $(key).textContent = Math.floor(game.bank[0][key]);
  $('population').textContent = `${game.population(0)}/${game.capacity(0)}`;
  const elapsed = Math.floor(game.time);
  $('clock').textContent = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
  const rival = game.home(1);
  const wave = Math.ceil(game.nextRaid - game.time);
  $('intel').textContent = game.options.mode === 'sprint' ? `${Math.floor(game.stats.gathered)} / 600 gathered` : game.options.mode === 'survival' ? `${Math.max(0, 240 - elapsed)} seconds remaining` : `${rival ? Math.ceil(rival.hp / STRUCTURES.core.hp * 100) : 0}% rival Core health · ${game.raids ? `Wave ${game.raids}` : `First rival wave in ${Math.max(0, wave)}s`}`;
  const building = activeBuilding();
  const first = building?.queue[0];
  const queueLength = building?.queue.length || 0;
  if (queueLength !== panelQueue) { panelQueue = queueLength; needsPanel = true; }
  const idle = game.units.filter(u => u.team === 0 && u.kind === 'collector' && !u.orders.length).length;
  $('telemetry').textContent = first ? `Training ${UNITS[first.kind].name} · ${Math.ceil(first.left)}s · ${building.queue.length} queued` : `Deposited ${Math.floor(game.stats.gathered)} · Trained ${game.stats.trained} · Idle Collectors ${idle}`;
  if (selection.some(id => !game.entity(id))) { selection = selection.filter(id => game.entity(id)); needsPanel = true; }
  if (needsPanel) { updatePanel(); needsPanel = false; }
}

function polygon(g, sides, radius, rotation = -Math.PI / 2) {
  g.beginPath();
  for (let index = 0; index < sides; index++) {
    const angle = rotation + index * Math.PI * 2 / sides;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index) g.lineTo(x, y); else g.moveTo(x, y);
  }
  g.closePath();
}

function ring(g, x, y, radius, color, width = 1) {
  g.beginPath();
  g.arc(x, y, radius, 0, Math.PI * 2);
  g.strokeStyle = color;
  g.lineWidth = width;
  g.stroke();
}

function drawDeposit(deposit) {
  if (!deposit.amount) return;
  const { x, y, kind, size } = deposit;
  const color = GOODS[kind].color;
  const fraction = Math.max(0.33, Math.sqrt(deposit.amount / deposit.total));
  ctx.save();
  ctx.translate(x, y);
  ring(ctx, 0, 0, size + 4, `${color}65`);
  ctx.fillStyle = `${color}23`;
  ctx.beginPath();
  ctx.ellipse(0, 0, 1.05 * size, 0.72 * size, -0.2, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 8; i++) {
    const angle = i * 2.42 + deposit.id;
    const spread = i === 0 ? 0 : (i % 3 + 1) * size / 4;
    ctx.save();
    ctx.translate(Math.cos(angle) * spread, Math.sin(angle) * spread * 0.68);
    ctx.rotate(angle);
    ctx.fillStyle = i % 3 ? `${color}aa` : color;
    ctx.strokeStyle = '#152d31';
    ctx.lineWidth = 1;
    if (kind === 'sugar') {
      ctx.beginPath();
      ctx.ellipse(0, 0, (5 + i % 3) * fraction, (4 + i % 2) * fraction, 0, 0, Math.PI * 2);
    } else {
      polygon(ctx, kind === 'mineral' ? 4 : 6, (9 + i % 4) * fraction);
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = color;
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 4;
  ctx.fillText(GOODS[kind].name, 0, size + 16);
  ctx.restore();
}

function drawStructure(structure, ghost = false) {
  const def = info(structure);
  const color = teams[structure.team];
  const r = def.size;
  ctx.save();
  ctx.translate(structure.x, structure.y);
  if (structure.progress < 1) ctx.setLineDash([5, 5]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.fillStyle = tints[structure.team];
  if (structure.kind === 'core') {
    ring(ctx, 0, 0, r + 10, `${color}62`);
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * r * 0.74, Math.sin(angle) * r * 0.74, 12, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }
    polygon(ctx, 8, r * 0.76, Math.PI / 8);
  } else {
    polygon(ctx, structure.kind === 'tower' ? 3 : structure.kind === 'shelter' ? 5 : 6, r);
  }
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);
  if (structure.kind === 'core') {
    const shine = ctx.createRadialGradient(-7, -14, 1, 0, 0, r * 0.7);
    shine.addColorStop(0, color);
    shine.addColorStop(0.58, tints[structure.team]);
    shine.addColorStop(1, '#101f28');
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.53, 0, Math.PI * 2);
    ctx.fillStyle = shine;
    ctx.fill();
    ring(ctx, 0, 0, r * 0.56, `${color}94`, 2);
  }
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(r * 0.82)}px system-ui, sans-serif`;
  ctx.fillText(def.icon, 0, 2);
  if (!ghost) {
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.fillText(`${structure.team ? 'Rival ' : ''}${def.name}`, 0, r + 23);
    if (structure.progress < 1) bar(-27, r + 33, 54, structure.progress, '#f2c674');
    if (structure.hp < def.hp) bar(-27, -r - 16, 54, structure.hp / def.hp, color);
  }
  ctx.restore();
}

function bar(x, y, width, fill, color) {
  ctx.fillStyle = '#08191c';
  ctx.fillRect(x, y, width, 5);
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, (width - 2) * Math.max(0, fill), 3);
}

function drawUnit(unit) {
  const def = info(unit);
  const color = teams[unit.team];
  const size = def.size;
  ctx.save();
  ctx.translate(unit.x, unit.y);
  ctx.rotate(unit.angle);
  if (!reduceMotion.matches && unit.moving) {
    ctx.setLineDash([3, 4]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = `${color}85`;
    ctx.beginPath();
    ctx.moveTo(-size - 3, 0);
    ctx.lineTo(-size - 20, 0);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const fill = ctx.createLinearGradient(0, -size, 0, size);
  fill.addColorStop(0, color);
  fill.addColorStop(0.38, tints[unit.team]);
  fill.addColorStop(1, '#132733');
  ctx.fillStyle = fill;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  if (unit.kind === 'collector') {
    ctx.beginPath();
    ctx.roundRect(-size, -size * 0.59, size * 2, size * 1.18, 8);
  } else if (unit.kind === 'scout') {
    ctx.beginPath();
    ctx.moveTo(size * 1.3, 0);
    ctx.lineTo(-size, size * 0.69);
    ctx.lineTo(-size * 0.56, 0);
    ctx.lineTo(-size, -size * 0.69);
    ctx.closePath();
  } else if (unit.kind === 'guard') {
    polygon(ctx, 4, size, 0);
  } else if (unit.kind === 'spark') {
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 1.13, size * 0.81, 0, 0, Math.PI * 2);
  } else {
    polygon(ctx, 6, size, 0);
  }
  ctx.fill();
  ctx.stroke();
  if (unit.kind === 'spark') {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(-size * 0.75, 0);
    ctx.lineTo(-size * 0.2, -size * 0.3);
    ctx.lineTo(size * 0.24, size * 0.19);
    ctx.lineTo(size * 0.82, -size * 0.19);
    ctx.stroke();
  } else {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(size * 0.16, 0, size * 0.25, size * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (unit.carry > 0.1 && unit.resource) {
    ctx.fillStyle = GOODS[unit.resource].color;
    polygon(ctx, 4, 5, 0);
    ctx.fill();
  }
  ctx.restore();
  if (unit.hp < def.hp) bar(unit.x - 14, unit.y - size - 10, 28, unit.hp / def.hp, color);
}

function drawField() {
  if (!camera.width || !camera.height) return;
  resetTransform(ctx, field, camera.width, camera.height);
  ctx.fillStyle = game.map.palette[0];
  ctx.fillRect(0, 0, camera.width, camera.height);
  ctx.save();
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
  const right = camera.x + camera.width / camera.zoom;
  const bottom = camera.y + camera.height / camera.zoom;
  const visible = e => e.x > camera.x - 140 && e.x < right + 140 && e.y > camera.y - 135 && e.y < bottom + 135;
  ctx.drawImage(terrain, camera.x, camera.y, right - camera.x, bottom - camera.y, camera.x, camera.y, right - camera.x, bottom - camera.y);
  for (const deposit of game.deposits) if (visible(deposit)) drawDeposit(deposit);
  for (const building of game.structures) if (visible(building)) drawStructure(building);
  for (const unit of game.units) if (visible(unit)) drawUnit(unit);
  for (const e of selected().filter(visible)) {
    const def = info(e);
    ring(ctx, e.x, e.y, def.size + 7, '#c4ffe0', 1.5);
    if (e.type === 'unit' && command?.type === 'gather' && e.kind === 'collector') ring(ctx, e.x, e.y, def.size + 11, '#f3ca86aa');
  }
  const focus = selected()[0];
  const route = focus?.type === 'unit' ? focus.orders[0] : focus?.rally;
  if (route && route.type !== 'hold' && visible(focus)) {
    const dest = game.entity(route.target) || route;
    ctx.strokeStyle = `${route.type === 'gather' && dest.kind ? GOODS[dest.kind].color : '#bcf7d4'}8c`;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.moveTo(focus.x, focus.y);
    ctx.lineTo(dest.x, dest.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const effect of game.effects) {
    if (!visible(effect.to)) continue;
    ctx.globalAlpha = effect.life / effect.max;
    const color = teams[effect.team];
    if (effect.type === 'ray') {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.7;
      ctx.beginPath();
      ctx.moveTo(effect.from.x, effect.from.y);
      ctx.lineTo(effect.to.x, effect.to.y);
      ctx.stroke();
    }
    ring(ctx, effect.to.x, effect.to.y, 8 + 15 * (1 - ctx.globalAlpha), color, 2);
    ctx.globalAlpha = 1;
  }
  if (marker) {
    ctx.globalAlpha = Math.min(1, marker.life * 2);
    ring(ctx, marker.x, marker.y, 9 + 19 * (1 - marker.life), marker.color, 2.5);
    ctx.globalAlpha = 1;
  }
  if (command?.type === 'build' && commandPointer) {
    const world = lens(commandPointer).world;
    ctx.globalAlpha = 0.66;
    drawStructure({ ...world, kind: command.kind, type: 'structure', team: 0, progress: 0 }, true);
    if (!game.canPlace(command.kind, world)) ring(ctx, world.x, world.y, STRUCTURES[command.kind].size + 12, teams[1], 3);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  const box = [...pointers.values()].find(p => !p.pan && p.distance > 6);
  if (box) {
    const { origin, end } = box;
    ctx.fillStyle = '#a7f3cd30';
    ctx.strokeStyle = '#a7f3cd';
    ctx.lineWidth = 1;
    ctx.fillRect(origin.x, origin.y, end.x - origin.x, end.y - origin.y);
    ctx.strokeRect(origin.x, origin.y, end.x - origin.x, end.y - origin.y);
  }
}

function drawMini() {
  const width = minimap.width;
  const height = minimap.height;
  const sx = width / WORLD.width;
  const sy = height / WORLD.height;
  mapCtx.drawImage(terrain, 0, 0, width, height);
  for (const deposit of game.deposits) {
    if (!deposit.amount) continue;
    mapCtx.fillStyle = GOODS[deposit.kind].color;
    mapCtx.fillRect(deposit.x * sx - 1.6, deposit.y * sy - 1.6, 3.2, 3.2);
  }
  for (const structure of game.structures) {
    mapCtx.fillStyle = teams[structure.team];
    const size = structure.kind === 'core' ? 7 : 4;
    mapCtx.fillRect(structure.x * sx - size / 2, structure.y * sy - size / 2, size, size);
  }
  for (const unit of game.units) {
    mapCtx.fillStyle = teams[unit.team];
    mapCtx.fillRect(unit.x * sx, unit.y * sy, 2.2, 2.2);
  }
  mapCtx.strokeStyle = '#f4ffea';
  mapCtx.lineWidth = 1.3;
  mapCtx.strokeRect(clamp(camera.x * sx, 1, width - 1), clamp(camera.y * sy, 1, height - 1), Math.min(camera.width / camera.zoom * sx, width - 2), Math.min(camera.height / camera.zoom * sy, height - 2));
}

function panFromMinimap(event) {
  const rect = minimap.getBoundingClientRect();
  centerOn({ x: (event.clientX - rect.left) / rect.width * WORLD.width, y: (event.clientY - rect.top) / rect.height * WORLD.height });
}

function zoomAt(value, x, y) {
  const worldX = camera.x + x / camera.zoom;
  const worldY = camera.y + y / camera.zoom;
  camera.zoom = clamp(value, Math.max(0.55, camera.width / WORLD.width, camera.height / WORLD.height), 2.15);
  camera.x = worldX - x / camera.zoom;
  camera.y = worldY - y / camera.zoom;
  constrainCamera();
}

field.addEventListener('contextmenu', event => { event.preventDefault(); if (game.winner === null) issueOrder(lens(event).world, event.shiftKey); });
field.addEventListener('pointerdown', event => {
  if (event.button !== 0 && event.button !== 1) return;
  if (game.winner !== null) return;
  const point = lens(event);
  const pan = event.button === 1 || event.altKey || (event.pointerType === 'touch' && !command);
  pointers.set(event.pointerId, { origin: point, end: point, pan, distance: 0, initialX: camera.x, initialY: camera.y });
  field.setPointerCapture(event.pointerId);
  field.focus({ preventScroll: true });
  updateCursor();
});
field.addEventListener('pointermove', event => {
  viewPointer = event;
  commandPointer = event;
  const active = pointers.get(event.pointerId);
  if (active) {
    active.end = lens(event);
    const dx = active.end.x - active.origin.x;
    const dy = active.end.y - active.origin.y;
    active.distance = Math.hypot(dx, dy);
    if (active.pan && active.distance > 5) {
      camera.x = active.initialX - dx / camera.zoom;
      camera.y = active.initialY - dy / camera.zoom;
      constrainCamera();
    }
  }
  updateCursor();
});
field.addEventListener('pointerup', event => {
  const active = pointers.get(event.pointerId);
  if (!active) return;
  pointers.delete(event.pointerId);
  if ((active.pan && active.distance > 5) || event.button === 1) { updateCursor(); return; }
  const point = lens(event);
  if (command) issueOrder(point.world, event.shiftKey);
  else if (active.distance > 6) selectBox(active, event.shiftKey);
  else {
    const target = targetAt(point.world);
    const now = performance.now();
    const doubleClick = target?.id === lastDoubleClick?.id && lastDoubleClick && now - lastDoubleClick.time < 330;
    lastDoubleClick = { id: target?.id, time: now };
    pick(target, event.shiftKey, doubleClick);
  }
  updateCursor();
});
field.addEventListener('pointercancel', event => { pointers.delete(event.pointerId); updateCursor(); });
field.addEventListener('pointerleave', () => { viewPointer = null; commandPointer = null; updateCursor(); });
field.addEventListener('wheel', event => { event.preventDefault(); const point = lens(event); zoomAt(camera.zoom * Math.exp(-event.deltaY / 650), point.x, point.y); updateCursor(); }, { passive: false });
minimap.addEventListener('pointerdown', event => { minimap.setPointerCapture(event.pointerId); isMinimapDragging = true; panFromMinimap(event); });
minimap.addEventListener('pointermove', event => { if (isMinimapDragging) panFromMinimap(event); });
minimap.addEventListener('pointerup', () => { isMinimapDragging = false; });
minimap.addEventListener('pointercancel', () => { isMinimapDragging = false; });

function openDialog(id) {
  heldKeys.clear();
  $(id).showModal();
}
function centerHome() {
  const home = game.home(0);
  if (home) centerOn({ x: home.x + Math.min(camera.width * 0.12 / camera.zoom, 110), y: home.y });
}
function changePause() {
  paused = !paused;
  $('pause').textContent = paused ? 'Resume' : 'Pause';
  show(paused ? 'Paused. You can still give orders.' : 'Match resumed.');
}
$('pause').addEventListener('click', changePause);
$('center').addEventListener('click', centerHome);
$('speed').addEventListener('click', () => { speed = { 1: 1.5, 1.5: 2, 2: 1 }[speed]; $('speed').textContent = `${speed}×`; });
$('help-open').addEventListener('click', () => openDialog('help'));
$('setup-open').addEventListener('click', () => openDialog('setup'));
$('play-again').addEventListener('click', () => openDialog('setup'));
$('start-match').addEventListener('click', () => { $('setup').close(); start($('map-choice').value, $('difficulty').value, $('mission-mode').value); });
window.addEventListener('keydown', event => {
  if (document.querySelector('dialog[open]') || ['BUTTON', 'SELECT', 'A'].includes(event.target.tagName)) return;
  if (event.key.startsWith('Arrow')) { event.preventDefault(); heldKeys.add(event.key); return; }
  if (event.repeat) return;
  const key = event.key.toLowerCase();
  if (key === ' ' || key === 'h') { event.preventDefault(); centerHome(); }
  if (key === 'escape') { command = null; needsPanel = true; updateInterface(); updateCursor(); }
  if (key === '.') selectIdle();
  if (key === 'm' && units().length) chooseMode('move');
  if (key === 'a' && fighters().length) chooseMode('attack');
  if (key === 'g' && workers().length) chooseMode('gather');
  if (key === 'p') changePause();
  if (/^[1-4]$/.test(key)) {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) { groups[key] = selection.slice(); show(`Saved group ${key}.`); }
    else if (groups[key]) { selection = groups[key].filter(id => game.entity(id)); command = null; needsPanel = true; updateInterface(); }
  }
});
window.addEventListener('keyup', event => heldKeys.delete(event.key));
window.addEventListener('blur', () => { heldKeys.clear(); });

function finish() {
  if (shownResult) return;
  shownResult = true;
  $('end-title').textContent = game.winner === 0 ? 'Colony victorious' : 'Rival colony wins';
  $('end-description').textContent = `${Math.floor(game.stats.gathered)} resources gathered · ${game.stats.trained} units trained · ${game.stats.defeated} rivals defeated`;
  $('end-panel').hidden = false;
}

function animate(now) {
  const dt = previousFrame ? Math.min((now - previousFrame) / 1000, 0.06) : 0;
  previousFrame = now;
  if (heldKeys.size) {
    camera.x += (Number(heldKeys.has('ArrowRight')) - Number(heldKeys.has('ArrowLeft'))) * 675 * dt / camera.zoom;
    camera.y += (Number(heldKeys.has('ArrowDown')) - Number(heldKeys.has('ArrowUp'))) * 675 * dt / camera.zoom;
    constrainCamera();
    updateCursor();
  }
  if (!paused && !document.querySelector('dialog[open]')) {
    for (let remaining = dt * speed; remaining > 0;) {
      const step = Math.min(remaining, 0.05);
      game.step(step);
      remaining -= step;
    }
  }
  if (marker && (marker.life -= dt) <= 0) marker = null;
  if (statusTimer > 0 && (statusTimer -= dt) <= 0) $('message').textContent = '';
  if (game.newsTime > reportedNews) { reportedNews = game.newsTime; show(game.news); }
  if (game.winner !== null) finish();
  updateCounter += dt;
  if (updateCounter > 0.13) { updateInterface(); drawMini(); updateCounter = 0; }
  drawField();
  requestAnimationFrame(animate);
}

resize();
start();
drawMini();
new ResizeObserver(resize).observe(field);
new ResizeObserver(resize).observe(minimap);
requestAnimationFrame(animate);
