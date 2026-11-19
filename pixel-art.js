import { WORLD, seeded } from './engine.js';

const FIGURES = {
  collector: [
    '.............', '..oobbbbo....', '.oattttabo...', 'oathttttaboo.', 'oattttttataao', 'obtttmtabhhbo',
    'obbbttbbbbbo.', '.obbbbbbbo...', '..oooooo.....',
  ],
  scout: [
    '.............', '.oo..........', '.otboo.......', '..ohhboo.....', '...othhboo...', '...oatttthboo',
    '..obtttbbboo.', '.oabbboo.....', '.ooo.........',
  ],
  guard: [
    '.............', '......o......', '.....obo.....', '...oobabo....', '..obathtboo..', '.oatthhttbbo.',
    'oatthmtttbbbo', '.obttttbbbo..', '..oabbbboo...', '...obbo......', '....oo.......',
  ],
  spark: [
    '.............', '...obbbbo....', '..baaaatbo...', '.balattabo...', 'obhllttatbbo.', 'obttlltthhbbo',
    '.obtttllbbbo.', '..obbbblboo..', '...oooooo....',
  ],
  warden: [
    '...............', '....oooooo.....', '..oobbbbbboo...', '.obaaaatbbbo...', '.obattttabbbo..', 'obatmbbaattbbo.',
    'obattttaabhbboo', 'obaaatttabbbo..', '.obbbatbbboo...', '..obbbbbboo....', '....ooooo......',
  ],
  core: [
    '.................', '......oobo.......', '....oobaaboo.....', '...oaattttbboo...', '..oaaabotooabo...',
    '.oabatbbaatbbbo..', '.oatboalhhaabbo..', 'oabtoathhhhtatbo.', 'obbaathmhhttbbbo.', 'obbatthhhtttbbbo.',
    '.obbbaattttbbbo..', '.oabbbbtbobbbo...', '..obbaatbobbo....', '...obbbbbbbo.....', '....ooooooo......',
  ],
  foundry: [
    '...............', '..ooob...obo...', '.oaaabo.oatbo..', '.oataboooabbo..', '.obttbaattaabo.',
    'oaatbhllhhbttbo', 'oatbhlahllatbbo', 'obbtbhlahtbbboo', '.obbbbbbbbboo..', '..ooooooooo....',
  ],
  depot: [
    '.............', '.....oo......', '...oobboo....', '..oaataboo...', '.oatahtabto..', 'oatttatttbboo',
    'obtttbtthhbbo', '.obabbbttbbo.', '...ooooooo...',
  ],
  tower: [
    '.............', '......o......', '.....obo.....', '.....oho.....', '....oahbo....', '...oaatbbo...',
    '...oathhbo...', '..oattattbo..', '.oattbattbbo.', 'oabbbbbbbbbbo', '.ooooooooooo.',
  ],
  shelter: [
    '.............', '...ooooooo...', '..oabbbbabo..', '.oatataatbbo.', 'oaatabaattbbo',
    'oattboabttbbo', '.obabobbabbo.', '...oooooooo..',
  ],
};
const PALETTES = [
  { o: '#111f29', b: '#284953', a: '#467467', t: '#539279', h: '#9fd6a0', m: '#f5efd4', l: '#d4f9c8' },
  { o: '#241e2c', b: '#674257', a: '#9c5658', t: '#b7645f', h: '#f29782', m: '#ffe2a0', l: '#ffd588' },
];
const sprites = new Map();

export function sprite(g, kind, team, x, y, diameter, mirrored = false) {
  const key = `${kind}:${team}`;
  let bitmap = sprites.get(key);
  if (!bitmap) {
    const pixels = FIGURES[kind];
    bitmap = document.createElement('canvas');
    bitmap.width = Math.max(...pixels.map(row => row.length));
    bitmap.height = pixels.length;
    const brush = bitmap.getContext('2d');
    for (const [row, line] of pixels.entries()) {
      for (const [column, shade] of [...line].entries()) {
        if (shade === '.') continue;
        brush.fillStyle = PALETTES[team][shade];
        brush.fillRect(column, row, 1, 1);
      }
    }
    sprites.set(key, bitmap);
  }
  const size = Math.max(1, Math.round(diameter / bitmap.width));
  const width = size * bitmap.width;
  const height = size * bitmap.height;
  g.save();
  g.translate(Math.round(x), Math.round(y));
  if (mirrored) g.scale(-1, 1);
  g.drawImage(bitmap, -Math.round(width / 2), -Math.round(height / 2), width, height);
  g.restore();
}

function terrainNotch(g, x, y, size, colors) {
  g.fillStyle = colors[0];
  g.fillRect(x - size, y, size * 2, Math.max(4, size * .46));
  g.fillRect(x - size * .7, y - size * .19, size * 1.4, size * .9);
  g.fillStyle = colors[1];
  g.fillRect(x - size * .65, y - size * .17, size * 1.26, 1);
  g.fillRect(x - size, y, Math.max(4, size * .36), 1);
  g.fillStyle = colors[2];
  g.fillRect(x - size * .54, y + size * .42, size * .72, 1);
  g.fillRect(x + size * .2, y + size * .13, 2, 1);
}

export function pixelTerrain(map) {
  const canvas = document.createElement('canvas');
  canvas.width = WORLD.width / 4;
  canvas.height = WORLD.height / 4;
  const g = canvas.getContext('2d');
  const rand = seeded(map.seed);
  const [base, middle, highlight] = map.palette;
  g.fillStyle = base;
  g.fillRect(0, 0, canvas.width, canvas.height);
  const drift = map.seed < 50 ? 0.15 : 0.2;
  for (let y = 0; y < canvas.height; y += 3) {
    for (let x = 0; x < canvas.width; x += 3) {
      const wave = Math.sin(x * .013 + Math.sin(y * .018) * 1.75) + Math.cos(y * .02 + x * drift * .035);
      const noise = rand() * .38;
      g.globalAlpha = Math.max(0, Math.min(.82, (wave + noise + 1.22) * .18));
      g.fillStyle = middle;
      g.fillRect(x, y, 3, 3);
    }
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 2200; i++) {
    const x = Math.floor(rand() * canvas.width);
    const y = Math.floor(rand() * canvas.height);
    g.fillStyle = i % 9 ? `${highlight}68` : `${highlight}b4`;
    g.fillRect(x, y, i % 8 ? 1 : 2, 1);
  }
  const colors = [`${base}c4`, `${highlight}8e`, `${middle}ee`];
  for (let i = 0; i < 152; i++) terrainNotch(g, Math.floor(rand() * canvas.width), Math.floor(rand() * canvas.height), 4 + Math.floor(rand() * 17), colors);
  g.strokeStyle = highlight;
  g.strokeRect(.5, .5, canvas.width - 1, canvas.height - 1);
  return canvas;
}
