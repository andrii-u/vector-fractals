// Core library for generating fractal vector primitives — platform agnostic.

// ─── Core Types and Interfaces ─────────────────────────────────────────────────

export type FractalType =
  | 'tree' | 'koch' | 'sierpinski' | 'dragon' | 'lsystem'
  | 'spiral' | 'constellation' | 'truchet' | 'waves' | 'flowfield'
  | 'kaleidoscope' | 'mandala' | 'lissajous' | 'hexgrid'
  | 'spirograph' | 'barnsley' | 'rose' | 'islamic' | 'crystal'
  | 'attractor' | 'harmonograph' | 'apollonian' | 'pythagoras';

export interface FractalParams {
  type: FractalType;
  angleVar: number;
  lengthReduction: number;
  hue: number;
  hue2: number;
  saturation: number;
  lightnessMid: number;
  opacityBase: number;
  opacityRange: number;
  maxDepth: number;
  treeCount: number;
  treeOrigin: number;
  seed: number;
  seed2: number;
  asymmetry: number;
  curlFactor: number;
  kochVariant: number;
  dragonScale: number;
  lSystemIdx: number;
  lSystemAngle: number;
  spiralN: number;
  constCount: number;
  kaleidoFold: number;
}

export interface Primitive {
  type: 'line' | 'circle' | 'path' | 'polygon' | 'polyline';
  key: string;
  attributes: { [key: string]: string | number };
}

export interface Point2D {
  x: number;
  y: number;
}

// ─── Utility Functions ────────────────────────────────────────────────────────

// Seeded PRNG (xorshift32) — same sequence for the same seed.
export function makeRng(seed: number): () => number {
  let s = Math.max(1, Math.floor(seed * 0xffffffff));
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
}

