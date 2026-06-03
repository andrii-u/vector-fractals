// React adapter — turns Primitive[] into SVG React elements.
import React from 'react';
import {
  generateFractalPrimitives,
  Primitive,
  FractalParams,
  FractalType
} from './fractal-core';

/**
 * Converts a platform-agnostic primitive to a React SVG element
 */
export function primitiveToReactElement(primitive: Primitive): React.ReactElement {
  const { type, key, attributes } = primitive;

  // React 19: `key` must be passed directly, not spread, so keep it out of attributes.
  switch (type) {
    case 'line':
      return <line key={key} {...attributes} />;
    case 'circle':
      return <circle key={key} {...attributes} />;
    case 'path':
      return <path key={key} {...attributes} />;
    case 'polygon':
      return <polygon key={key} {...attributes} />;
    case 'polyline':
      return <polyline key={key} {...attributes} />;
    default:
      return <></>;
  }
}

/**
 * Main function to generate fractal scene as React elements
 */
export function buildFractal(width: number, height: number, params: FractalParams): React.ReactElement[] {
  const primitives = generateFractalPrimitives(width, height, params);
  return primitives.map(primitiveToReactElement);
}

// Per-type convenience builders.
export function buildTree(width: number, height: number, params: FractalParams): React.ReactElement[] {
  return buildFractal(width, height, { ...params, type: 'tree' });
}

export function buildKoch(width: number, height: number, params: FractalParams): React.ReactElement[] {
  return buildFractal(width, height, { ...params, type: 'koch' });
}

export function buildSierpinskiScene(width: number, height: number, params: FractalParams): React.ReactElement[] {
  return buildFractal(width, height, { ...params, type: 'sierpinski' });
}

export function buildDragon(width: number, height: number, params: FractalParams): React.ReactElement[] {
  return buildFractal(width, height, { ...params, type: 'dragon' });
}

export function buildLSystem(width: number, height: number, params: FractalParams): React.ReactElement[] {
  return buildFractal(width, height, { ...params, type: 'lsystem' });
}

export function buildSpiral(width: number, height: number, params: FractalParams): React.ReactElement[] {
  return buildFractal(width, height, { ...params, type: 'spiral' });
}

export function buildConstellation(width: number, height: number, params: FractalParams): React.ReactElement[] {
  return buildFractal(width, height, { ...params, type: 'constellation' });
}

export function buildTruchet(width: number, height: number, params: FractalParams): React.ReactElement[] {
  return buildFractal(width, height, { ...params, type: 'truchet' });
}

export function buildWaves(width: number, height: number, params: FractalParams): React.ReactElement[] {
  return buildFractal(width, height, { ...params, type: 'waves' });
}

export function buildFlowField(width: number, height: number, params: FractalParams): React.ReactElement[] {
  return buildFractal(width, height, { ...params, type: 'flowfield' });
}

export function buildKaleidoscope(width: number, height: number, params: FractalParams): React.ReactElement[] {
  return buildFractal(width, height, { ...params, type: 'kaleidoscope' });
}

export function buildMandala(width: number, height: number, params: FractalParams): React.ReactElement[] {
  return buildFractal(width, height, { ...params, type: 'mandala' });
}

export function buildLissajous(width: number, height: number, params: FractalParams): React.ReactElement[] {
  return buildFractal(width, height, { ...params, type: 'lissajous' });
}

export function buildHexGrid(width: number, height: number, params: FractalParams): React.ReactElement[] {
  return buildFractal(width, height, { ...params, type: 'hexgrid' });
}

export function buildSpirograph(width: number, height: number, params: FractalParams): React.ReactElement[] {
  return buildFractal(width, height, { ...params, type: 'spirograph' });
}

export function buildBarnsley(width: number, height: number, params: FractalParams): React.ReactElement[] {
  return buildFractal(width, height, { ...params, type: 'barnsley' });
}

export function buildRose(width: number, height: number, params: FractalParams): React.ReactElement[] {
  return buildFractal(width, height, { ...params, type: 'rose' });
}

export function buildIslamic(width: number, height: number, params: FractalParams): React.ReactElement[] {
  return buildFractal(width, height, { ...params, type: 'islamic' });
}

export function buildCrystal(width: number, height: number, params: FractalParams): React.ReactElement[] {
  return buildFractal(width, height, { ...params, type: 'crystal' });
}

export function buildAttractor(width: number, height: number, params: FractalParams): React.ReactElement[] {
  return buildFractal(width, height, { ...params, type: 'attractor' });
}

export function buildHarmonograph(width: number, height: number, params: FractalParams): React.ReactElement[] {
  return buildFractal(width, height, { ...params, type: 'harmonograph' });
}

export function buildApollonian(width: number, height: number, params: FractalParams): React.ReactElement[] {
  return buildFractal(width, height, { ...params, type: 'apollonian' });
}

export function buildPythagoras(width: number, height: number, params: FractalParams): React.ReactElement[] {
  return buildFractal(width, height, { ...params, type: 'pythagoras' });
}
