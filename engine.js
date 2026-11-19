export const WORLD = { width: 3600, height: 2380 };
export const GOODS = {
  sugar: { name: 'Sugar', color: '#efbe6a' }, mineral: { name: 'Minerals', color: '#76dbef' }, membrane: { name: 'Membrane', color: '#df9ef2' }
};
export const UNITS = {
  collector: { name: 'Collector', icon: '▰', role: 'Gather and construct', hp: 65, speed: 116, size: 12, range: 0, damage: 0, cost: { sugar: 35 }, time: 6 },
  scout: { name: 'Scout', icon: '➤', role: 'Fast, light attacker', hp: 62, speed: 200, size: 12, range: 26, damage: 8, cooldown: 0.57, cost: { sugar: 35, mineral: 12 }, time: 5 },
  guard: { name: 'Guard', icon: '◆', role: 'Frontline melee', hp: 115, speed: 128, size: 16, range: 20, damage: 15, cooldown: 0.72, cost: { sugar: 50, mineral: 15 }, time: 7 },
  spark: { name: 'Spark', icon: '✦', role: 'Ranged attacker', hp: 70, speed: 105, size: 14, range: 150, damage: 12, cooldown: 0.99, cost: { sugar: 45, mineral: 25, membrane: 10 }, time: 9 },
  warden: { name: 'Warden', icon: '⬣', role: 'Armored unit, strong against buildings', hp: 222, speed: 87, size: 23, range: 25, damage: 22, cooldown: 1.04, cost: { sugar: 80, mineral: 38, membrane: 18 }, time: 12 },
};
export const STRUCTURES = {
  core: { name: 'Core', icon: '◈', role: 'Trains Collectors and Scouts. Accepts resources.', hp: 1180, size: 50 },
  foundry: { name: 'Foundry', icon: '✳', role: 'Trains Guards, Sparks and Wardens.', hp: 490, size: 35, cost: { sugar: 65, mineral: 45 }, time: 11 },
  depot: { name: 'Depot', icon: '⬡', role: 'Accepts resources closer to deposits.', hp: 290, size: 27, cost: { sugar: 40, mineral: 25 }, time: 6 },
  tower: { name: 'Tower', icon: '▲', role: 'Fires on nearby rivals.', hp: 385, size: 27, cost: { mineral: 65, membrane: 15 }, time: 9 },
  shelter: { name: 'Shelter', icon: '⌂', role: 'Increases unit capacity by 8.', hp: 310, size: 29, cost: { sugar: 45, mineral: 17 }, time: 7 },
};
export const MAPS = {
  basin: { name: 'Glasswater Basin', palette: ['#0b2427', '#163938', '#336558'], seed: 63, start: [520, 1190], rival: [3080, 1190] },
  reef: { name: 'Lantern Reef', palette: ['#141f36', '#263650', '#4b5b79'], seed: 24, start: [530, 1710], rival: [3065, 550] },
  shelf: { name: 'Mineral Shelf', palette: ['#24272e', '#393c47', '#5a6270'], seed: 91, start: [700, 530], rival: [2875, 1715] },
};
export const MODES = { conquest: 'Destroy the rival Core', survival: 'Survive for 4 minutes', sprint: 'Gather 600 resources' };
const LEVELS = { practice: { first: 85, gap: 70, raid: 2 }, standard: { first: 45, gap: 52, raid: 3 }, challenge: { first: 32, gap: 39, raid: 5 } };
const POINTS = { sugar: 950, mineral: 820, membrane: 730 };
const CARRY = 18;
const TRAIN = { core: ['collector', 'scout'], foundry: ['guard', 'spark', 'warden'] };
export const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const info = entity => entity.type === 'structure' ? STRUCTURES[entity.kind] : UNITS[entity.kind];
export const makePoint = (x, y, margin = 10) => ({ x: clamp(x, margin, WORLD.width - margin), y: clamp(y, margin, WORLD.height - margin) });
export function seeded(seed) {
  let state = seed;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}