export function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function lcmInt(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

// Interpolates an HSLA colour between hue→hue2 by `progress` (0..1).
export function branchColor(
  hue: number, hue2: number,
  sat: number, lightnessMid: number,
  opacityBase: number, opacityRange: number,
  progress: number
): string {
  const blended = hue + ((hue2 - hue + 540) % 360 - 180) * progress;
  const l = lightnessMid - 8 + progress * 18;
  const opacity = opacityBase + progress * opacityRange;
  return `hsla(${blended % 360}, ${sat}%, ${Math.max(10, l)}%, ${Math.min(0.9, opacity)})`;
}

// ─── Fractal 1: Multi-tree ────────────────────────────────────────────────────

function buildTreeCore(
  x: number, y: number, angle: number, length: number,
  depth: number, maxDepth: number,
  p: FractalParams,
  levelAngle: number,
  primitives: Primitive[]
): void {
  if (depth === 0 || length < 0.5) return;
  
  const rad = (angle * Math.PI) / 180;
  const x2 = x + length * Math.cos(rad);
  const y2 = y + length * Math.sin(rad);
  const progress = 1 - depth / maxDepth;

  primitives.push({
    type: 'line',
    key: `t${depth}-${x.toFixed(1)}-${y.toFixed(1)}-${angle.toFixed(1)}`,
    attributes: {
      x1: x, y1: y, x2: x2, y2: y2,
      stroke: branchColor(p.hue, p.hue2, p.saturation, p.lightnessMid, p.opacityBase, p.opacityRange, progress),
      strokeWidth: Math.max(0.3, depth * 0.5),
      strokeLinecap: 'round'
    }
  });

  const nextAngle = levelAngle + p.curlFactor;
  const leftAngle = angle - p.angleVar - p.angleVar * p.asymmetry;
  const rightAngle = angle + p.angleVar * (1 + p.asymmetry);

  buildTreeCore(x2, y2, leftAngle + nextAngle * 0.3, length * p.lengthReduction, depth - 1, maxDepth, p, nextAngle, primitives);
  buildTreeCore(x2, y2, rightAngle + nextAngle * 0.3, length * p.lengthReduction, depth - 1, maxDepth, p, nextAngle, primitives);
}

export function generateTreeScene(W: number, H: number, params: FractalParams): Primitive[] {
  const primitives: Primitive[] = [];
  const { maxDepth, treeCount, seed, treeOrigin } = params;
  const rng = makeRng(seed);

  for (let i = 0; i < treeCount; i++) {
    // Each tree gets its own hue so a cluster reads as a palette, not a monochrome.
    const hueShift = (i * (30 + rng() * 60)) % 360;
    const treeParams = { ...params, hue: (params.hue + hueShift) % 360 };

    let tx: number, ty: number, startAngle: number, baseLen: number;

    if (treeOrigin === 3) {
      // Corners + side midpoints, growing inward.
      const corners: [number, number, number][] = [
        [W * 0.08, H, -70 - rng() * 15],
        [W * 0.92, H, -110 + rng() * 15],
        [W * 0.08, 0, 70 + rng() * 15],
        [W * 0.92, 0, 110 - rng() * 15],
        [0, H * 0.5, -(rng() * 20)],
        [W, H * 0.5, 180 + rng() * 20 - 10],
      ];
      const c = corners[i % corners.length];
      tx = c[0]; ty = c[1]; startAngle = c[2];
      baseLen = Math.max(W, H) / (1.8 + rng() * 1.5);
    } else if (treeOrigin === 4) {
      // One tree per edge, growing toward the centre.
      const edge = i % 4;
      if (edge === 0) {
        tx = (0.1 + rng() * 0.8) * W; ty = H; startAngle = -90 + (rng() - 0.5) * 30;
        baseLen = H / (1.8 + rng() * 1.5);
      } else if (edge === 1) {
        tx = (0.1 + rng() * 0.8) * W; ty = 0; startAngle = 90 + (rng() - 0.5) * 30;
        baseLen = H / (1.8 + rng() * 1.5);
      } else if (edge === 2) {
        tx = 0; ty = (0.1 + rng() * 0.8) * H; startAngle = (rng() - 0.5) * 30;
        baseLen = W / (1.8 + rng() * 1.5);
      } else {
        tx = W; ty = (0.1 + rng() * 0.8) * H; startAngle = 180 + (rng() - 0.5) * 30;
        baseLen = W / (1.8 + rng() * 1.5);
      }
    } else if (treeOrigin === 1) {
      // Hanging from the top edge, spread across the width.
      const t = treeCount === 1 ? 0.5 : i / (treeCount - 1);
      tx = Math.max(0.05, Math.min(0.95, t + (rng() - 0.5) * 0.15)) * W;
      ty = 0; startAngle = 90 + (rng() - 0.5) * 20;
      baseLen = H / (1.8 + rng() * 1.5);
    } else {
      // Default: rooted on the bottom edge, spread across the width.
      const t = treeCount === 1 ? 0.5 : i / (treeCount - 1);
      tx = Math.max(0.05, Math.min(0.95, t + (rng() - 0.5) * 0.15)) * W;
      ty = H; startAngle = -90 + (rng() - 0.5) * 20;
      baseLen = H / (1.8 + rng() * 1.5);
    }

    buildTreeCore(tx, ty, startAngle, baseLen, maxDepth, maxDepth, treeParams, 0, primitives);
  }

  return primitives;
}

// ─── Fractal 2: Koch variants ─────────────────────────────────────────────────

function kochLineCore(
  x1: number, y1: number, x2: number, y2: number,
  depth: number,
  primitives: Primitive[],
  p: FractalParams,
  variant: number
): void {
  if (depth === 0) {
    primitives.push({
      type: 'line',
      key: `k${x1.toFixed(1)}-${y1.toFixed(1)}-${x2.toFixed(1)}-${y2.toFixed(1)}`,
      attributes: {
        x1, y1, x2, y2,
        stroke: branchColor(p.hue, p.hue2, p.saturation, p.lightnessMid, p.opacityBase, p.opacityRange, 0.5),
        strokeWidth: 0.6,
        strokeLinecap: 'round'
      }
    });
    return;
  }

  const dx = x2 - x1, dy = y2 - y1;
  const ax = x1 + dx / 3, ay = y1 + dy / 3;
  const bx = x1 + 2 * dx / 3, by = y1 + 2 * dy / 3;

  const sign = (variant % 2 === 0) ? 1 : -1;
  const peakRatio = variant < 2 ? Math.sqrt(3) / 6 : Math.sqrt(2) / 4;
  const mx = (x1 + x2) / 2 - sign * dy * peakRatio;
  const my = (y1 + y2) / 2 + sign * dx * peakRatio;

  kochLineCore(x1, y1, ax, ay, depth - 1, primitives, p, variant);
  kochLineCore(ax, ay, mx, my, depth - 1, primitives, p, variant);
  kochLineCore(mx, my, bx, by, depth - 1, primitives, p, variant);
  kochLineCore(bx, by, x2, y2, depth - 1, primitives, p, variant);
}

export function generateKochScene(width: number, height: number, params: FractalParams): Primitive[] {
  const primitives: Primitive[] = [];
  const depth = Math.min(params.maxDepth - 5, 5);
  const rng = makeRng(params.seed);

  const count = 1 + Math.floor(rng() * 3);
  for (let k = 0; k < count; k++) {
    const cx = width * (0.2 + rng() * 0.6);
    const cy = height * (0.2 + rng() * 0.6);
    const r = Math.min(width, height) * (0.18 + rng() * 0.22);
    const sides = [3, 3, 4, 5][Math.floor(rng() * 4)];
    
    for (let i = 0; i < sides; i++) {
      const a1 = (i * (360 / sides) - 90) * Math.PI / 180;
      const a2 = ((i + 1) * (360 / sides) - 90) * Math.PI / 180;
      kochLineCore(
        cx + r * Math.cos(a1), cy + r * Math.sin(a1),
        cx + r * Math.cos(a2), cy + r * Math.sin(a2),
        depth, primitives, params, params.kochVariant
      );
    }
  }
  return primitives;
}

// ─── Fractal 3: Sierpinski ────────────────────────────────────────────────────

function buildSierpinskiCore(
  x1: number, y1: number, x2: number, y2: number, x3: number, y3: number,
  depth: number, maxDepth: number,
  primitives: Primitive[],
  p: FractalParams
): void {
  if (depth === 0) {
    const col = branchColor(p.hue, p.hue2, p.saturation, p.lightnessMid, p.opacityBase, p.opacityRange, 0.4);
    primitives.push({
      type: 'polygon',
      key: `s${depth}-${x1.toFixed(0)}-${y1.toFixed(0)}-${x2.toFixed(0)}`,
      attributes: {
        points: `${x1},${y1} ${x2},${y2} ${x3},${y3}`,
        fill: col,
        stroke: col,
        strokeWidth: 0.3
      }
    });
    return;
  }

  const mx12 = (x1 + x2) / 2, my12 = (y1 + y2) / 2;
  const mx23 = (x2 + x3) / 2, my23 = (y2 + y3) / 2;
  const mx13 = (x1 + x3) / 2, my13 = (y1 + y3) / 2;
  
  buildSierpinskiCore(x1, y1, mx12, my12, mx13, my13, depth - 1, maxDepth, primitives, p);
  buildSierpinskiCore(mx12, my12, x2, y2, mx23, my23, depth - 1, maxDepth, primitives, p);
  buildSierpinskiCore(mx13, my13, mx23, my23, x3, y3, depth - 1, maxDepth, primitives, p);
}

export function generateSierpinskiScene(width: number, height: number, params: FractalParams): Primitive[] {
  const primitives: Primitive[] = [];
  const depth = Math.min(params.maxDepth - 6, 6);
  const rng = makeRng(params.seed);

  const rotation = rng() * 360;
  const cx = width / 2, cy = height * (0.4 + rng() * 0.2);
  const r = Math.min(width, height) * (0.42 + rng() * 0.06);

  function rotPt(deg: number): [number, number] {
    const a = (deg + rotation) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }

  const [x1, y1] = rotPt(-90);
  const [x2, y2] = rotPt(30);
  const [x3, y3] = rotPt(150);
  
  buildSierpinskiCore(x1, y1, x2, y2, x3, y3, depth, depth, primitives, params);
  return primitives;
}

// ─── Fractal 4: Dragon curve ──────────────────────────────────────────────────

function dragonCurve(depth: number): [number, number][] {
  let points: [number, number][] = [[0, 0], [1, 0]];
  for (let i = 0; i < depth; i++) {
    const last = points[points.length - 1];
    const newPts: [number, number][] = [];
    for (let j = points.length - 2; j >= 0; j--) {
      const [px, py] = points[j];
      const rx = last[0] + (py - last[1]);
      const ry = last[1] - (px - last[0]);
      newPts.push([rx, ry]);
    }
    points = [...points, ...newPts];
  }
  return points;
}

export function generateDragonScene(width: number, height: number, params: FractalParams): Primitive[] {
  const primitives: Primitive[] = [];
  const depth = Math.min(params.maxDepth - 3, 13);
  const pts = dragonCurve(depth);
  if (pts.length < 2) return primitives;

  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const scaleX = (width * params.dragonScale) / (maxX - minX || 1);
  const scaleY = (height * params.dragonScale) / (maxY - minY || 1);
  const scale = Math.min(scaleX, scaleY);

  const rng = makeRng(params.seed);
  const offX = width * (0.15 + rng() * 0.7) - ((minX + maxX) / 2) * scale;
  const offY = height * (0.15 + rng() * 0.7) - ((minY + maxY) / 2) * scale;

  const total = pts.length - 1;
  for (let i = 0; i < total; i++) {
    const progress = i / total;
    const [x1r, y1r] = pts[i], [x2r, y2r] = pts[i + 1];
    primitives.push({
      type: 'line',
      key: `d${i}`,
      attributes: {
        x1: x1r * scale + offX,
        y1: y1r * scale + offY,
        x2: x2r * scale + offX,
        y2: y2r * scale + offY,
        stroke: branchColor(params.hue, params.hue2, params.saturation, params.lightnessMid, params.opacityBase, params.opacityRange, progress),
        strokeWidth: 0.6,
        strokeLinecap: 'round'
      }
    });
  }
  return primitives;
}

// ─── Fractal 5: L-system ──────────────────────────────────────────────────────

type LRule = Record<string, string>;

const L_SYSTEMS: Array<{ axiom: string; rules: LRule; angle: number; label: string }> = [
  { axiom: 'F', rules: { F: 'F[+F]F[-F]F' }, angle: 25, label: 'plant-a' },
  { axiom: 'F', rules: { F: 'FF+[+F-F-F]-[-F+F+F]' }, angle: 22, label: 'plant-b' },
  { axiom: 'X', rules: { X: 'F+[[X]-X]-F[-FX]+X', F: 'FF' }, angle: 25, label: 'plant-c' },
  { axiom: 'F', rules: { F: 'F[+FF][-FF]F[-F][+F]F' }, angle: 35, label: 'bush' },
  { axiom: 'F', rules: { F: 'F+F-F-F+F' }, angle: 90, label: 'hilbert-like' },
  { axiom: 'X', rules: { X: 'YF+XF+Y', Y: 'XF-YF-X' }, angle: 60, label: 'triangle' },
  { axiom: 'F', rules: { F: 'F[+F[+F][-F]][-F[+F][-F]]' }, angle: 30, label: 'dense-bush' },
  { axiom: 'X', rules: { X: 'F[-X][+X]FX', F: 'FF' }, angle: 20, label: 'wide-spread' },
];

function expandLSystem(axiom: string, rules: LRule, iters: number): string {
  let s = axiom;
  for (let i = 0; i < iters; i++) {
    s = s.split('').map(c => rules[c] ?? c).join('');
    if (s.length > 80000) break;
  }
  return s;
}

export function generateLSystemScene(width: number, height: number, params: FractalParams): Primitive[] {
  const primitives: Primitive[] = [];
  const sysIdx = params.lSystemIdx % L_SYSTEMS.length;
  const sys = L_SYSTEMS[sysIdx];
  const iters = Math.min(params.maxDepth - 6, 5);
  const expanded = expandLSystem(sys.axiom, sys.rules, iters);

  const rng = makeRng(params.seed);
  const instances = 1 + Math.floor(rng() * 2);
  const useAngle = params.lSystemAngle;

  for (let inst = 0; inst < instances; inst++) {
    const startX = width * (0.15 + rng() * 0.7);
    let x = startX;
    let y = height * (0.92 - inst * 0.35);
    let angle = -90 + (rng() - 0.5) * 25;
    let depth = 0;
    const stepBase = Math.min(width, height) / (iters * 4 + 4);

    const stack: Array<{ x: number; y: number; angle: number; depth: number }> = [];
    let idx = 0;

    for (const ch of expanded) {
      if (idx > 10000) break;
      const progress = Math.max(0, Math.min(1, 1 - depth / (iters * 2 + 2)));
      
      switch (ch) {
        case 'F': {
          const rad = (angle * Math.PI) / 180;
          const nx = x + stepBase * Math.cos(rad);
          const ny = y + stepBase * Math.sin(rad);
          primitives.push({
            type: 'line',
            key: `l${inst}-${idx}`,
            attributes: {
              x1: x, y1: y, x2: nx, y2: ny,
              stroke: branchColor(params.hue, params.hue2, params.saturation, params.lightnessMid, params.opacityBase, params.opacityRange, progress),
              strokeWidth: Math.max(0.4, (iters * 2 - depth * 0.8) * 0.3),
              strokeLinecap: 'round'
            }
          });
          x = nx; y = ny;
          break;
        }
        case '+': angle += useAngle; break;
        case '-': angle -= useAngle; break;
        case '[': stack.push({ x, y, angle, depth }); depth++; break;
        case ']': {
          const s = stack.pop();
          if (s) { x = s.x; y = s.y; angle = s.angle; depth = s.depth }
          break;
        }
      }
      idx++;
    }
  }
  return primitives;
}

// ─── Fractal 6: Golden-ratio spiral ───────────────────────────────────────────

export function generateSpiralScene(width: number, height: number, params: FractalParams): Primitive[] {
  const primitives: Primitive[] = [];
  const rng = makeRng(params.seed);
  const PHI = 137.508 * Math.PI / 180;

  const cx = width * (0.3 + rng() * 0.4);
  const cy = height * (0.3 + rng() * 0.4);

  const cornerDist = Math.max(
    Math.hypot(cx, cy),
    Math.hypot(width - cx, cy),
    Math.hypot(cx, height - cy),
    Math.hypot(width - cx, height - cy)
  );

  const N = params.spiralN;
  const scale = (cornerDist / Math.sqrt(N)) * (0.92 + params.seed2 * 0.12);

  const pts: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const r = scale * Math.sqrt(i + 1);
    const a = i * PHI;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }

  for (let i = 1; i < pts.length; i++) {
    const progress = i / pts.length;
    primitives.push({
      type: 'line',
      key: `sp${i}`,
      attributes: {
        x1: pts[i - 1][0], y1: pts[i - 1][1],
        x2: pts[i][0], y2: pts[i][1],
        stroke: branchColor(params.hue, params.hue2, params.saturation, params.lightnessMid, params.opacityBase, params.opacityRange, progress),
        strokeWidth: Math.max(0.2, 1.0 - progress * 0.7),
        strokeLinecap: 'round'
      }
    });
  }

  const webStep = 5 + Math.floor(rng() * 8);
  for (let i = 0; i + webStep < pts.length; i += webStep) {
    const progress = i / pts.length;
    primitives.push({
      type: 'line',
      key: `spw${i}`,
      attributes: {
        x1: pts[i][0], y1: pts[i][1],
        x2: pts[i + webStep][0], y2: pts[i + webStep][1],
        stroke: branchColor(params.hue, params.hue2, params.saturation, params.lightnessMid, params.opacityBase * 0.5, params.opacityRange * 0.4, progress),
        strokeWidth: 0.3
      }
    });
  }

  return primitives;
}

