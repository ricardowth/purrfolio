import { Fragment, useMemo, useState } from 'react';
import { REGIONS, SILHOUETTE, TAIL_PATH, VIEW_BOX, describePart, type Region, type Shape } from '@/anatomy/regions';
import { cx } from '@/components/ui';
import type { Issue, Severity, Side } from '@shared/types';

const SEVERITY_FILL: Record<Severity, string> = {
  low: '#fbbf24',
  medium: '#f97316',
  high: '#ef4444',
};
const SEVERITY_RANK: Record<Severity, number> = { low: 1, medium: 2, high: 3 };
const RESOLVED_COLOUR = '#10b981';

export interface PartSelection {
  bodyPart: string;
  side: Side;
}

interface PartState {
  worstActive: Severity | null;
  activeCount: number;
  resolvedCount: number;
}

const EMPTY_STATE: PartState = { worstActive: null, activeCount: 0, resolvedCount: 0 };

const keyOf = (bodyPart: string, side: Side) => `${bodyPart}|${side}`;
const opposite = (side: 'left' | 'right') => (side === 'left' ? 'right' : 'left');

/** Roll the pet's issues up into per-part severity, keyed by part + side. */
function summarise(issues: Issue[]): Map<string, PartState> {
  const map = new Map<string, PartState>();
  for (const issue of issues) {
    const key = keyOf(issue.bodyPart, issue.side);
    const current = map.get(key) ?? { ...EMPTY_STATE };
    if (issue.status === 'resolved') {
      current.resolvedCount += 1;
    } else {
      current.activeCount += 1;
      if (!current.worstActive || SEVERITY_RANK[issue.severity] > SEVERITY_RANK[current.worstActive]) {
        current.worstActive = issue.severity;
      }
    }
    map.set(key, current);
  }
  return map;
}

const BASE_SHAPE = 'fill-stone-200 stroke-stone-400 dark:fill-stone-800 dark:stroke-stone-600';

function ShapeEl({ shape, ...props }: { shape: Shape } & React.SVGProps<SVGPathElement & SVGEllipseElement>) {
  const transform = [
    shape.translate ? `translate(${shape.translate[0]} ${shape.translate[1]})` : '',
    shape.kind === 'ellipse' && shape.rotate ? `rotate(${shape.rotate} ${shape.cx} ${shape.cy})` : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (shape.kind === 'path') return <path d={shape.d} transform={transform || undefined} {...props} />;
  return <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} transform={transform || undefined} {...props} />;
}

interface CatBodyProps {
  issues: Issue[];
  viewSide: 'left' | 'right';
  showInternal: boolean;
  selected?: PartSelection | null;
  onSelect?: (selection: PartSelection) => void;
  className?: string;
}

