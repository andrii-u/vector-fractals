// Renders all fractal types into a single HTML grid for visual inspection.
import { writeFileSync } from 'node:fs';
import { generateFractalParams, generateFractalPrimitives } from '../dist/index.js';

const TYPES = [
  'tree', 'koch', 'sierpinski', 'dragon', 'lsystem', 'spiral', 'constellation',
  'truchet', 'waves', 'flowfield', 'kaleidoscope', 'mandala', 'lissajous', 'hexgrid',
  'spirograph', 'barnsley', 'rose', 'islamic', 'crystal',
  'attractor', 'harmonograph', 'apollonian', 'pythagoras',
];

const W = 480, H = 320;
const kebab = (k) => k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

function svgFor(type) {
  // Seed chosen per type so colours are visible on a dark card.
  const params = { ...generateFractalParams(7), type, saturation: 55, lightnessMid: 60, opacityBase: 0.5, opacityRange: 0.45 };
  const prims = generateFractalPrimitives(W, H, params);
  const body = prims.map((p) => {
    const attrs = Object.entries(p.attributes)
      .map(([k, v]) => `${kebab(k)}="${v}"`).join(' ');
    return `<${p.type} ${attrs} />`;
  }).join('');
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`;
}

const cards = TYPES.map((t) => `
  <figure>
    <div class="art">${svgFor(t)}</div>
    <figcaption>${t} <small>(${generateFractalPrimitives(W, H, { ...generateFractalParams(7), type: t }).length} prims)</small></figcaption>
  </figure>`).join('');

const html = `<!doctype html><html><head><meta charset="utf-8"><title>vector-fractals sandbox</title>
<style>
  body { background:#0b0e14; color:#cbd5e1; font:14px system-ui; margin:0; padding:20px; }
  h1 { font-weight:600; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(480px,1fr)); gap:16px; }
  figure { margin:0; background:#11151f; border:1px solid #1e2636; border-radius:8px; overflow:hidden; }
  .art { background:#0b0e14; }
  figcaption { padding:8px 12px; }
  small { color:#64748b; }
</style></head><body>
<h1>vector-fractals — all ${TYPES.length} types (seed 7)</h1>
<div class="grid">${cards}</div>
</body></html>`;

writeFileSync(new URL('./index.html', import.meta.url), html);
console.log('wrote sandbox/index.html');