// ─── Fractal 7: Constellation ─────────────────────────────────────────────────

export function generateConstellationScene(width: number, height: number, params: FractalParams): Primitive[] {
  const primitives: Primitive[] = [];
  const rng = makeRng(params.seed);
  const rng2 = makeRng(params.seed2);

  const count = params.constCount;
  const pts: [number, number][] = [];
  const margin = 20;
  
  for (let i = 0; i < count; i++) {
    pts.push([
      margin + rng2() * (width - 2 * margin),
      margin + rng2() * (height - 2 * margin),
    ]);
  }

  const area = width * height;
  const maxDist = Math.sqrt(area / count) * (1.8 + params.seed2 * 1.2);

  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[i][0] - pts[j][0];
      const dy = pts[i][1] - pts[j][1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < maxDist) {
        const fade = 1 - dist / maxDist;
        const progress = (i + j) / (2 * pts.length);
        primitives.push({
          type: 'line',
          key: `cn${i}-${j}`,
          attributes: {
            x1: pts[i][0], y1: pts[i][1],
            x2: pts[j][0], y2: pts[j][1],
            stroke: branchColor(params.hue, params.hue2, params.saturation, params.lightnessMid, params.opacityBase * fade * 0.75, params.opacityRange * 0.45, progress),
            strokeWidth: 0.5
          }
        });
      }
    }
  }

  for (let i = 0; i < pts.length; i++) {
    const progress = i / pts.length;
    primitives.push({
      type: 'circle',
      key: `cn-pt${i}`,
      attributes: {
        cx: pts[i][0], cy: pts[i][1],
        r: 0.8 + rng2() * 1.6,
        fill: branchColor(params.hue, params.hue2, params.saturation, params.lightnessMid, params.opacityBase + 0.06, params.opacityRange, progress)
      }
    });
  }

  return primitives;
}

// ─── Pattern 8: Truchet tiles ─────────────────────────────────────────────────

export function generateTruchetScene(width: number, height: number, params: FractalParams): Primitive[] {
  const primitives: Primitive[] = [];
  const rng = makeRng(params.seed);

  const cellSize = 30 + Math.floor(rng() * 50);
  const r = cellSize / 2;
  const cols = Math.ceil(width / cellSize) + 1;
  const rows = Math.ceil(height / cellSize) + 1;
  const total = rows * cols;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cellSize;
      const y = row * cellSize;
      const progress = (row * cols + col) / total;
      const color = branchColor(params.hue, params.hue2, params.saturation, params.lightnessMid, params.opacityBase, params.opacityRange, progress);
      const k = `tr${row}-${col}`;

      if (rng() < 0.5) {
        primitives.push({
          type: 'path',
          key: `${k}a`,
          attributes: {
            d: `M ${x + r} ${y} A ${r} ${r} 0 0 1 ${x} ${y + r}`,
            fill: 'none', stroke: color, strokeWidth: 1.2, strokeLinecap: 'round'
          }
        });
        primitives.push({
          type: 'path',
          key: `${k}b`,
          attributes: {
            d: `M ${x + cellSize} ${y + r} A ${r} ${r} 0 0 0 ${x + r} ${y + cellSize}`,
            fill: 'none', stroke: color, strokeWidth: 1.2, strokeLinecap: 'round'
          }
        });
      } else {
        primitives.push({
          type: 'path',
          key: `${k}c`,
          attributes: {
            d: `M ${x + r} ${y} A ${r} ${r} 0 0 0 ${x + cellSize} ${y + r}`,
            fill: 'none', stroke: color, strokeWidth: 1.2, strokeLinecap: 'round'
          }
        });
        primitives.push({
          type: 'path',
          key: `${k}d`,
          attributes: {
            d: `M ${x} ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y + cellSize}`,
            fill: 'none', stroke: color, strokeWidth: 1.2, strokeLinecap: 'round'
          }
        });
      }
    }
  }

  return primitives;
}

// ─── Pattern 9: Wave interference ────────────────────────────────────────────

export function generateWavesScene(width: number, height: number, params: FractalParams): Primitive[] {
  const primitives: Primitive[] = [];
  const rng = makeRng(params.seed);

  const numWaves = 3 + Math.floor(rng() * 4);
  const lineCount = 50 + Math.floor(rng() * 50);
  const STEPS = 80;

  const freqs = Array.from({ length: numWaves }, () => rng() * 0.012 + 0.002);
  const amps  = Array.from({ length: numWaves }, () => height * (0.03 + rng() * 0.07));
  const phases = Array.from({ length: numWaves }, () => rng() * Math.PI * 2);
  const yFreqs = Array.from({ length: numWaves }, () => rng() * 0.02 + 0.005);

  for (let li = 0; li < lineCount; li++) {
    const yBase = (li / (lineCount - 1)) * height;
    const progress = li / lineCount;
    const color = branchColor(params.hue, params.hue2, params.saturation, params.lightnessMid, params.opacityBase, params.opacityRange, progress);

    const pts: string[] = [];
    for (let xi = 0; xi <= STEPS; xi++) {
      const x = (xi / STEPS) * width;
      let yOff = 0;
      for (let wi = 0; wi < numWaves; wi++) {
        yOff += amps[wi] * Math.sin(freqs[wi] * x + phases[wi] + li * yFreqs[wi] * 10);
      }
      pts.push(`${x.toFixed(1)},${(yBase + yOff).toFixed(1)}`);
    }

    primitives.push({
      type: 'polyline',
      key: `wv${li}`,
      attributes: {
        points: pts.join(' '),
        fill: 'none',
        stroke: color,
        strokeWidth: 0.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round'
      }
    });
  }

  return primitives;
}

// ─── Pattern 10: Flow field ───────────────────────────────────────────────────

