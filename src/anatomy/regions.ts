/**
 * The cat body map.
 *
 * The illustration is a side view facing left. It is drawn in three passes:
 *   1. `far` shapes  — the limbs on the far side of the cat, behind the body
 *   2. the silhouette — the neutral body outline
 *   3. `near`/`flat` — the clickable, colour-coded anatomical regions
 *
 * Everything here is plain geometry so the rendering component stays dumb and
 * the region list can grow without touching it.
 */

export const VIEW_BOX = '0 0 400 270';

/** Head, neck and torso as a single outline. Legs and tail are drawn separately. */
export const SILHOUETTE =
  'M 38,102 C 38,88 44,76 56,70 L 52,40 L 84,62 L 96,40 L 108,72 ' +
  'C 120,82 128,94 130,108 C 158,98 196,92 232,94 C 268,96 296,104 314,124 ' +
  'C 328,140 330,160 320,174 C 312,184 298,190 284,190 L 148,190 ' +
  'C 118,190 100,178 92,160 C 86,146 82,128 78,118 C 64,116 46,112 38,102 Z';

export const TAIL_PATH =
  'M 314,150 C 346,138 372,152 378,180 C 383,203 370,222 350,226 ' +
  'C 362,212 366,192 359,177 C 351,160 334,156 316,168 Z';

// Limb geometry, written once for the near side and re-used for the far side
// via a translate, so the two sides can never drift apart.
const FRONT_UPPER = 'M 104,156 C 118,150 133,157 135,173 L 131,208 L 108,208 C 101,190 99,171 104,156 Z';
const FRONT_LOWER = 'M 109,205 L 131,205 L 129,236 L 112,236 Z';
const FRONT_PAW = 'M 110,231 L 131,231 L 131,244 C 131,248 128,250 123,250 L 100,250 C 96,250 94,246 96,241 Z';

const HIND_UPPER = 'M 250,130 C 276,121 301,136 305,163 C 307,182 296,197 279,199 L 255,199 C 245,181 242,151 250,130 Z';
const HIND_LOWER = 'M 263,193 L 289,193 L 285,236 L 268,236 Z';
const HIND_PAW = 'M 266,231 L 287,231 L 287,244 C 287,248 284,250 279,250 L 256,250 C 252,250 250,246 252,241 Z';

const FRONT_FAR: [number, number] = [25, -3];
const HIND_FAR: [number, number] = [-23, -3];

export type Layer = 'near' | 'far' | 'flat';

export type Shape =
  | { kind: 'path'; d: string; layer: Layer; translate?: [number, number] }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; rotate?: number; layer: Layer; translate?: [number, number] };

export type RegionGroup = 'head' | 'body' | 'limbs' | 'internal' | 'general';

export interface Region {
  id: string;
  label: string;
  group: RegionGroup;
  /** Left/right matters for this part, so issues on it record a side. */
  sided?: boolean;
  /** Only visible when the internal-organs overlay is switched on. */
  internal?: boolean;
  /** Empty for non-anatomical parts, which appear as buttons instead. */
  shapes: Shape[];
}

const ellipse = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  extra: { rotate?: number; layer?: Layer } = {},
): Shape => ({ kind: 'ellipse', cx, cy, rx, ry, rotate: extra.rotate, layer: extra.layer ?? 'flat' });

const nearFar = (d: string, offset: [number, number]): Shape[] => [
  { kind: 'path', d, layer: 'near' },
  { kind: 'path', d, layer: 'far', translate: offset },
];

/**
 * Order matters: regions are painted in sequence, so broad areas come first and
 * the smaller features that sit on top of them come later.
 */
