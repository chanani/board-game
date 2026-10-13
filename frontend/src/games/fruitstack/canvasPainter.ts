import { fruitArt, type ArtShape } from './art/fruitArt';
import { FRUITS } from './engine/constants';
import type { Painter } from './paint';

const TAU = Math.PI * 2;
type Sprite = { image: HTMLCanvasElement; side: number };

function trace(context: CanvasRenderingContext2D, shape: ArtShape): Path2D | null {
  if (shape.kind === 'path') {
    return new Path2D(shape.d);
  }
  context.beginPath();
  if (shape.kind === 'circle') {
    context.arc(shape.cx, shape.cy, shape.r, 0, TAU);
    return null;
  }
  context.ellipse(shape.cx, shape.cy, shape.rx, shape.ry, 0, 0, TAU);
  return null;
}

function drawShape(context: CanvasRenderingContext2D, shape: ArtShape): void {
  const path = trace(context, shape);
  context.globalAlpha = shape.opacity ?? 1;
  if (shape.fill && shape.fill !== 'none') {
    context.fillStyle = shape.fill;
    if (path) { context.fill(path); } else { context.fill(); }
  }
  if (shape.stroke) {
    context.strokeStyle = shape.stroke;
    context.lineWidth = shape.strokeWidth ?? 1;
    if (path) { context.stroke(path); } else { context.stroke(); }
  }
}

/** 단계 × 화면 반지름마다 한 번 그려 두는 작은 캔버스. 만들 수 없으면(캔버스·Path2D 없음) null. */
function buildSprite(level: number, radius: number, ratio: number): Sprite | null {
  try {
    const side = Math.ceil(radius * 2) + 2;
    const image = document.createElement('canvas');
    image.width = Math.ceil(side * ratio);
    image.height = Math.ceil(side * ratio);
    const context = image.getContext('2d');
    if (!context) {
      return null;
    }
    context.scale(ratio, ratio);
    context.translate(side / 2, side / 2);
    context.scale(radius / 50, radius / 50);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    fruitArt(level).forEach((shape) => drawShape(context, shape));
    return { image, side };
  } catch {
    return null;
  }
}

/**
 * 캔버스에 그리는 Painter. ratio는 캔버스 해상도 배율(스프라이트를 그만큼 촘촘히 만든다. 좌표는 늘 CSS px).
 */
export function createCanvasPainter(context: CanvasRenderingContext2D, ratio = 1): Painter {
  const sprites = new Map<string, Sprite | null>();
  const spriteOf = (level: number, radius: number) => {
    const key = `${level}:${Math.round(radius)}`;
    if (!sprites.has(key)) {
      sprites.set(key, buildSprite(level, Math.max(1, Math.round(radius)), ratio));
    }
    return sprites.get(key) ?? null;
  };
  const plainFruit = (level: number, radius: number) => {
    context.fillStyle = FRUITS[level - 1]?.color ?? '#FFFFFF';
    context.beginPath();
    context.arc(0, 0, radius, 0, TAU);
    context.fill();
  };

  return {
    clear(width, height) {
      context.clearRect(0, 0, width, height);
    },
    rect(x, y, width, height, fill) {
      context.fillStyle = fill;
      context.fillRect(x, y, width, height);
    },
    line(x1, y1, x2, y2, color, width, dash) {
      context.setLineDash(dash);
      context.strokeStyle = color;
      context.lineWidth = width;
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.stroke();
      context.setLineDash([]);
    },
    fruit(level, x, y, radius, angle, alpha) {
      const sprite = spriteOf(level, radius);
      context.save();
      context.globalAlpha = alpha;
      context.translate(x, y);
      context.rotate(angle);
      if (sprite) {
        context.drawImage(sprite.image, -sprite.side / 2, -sprite.side / 2, sprite.side, sprite.side);
      } else {
        plainFruit(level, radius);
      }
      context.restore();
    },
    ring(x, y, radius, color, alpha) {
      context.save();
      context.globalAlpha = Math.max(0, alpha);
      context.strokeStyle = color;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(x, y, radius, 0, TAU);
      context.stroke();
      context.restore();
    },
    text(text, x, y, size, color) {
      context.font = `bold ${size}px sans-serif`;
      context.textAlign = 'center';
      context.fillStyle = color;
      context.fillText(text, x, y);
    },
  };
}