export class Game {
  constructor(map = 'basin', difficulty = 'standard', mode = 'conquest') {
    this.map = MAPS[map];
    this.options = { map, difficulty, mode };
    this.pressure = LEVELS[difficulty];
    this.time = 0;
    this.nextId = 1;
    this.units = [];
    this.structures = [];
    this.deposits = [];
    this.effects = [];
    this.bank = [{ sugar: 135, mineral: 80, membrane: 30 }, { sugar: 155, mineral: 95, membrane: 40 }];
    this.stats = { gathered: 0, trained: 0, defeated: 0, built: 0 };
    this.news = '';
    this.newsTime = -20;
    this.nextThink = 0;
    this.nextRaid = this.pressure.first;
    this.raids = 0;
    this.winner = null;
    for (const [team, coordinate] of [[0, this.map.start], [1, this.map.rival]]) {
      const home = this.structure('core', team, { x: coordinate[0], y: coordinate[1] });
      this.baseDeposits(home, team ? -1 : 1);
      const direction = team ? -1 : 1;
      for (const [kind, x, y] of [['collector', 77, -44], ['collector', 82, -12], ['collector', 83, 20], ['collector', 70, 48], ['guard', 106, -88], ['scout', 150, 49]]) {
        this.unit(kind, team, { x: home.x + direction * x, y: home.y + y });
      }
    }
    const random = seeded(this.map.seed);
    const neutral = ['sugar', 'mineral', 'membrane'];
    for (let i = 0; i < 19; i++) {
      const point = { x: 420 + random() * 2760, y: 240 + random() * 1900 };
      if (this.structures.some(b => distance(point, b) < 345) || this.deposits.some(d => distance(point, d) < 158)) continue;
      this.addDeposit(neutral[i % neutral.length], point.x, point.y, 1.25);
    }
  }

  baseDeposits(base, direction) {
    const points = [['sugar', 187, -128], ['mineral', 218, 130], ['membrane', -145, 115], ['sugar', 27, -271], ['mineral', -120, -220], ['membrane', 370, -130]];
    for (const [kind, x, y] of points) this.addDeposit(kind, base.x + direction * x, base.y + y);
  }

  addDeposit(kind, x, y, size = 1) {
    const amount = Math.round(POINTS[kind] * size);
    this.deposits.push({ id: this.nextId++, type: 'deposit', x, y, kind, size: 28 * size, amount, total: amount });
  }

  unit(kind, team, point) {
    const unit = { ...makePoint(point.x, point.y), id: this.nextId++, type: 'unit', kind, team, hp: UNITS[kind].hp, angle: team ? Math.PI : 0, carry: 0, resource: null, returning: false, cooldown: 0, orders: [], moving: false };
    this.units.push(unit);
    return unit;
  }

  structure(kind, team, point, progress = 1) {
    const building = { x: point.x, y: point.y, id: this.nextId++, type: 'structure', kind, team, hp: STRUCTURES[kind].hp, progress, queue: [], rally: null, cooldown: 0 };
    this.structures.push(building);
    return building;
  }

  home(team) { return this.structures.find(b => b.team === team && b.kind === 'core' && b.hp > 0); }
  entity(id) { return this.units.find(u => u.id === id && u.hp > 0) || this.structures.find(b => b.id === id && b.hp > 0) || this.deposits.find(r => r.id === id); }
  population(team) { return this.units.filter(u => u.team === team && u.hp > 0).length + this.structures.filter(b => b.team === team && b.hp > 0).reduce((n, b) => n + b.queue.length, 0); }
  capacity(team) { return Math.min(72, 12 + 8 * this.structures.filter(b => b.team === team && b.kind === 'shelter' && b.hp > 0 && b.progress === 1).length); }
  tell(message) { this.news = message; this.newsTime = this.time; }
  canPay(team, price = {}) { return Object.entries(price).every(([key, value]) => this.bank[team][key] >= value); }
  transfer(team, price, direction) { for (const [key, value] of Object.entries(price)) this.bank[team][key] += direction * value; }

