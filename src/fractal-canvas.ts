// Canvas 2D adapter — renders Primitive[] to a CanvasRenderingContext2D.
import {
  generateFractalPrimitives,
  Primitive,
  FractalParams
} from './fractal-core';

export interface CanvasRendererOptions {
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
  scale?: number;
}

/**
 * Renders fractal primitives to a Canvas 2D context
 */
export function renderToCanvas(
  params: FractalParams,
  options: CanvasRendererOptions
): void {
  const { context, width, height, scale = 1 } = options;
  const primitives = generateFractalPrimitives(width, height, params);
  
  context.save();
  context.scale(scale, scale);
  
  for (const primitive of primitives) {
    renderPrimitiveToCanvas(primitive, context);
  }
  
  context.restore();
}

// Applies an SVG-style transform string (translate/rotate/scale) to the context.
// Mirrors how the SVG adapter consumes the `transform` attribute, so kaleidoscope
// and other rotated/mirrored scenes render identically on canvas.
function applyTransform(ctx: CanvasRenderingContext2D, transform: string): void {
  const re = /(translate|rotate|scale)\s*\(([^)]*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(transform))) {
    const args = m[2].split(/[\s,]+/).map(Number);
    switch (m[1]) {
      case 'translate': ctx.translate(args[0] || 0, args[1] || 0); break;
      case 'rotate':    ctx.rotate(((args[0] || 0) * Math.PI) / 180); break;
      case 'scale':     ctx.scale(args[0] ?? 1, args[1] ?? args[0] ?? 1); break;
    }
  }
}

function renderPrimitiveToCanvas(primitive: Primitive, ctx: CanvasRenderingContext2D): void {
  const { type, attributes } = primitive;

  ctx.save();

  if (attributes.transform) applyTransform(ctx, attributes.transform as string);
  if (attributes.stroke) ctx.strokeStyle = attributes.stroke as string;
  if (attributes.fill) ctx.fillStyle = attributes.fill as string;
  if (attributes.strokeWidth) ctx.lineWidth = attributes.strokeWidth as number;
  if (attributes.opacity) ctx.globalAlpha = attributes.opacity as number;
  if (attributes.strokeLinecap) ctx.lineCap = attributes.strokeLinecap as CanvasLineCap;
  if (attributes.strokeLinejoin) ctx.lineJoin = attributes.strokeLinejoin as CanvasLineJoin;

  switch (type) {
    case 'line':
      ctx.beginPath();
      ctx.moveTo(attributes.x1 as number, attributes.y1 as number);
      ctx.lineTo(attributes.x2 as number, attributes.y2 as number);
      if (attributes.stroke) ctx.stroke();
      break;
      
    case 'circle':
      ctx.beginPath();
      ctx.arc(attributes.cx as number, attributes.cy as number, attributes.r as number, 0, Math.PI * 2);
      if (attributes.fill) ctx.fill();
      if (attributes.stroke) ctx.stroke();
      break;
      
    case 'path':
      if (attributes.d) {
        const path = new Path2D(attributes.d as string);
        if (attributes.fill) ctx.fill(path);
        if (attributes.stroke) ctx.stroke(path);
      }
      break;
      
    case 'polygon':
      if (attributes.points) {
        const points = (attributes.points as string).split(' ').map(p => {
          const [x, y] = p.split(',').map(Number);
          return { x, y };
        });
        ctx.beginPath();
        points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        if (attributes.fill) ctx.fill();
        if (attributes.stroke) ctx.stroke();
      }
      break;
      
    case 'polyline':
      if (attributes.points) {
        const points = (attributes.points as string).split(' ').map(p => {
          const [x, y] = p.split(',').map(Number);
          return { x, y };
        });
        ctx.beginPath();
        points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        if (attributes.stroke) ctx.stroke();
      }
      break;
  }
  
  ctx.restore();
}

/**
 * Creates a canvas element and renders the fractal
 */
export function createCanvasFractal(
  params: FractalParams,
  width: number,
  height: number,
  scale: number = window.devicePixelRatio || 1
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not supported');
  
  renderToCanvas(params, {
    context: ctx,
    width,
    height,
    scale
  });
  
  return canvas;
}