export const REGIONS: Region[] = [
  // Whole-body catch-all. First in the list, so it sits underneath everything
  // and only receives clicks on bare torso.
  { id: 'coat', label: 'Coat & skin', group: 'body', shapes: [{ kind: 'path', d: SILHOUETTE, layer: 'flat' }] },

  // --- head ---
  { id: 'head', label: 'Head', group: 'head', shapes: [ellipse(86, 96, 44, 38)] },
  {
    id: 'ear',
    label: 'Ear',
    group: 'head',
    sided: true,
    shapes: [
      { kind: 'path', d: 'M 52,40 L 86,62 L 58,74 Z', layer: 'near' },
      { kind: 'path', d: 'M 96,40 L 110,74 L 80,60 Z', layer: 'far' },
    ],
  },
  { id: 'eye', label: 'Eye', group: 'head', sided: true, shapes: [ellipse(67, 91, 10, 8, { layer: 'near' })] },
  { id: 'nose', label: 'Nose', group: 'head', shapes: [ellipse(45, 100, 9, 7)] },
  { id: 'mouth', label: 'Mouth & teeth', group: 'head', shapes: [ellipse(52, 113, 15, 11)] },
  { id: 'neck', label: 'Neck & throat', group: 'head', shapes: [ellipse(124, 122, 24, 22)] },

  // --- torso ---
  { id: 'back', label: 'Back & spine', group: 'body', shapes: [ellipse(212, 106, 80, 17, { rotate: -2 })] },
  { id: 'chest', label: 'Chest', group: 'body', shapes: [ellipse(128, 159, 31, 27)] },
  { id: 'abdomen', label: 'Abdomen', group: 'body', shapes: [ellipse(212, 168, 58, 21)] },
  { id: 'hips', label: 'Hips', group: 'body', shapes: [ellipse(296, 130, 27, 25)] },
  { id: 'tail', label: 'Tail', group: 'body', shapes: [{ kind: 'path', d: TAIL_PATH, layer: 'flat' }] },

  // --- limbs ---
  { id: 'front-leg-upper', label: 'Front leg (upper)', group: 'limbs', sided: true, shapes: nearFar(FRONT_UPPER, FRONT_FAR) },
  { id: 'front-leg-lower', label: 'Front leg (lower)', group: 'limbs', sided: true, shapes: nearFar(FRONT_LOWER, FRONT_FAR) },
  { id: 'front-paw', label: 'Front paw', group: 'limbs', sided: true, shapes: nearFar(FRONT_PAW, FRONT_FAR) },
  { id: 'hind-leg-upper', label: 'Hind leg (thigh)', group: 'limbs', sided: true, shapes: nearFar(HIND_UPPER, HIND_FAR) },
  { id: 'hind-leg-lower', label: 'Hind leg (lower)', group: 'limbs', sided: true, shapes: nearFar(HIND_LOWER, HIND_FAR) },
  { id: 'hind-paw', label: 'Hind paw', group: 'limbs', sided: true, shapes: nearFar(HIND_PAW, HIND_FAR) },

  // --- internal, shown only with the organ overlay ---
  { id: 'lungs', label: 'Lungs', group: 'internal', internal: true, shapes: [ellipse(174, 126, 30, 20)] },
  { id: 'heart', label: 'Heart', group: 'internal', internal: true, shapes: [ellipse(150, 140, 16, 14)] },
  { id: 'liver', label: 'Liver', group: 'internal', internal: true, shapes: [ellipse(188, 154, 20, 15)] },
  { id: 'stomach', label: 'Stomach', group: 'internal', internal: true, shapes: [ellipse(212, 140, 23, 17)] },
  { id: 'intestines', label: 'Intestines', group: 'internal', internal: true, shapes: [ellipse(240, 164, 31, 17)] },
  { id: 'kidney', label: 'Kidney', group: 'internal', internal: true, sided: true, shapes: [ellipse(264, 126, 14, 11)] },
  { id: 'bladder', label: 'Bladder', group: 'internal', internal: true, shapes: [ellipse(284, 172, 14, 12)] },

  // --- not on the diagram ---
  { id: 'general', label: 'General / whole body', group: 'general', shapes: [] },
  { id: 'behaviour', label: 'Behaviour & mood', group: 'general', shapes: [] },
];

export const REGIONS_BY_ID = new Map(REGIONS.map((region) => [region.id, region]));

export const regionLabel = (id: string) => REGIONS_BY_ID.get(id)?.label ?? id;

/** 'front-paw' + 'left' -> 'Left front paw'. */
export function describePart(bodyPart: string, side: string): string {
  const label = regionLabel(bodyPart);
  if (side !== 'left' && side !== 'right') return label;
  return `${side === 'left' ? 'Left' : 'Right'} ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
}