  train(building, kind) {
    if (!building || building.progress < 1 || !TRAIN[building.kind]?.includes(kind)) return 'Select a finished training structure.';
    if (building.queue.length >= 6) return 'This production queue is full.';
    if (this.population(building.team) >= this.capacity(building.team)) return 'Unit limit reached. Build a Shelter.';
    const { cost, time } = UNITS[kind];
    if (!this.canPay(building.team, cost)) return 'Gather more resources for that unit.';
    this.transfer(building.team, cost, -1);
    building.queue.push({ kind, left: time, total: time });
    return '';
  }

  cancelTrain(building) {
    const last = building.queue.pop();
    if (last) this.transfer(building.team, UNITS[last.kind].cost, 1);
  }

  canPlace(kind, p) {
    const size = STRUCTURES[kind].size;
    return p.x > size + 20 && p.y > size + 20 && p.x < WORLD.width - size - 20 && p.y < WORLD.height - size - 20
      && !this.structures.some(b => b.hp > 0 && distance(b, p) < info(b).size + size + 20)
      && !this.deposits.some(d => d.amount > 0 && distance(d, p) < d.size + size + 22);
  }

  build(workers, kind, point) {
    if (!workers.length) return 'Select a Collector first.';
    const team = workers[0].team;
    if (this.structures.filter(b => b.team === team).length >= 22) return 'Structure limit reached.';
    if (!this.canPlace(kind, point)) return 'Choose open ground away from deposits and structures.';
    if (!this.canPay(team, STRUCTURES[kind].cost)) return 'Gather more resources for that structure.';
    this.transfer(team, STRUCTURES[kind].cost, -1);
    const building = this.structure(kind, team, point, 0);
    this.order(workers, { type: 'build', target: building.id, x: building.x, y: building.y });
    return '';
  }

  order(units, order, queue = false) {
    let i = 0;
    for (const u of units) {
      if (u.hp <= 0 || (u.kind !== 'collector' && ['build', 'gather', 'deposit'].includes(order.type)) || (u.kind === 'collector' && order.type === 'attack')) continue;
      const next = { ...order };
      if (u.kind === 'collector' && next.type === 'attackMove') next.type = 'move';
      if (['move', 'attackMove'].includes(next.type) && units.length > 1) {
        Object.assign(next, makePoint(order.x + Math.cos(i * 2.4) * Math.sqrt(i) * 27, order.y + Math.sin(i * 2.4) * Math.sqrt(i) * 27));
        i++;
      }
      if (queue) { if (u.orders.length < 9) u.orders.push(next); }
      else { u.orders = [next]; u.returning = false; }
    }
  }

  move(unit, point, dt, stop = 4) {
    const dx = point.x - unit.x;
    const dy = point.y - unit.y;
    const d = Math.hypot(dx, dy);
    if (d <= stop + 0.01) return true;
    const stride = Math.min(info(unit).speed * dt, d - stop);
    unit.x += dx / d * stride;
    unit.y += dy / d * stride;
    unit.angle = Math.atan2(dy, dx);
    unit.moving = stride > 0;
    return false;
  }

  unload(unit, dt, target = null) {
    const building = target || this.structures.filter(b => b.team === unit.team && b.progress === 1 && b.hp > 0 && ['core', 'depot'].includes(b.kind)).sort((a, b) => distance(a, unit) - distance(b, unit))[0];
    if (!building) return false;
    if (!this.move(unit, building, dt, info(building).size + 13)) return false;
    if (unit.carry > 0) {
      this.bank[unit.team][unit.resource] += unit.carry;
      if (unit.team === 0) this.stats.gathered += unit.carry;
    }
    unit.carry = 0;
    unit.returning = false;
    return true;
  }

  nearbyEnemy(entity, range) {
    let best = null;
    let bestGap = range;
    for (const enemy of [...this.units, ...this.structures]) {
      if (enemy.team === entity.team || enemy.hp <= 0) continue;
      const gap = distance(entity, enemy) - info(enemy).size;
      if (gap < bestGap) { bestGap = gap; best = enemy; }
    }
    return best;
  }