export function CatBody({ issues, viewSide, showInternal, selected, onSelect, className }: CatBodyProps) {
  const states = useMemo(() => summarise(issues), [issues]);
  const [hovered, setHovered] = useState<PartSelection | null>(null);

  /** Which side a given shape represents, given which side of the cat we're looking at. */
  const sideFor = (region: Region, shape: Shape): Side => {
    if (!region.sided) return 'none';
    return shape.layer === 'far' ? opposite(viewSide) : viewSide;
  };

  const limbs = REGIONS.filter((region) => region.group === 'limbs');
  const overlays = REGIONS.filter((region) => region.shapes.length > 0 && (showInternal || !region.internal));

  function renderOverlay(region: Region, shape: Shape, index: number) {
    const side = sideFor(region, shape);
    const state = states.get(keyOf(region.id, side)) ?? EMPTY_STATE;
    const isSelected = selected?.bodyPart === region.id && selected.side === side;
    const isHovered = hovered?.bodyPart === region.id && hovered.side === side;

    const fill = state.worstActive
      ? SEVERITY_FILL[state.worstActive]
      : state.resolvedCount > 0
        ? RESOLVED_COLOUR
        : 'transparent';

    const fillOpacity = state.worstActive
      ? region.id === 'coat'
        ? 0.32
        : 0.62
      : state.resolvedCount > 0
        ? 0.16
        : isHovered
          ? 0.14
          : 0;

    const stroke = isSelected ? '#b45309' : state.worstActive ? fill : state.resolvedCount > 0 ? RESOLVED_COLOUR : 'currentColor';

    return (
      <ShapeEl
        key={`${region.id}-${index}`}
        shape={shape}
        fill={fill === 'transparent' && isHovered ? '#f59e0b' : fill}
        fillOpacity={fillOpacity}
        stroke={stroke}
        strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
        strokeOpacity={isSelected ? 1 : state.activeCount || state.resolvedCount ? 0.9 : 0.35}
        strokeDasharray={region.internal ? '4 3' : undefined}
        className={cx('text-stone-400 dark:text-stone-500', onSelect && 'cursor-pointer')}
        style={{ transition: 'fill-opacity 120ms, stroke-width 120ms' }}
        onClick={onSelect ? () => onSelect({ bodyPart: region.id, side }) : undefined}
        onMouseEnter={() => setHovered({ bodyPart: region.id, side })}
        onMouseLeave={() => setHovered(null)}
      >
        <title>
          {describePart(region.id, side)}
          {state.activeCount ? ` — ${state.activeCount} active issue${state.activeCount === 1 ? '' : 's'}` : ''}
          {state.resolvedCount ? ` — ${state.resolvedCount} resolved` : ''}
        </title>
      </ShapeEl>
    );
  }

  const caption = hovered ?? selected ?? null;
  const captionState = caption ? (states.get(keyOf(caption.bodyPart, caption.side)) ?? EMPTY_STATE) : null;

  return (
    <div className={className}>
      <svg viewBox={VIEW_BOX} className="w-full" role="img" aria-label="Cat body map">
        {/* Far-side limbs sit behind the body and are drawn faded. */}
        <g opacity={0.55}>
          {limbs.flatMap((region) =>
            region.shapes
              .filter((shape) => shape.layer === 'far')
              .map((shape, index) => <ShapeEl key={`far-base-${region.id}-${index}`} shape={shape} className={BASE_SHAPE} strokeWidth={2} />),
          )}
          {limbs.flatMap((region) =>
            region.shapes.filter((shape) => shape.layer === 'far').map((shape, index) => renderOverlay(region, shape, index)),
          )}
        </g>

        <path d={TAIL_PATH} className={BASE_SHAPE} strokeWidth={2} />
        <path d={SILHOUETTE} className={BASE_SHAPE} strokeWidth={2} />

        {/* Near-side limbs, painted over the body. */}
        {limbs.flatMap((region) =>
          region.shapes
            .filter((shape) => shape.layer === 'near')
            .map((shape, index) => <ShapeEl key={`near-base-${region.id}-${index}`} shape={shape} className={BASE_SHAPE} strokeWidth={2} />),
        )}

        {/* Interactive regions. */}
        <g opacity={showInternal ? 0.75 : 1}>
          {overlays
            .filter((region) => !region.internal)
            .map((region) => (
              <Fragment key={region.id}>
                {region.shapes.filter((shape) => shape.layer !== 'far').map((shape, index) => renderOverlay(region, shape, index))}
              </Fragment>
            ))}
        </g>

        {showInternal &&
          overlays
            .filter((region) => region.internal)
            .map((region) => (
              <Fragment key={region.id}>
                {region.shapes.map((shape, index) => renderOverlay(region, shape, index))}
              </Fragment>
            ))}
      </svg>

      <p className="mt-1 min-h-5 text-center text-sm text-stone-600 dark:text-stone-400">
        {caption && captionState ? (
          <>
            <span className="font-medium text-stone-800 dark:text-stone-200">{describePart(caption.bodyPart, caption.side)}</span>
            {captionState.activeCount > 0 && <> · {captionState.activeCount} active</>}
            {captionState.resolvedCount > 0 && <> · {captionState.resolvedCount} resolved</>}
            {captionState.activeCount === 0 && captionState.resolvedCount === 0 && <> · nothing recorded</>}
          </>
        ) : (
          <span className="text-stone-400 dark:text-stone-500">Hover a body part to inspect it</span>
        )}
      </p>
    </div>
  );
}

export function SeverityLegend() {
  const entries: [string, string][] = [
    ['No issues', 'transparent'],
    ['Low', SEVERITY_FILL.low],
    ['Medium', SEVERITY_FILL.medium],
    ['High', SEVERITY_FILL.high],
    ['Resolved', RESOLVED_COLOUR],
  ];
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
      {entries.map(([label, colour]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span
            className="size-3 rounded-full border border-stone-300 dark:border-stone-600"
            style={{ background: colour === 'transparent' ? 'transparent' : colour, opacity: label === 'Resolved' ? 0.4 : 0.75 }}
          />
          {label}
        </span>
      ))}
    </div>
  );
}
