import { describe, it, expect } from 'vitest';
import {
  generateFractalParams,
  generateFractalPrimitives,
  type FractalType,
  type Primitive,
} from '../src/fractal-core';

const ALL_TYPES: FractalType[] = [
  'tree', 'koch', 'sierpinski', 'dragon', 'lsystem', 'spiral', 'constellation',
  'truchet', 'waves', 'flowfield', 'kaleidoscope', 'mandala', 'lissajous', 'hexgrid',
  'spirograph', 'barnsley', 'rose', 'islamic', 'crystal',
  'attractor', 'harmonograph', 'apollonian', 'pythagoras',
];

const W = 1200, H = 800;

// A numeric attribute is bad if it is non-finite, or serialised to a string that
// encodes a non-finite value (e.g. toFixed(NaN) === "NaN").
function hasBadNumbers(prims: Primitive[]): boolean {
  for (const p of prims) {
    for (const v of Object.values(p.attributes)) {
      if (typeof v === 'number' && !Number.isFinite(v)) return true;
      if (typeof v === 'string' && /NaN|Infinity|undefined/.test(v)) return true;
    }
  }
  return false;
}

describe('generateFractalParams', () => {
  it('is deterministic for a given seed', () => {
    expect(generateFractalParams(42)).toEqual(generateFractalParams(42));
  });

  it('produces different output for different seeds', () => {
    expect(generateFractalParams(1)).not.toEqual(generateFractalParams(2));
  });
});

describe('generateFractalPrimitives', () => {
  it('is deterministic for given params', () => {
    const params = generateFractalParams(7);
    expect(generateFractalPrimitives(W, H, params)).toEqual(
      generateFractalPrimitives(W, H, params),
    );
  });

  for (const type of ALL_TYPES) {
    describe(`type: ${type}`, () => {
      // Sweep seeds so we exercise each generator's branches.
      const scenes = Array.from({ length: 8 }, (_, i) => {
        const params = { ...generateFractalParams(i * 11 + 3), type };
        return generateFractalPrimitives(W, H, params);
      });

      it('returns at least one primitive', () => {
        for (const scene of scenes) expect(scene.length).toBeGreaterThan(0);
      });

      it('never emits NaN/Infinity coordinates', () => {
        for (const scene of scenes) expect(hasBadNumbers(scene)).toBe(false);
      });

      it('emits non-empty keys and known primitive types', () => {
        const known = new Set(['line', 'circle', 'path', 'polygon', 'polyline']);
        for (const scene of scenes) {
          for (const p of scene) {
            expect(typeof p.key).toBe('string');
            expect(p.key.length).toBeGreaterThan(0);
            expect(known.has(p.type)).toBe(true);
          }
        }
      });
    });
  }
});