export function generateFlowFieldScene(width: number, height: number, params: FractalParams): Primitive[] {
  const primitives: Primitive[] = [];
  const rng = makeRng(params.seed);
  const rng2 = makeRng(params.seed2);

  const freq1 = 0.002 + rng() * 0.008;
  const freq2 = 0.002 + rng() * 0.008;
  const twist = rng() * 3 + 1;
  const offset = rng() * Math.PI * 2;

  const numCurves = 80 + Math.floor(rng() * 80);
  const maxSteps  = 60 + Math.floor(rng() * 60);
  const stepLen   = Math.min(width, height) / 70;

  function fieldAngle(x: number, y: number): number {
    return (
      Math.sin(x * freq1 + offset) * Math.cos(y * freq2) +
      Math.sin(y * freq1 * 0.7 + offset * 1.3) * 0.5
    ) * twist;
  }

  for (let ci = 0; ci < numCurves; ci++) {
    let x = rng2() * width;
    let y = rng2() * height;
    const pts: string[] = [`${x.toFixed(1)},${y.toFixed(1)}`];

    for (let step = 0; step < maxSteps; step++) {
      const angle = fieldAngle(x, y);
      x += Math.cos(angle) * stepLen;
      y += Math.sin(angle) * stepLen;
      if (x < -10 || x > width + 10 || y < -10 || y > height + 10) break;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }

    if (pts.length < 4) continue;

    const progress = ci / numCurves;
    const color = branchColor(params.hue, params.hue2, params.saturation, params.lightnessMid, params.opacityBase, params.opacityRange, progress);

    primitives.push({
      type: 'polyline',
      key: `ff${ci}`,
      attributes: {
        points: pts.join(' '),
        fill: 'none',
        stroke: color,
        strokeWidth: 0.7,
        strokeLinecap: 'round',
        strokeLinejoin: 'round'
      }
    });
  }

  return primitives;
}

// ─── Pattern 11: Kaleidoscope ─────────────────────────────────────────────────

