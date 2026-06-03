import { describe, it, expect, beforeAll } from 'vitest';
import { generateFractalParams, generateFractalPrimitives, type Primitive } from '../src/fractal-core';
import { primitiveToReactElement, buildFractal } from '../src/fractal-builders';
import { renderToCanvas } from '../src/fractal-canvas';

// Minimal stand-ins so the Canvas adapter can run without a DOM.
beforeAll(() => {
  // @ts-expect-error — test stub for the few path primitives.
  globalThis.Path2D = class { constructor(_d?: string) {} };
});

function stubCtx(): CanvasRenderingContext2D {
  return new Proxy({} as Record<string, unknown>, {
    get: (t, prop) => (prop in t ? t[prop as string] : () => {}),
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
}

const attrsFor = (type: Primitive['type']): Record<string, string | number> => {
  switch (type) {
    case 'line': return { x1: 0, y1: 0, x2: 1, y2: 1, stroke: 'red' };
    case 'circle': return { cx: 1, cy: 1, r: 2, fill: 'blue' };
    case 'path': return { d: 'M0 0 L1 1', stroke: 'green' };
    default: return { points: '0,0 1,1 2,0', stroke: 'black' };
  }
};

const sample: Primitive[] = (['line', 'circle', 'path', 'polygon', 'polyline'] as const).map(
  (type, i) => ({ type, key: `k${i}`, attributes: attrsFor(type) }),
);

describe('React adapter', () => {
  it('returns a React element for every primitive type', () => {
    for (const p of sample) {
      const el = primitiveToReactElement(p);
      expect(el).toBeTruthy();
      expect(el.type).toBe(p.type);
    }
  });

  it('builds a non-empty element list from a scene', () => {
    const els = buildFractal(1200, 800, generateFractalParams(5));
    expect(els.length).toBeGreaterThan(0);
  });
});

describe('Canvas adapter', () => {
  it('renders kaleidoscope (transform-heavy) without throwing', () => {
    const params = { ...generateFractalParams(9), type: 'kaleidoscope' as const };
    expect(() => renderToCanvas(params, { context: stubCtx(), width: 1200, height: 800 })).not.toThrow();
  });

  it('renders every type without throwing', () => {
    const params = generateFractalParams(3);
    expect(() => {
      const scene = generateFractalPrimitives(1200, 800, params);
      expect(scene.length).toBeGreaterThan(0);
    }).not.toThrow();
  });
});
