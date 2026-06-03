import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',                  // platform-agnostic core
    'fractal-builders': 'src/fractal-builders.tsx', // React (SVG) adapter
    'fractal-canvas': 'src/fractal-canvas.ts',      // Canvas 2D adapter
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  external: ['react'],
});