export function generateKaleidoscopeScene(width: number, height: number, params: FractalParams): Primitive[] {
  const primitives: Primitive[] = [];
  const rng = makeRng(params.seed);
  const rng2 = makeRng(params.seed2);

  const N = params.kaleidoFold ?? 6;
  const cx = width / 2;
  const cy = height / 2;
  const R = Math.max(width, height) * 0.68;
  const segAngle = (2 * Math.PI) / N;

  // Build one segment's content in local coords
  const seg: Primitive[] = [];

  // Radial lines from center
  const spokeCount = 3 + Math.floor(rng() * 5);
  for (let i = 0; i < spokeCount; i++) {
    const a = rng() * segAngle;
    const r1 = rng() * R * 0.15;
    const r2 = rng() * R * 0.92 + R * 0.05;
    const progress = i / spokeCount;
    seg.push({
      type: 'line',
      key: `ks${i}`,
      attributes: {
        x1: (Math.cos(a) * r1).toFixed(2), y1: (Math.sin(a) * r1).toFixed(2),
        x2: (Math.cos(a) * r2).toFixed(2), y2: (Math.sin(a) * r2).toFixed(2),
        stroke: branchColor(params.hue, params.hue2, params.saturation, params.lightnessMid, params.opacityBase, params.opacityRange, progress),
        strokeWidth: 0.5 + rng2() * 1.3,
        strokeLinecap: 'round'
      }
    });
  }

  // Cross-lines within the sector
  const crossCount = 12 + Math.floor(rng() * 18);
  for (let i = 0; i < crossCount; i++) {
    const a1 = rng() * segAngle, r1 = rng() * R;
    const a2 = rng() * segAngle, r2 = rng() * R;
    const progress = 0.3 + (i / crossCount) * 0.7;
    seg.push({
      type: 'line',
      key: `kc${i}`,
      attributes: {
        x1: (Math.cos(a1) * r1).toFixed(2), y1: (Math.sin(a1) * r1).toFixed(2),
        x2: (Math.cos(a2) * r2).toFixed(2), y2: (Math.sin(a2) * r2).toFixed(2),
        stroke: branchColor(params.hue, params.hue2, params.saturation, params.lightnessMid, params.opacityBase * 0.7, params.opacityRange * 0.9, progress),
        strokeWidth: 0.6 + rng2() * 0.8,
        strokeLinecap: 'round'
      }
    });
  }

  // Arcs at various radii
  const arcCount = 5 + Math.floor(rng() * 7);
  for (let i = 0; i < arcCount; i++) {
    const r = rng() * R * 0.88 + R * 0.06;
    const aStart = rng() * segAngle * 0.3;
    const aEnd = segAngle * (0.55 + rng() * 0.45);
    const x1 = Math.cos(aStart) * r, y1 = Math.sin(aStart) * r;
    const x2 = Math.cos(aEnd) * r, y2 = Math.sin(aEnd) * r;
    const large = (aEnd - aStart) > Math.PI ? 1 : 0;
    const progress = i / arcCount;
    seg.push({
      type: 'path',
      key: `ka${i}`,
      attributes: {
        d: `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
        fill: 'none',
        stroke: branchColor(params.hue, params.hue2, params.saturation, params.lightnessMid, params.opacityBase * 0.85, params.opacityRange, progress),
        strokeWidth: 0.6 + rng2() * 0.8,
        strokeLinecap: 'round'
      }
    });
  }

  // Dots at interesting points
  const dotCount = 6 + Math.floor(rng() * 10);
  for (let i = 0; i < dotCount; i++) {
    const a = rng() * segAngle;
    const r = rng() * R * 0.9;
    const progress = i / dotCount;
    seg.push({
      type: 'circle',
      key: `kd${i}`,
      attributes: {
        cx: (Math.cos(a) * r).toFixed(2), cy: (Math.sin(a) * r).toFixed(2),
        r: 0.8 + rng2() * 2.8,
        fill: branchColor(params.hue, params.hue2, params.saturation, params.lightnessMid, params.opacityBase + 0.06, params.opacityRange, progress)
      }
    });
  }

  // Render N rotated + alternating-mirrored copies
  for (let fold = 0; fold < N; fold++) {
    const rot = (fold * 360) / N;
    const mirror = fold % 2 === 1 ? ' scale(1,-1)' : '';

    seg.forEach(primitive => {
      primitives.push({
        ...primitive,
        key: `kf${fold}-${primitive.key}`,
        attributes: {
          ...primitive.attributes,
          transform: `translate(${cx},${cy}) rotate(${rot})${mirror}`
        }
      });
    });
  }

  return primitives;
}

// ─── Pattern 12: Mandala ──────────────────────────────────────────────────────

export function generateMandalaScene(width: number, height: number, params: FractalParams): Primitive[] {
  const primitives: Primitive[] = [];
  const rng = makeRng(params.seed);
  const rng2 = makeRng(params.seed2);

  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.min(width, height) * 0.46;

  const symOptions = [6, 7, 8, 9, 10, 12, 16];
  const N = symOptions[Math.floor(rng() * symOptions.length)];
  const ringCount = 5 + Math.floor(rng() * 3);
  const style = Math.floor(rng() * 4);

  // Outer decorative border
  primitives.push({
    type: 'circle',
    key: 'outer',
    attributes: {
      cx, cy, r: maxR * 1.02,
      fill: 'none',
      stroke: branchColor(params.hue, params.hue2, params.saturation, params.lightnessMid, params.opacityBase * 0.35, params.opacityRange * 0.3, 0.9),
      strokeWidth: 0.5
    }
  });

  for (let ring = 0; ring <= ringCount; ring++) {
    const r = ring === 0 ? maxR * 0.06 : maxR * ring / ringCount;
    const progress = ring / ringCount;
    const color = branchColor(params.hue, params.hue2, params.saturation, params.lightnessMid, params.opacityBase, params.opacityRange, progress);
    const colorAlt = branchColor(params.hue2, params.hue, params.saturation * 0.9, params.lightnessMid, params.opacityBase * 0.65, params.opacityRange * 0.8, 1 - progress);

    // Ring circle
    primitives.push({
      type: 'circle',
      key: `mr${ring}`,
      attributes: {
        cx, cy, r,
        fill: 'none', stroke: color, strokeWidth: ring === 0 ? 1.8 : 0.4
      }
    });

    if (ring === 0) {
      // Filled center
      primitives.push({
        type: 'circle',
        key: 'mc',
        attributes: {
          cx, cy, r: maxR * 0.03,
          fill: color
        }
      });
      continue;
    }

    // Per-ring angular offset for visual complexity
    const angleOff = ring % 2 === 0 ? Math.PI / N : 0;

    for (let i = 0; i < N; i++) {
      const angle = (i * 2 * Math.PI / N) + angleOff;
      const nextAngle = ((i + 1) * 2 * Math.PI / N) + angleOff;
      const midAngle = (angle + nextAngle) / 2;

      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      const px2 = cx + r * Math.cos(nextAngle);
      const py2 = cy + r * Math.sin(nextAngle);
      const outerR = r + (maxR / (ringCount * 1.6));
      const midX = cx + outerR * Math.cos(midAngle);
      const midY = cy + outerR * Math.sin(midAngle);

      switch (style) {
        case 0: {
          // Petal arcs between adjacent ring points + dots
          primitives.push({
            type: 'path',
            key: `mp${ring}-${i}`,
            attributes: {
              d: `M ${px.toFixed(1)} ${py.toFixed(1)} Q ${midX.toFixed(1)} ${midY.toFixed(1)} ${px2.toFixed(1)} ${py2.toFixed(1)}`,
              fill: 'none', stroke: color, strokeWidth: 0.65, strokeLinecap: 'round'
            }
          });
          primitives.push({
            type: 'circle',
            key: `mpd${ring}-${i}`,
            attributes: {
              cx: px, cy: py, r: 1.1 + rng2() * 0.5,
              fill: colorAlt
            }
          });
          break;
        }
        case 1: {
          // Radial spokes (inner rings) + dots at all rings
          if (ring <= 3) {
            const innerR2 = ring > 1 ? maxR * (ring - 1) / ringCount : 0;
            primitives.push({
              type: 'line',
              key: `ms${ring}-${i}`,
              attributes: {
                x1: (cx + innerR2 * Math.cos(angle)).toFixed(1),
                y1: (cy + innerR2 * Math.sin(angle)).toFixed(1),
                x2: px.toFixed(1), y2: py.toFixed(1),
                stroke: color, strokeWidth: 0.45
              }
            });
          }
          primitives.push({
            type: 'circle',
            key: `msd${ring}-${i}`,
            attributes: {
              cx: px, cy: py,
              r: 1.4 - progress * 0.5,
              fill: color
            }
          });
          break;
        }
        case 2: {
          // Diamond petals
          const innerR2 = r * 0.78;
          const ix = cx + innerR2 * Math.cos(angle);
          const iy = cy + innerR2 * Math.sin(angle);
          const ox = cx + r * 1.1 * Math.cos(angle);
          const oy = cy + r * 1.1 * Math.sin(angle);
          const lx = cx + r * 0.7 * Math.cos(angle - Math.PI / N);
          const ly = cy + r * 0.7 * Math.sin(angle - Math.PI / N);
          const rx2 = cx + r * 0.7 * Math.cos(angle + Math.PI / N);
          const ry2 = cy + r * 0.7 * Math.sin(angle + Math.PI / N);
          primitives.push({
            type: 'path',
            key: `md${ring}-${i}`,
            attributes: {
              d: `M ${ox.toFixed(1)} ${oy.toFixed(1)} L ${lx.toFixed(1)} ${ly.toFixed(1)} L ${ix.toFixed(1)} ${iy.toFixed(1)} L ${rx2.toFixed(1)} ${ry2.toFixed(1)} Z`,
              fill: 'none', stroke: color, strokeWidth: 0.5
            }
          });
          primitives.push({
            type: 'circle',
            key: `mdd${ring}-${i}`,
            attributes: {
              cx: px, cy: py, r: 0.7,
              fill: colorAlt
            }
          });
          break;
        }
        case 3: {
          // Interlaced lines between adjacent rings + midpoint dots
          primitives.push({
            type: 'path',
            key: `mi${ring}-${i}`,
            attributes: {
              d: `M ${px.toFixed(1)} ${py.toFixed(1)} Q ${midX.toFixed(1)} ${midY.toFixed(1)} ${px2.toFixed(1)} ${py2.toFixed(1)}`,
              fill: 'none', stroke: colorAlt, strokeWidth: 0.5, strokeLinecap: 'round'
            }
          });
          primitives.push({
            type: 'circle',
            key: `mid${ring}-${i}`,
            attributes: {
              cx: midX, cy: midY, r: 0.8,
              fill: color
            }
          });
          break;
        }
      }
    }

    // Polygon outline at every other ring
    if (ring % 2 === 0 && ring > 0 && ring < ringCount) {
      const polyPts = Array.from({ length: N }, (_, i) => {
        const a = (i * 2 * Math.PI / N) + angleOff;
        return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
      }).join(' ');
      primitives.push({
        type: 'polygon',
        key: `mply${ring}`,
        attributes: {
          points: polyPts,
          fill: 'none', stroke: color, strokeWidth: 0.3, opacity: 0.45
        }
      });
    }
  }

  return primitives;
}

// ─── Pattern 13: Lissajous figures ───────────────────────────────────────────

export function generateLissajousScene(width: number, height: number, params: FractalParams): Primitive[] {
  const primitives: Primitive[] = [];
  const rng = makeRng(params.seed);
  const rng2 = makeRng(params.seed2);

  const cx = width / 2;
  const cy = height / 2;
  const Ax = width * 0.44;
  const Ay = height * 0.44;
  const STEPS = 900;

  // Coprime ratio pairs for distinct closed Lissajous figures
  const ratios: [number, number][] = [
    [1, 2], [2, 3], [3, 4], [4, 5], [3, 5],
    [1, 3], [5, 6], [2, 5], [3, 7], [1, 4],
    [5, 7], [4, 7], [5, 8], [3, 8], [7, 8],
  ];

  const count = 2 + Math.floor(rng() * 4);

  for (let k = 0; k < count; k++) {
    const [a, b] = ratios[Math.floor(rng() * ratios.length)];
    const delta = rng() * Math.PI * 2;
    const scale = 0.38 + rng2() * 0.62;
    
    const pts: string[] = [];
    for (let i = 0; i <= STEPS; i++) {
      const t = (i / STEPS) * 2 * Math.PI;
      const x = cx + Ax * scale * Math.sin(a * t + delta);
      const y = cy + Ay * scale * Math.sin(b * t);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }

    const progress = k / Math.max(count - 1, 1);
    primitives.push({
      type: 'polyline',
      key: `lj${k}`,
      attributes: {
        points: pts.join(' '),
        fill: 'none',
        stroke: branchColor(params.hue, params.hue2, params.saturation, params.lightnessMid, params.opacityBase, params.opacityRange, progress),
        strokeWidth: 0.65 + rng2() * 0.7,
        strokeLinecap: 'round',
        strokeLinejoin: 'round'
      }
    });
  }

  return primitives;
}

// ─── Pattern 14: Hexagonal grid ───────────────────────────────────────────────

export function generateHexGridScene(width: number, height: number, params: FractalParams): Primitive[] {
  const primitives: Primitive[] = [];
  const rng = makeRng(params.seed);

  const cellR = 16 + Math.floor(rng() * 38);
  const colStep = cellR * 1.5;
  const rowStep = cellR * Math.sqrt(3);
  const cols = Math.ceil(width / colStep) + 2;
  const rows = Math.ceil(height / rowStep) + 2;

  const hexPts = (cx: number, cy: number, r: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (i * 60 + 30) * Math.PI / 180;
      return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
    }).join(' ');

  const style = Math.floor(rng() * 3);
  const waveFreq = 0.008 + rng() * 0.016;
  const wavePhase = rng() * Math.PI * 2;

  let idx = 0;
  for (let col = -1; col < cols; col++) {
    for (let row = -1; row < rows; row++) {
      const x = col * colStep;
      const y = row * rowStep + (col % 2 !== 0 ? rowStep / 2 : 0);

      const wave = Math.sin(x * waveFreq + wavePhase) * 0.5 + Math.cos(y * waveFreq * 0.7) * 0.5;
      const progress = Math.max(0, Math.min(1, (wave + 1) / 2));

      const color = branchColor(params.hue, params.hue2, params.saturation, params.lightnessMid, params.opacityBase, params.opacityRange, progress);
      const fillColor = branchColor(params.hue, params.hue2, params.saturation, params.lightnessMid, params.opacityBase * 0.28, params.opacityRange * 0.4, progress);

      const pts = hexPts(x, y, cellR - 0.8);
      const key = `hx${idx++}`;

      if (style === 0) {
        primitives.push({
          type: 'polygon',
          key,
          attributes: {
            points: pts,
            fill: 'none', stroke: color, strokeWidth: 0.7
          }
        });
      } else if (style === 1) {
        primitives.push({
          type: 'polygon',
          key,
          attributes: {
            points: pts,
            fill: fillColor, stroke: color, strokeWidth: 0.5
          }
        });
      } else {
        const dotR = cellR * (0.08 + Math.abs(wave) * 0.1);
        primitives.push({
          type: 'circle',
          key,
          attributes: {
            cx: x, cy: y, r: Math.max(0.5, dotR),
            fill: color
          }
        });
      }
    }
  }

  return primitives;
}

// ─── Pattern 15: Spirograph (hypotrochoid) ───────────────────────────────────

export function generateSpirographScene(width: number, height: number, params: FractalParams): Primitive[] {
  const primitives: Primitive[] = [];
  const rng = makeRng(params.seed);
  const rng2 = makeRng(params.seed2);

  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.min(width, height) * 0.44;

  const ratioSets: [number, number][] = [
    [5, 3], [7, 4], [8, 5], [11, 6], [9, 5],
    [7, 3], [13, 7], [5, 2], [11, 4], [6, 5],
    [7, 5], [9, 4], [10, 3], [13, 5], [8, 3],
    [11, 3], [12, 5], [15, 7], [7, 2], [9, 2],
  ];

  const count = 1 + Math.floor(rng() * 3);

  for (let k = 0; k < count; k++) {
    const [Rr, rr] = ratioSets[Math.floor(rng() * ratioSets.length)];
    const R = maxR * (0.52 + rng() * 0.48);
    const r = R * (rr / Rr);
    const d = r * (0.35 + rng2() * 1.2);

    const loops = lcmInt(Rr, rr) / rr;
    const STEPS = Math.min(3200, loops * 80);

    const pts: string[] = [];
    for (let i = 0; i <= STEPS; i++) {
      const t = (i / STEPS) * loops * 2 * Math.PI;
      const x = cx + (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
      const y = cy + (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }

    const progress = k / Math.max(count - 1, 1);
    primitives.push({
      type: 'polyline',
      key: `sg${k}`,
      attributes: {
        points: pts.join(' '),
        fill: 'none',
        stroke: branchColor(params.hue, params.hue2, params.saturation, params.lightnessMid, params.opacityBase, params.opacityRange, progress),
        strokeWidth: 0.65 + rng2() * 0.55,
        strokeLinecap: 'round',
        strokeLinejoin: 'round'
      }
    });
  }

  return primitives;
}

// ─── Pattern 16: Barnsley Fern ────────────────────────────────────────────────

export function generateBarnsleyScene(width: number, height: number, params: FractalParams): Primitive[] {
  const primitives: Primitive[] = [];
  const rng = makeRng(params.seed);

  const scale = height * 0.88 / 10;
  const ox = width / 2 - 0.35 * scale;
  const oy = height * 0.97;

  const fernCount = 1 + Math.floor(rng() * 2);
  for (let fi = 0; fi < fernCount; fi++) {
    const dxOff = (fi - (fernCount - 1) / 2) * width * 0.28;
    let x = 0, y = 0;
    const pts: [number, number][] = [];

    for (let i = 0; i < 9000; i++) {
      const r = rng();
      let nx: number, ny: number;
      if (r < 0.01)       { nx = 0;                          ny = 0.16 * y }
      else if (r < 0.86)  { nx = 0.85 * x + 0.04 * y;       ny = -0.04 * x + 0.85 * y + 1.6 }
      else if (r < 0.93)  { nx = 0.20 * x - 0.26 * y;       ny = 0.23 * x + 0.22 * y + 1.6 }
      else                { nx = -0.15 * x + 0.28 * y;       ny = 0.26 * x + 0.24 * y + 0.44 }
      x = nx; y = ny;
      if (i >= 50) pts.push([ox + dxOff + x * scale, oy - y * scale]);
    }

    const step = Math.max(1, Math.floor(pts.length / 700));
    for (let i = 0; i < pts.length; i += step) {
      const [px, py] = pts[i];
      const progress = i / pts.length;
      primitives.push({
        type: 'circle',
        key: `bf${fi}-${i}`,
        attributes: {
          cx: px.toFixed(1), cy: py.toFixed(1), r: 0.85,
          fill: branchColor(params.hue, params.hue2, params.saturation, params.lightnessMid, params.opacityBase, params.opacityRange, progress)
        }
      });
    }
  }
  return primitives;
}

// ─── Pattern 17: Rose curves ─────────────────────────────────────────────────

export function generateRoseScene(width: number, height: number, params: FractalParams): Primitive[] {
  const primitives: Primitive[] = [];
  const rng = makeRng(params.seed);
  const rng2 = makeRng(params.seed2);

  const count = 2 + Math.floor(rng() * 3);
  const kOptions: [number, number][] = [
    [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1],
    [3, 2], [5, 2], [7, 2],
    [4, 3], [5, 3], [7, 3], [8, 3],
    [5, 4], [7, 4], [9, 4],
  ];

  for (let ci = 0; ci < count; ci++) {
    const [n, d] = kOptions[Math.floor(rng() * kOptions.length)];
    const k = n / d;
    const cx = width * (0.15 + rng() * 0.70);
    const cy = height * (0.15 + rng() * 0.70);
    const maxR = Math.min(width, height) * (0.14 + rng() * 0.26);
    const period = Math.PI * 2 * d;
    const STEPS = Math.min(800, 200 * d);
    const pts: string[] = [];
    
    for (let i = 0; i <= STEPS; i++) {
      const theta = (i / STEPS) * period;
      const r = Math.cos(k * theta) * maxR;
      pts.push(`${(cx + r * Math.cos(theta)).toFixed(1)},${(cy + r * Math.sin(theta)).toFixed(1)}`);
    }

    const progress = ci / Math.max(count - 1, 1);
    primitives.push({
      type: 'polyline',
      key: `rose${ci}`,
      attributes: {
        points: pts.join(' '),
        fill: 'none',
        stroke: branchColor(params.hue, params.hue2, params.saturation, params.lightnessMid, params.opacityBase + 0.05, params.opacityRange, progress),
        strokeWidth: 0.7 + rng2() * 1.4,
        strokeLinecap: 'round',
        strokeLinejoin: 'round'
      }
    });
  }
  return primitives;
}

// ─── Pattern 18: Islamic star tiling ─────────────────────────────────────────

export function generateIslamicScene(width: number, height: number, params: FractalParams): Primitive[] {
  const primitives: Primitive[] = [];
  const rng = makeRng(params.seed);

  const starN = ([6, 8, 12] as const)[Math.floor(rng() * 3)];
  const cellSize = 55 + Math.floor(rng() * 65);
  const outerR = cellSize * 0.44;
  const innerR = outerR * (0.32 + rng() * 0.26);
  const baseRot = rng() * (Math.PI / starN);

  const hexPack = starN === 6;
  const cols = Math.ceil(width / cellSize) + 2;
  const rows = Math.ceil(height / cellSize) + 2;

  for (let row = -1; row < rows; row++) {
    for (let col = -1; col < cols; col++) {
      const cx = col * cellSize + (hexPack && row % 2 === 1 ? cellSize / 2 : 0);
      const cy = row * cellSize;
      const progress = ((row + 1) / (rows + 1) + (col + 1) / (cols + 1)) / 2;

      const pts: string[] = [];
      for (let i = 0; i < starN * 2; i++) {
        const angle = (i * Math.PI / starN) + baseRot;
        const r = i % 2 === 0 ? outerR : innerR;
        pts.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`);
      }

      primitives.push({
        type: 'polygon',
        key: `is${row}-${col}`,
        attributes: {
          points: pts.join(' '),
          fill: 'none',
          stroke: branchColor(params.hue, params.hue2, params.saturation, params.lightnessMid, params.opacityBase, params.opacityRange, progress),
          strokeWidth: 0.75,
          strokeLinejoin: 'round'
        }
      });
    }
  }
  return primitives;
}

