import { Fragment, useMemo, useState } from 'react';
import {
  REGIONS,
  REGIONS_BY_ID,
  SILHOUETTE,
  TAIL_PATH,
  VIEW_BOX,
  describePart,
  regionLabel,
  type Region,
  type Shape,
} from '@/anatomy/regions';
import { useI18n } from '@/lib/i18n';
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

/**
 * Which side of the cat a shape stands for. Fixed, not a point of view: the
 * near shapes are the cat's left, the shapes drawn behind and faded are its
 * right. Both are always on screen, so nothing has to be turned around to see
 * that an ear infection is in both ears.
 */
const sideFor = (region: Region, shape: Shape): Side => {
  if (!region.sided) return 'none';
  return shape.layer === 'far' ? 'right' : 'left';
};

/**
 * Roll the pet's issues up into per-part severity, keyed by part + side. An
 * issue spanning several zones counts once against each of them, so both ears
 * light up for the one ear infection.
 */
function summarise(issues: Issue[]): Map<string, PartState> {
  const map = new Map<string, PartState>();
  for (const issue of issues) {
    for (const part of issue.parts) {
      const key = keyOf(part.bodyPart, part.side);
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
  showInternal: boolean;
  /** Zones drawn as picked — one while filtering, several while editing an issue. */
  selected?: PartSelection[] | null;
  onSelect?: (selection: PartSelection) => void;
  className?: string;
  /**
   * Also list open issues recorded against parts the diagram cannot draw
   * ('General / whole body', 'Behaviour & mood'), which would otherwise be
   * invisible here however serious they are.
   */
  showOffDiagram?: boolean;
}

export function CatBody({ issues, showInternal, selected, onSelect, className, showOffDiagram }: CatBodyProps) {
  const i18n = useI18n();
  const { t, tn } = i18n;
  const states = useMemo(() => summarise(issues), [issues]);
  const [hovered, setHovered] = useState<PartSelection | null>(null);

  const limbs = REGIONS.filter((region) => region.group === 'limbs');
  const overlays = REGIONS.filter((region) => region.shapes.length > 0 && (showInternal || !region.internal));

  function renderOverlay(region: Region, shape: Shape, index: number) {
    const side = sideFor(region, shape);
    const state = states.get(keyOf(region.id, side)) ?? EMPTY_STATE;
    const isSelected = Boolean(selected?.some((part) => part.bodyPart === region.id && part.side === side));
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

    // Far limbs are already inside a faded group; the far ear and eye are
    // painted on top and carry their own fade, so the cat's right-hand side
    // reads as the lighter one wherever it appears.
    const farFade = shape.layer === 'far' && region.group !== 'limbs' ? 0.7 : undefined;

    return (
      <ShapeEl
        key={`${region.id}-${index}`}
        shape={shape}
        opacity={farFade}
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
          {describePart(i18n, region.id, side)}
          {state.activeCount ? ` — ${tn('body.titleActive', state.activeCount)}` : ''}
          {state.resolvedCount ? ` — ${t('body.titleResolved', { n: state.resolvedCount })}` : ''}
        </title>
      </ShapeEl>
    );
  }

  // With several zones picked there is no single one to caption, so the line
  // falls back to the hover hint rather than naming an arbitrary member.
  const caption = hovered ?? (selected?.length === 1 ? selected[0] : null);
  const captionState = caption ? (states.get(keyOf(caption.bodyPart, caption.side)) ?? EMPTY_STATE) : null;

  const offDiagram = showOffDiagram
    ? issues.flatMap((issue) =>
        issue.status === 'resolved'
          ? []
          : issue.parts
              .filter((part) => (REGIONS_BY_ID.get(part.bodyPart)?.shapes.length ?? 0) === 0)
              .map((part) => ({ issue, part })),
      )
    : [];

  return (
    <div className={className}>
      <svg viewBox={VIEW_BOX} className="w-full" role="img" aria-label={t('body.ariaLabel')}>
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
                {region.shapes
                  // The far limbs were painted behind the body in the first
                  // pass. Every other far shape belongs on top, or it would be
                  // swallowed by the silhouette and could never be clicked.
                  .filter((shape) => shape.layer !== 'far' || region.group !== 'limbs')
                  .map((shape, index) => renderOverlay(region, shape, index))}
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
            <span className="font-medium text-stone-800 dark:text-stone-200">{describePart(i18n, caption.bodyPart, caption.side)}</span>
            {captionState.activeCount > 0 && <> · {t('body.activeCount', { n: captionState.activeCount })}</>}
            {captionState.resolvedCount > 0 && <> · {t('body.resolvedCount', { n: captionState.resolvedCount })}</>}
            {captionState.activeCount === 0 && captionState.resolvedCount === 0 && <> · {t('body.nothingRecorded')}</>}
          </>
        ) : (
          <span className="text-stone-400 dark:text-stone-500">{t('body.hoverHint')}</span>
        )}
      </p>

      {/* The map never turns around, so it says once which side is which. */}
      <p className="text-center text-[11px] text-stone-400 dark:text-stone-500">{t('body.sideKey')}</p>

      {offDiagram.length > 0 && (
        <div className="mt-2 rounded-lg border border-dashed border-stone-300 px-3 py-2 dark:border-stone-700">
          <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-stone-400 uppercase">{t('body.offDiagram')}</p>
          <ul className="space-y-1 text-sm">
            {offDiagram.map(({ issue, part }) => (
              <li key={`${issue.id}-${part.bodyPart}`} className="flex items-center gap-2">
                <span className="size-2 shrink-0 rounded-full" style={{ background: SEVERITY_FILL[issue.severity] }} />
                <span className="truncate text-stone-700 dark:text-stone-300">{issue.title}</span>
                <span className="ml-auto shrink-0 text-xs text-stone-500">{regionLabel(i18n, part.bodyPart)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function SeverityLegend() {
  const { t } = useI18n();
  const entries: [string, string, boolean][] = [
    [t('body.legendNone'), 'transparent', false],
    [t('body.legendLow'), SEVERITY_FILL.low, false],
    [t('body.legendMedium'), SEVERITY_FILL.medium, false],
    [t('body.legendHigh'), SEVERITY_FILL.high, false],
    [t('body.legendResolved'), RESOLVED_COLOUR, true],
  ];
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
      {entries.map(([label, colour, faded]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span
            className="size-3 rounded-full border border-stone-300 dark:border-stone-600"
            style={{ background: colour === 'transparent' ? 'transparent' : colour, opacity: faded ? 0.4 : 0.75 }}
          />
          {label}
        </span>
      ))}
    </div>
  );
}
