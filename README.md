# @andrii-u/vector-fractals

Generate beautiful vector fractals and generative patterns as **platform-agnostic
primitives**, then render them anywhere. The core has no dependencies and no DOM; thin
adapters turn the primitives into React SVG elements or draw them onto a Canvas 2D context.

23 pattern types: `tree`, `koch`, `sierpinski`, `dragon`, `lsystem`, `spiral`,
`constellation`, `truchet`, `waves`, `flowfield`, `kaleidoscope`, `mandala`, `lissajous`,
`hexgrid`, `spirograph`, `barnsley`, `rose`, `islamic`, `crystal`, `attractor`,
`harmonograph`, `apollonian`, `pythagoras`.

## Install

```bash
npm install @andrii-u/vector-fractals
```

`react` is an optional peer dependency — only needed if you use the React adapter.

## Usage

### Core (no dependencies)

```ts
import { generateFractalParams, generateFractalPrimitives } from '@andrii-u/vector-fractals';

// Pass a seed for a reproducible result; omit it for a random one.
const params = generateFractalParams(42);
const primitives = generateFractalPrimitives(1200, 800, params);
// primitives: Array<{ type, key, attributes }> — render however you like.
```

### React (SVG)

```tsx
import { buildFractal } from '@andrii-u/vector-fractals/react';

function Background({ params }) {
  return (
    <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
      {buildFractal(1200, 800, params)}
    </svg>
  );
}
```

### Canvas 2D

```ts
import { createCanvasFractal, renderToCanvas } from '@andrii-u/vector-fractals/canvas';

const canvas = createCanvasFractal(params, 1200, 800);
document.body.appendChild(canvas);
```

## API

- `generateFractalParams(seed?: number): FractalParams` — random or seeded parameter set.
- `generateFractalPrimitives(width, height, params): Primitive[]` — the platform-agnostic scene.
- `@andrii-u/vector-fractals/react` — `buildFractal`, `primitiveToReactElement`, per-type `buildTree`/`buildKoch`/…
- `@andrii-u/vector-fractals/canvas` — `renderToCanvas`, `createCanvasFractal`.

## Determinism

`generateFractalParams(seed)` and `generateFractalPrimitives` are fully deterministic for a
given seed/params, so you can persist a small `FractalParams` object and reproduce the exact
same artwork later.

## License

MIT © Andrii Ursolov