// ─── Pattern 19: Crystal lattice ─────────────────────────────────────────────

export function generateCrystalScene(width: number, height: number, params: FractalParams): Primitive[] {
  const primitives: Primitive[] = [];
  const rng = makeRng(params.seed);

  const cellW = 38 + Math.floor(rng() * 52);
  const aspect = 0.5 + rng() * 0.7;
  const cellH = Math.round(cellW * aspect);
  const cols = Math.ceil(width / cellW) + 2;
  const rows = Math.ceil(height / cellH) + 2;

  const innerRatio = 0.45 + rng() * 0.25;

  for (let row = -1; row < rows; row++) {
    for (let col = -1; col < cols; col++) {
      const cx = col * cellW + (row % 2 !== 0 ? cellW / 2 : 0);
      const cy = row * cellH;

      const hw = cellW * 0.46;
      const hh = cellH * 0.46;
      const progress = ((row + 1) * (cols + 2) + (col + 1)) / ((rows + 2) * (cols + 2));
      const color = branchColor(params.hue, params.hue2, params.saturation, params.lightnessMid, params.opacityBase, params.opacityRange, progress);
      const colorInner = branchColor(params.hue2, params.hue, params.saturation * 0.85, params.lightnessMid, params.opacityBase * 0.6, params.opacityRange * 0.7, 1 - progress);

      // Outer diamond
      primitives.push({
        type: 'polygon',
        key: `cr${row}-${col}`,
        attributes: {
          points: `${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`,
          fill: 'none', stroke: color, strokeWidth: 0.8
        }
      });

      // Inner diamond
      const iw = hw * innerRatio, ih = hh * innerRatio;
      primitives.push({
        type: 'polygon',
        key: `ci${row}-${col}`,
        attributes: {
          points: `${cx},${cy - ih} ${cx + iw},${cy} ${cx},${cy + ih} ${cx - iw},${cy}`,
          fill: 'none', stroke: colorInner, strokeWidth: 0.5
        }
      });
    }
  }
  return primitives;
}