  strike(entity, target, damage, cooldown) {
    const effect = entity.kind === 'spark' || entity.kind === 'tower' ? 'ray' : 'hit';
    this.effects.push({ type: effect, from: { x: entity.x, y: entity.y }, to: { x: target.x, y: target.y }, team: entity.team, life: 0.29, max: 0.29 });
    entity.cooldown = cooldown;
    target.hp -= damage;
    if (target.hp <= 0 && entity.team === 0 && target.type === 'unit') this.stats.defeated++;
    if (target.team === 0 && target.kind === 'core' && this.time - this.newsTime > 8) this.tell('Your Core is under attack!');
  }

  fight(unit, target, dt, hold = false) {
    const stats = info(unit);
    const limit = stats.range + info(target).size;
    if (distance(unit, target) <= limit + 0.01) {
      if (unit.cooldown <= 0) this.strike(unit, target, stats.damage * (target.type === 'structure' && unit.kind === 'warden' ? 1.75 : 1), stats.cooldown);
    } else if (!hold) this.move(unit, target, dt, limit);
  }

  updateUnit(unit, dt) {
    unit.cooldown = Math.max(0, unit.cooldown - dt);
    unit.moving = false;
    const command = unit.orders[0];
    if (command?.type === 'move') { if (this.move(unit, command, dt)) unit.orders.shift(); return; }
    if (command?.type === 'build') {
      const building = this.entity(command.target);
      if (!building || building.progress >= 1) { unit.orders.shift(); return; }
      if (!this.move(unit, building, dt, info(building).size + 15)) return;
      building.progress = Math.min(1, building.progress + dt / info(building).time);
      if (building.progress === 1 && unit.team === 0) { this.stats.built++; this.tell(`${info(building).name} finished.`); }
      return;
    }
    if (command?.type === 'gather') {
      const deposit = this.entity(command.target);
      if (unit.returning || unit.carry >= CARRY - 0.01 || (unit.carry > 0 && (!deposit?.amount || unit.resource !== deposit.kind))) {
        unit.returning = true;
        this.unload(unit, dt);
      } else if (!deposit?.amount) {
        const replacement = this.deposits.filter(d => d.kind === deposit?.kind && d.amount > 0 && distance(d, unit) < 500).sort((a, b) => distance(a, unit) - distance(b, unit))[0];
        if (replacement) Object.assign(command, { target: replacement.id, x: replacement.x, y: replacement.y });
        else unit.orders.shift();
      } else if (this.move(unit, deposit, dt, deposit.size + 7)) {
        const amount = Math.min(CARRY - unit.carry, deposit.amount, dt * 8);
        unit.resource = deposit.kind;
        unit.carry += amount;
        deposit.amount -= amount;
      }
      return;
    }
    if (command?.type === 'deposit') {
      if (this.unload(unit, dt, this.entity(command.target))) unit.orders.shift();
      return;
    }
    if (unit.kind === 'collector') { if (!command && unit.carry > 0) this.unload(unit, dt); return; }
    const target = command?.type === 'attack' ? this.entity(command.target) : this.nearbyEnemy(unit, info(unit).range + (command?.type === 'attackMove' ? 145 : 37));
    if (target) this.fight(unit, target, dt, command?.type === 'hold');
    else if (command?.type === 'attack' || (command?.type === 'attackMove' && this.move(unit, command, dt))) unit.orders.shift();
  }

  updateBuilding(building, dt) {
    if (building.progress < 1 || building.hp <= 0) return;
    if (building.kind === 'tower') {
      building.cooldown = Math.max(0, building.cooldown - dt);
      if (!building.cooldown) {
        const target = this.nearbyEnemy(building, 166);
        if (target) this.strike(building, target, 19, 0.92);
      }
    }
    const next = building.queue[0];
    if (!next || (next.left -= dt) > 0) return;
    building.queue.shift();
    const angle = this.nextId * 2.4;
    const step = info(building).size + 27;
    const unit = this.unit(next.kind, building.team, { x: building.x + Math.cos(angle) * step, y: building.y + Math.sin(angle) * step });
    if (building.rally) this.order([unit], { ...building.rally });
    if (building.team === 0) this.stats.trained++;
  }

