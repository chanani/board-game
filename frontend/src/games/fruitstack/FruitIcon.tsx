import { fruitArt, type ArtShape } from './art/fruitArt';

type Props = { level: number; size: number; className?: string; title?: string };

function Shape({ shape }: { shape: ArtShape }) {
  const paint = {
    fill: shape.fill ?? 'none', stroke: shape.stroke, strokeWidth: shape.strokeWidth, opacity: shape.opacity,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  };
  if (shape.kind === 'circle') {
    return <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...paint} />;
  }
  if (shape.kind === 'ellipse') {
    return <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...paint} />;
  }
  return <path d={shape.d} {...paint} />;
}

/** 과일 그림 자료 → 인라인 SVG. title이 없으면 장식이다. */
export function FruitIcon({ level, size, className, title }: Props) {
  const shapes = fruitArt(level);
  if (shapes.length === 0) {
    return null;
  }
  return (
    <svg viewBox="-50 -50 100 100" width={size} height={size} className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      {shapes.map((shape, index) => <Shape key={index} shape={shape} />)}
    </svg>
  );
}