// ─── Pattern 20: De Jong strange attractor ──────────────────────────────────

export function generateAttractorScene(width: number, height: number, params: FractalParams): Primitive[] {
  const primitives: Primitive[] = [];
  const rng = makeRng(params.seed);

  // Coefficients in [-3, 3] give the richest De Jong portraits.
  const a = rng() * 6 - 3, b = rng() * 6 - 3;
  const c = rng() * 6 - 3, d = rng() * 6 - 3;

  const cx = width / 2, cy = height / 2;
  const scale = Math.min(width, height) * 0.23; // De Jong output stays within [-2, 2]
  const N = 14000;

  let x = 0, y = 0;
  for (let i = 0; i < N; i++) {
    const nx = Math.sin(a * y) - Math.cos(b * x);
    const ny = Math.sin(c * x) - Math.cos(d * y);
    x = nx; y = ny;
    if (i < 100 || i % 3 !== 0) continue; // let it settle, then thin out the cloud
    const progress = i / N;
    primitives.push({
      type: 'circle',
      key: `at${i}`,
      attributes: {
        cx: (cx + x * scale).toFixed(1), cy: (cy + y * scale).toFixed(1), r: 0.55,
        fill: branchColor(params.hue, params.hue2, params.saturation, params.lightnessMid, params.opacityBase * 0.8, params.opacityRange, progress)
      }
    });
  }
  return primitives;
}

// ─── Pattern 21: Harmonograph ────────────────────────────────────────────────

export function generateHarmonographScene(width: number, height: number, params: FractalParams): Primitive[] {
  const primitives: Primitive[] = [];
  const rng = makeRng(params.seed);
  const rng2 = makeRng(params.seed2);

  const cx = width / 2, cy = height / 2;
  const Ax = width * 0.22, Ay = height * 0.22;
  const STEPS = 2200;
  const count = 2 + Math.floor(rng() * 3);

  // Near-integer frequencies with a tiny detune produce the classic drifting figure.
  const nearInt = () => (1 + Math.floor(rng() * 4)) + (rng() - 0.5) * 0.04;

  for (let k = 0; k < count; k++) {
    const f1 = nearInt(), f2 = nearInt(), f3 = nearInt(), f4 = nearInt();
    const p1 = rng() * Math.PI * 2, p2 = rng() * Math.PI * 2;
    const p3 = rng() * Math.PI * 2, p4 = rng() * Math.PI * 2;
    const d1 = 0.002 + rng() * 0.005, d2 = 0.002 + rng() * 0.005;
    const d3 = 0.002 + rng() * 0.005, d4 = 0.002 + rng() * 0.005;
    const span = 24 * Math.PI;

    const pts: string[] = [];
    for (let i = 0; i <= STEPS; i++) {
      const t = (i / STEPS) * span;
      const x = cx + Ax * (Math.sin(f1 * t + p1) * Math.exp(-d1 * t) + Math.sin(f2 * t + p2) * Math.exp(-d2 * t)) * 0.5;
      const y = cy + Ay * (Math.sin(f3 * t + p3) * Math.exp(-d3 * t) + Math.sin(f4 * t + p4) * Math.exp(-d4 * t)) * 0.5;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }

    const progress = k / Math.max(count - 1, 1);
    primitives.push({
      type: 'polyline',
      key: `hg${k}`,
      attributes: {
        points: pts.join(' '),
        fill: 'none',
        stroke: branchColor(params.hue, params.hue2, params.saturation, params.lightnessMid, params.opacityBase, params.opacityRange, progress),
        strokeWidth: 0.6 + rng2() * 0.6,
        strokeLinecap: 'round',
        strokeLinejoin: 'round'
      }
    });
  }
  return primitives;
}

// ─── Pattern 22: Apollonian gasket ───────────────────────────────────────────

type Complex = [number, number];
const cAdd = (a: Complex, b: Complex): Complex => [a[0] + b[0], a[1] + b[1]];
const cSub = (a: Complex, b: Complex): Complex => [a[0] - b[0], a[1] - b[1]];
const cMul = (a: Complex, b: Complex): Complex => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cScale = (a: Complex, s: number): Complex => [a[0] * s, a[1] * s];
function cSqrt(a: Complex): Complex {
  const r = Math.hypot(a[0], a[1]);
  const re = Math.sqrt((r + a[0]) / 2);
  const im = (a[1] < 0 ? -1 : 1) * Math.sqrt(Math.max(0, (r - a[0]) / 2));
  return [re, im];
}

interface Gcircle { b: number; z: Complex } // b = signed curvature (1/r), z = centre

export function generateApollonianScene(width: number, height: number, params: FractalParams): Primitive[] {
  const primitives: Primitive[] = [];
  const cx = width / 2, cy = height / 2;
  const scale = Math.min(width, height) * 0.47;
  const minR = 0.012; // stop recursing below this normalised radius
  const maxDepth = Math.min(params.maxDepth, 10);

  const ringFor = (g: Gcircle, depth: number): Primitive => {
    const r = 1 / Math.abs(g.b);
    const progress = Math.min(1, depth / maxDepth);
    return {
      type: 'circle',
      key: `ap${g.z[0].toFixed(3)}-${g.z[1].toFixed(3)}-${r.toFixed(3)}`,
      attributes: {
        cx: (cx + g.z[0] * scale).toFixed(1),
        cy: (cy + g.z[1] * scale).toFixed(1),
        r: (r * scale).toFixed(1),
        fill: 'none',
        stroke: branchColor(params.hue, params.hue2, params.saturation, params.lightnessMid, params.opacityBase + 0.05, params.opacityRange, progress),
        strokeWidth: Math.max(0.3, 1.4 - progress * 1.0)
      }
    };
  };

  // Outer enclosing circle (negative curvature) + two equal circles inside it.
  const c0: Gcircle = { b: -1, z: [0, 0] };
  const c1: Gcircle = { b: 2, z: [-0.5, 0] };
  const c2: Gcircle = { b: 2, z: [0.5, 0] };
  primitives.push(ringFor(c0, 0));
  primitives.push(ringFor(c1, 1));
  primitives.push(ringFor(c2, 1));

  // Descartes' theorem: the two circles tangent to c0, c1, c2.
  const sumB = c0.b + c1.b + c2.b;
  const rootB = 2 * Math.sqrt(Math.abs(c0.b * c1.b + c1.b * c2.b + c2.b * c0.b));
  const bz = cAdd(cAdd(cScale(c0.z, c0.b), cScale(c1.z, c1.b)), cScale(c2.z, c2.b));
  const p12 = cScale(cMul(c0.z, c1.z), c0.b * c1.b);
  const p23 = cScale(cMul(c1.z, c2.z), c1.b * c2.b);
  const p31 = cScale(cMul(c2.z, c0.z), c2.b * c0.b);
  const rootZ = cScale(cSqrt(cAdd(cAdd(p12, p23), p31)), 2);

  // Reflect one circle of a tangent quadruple across the other three (no sqrt needed).
  const gasket = (a: Gcircle, b: Gcircle, c: Gcircle, d: Gcircle, depth: number): void => {
    if (depth >= maxDepth) return;
    const triples: [Gcircle, Gcircle, Gcircle, Gcircle][] = [
      [b, c, d, a], [a, c, d, b], [a, b, d, c],
    ];
    for (const [x, y, z, old] of triples) {
      const nb = 2 * (x.b + y.b + z.b) - old.b;
      if (!isFinite(nb) || nb === 0) continue;
      const nbz = cSub(
        cScale(cAdd(cAdd(cScale(x.z, x.b), cScale(y.z, y.b)), cScale(z.z, z.b)), 2),
        cScale(old.z, old.b)
      );
      const nc: Gcircle = { b: nb, z: cScale(nbz, 1 / nb) };
      if (1 / Math.abs(nb) < minR) continue;
      primitives.push(ringFor(nc, depth + 1));
      gasket(x, y, z, nc, depth + 1);
    }
  };

  for (const sign of [1, -1]) {
    const b3 = sumB + sign * rootB;
    const z3 = cScale(cAdd(bz, cScale(rootZ, sign)), 1 / b3);
    const c3: Gcircle = { b: b3, z: z3 };
    primitives.push(ringFor(c3, 1));
    gasket(c0, c1, c2, c3, 1);
  }
  return primitives;
}