  think() {
    const home = this.home(1);
    const target = this.home(0);
    if (!home || !target) return;
    const workers = this.units.filter(u => u.team === 1 && u.kind === 'collector' && u.hp > 0);
    const gather = ['sugar', 'mineral', 'sugar', 'membrane'];
    for (const [index, unit] of workers.entries()) {
      if (unit.orders.length) continue;
      const deposit = this.deposits.filter(d => d.amount > 0 && d.kind === gather[index % gather.length]).sort((a, b) => distance(a, home) - distance(b, home))[0];
      if (deposit) this.order([unit], { type: 'gather', target: deposit.id, x: deposit.x, y: deposit.y });
    }
    if (workers.length + home.queue.length < (this.options.difficulty === 'challenge' ? 9 : 7)) this.train(home, 'collector');
    const buildings = this.structures.filter(b => b.team === 1);
    const foundry = buildings.find(b => b.kind === 'foundry');
    const shelters = buildings.filter(b => b.kind === 'shelter').length;
    const buildKind = !foundry ? 'foundry' : shelters < 4 && this.population(1) >= this.capacity(1) - 2 ? 'shelter' : null;
    if (buildKind && this.canPay(1, STRUCTURES[buildKind].cost)) {
      const worker = workers.find(u => u.orders[0]?.type !== 'build' && !u.returning);
      const candidates = [[-125, -80], [-120, 170], [110, 98], [64, -160], [-225, 30], [57, 220], [-180, -245]];
      const location = candidates.map(([x, y]) => ({ x: home.x + x, y: home.y + y })).find(p => this.canPlace(buildKind, p));
      if (worker && location) this.build([worker], buildKind, location);
    }
    if (foundry?.progress === 1 && foundry.queue.length < 2) {
      const planned = ['guard', 'spark', 'guard', 'warden'][Math.floor(this.time / 4) % 4];
      if (!this.canPay(1, UNITS[planned].cost)) this.train(foundry, 'guard');
      else this.train(foundry, planned);
    }
    if (this.time < this.nextRaid) return;
    const fighters = this.units.filter(u => u.team === 1 && u.kind !== 'collector' && u.hp > 0 && !u.orders.length);
    if (fighters.length < 2) { this.nextRaid += 7; return; }
    this.raids++;
    const group = fighters.slice(0, this.pressure.raid + Math.floor(this.raids / 2));
    this.order(group, { type: 'attackMove', x: target.x, y: target.y });
    this.nextRaid = this.time + this.pressure.gap;
    this.tell(`Rival wave ${this.raids} is on the move.`);
  }

  step(dt) {
    if (this.winner !== null) return;
    this.time += dt;
    for (const entity of this.structures) this.updateBuilding(entity, dt);
    for (const entity of this.units) if (entity.hp > 0) this.updateUnit(entity, dt);
    for (let i = 0; i < this.units.length; i++) {
      const a = this.units[i];
      if (a.hp <= 0) continue;
      for (let j = i + 1; j < this.units.length; j++) {
        const b = this.units[j];
        if (b.hp <= 0 || a.team !== b.team || Math.abs(a.x - b.x) > 38 || Math.abs(a.y - b.y) > 38) continue;
        const gap = distance(a, b);
        const need = (info(a).size + info(b).size) * 0.77;
        if (gap >= need) continue;
        const angle = gap > 0.01 ? Math.atan2(b.y - a.y, b.x - a.x) : (a.id % 11) * 0.59;
        const pull = Math.min(80 * dt, (need - gap) / 2);
        const dx = Math.cos(angle) * pull;
        const dy = Math.sin(angle) * pull;
        Object.assign(a, makePoint(a.x - dx, a.y - dy));
        Object.assign(b, makePoint(b.x + dx, b.y + dy));
      }
    }
    this.units = this.units.filter(u => u.hp > 0);
    this.structures = this.structures.filter(b => b.hp > 0);
    for (const effect of this.effects) effect.life -= dt;
    this.effects = this.effects.filter(e => e.life > 0);
    if (!this.home(0)) { this.winner = 1; return; }
    if (!this.home(1) || (this.options.mode === 'survival' && this.time >= 240) || (this.options.mode === 'sprint' && this.stats.gathered >= 600)) { this.winner = 0; return; }
    if (this.time >= this.nextThink) { this.think(); this.nextThink = this.time + 2; }
  }
}