// ─── Pattern 23: Pythagoras tree ─────────────────────────────────────────────

export function generatePythagorasScene(width: number, height: number, params: FractalParams): Primitive[] {
  const primitives: Primitive[] = [];
  const depth = Math.min(params.maxDepth, 11);
  // Split angle of the right triangle on top of each square (drives the lean).
  const alphaBase = Math.max(15, Math.min(70, params.angleVar)) * Math.PI / 180;
  const lean = (params.asymmetry - 0.3) * 0.5; // bias left/right children asymmetrically

  // Recurse on the top edge (a → b) of each square; squares grow "up" (toward -y).
  const branch = (ax: number, ay: number, bx: number, by: number, d: number): void => {
    if (d <= 0) return;
    const dx = bx - ax, dy = by - ay;
    // Up-normal (rotate edge by -90°): square sits above the a→b edge.
    const cx2 = bx + dy, cy2 = by - dx;
    const dx2 = ax + dy, dy2 = ay - dx;

    const progress = 1 - d / depth;
    primitives.push({
      type: 'polygon',
      key: `py${d}-${ax.toFixed(0)}-${ay.toFixed(0)}-${bx.toFixed(0)}`,
      attributes: {
        points: `${ax.toFixed(1)},${ay.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)} ${cx2.toFixed(1)},${cy2.toFixed(1)} ${dx2.toFixed(1)},${dy2.toFixed(1)}`,
        fill: branchColor(params.hue, params.hue2, params.saturation, params.lightnessMid, params.opacityBase * 0.5, params.opacityRange * 0.6, progress),
        stroke: branchColor(params.hue, params.hue2, params.saturation, params.lightnessMid, params.opacityBase, params.opacityRange, progress),
        strokeWidth: Math.max(0.3, d * 0.25)
      }
    });

    // Apex of the right triangle on the top edge d2 → c2. The perpendicular term
    // points along the square's outward normal (tdy, -tdx) so the tree grows away
    // from the base instead of collapsing inward.
    const alpha = alphaBase + lean;
    const ca = Math.cos(alpha), sa = Math.sin(alpha);
    const tdx = cx2 - dx2, tdy = cy2 - dy2;
    const ex = dx2 + tdx * ca * ca + tdy * ca * sa;
    const ey = dy2 + tdy * ca * ca - tdx * ca * sa;

    branch(dx2, dy2, ex, ey, d - 1); // left child on the top-left edge
    branch(ex, ey, cx2, cy2, d - 1); // right child on the top-right edge
  };

  const base = Math.min(width, height) * 0.16;
  const startX = width / 2 - base / 2;
  const startY = height * 0.96;
  branch(startX, startY, startX + base, startY, depth);

  return primitives;
}

// ─── Main Export Function ─────────────────────────────────────────────────────

export function generateFractalPrimitives(width: number, height: number, params: FractalParams): Primitive[] {
  switch (params.type) {
    case 'tree': return generateTreeScene(width, height, params);
    case 'koch': return generateKochScene(width, height, params);
    case 'sierpinski': return generateSierpinskiScene(width, height, params);
    case 'dragon': return generateDragonScene(width, height, params);
    case 'lsystem': return generateLSystemScene(width, height, params);
    case 'spiral': return generateSpiralScene(width, height, params);
    case 'constellation': return generateConstellationScene(width, height, params);
    case 'truchet': return generateTruchetScene(width, height, params);
    case 'waves': return generateWavesScene(width, height, params);
    case 'flowfield': return generateFlowFieldScene(width, height, params);
    case 'kaleidoscope': return generateKaleidoscopeScene(width, height, params);
    case 'mandala': return generateMandalaScene(width, height, params);
    case 'lissajous': return generateLissajousScene(width, height, params);
    case 'hexgrid': return generateHexGridScene(width, height, params);
    case 'spirograph': return generateSpirographScene(width, height, params);
    case 'barnsley': return generateBarnsleyScene(width, height, params);
    case 'rose': return generateRoseScene(width, height, params);
    case 'islamic': return generateIslamicScene(width, height, params);
    case 'crystal': return generateCrystalScene(width, height, params);
    case 'attractor': return generateAttractorScene(width, height, params);
    case 'harmonograph': return generateHarmonographScene(width, height, params);
    case 'apollonian': return generateApollonianScene(width, height, params);
    case 'pythagoras': return generatePythagorasScene(width, height, params);
    default: return [];
  }
}

// ─── Parameter Generation ─────────────────────────────────────────────────────

const FRACTAL_POOL: FractalType[] = [
  'tree', 'tree', 'tree', 'spiral', 'spiral', 'spiral',
  'constellation', 'constellation', 'constellation', 'truchet', 'truchet', 'truchet',
  'waves', 'waves', 'waves', 'flowfield', 'flowfield', 'flowfield', 'lsystem', 'lsystem',
  'dragon', 'sierpinski', 'koch', 'kaleidoscope', 'kaleidoscope', 'kaleidoscope', 'kaleidoscope',
  'mandala', 'mandala', 'mandala', 'spirograph', 'spirograph', 'spirograph', 'lissajous', 'lissajous',
  'hexgrid', 'hexgrid', 'rose', 'rose', 'rose', 'islamic', 'islamic', 'islamic', 'crystal', 'crystal',
  'barnsley', 'barnsley',
  'attractor', 'attractor', 'harmonograph', 'harmonograph',
  'apollonian', 'apollonian', 'pythagoras', 'pythagoras',
];

// Pass `seed` for a reproducible result; omit it for a random one.
export function generateFractalParams(seed: number = Math.random()): FractalParams {
  const rng = makeRng(seed);
  const seed2 = rng();

  const type = FRACTAL_POOL[Math.floor(rng() * FRACTAL_POOL.length)];
  const hue = rng() * 360;
  const hue2 = (hue + rng() * 200 - 100 + 360) % 360;
  const saturation = rng() * 35 + 18;
  const lightnessMid = rng() * 22 + 20;
  const opacityBase = rng() * 0.18 + 0.10;
  const opacityRange = rng() * 0.5 + 0.3;
  const angleVar = rng() * 45 + 5;
  const asymmetry = rng() * 0.6;
  const curlFactor = (rng() - 0.5) * 8;
  const lengthReduction = rng() * 0.18 + 0.60;
  const maxDepth = 9 + Math.floor(rng() * 4);
  const treeCount = 2 + Math.floor(rng() * 5);
  
  const treeOriginRoll = rng();
  const treeOrigin = treeOriginRoll < 0.50 ? 0
    : treeOriginRoll < 0.60 ? 1
    : treeOriginRoll < 0.80 ? 3
    : 4;

  const kochVariant = Math.floor(rng() * 4);
  const dragonScale = rng() * 0.12 + 0.88;
  const lSystemIdx = Math.floor(rng() * 8);
  const lSystemAngle = rng() * 30 + 12;
  const spiralN = 900 + Math.floor(rng() * 900);
  const constCount = 70 + Math.floor(rng() * 90);

  const kaleidoFolds = [4, 5, 6, 8, 10, 12];
  const kaleidoFold = kaleidoFolds[Math.floor(rng() * kaleidoFolds.length)];

  return {
    type, hue, hue2, saturation, lightnessMid, opacityBase, opacityRange,
    angleVar, asymmetry, curlFactor, lengthReduction, maxDepth, treeCount, treeOrigin,
    seed, seed2, kochVariant, dragonScale, lSystemIdx, lSystemAngle, spiralN, constCount, kaleidoFold,
  };
}
