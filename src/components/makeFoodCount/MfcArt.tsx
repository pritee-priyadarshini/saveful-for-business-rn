import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import type { FoodSource } from '@/types/makeFoodCount';
import type { FoodIconKey } from '@/utils/foodListing';
import { normalize } from '@/utils/responsive';

/**
 * Make Food Count food pictures, drawn as vectors so they stay sharp at every
 * size. Subjects follow the client's prototype (deck "Saveful Make Food Count
 * 2610"): pasta tray, rotten tomato, carrot peelings, plate scraps, and one
 * picture per food row.
 */
export type MfcArtKey =
  | 'sourceOverproduction'
  | 'sourceSpoilage'
  | 'sourcePreparation'
  | 'sourcePlateScraps'
  | 'meal'
  | 'produce'
  | 'meat'
  | 'chicken'
  | 'beef'
  | 'lamb'
  | 'pork'
  | 'bakery'
  | 'dairy'
  | 'seafood'
  | 'fish'
  | 'shellfish'
  | 'pantry'
  | 'other'
  | 'peels'
  | 'bones'
  | 'shells'
  | 'coffee';

// ─── Resolving a row to its picture ──────────────────────────────────────────

export const SOURCE_ART: Record<FoodSource, MfcArtKey> = {
  OVERPRODUCTION: 'sourceOverproduction',
  SPOILAGE: 'sourceSpoilage',
  PREPARATION: 'sourcePreparation',
  PLATE_SCRAPS: 'sourcePlateScraps',
};

/** Taxonomy category keys from GET /mfc/taxonomy. Keys are stable; labels are not. */
const CATEGORY_ART: Record<string, MfcArtKey> = {
  meat_poultry: 'meat',
  seafood: 'seafood',
  fruit_veg: 'produce',
  dairy: 'dairy',
  bread_bakery: 'bakery',
  bakery: 'bakery',
  prepared_meals: 'meal',
  pantry: 'pantry',
  other: 'other',
  peels_trimmings: 'peels',
  meat_offcuts: 'meat',
  bones: 'bones',
  shells: 'shells',
  coffee_grounds: 'coffee',
  preparation_mistake: 'meal',
  plate_scraps: 'sourcePlateScraps',
  mixed_plate_scraps: 'sourcePlateScraps',
};

const SUBTYPE_ART: Record<string, MfcArtKey> = {
  chicken: 'chicken',
  beef: 'beef',
  lamb: 'lamb',
  pork: 'pork',
  fish: 'fish',
  shellfish: 'shellfish',
};

/** Listing icon keys the server sends, and the app's own listing keys. */
const ICON_KEY_ART: Record<string, MfcArtKey> = {
  meat: 'meat',
  chicken: 'chicken',
  beef: 'beef',
  lamb: 'lamb',
  pork: 'pork',
  fish: 'fish',
  shellfish: 'shellfish',
  produce: 'produce',
  dairy: 'dairy',
  bakery: 'bakery',
  meal: 'meal',
  coffee: 'coffee',
  other: 'other',
  preparedMeals: 'meal',
  fruitVeg: 'produce',
  bread: 'bakery',
  bakedGoods: 'bakery',
  defaultMeal: 'meal',
};

export function resolveMfcArt(row: {
  category?: string | null;
  subtype?: string | null;
  iconKey?: string | null;
}): MfcArtKey {
  if (row.subtype && SUBTYPE_ART[row.subtype]) return SUBTYPE_ART[row.subtype];
  if (row.category && CATEGORY_ART[row.category]) return CATEGORY_ART[row.category];
  if (row.iconKey && ICON_KEY_ART[row.iconKey]) return ICON_KEY_ART[row.iconKey];
  return 'other';
}

/** The closest of the listing screens' own icons, for carried-forward rows on the existing listing form. */
export function toListingIconKey(iconKey: string | null | undefined, category?: string | null): FoodIconKey {
  switch (resolveMfcArt({ iconKey, category })) {
    case 'meat':
    case 'chicken':
    case 'beef':
    case 'lamb':
    case 'pork':
    case 'bones':
      return 'meat';
    case 'produce':
    case 'peels':
      return 'fruitVeg';
    case 'dairy':
      return 'dairy';
    case 'bakery':
      return 'bread';
    case 'meal':
      return 'preparedMeals';
    default:
      return 'defaultMeal';
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * A food picture on a white rounded tile, as the deck shows them.
 * `aspect` is width / height (rows in the deck use roughly 4:3).
 */
export function MfcArt({
  art,
  size = 40,
  aspect = 1,
  radius = 8,
  tile = true,
  style,
  accessibilityLabel,
}: {
  art: MfcArtKey;
  /** Width in points. */
  size?: number;
  aspect?: number;
  radius?: number;
  /** false: no white tile behind the picture. */
  tile?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const width = normalize(size);
  const height = width / aspect;
  const drawn = Math.min(width, height) * (tile ? 0.92 : 1);
  const Art = ART[art];
  return (
    <View
      style={[styles.box, { width, height, borderRadius: radius }, tile && styles.tile, style]}
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    >
      <Svg width={drawn} height={drawn} viewBox="0 0 64 64">
        <Art />
      </Svg>
    </View>
  );
}

// ─── Shared bits ─────────────────────────────────────────────────────────────

function Shadow({ cx = 32, cy = 56, rx = 24, ry = 4 }: { cx?: number; cy?: number; rx?: number; ry?: number }) {
  return <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#000" opacity={0.08} />;
}

function Parsley({ x, y, s = 1, rotate = 0 }: { x: number; y: number; s?: number; rotate?: number }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${rotate}) scale(${s})`}>
      <Path d="M0 0 C-3 -2 -3 -6 0 -6 C1 -9 5 -9 5 -5 C9 -5 9 -1 5 0 C5 3 1 3 0 0 Z" fill="#3E8E3A" />
      <Path d="M0 0 C1 -2 2 -4 4 -5" stroke="#2D6B2A" strokeWidth={0.8} fill="none" />
    </G>
  );
}

/** Penne tube, for pasta dishes. */
function Penne({ x, y, r = 0, c = '#F2B54A' }: { x: number; y: number; r?: number; c?: string }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${r})`}>
      <Path d="M-5 -1.8 L4 -2.6 L5 1.8 L-4 2.6 Z" fill={c} />
      <Path d="M-3 -2 L-2 2.4 M0 -2.3 L1 2.2 M3 -2.5 L3.8 2" stroke="#D99530" strokeWidth={0.6} />
      <Ellipse cx={4.5} cy={-0.4} rx={0.9} ry={2.2} fill="#C9832A" />
    </G>
  );
}

function Tomato({ x, y, r = 6 }: { x: number; y: number; r?: number }) {
  return (
    <G>
      <Circle cx={x} cy={y} r={r} fill="#E5392B" />
      <Ellipse cx={x - r * 0.35} cy={y - r * 0.35} rx={r * 0.3} ry={r * 0.2} fill="#FF8A7A" opacity={0.8} />
      <Path
        d={`M${x - 2.5} ${y - r + 0.5} L${x} ${y - r - 1.5} L${x + 2.5} ${y - r + 0.5} L${x} ${y - r + 1.2} Z`}
        fill="#3E8E3A"
      />
    </G>
  );
}

function Carrot({ x, y, len = 22, rotate = 0 }: { x: number; y: number; len?: number; rotate?: number }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <Path d={`M0 -4 Q${len * 0.5} -3.5 ${len} 0 Q${len * 0.5} 3.5 0 4 Q-2 0 0 -4 Z`} fill="#F07B22" />
      <Path d={`M3 -2 l2 1.5 M8 -2.6 l2 1.8 M13 -2.2 l2 1.4`} stroke="#C85D12" strokeWidth={0.8} strokeLinecap="round" />
      <Path d="M0 -1 Q-6 -6 -8 -3 Q-5 -1 0 0 Q-7 1 -7 5 Q-3 4 0 1" fill="#3E8E3A" />
    </G>
  );
}

// ─── Source pictures ─────────────────────────────────────────────────────────

/** Overproduction: a steel tray of baked penne. */
function SourceOverproduction() {
  return (
    <G>
      <Defs>
        <LinearGradient id="tray" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#E9ECEF" />
          <Stop offset="1" stopColor="#9AA3AB" />
        </LinearGradient>
      </Defs>
      <Shadow cy={54} rx={28} ry={4} />
      {/* tray walls and rim */}
      <Path d="M4 26 L60 26 L55 50 Q54 53 51 53 L13 53 Q10 53 9 50 Z" fill="url(#tray)" />
      <Rect x={2} y={22} width={60} height={6} rx={3} fill="#C7CDD3" />
      <Rect x={2} y={22} width={60} height={2} rx={1} fill="#F4F6F8" />
      {/* pasta bed */}
      <Path d="M7 26 Q32 18 57 26 L56 30 L8 30 Z" fill="#E8A23A" />
      <Penne x={13} y={25} r={-15} />
      <Penne x={22} y={22} r={20} />
      <Penne x={31} y={24} r={-30} c="#F5C25A" />
      <Penne x={40} y={21} r={10} />
      <Penne x={49} y={24} r={-20} c="#F5C25A" />
      <Penne x={18} y={28} r={35} />
      <Penne x={36} y={28} r={-5} />
      <Penne x={45} y={28} r={30} c="#F5C25A" />
      <Penne x={27} y={28} r={-40} />
      {/* herbs and char */}
      <Circle cx={20} cy={24} r={0.9} fill="#2D6B2A" />
      <Circle cx={34} cy={21} r={0.9} fill="#2D6B2A" />
      <Circle cx={44} cy={26} r={0.9} fill="#2D6B2A" />
      <Circle cx={28} cy={26} r={0.7} fill="#A4521E" />
      <Circle cx={51} cy={22} r={0.7} fill="#A4521E" />
      {/* tray shine */}
      <Path d="M12 34 L50 34" stroke="#FFFFFF" strokeWidth={1.4} opacity={0.6} strokeLinecap="round" />
    </G>
  );
}

/** Spoilage: an overripe tomato with a mouldy patch. */
function SourceSpoilage() {
  return (
    <G>
      <Defs>
        <RadialGradient id="rot" cx="0.38" cy="0.35" r="0.75">
          <Stop offset="0" stopColor="#F26B4A" />
          <Stop offset="0.7" stopColor="#C8452B" />
          <Stop offset="1" stopColor="#8E2E1C" />
        </RadialGradient>
      </Defs>
      <Shadow cy={57} rx={20} ry={3.5} />
      <Path d="M32 14 C48 13 58 24 56 38 C54 51 43 57 31 56 C18 55 8 47 8 35 C8 22 18 15 32 14 Z" fill="url(#rot)" />
      {/* wrinkles */}
      <Path d="M16 30 Q20 34 18 40 M45 22 Q50 28 49 34 M26 48 Q31 51 37 49" stroke="#8E2E1C" strokeWidth={1.1} fill="none" opacity={0.6} strokeLinecap="round" />
      {/* mould */}
      <Ellipse cx={40} cy={38} rx={9} ry={7} fill="#6E6A3A" />
      <Ellipse cx={40} cy={38} rx={6} ry={4.6} fill="#9C9A6A" />
      <Circle cx={37} cy={36} r={1.6} fill="#E6E8DA" />
      <Circle cx={42} cy={39} r={1.3} fill="#E6E8DA" />
      <Circle cx={40} cy={41} r={1} fill="#D0D3C0" />
      {/* highlight */}
      <Ellipse cx={21} cy={23} rx={4.5} ry={2.6} fill="#FFB199" opacity={0.7} transform="rotate(-30 21 23)" />
      {/* dried calyx */}
      <Path d="M31 15 L24 9 L30 12 L32 5 L34 12 L41 8 L35 15 Z" fill="#5C6B2C" />
      <Path d="M32 13 L33 6" stroke="#4A5722" strokeWidth={1.4} strokeLinecap="round" />
    </G>
  );
}

/** Preparation: a heap of thin carrot peel ribbons with parsley. */
function SourcePreparation() {
  const ribbons = [
    'M6 44 C12 36 18 48 24 40 S34 34 38 42 S50 46 58 36',
    'M8 36 C14 28 20 40 26 32 S36 26 40 34 S52 36 58 26',
    'M10 50 C16 44 22 54 28 48 S38 44 42 50 S52 52 56 46',
    'M14 28 C18 20 24 30 30 24 S38 18 44 26',
    'M18 42 C24 34 30 44 36 36 S46 30 52 38',
    'M12 44 C20 52 30 40 40 46',
  ];
  return (
    <G>
      <Shadow cy={56} rx={26} ry={3.5} />
      {ribbons.map((d, i) => (
        <G key={i}>
          <Path d={d} stroke="#D2691A" strokeWidth={4} fill="none" strokeLinecap="round" />
          <Path d={d} stroke={i % 2 ? '#F7983A' : '#FBB062'} strokeWidth={2.4} fill="none" strokeLinecap="round" />
        </G>
      ))}
      <Parsley x={46} y={22} s={1.5} rotate={10} />
      <Parsley x={14} y={26} s={1.2} rotate={-30} />
      <Parsley x={52} y={44} s={1.1} rotate={40} />
    </G>
  );
}

/** Plate scraps: a white plate with leftovers and a fork. */
function SourcePlateScraps() {
  return (
    <G>
      <Shadow cy={54} rx={28} ry={4} />
      <Ellipse cx={32} cy={36} rx={29} ry={17} fill="#E6E4E1" />
      <Ellipse cx={32} cy={34} rx={29} ry={17} fill="#FFFFFF" />
      <Ellipse cx={32} cy={34} rx={20} ry={11} fill="#F6F5F3" />
      {/* leftovers */}
      <Penne x={24} y={34} r={20} />
      <Penne x={31} y={38} r={-25} c="#F5C25A" />
      <Path d="M36 30 q4 -3 7 0 q-2 4 -7 0 Z" fill="#E5392B" />
      <Circle cx={20} cy={30} r={1.8} fill="#E5392B" />
      <Circle cx={41} cy={37} r={1.5} fill="#E5392B" />
      <Circle cx={27} cy={28} r={1.6} fill="#5AA34B" />
      <Circle cx={38} cy={41} r={1.3} fill="#5AA34B" />
      <Path d="M17 37 q3 -1 5 1" stroke="#C0392B" strokeWidth={1.4} fill="none" strokeLinecap="round" />
      {/* fork */}
      <G transform="rotate(-35 46 30)">
        <Rect x={44.6} y={22} width={2.8} height={22} rx={1.4} fill="#B7BEC5" />
        <Path d="M42 12 L42 21 Q46 25 50 21 L50 12" stroke="#B7BEC5" strokeWidth={1.6} fill="none" />
        <Path d="M44.6 12 L44.6 20 M47.4 12 L47.4 20" stroke="#B7BEC5" strokeWidth={1.4} />
      </G>
    </G>
  );
}

// ─── Food rows ───────────────────────────────────────────────────────────────

/** Prepared meals: a bowl of penne with tomato and basil. */
function Meal() {
  return (
    <G>
      <Shadow cy={56} rx={22} ry={3.5} />
      <Path d="M8 30 L56 30 Q54 50 32 52 Q10 50 8 30 Z" fill="#E4E6EA" />
      <Path d="M10 34 Q32 38 54 34" stroke="#FFFFFF" strokeWidth={1.4} opacity={0.7} fill="none" />
      <Ellipse cx={32} cy={30} rx={24} ry={7} fill="#F2F3F5" />
      <Path d="M11 30 Q20 18 32 20 Q46 18 53 30 Q32 35 11 30 Z" fill="#E8A23A" />
      <Penne x={18} y={26} r={-20} />
      <Penne x={27} y={22} r={25} c="#F5C25A" />
      <Penne x={37} y={23} r={-10} />
      <Penne x={46} y={26} r={30} c="#F5C25A" />
      <Penne x={32} y={28} r={-35} />
      <Circle cx={23} cy={27} r={1.6} fill="#D2402F" />
      <Circle cx={41} cy={28} r={1.6} fill="#D2402F" />
      <Parsley x={31} y={21} s={1.1} rotate={-10} />
    </G>
  );
}

/** Fruit & vegetables: broccoli, carrots and tomatoes. */
function Produce() {
  return (
    <G>
      <Shadow cy={56} rx={24} ry={3.5} />
      {/* broccoli */}
      <Path d="M36 30 L34 46 L42 46 L40 30 Z" fill="#7FB55A" />
      <Circle cx={30} cy={22} r={8} fill="#3E8E3A" />
      <Circle cx={40} cy={16} r={8.5} fill="#4C9C43" />
      <Circle cx={48} cy={24} r={7.5} fill="#3E8E3A" />
      <Circle cx={38} cy={26} r={7} fill="#5AA34B" />
      <Circle cx={36} cy={14} r={2} fill="#6DB85A" />
      <Circle cx={45} cy={20} r={1.8} fill="#6DB85A" />
      <Circle cx={28} cy={19} r={1.6} fill="#6DB85A" />
      <Carrot x={8} y={38} len={30} rotate={-20} />
      <Carrot x={12} y={46} len={28} rotate={-4} />
      <Tomato x={20} y={50} r={7} />
      <Tomato x={46} y={49} r={7.5} />
      <Tomato x={33} y={53} r={5} />
    </G>
  );
}

/** Meat & poultry: raw chicken thighs. */
function Meat() {
  return (
    <G>
      <Defs>
        <LinearGradient id="raw" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F7C9C0" />
          <Stop offset="1" stopColor="#E29A90" />
        </LinearGradient>
      </Defs>
      <Shadow cy={54} rx={26} ry={3.5} />
      <Path d="M6 42 C6 30 18 24 28 28 C36 31 36 44 28 50 C20 55 6 52 6 42 Z" fill="url(#raw)" />
      <Path d="M26 36 C28 22 44 18 52 26 C60 34 56 48 44 50 C34 52 24 46 26 36 Z" fill="url(#raw)" />
      <Path d="M30 30 Q40 26 48 32 M12 38 Q20 34 26 40" stroke="#F9E0DA" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <Path d="M34 44 Q42 46 50 40 M10 46 Q16 49 22 47" stroke="#C97A70" strokeWidth={1.1} fill="none" strokeLinecap="round" />
      <Ellipse cx={40} cy={30} rx={6} ry={2.5} fill="#FCEDE9" opacity={0.7} />
    </G>
  );
}

function Chicken() {
  return (
    <G>
      <Shadow cy={55} rx={22} ry={3.5} />
      <Path d="M40 40 L52 52" stroke="#F4EBDD" strokeWidth={6} strokeLinecap="round" />
      <Circle cx={51} cy={56} r={4} fill="#F4EBDD" />
      <Circle cx={56} cy={51} r={4} fill="#F4EBDD" />
      <Path d="M44 42 Q34 50 22 46 Q6 40 7 24 Q9 9 24 8 Q40 8 45 22 Q48 34 44 42 Z" fill="#F2B8AC" />
      <Path d="M44 42 Q34 50 22 46 Q14 43 10 36 Q24 42 40 32 Q46 30 44 42 Z" fill="#E29A90" />
      <Path d="M15 18 Q20 12 28 12" stroke="#FBE3DD" strokeWidth={3.5} fill="none" strokeLinecap="round" />
    </G>
  );
}

function Beef() {
  return (
    <G>
      <Shadow cy={54} rx={25} ry={3.5} />
      <Path d="M8 30 C8 16 26 10 42 14 C56 18 60 32 54 42 C48 52 30 54 18 48 C10 44 8 38 8 30 Z" fill="#F1E3D6" />
      <Path d="M12 30 C12 19 27 15 41 18 C52 21 55 31 50 39 C45 47 30 49 20 45 C14 42 12 37 12 30 Z" fill="#B73A35" />
      <Path d="M20 26 Q30 22 40 28 M18 36 Q28 32 38 38 M30 42 Q38 40 46 34" stroke="#F1D1C8" strokeWidth={1.2} fill="none" opacity={0.85} strokeLinecap="round" />
      <Ellipse cx={24} cy={22} rx={6} ry={2.2} fill="#D45A52" />
    </G>
  );
}

function Lamb() {
  return (
    <G>
      <Shadow cy={55} rx={24} ry={3.5} />
      {[14, 26, 38].map((x, i) => (
        <G key={x}>
          <Rect x={x + 2} y={6} width={4} height={18} rx={2} fill="#F4EBDD" />
          <Path d={`M${x - 3} 26 Q${x + 4} 18 ${x + 11} 26 L${x + 10} 48 Q${x + 4} 52 ${x - 2} 48 Z`} fill={i % 2 ? '#C2565A' : '#B84A4E'} />
          <Path d={`M${x - 1} 30 Q${x + 4} 27 ${x + 9} 30`} stroke="#F1D1C8" strokeWidth={1.4} fill="none" />
        </G>
      ))}
    </G>
  );
}

function Pork() {
  return (
    <G>
      <Shadow cy={54} rx={24} ry={3.5} />
      <Path d="M10 30 C10 18 26 12 42 16 C54 19 58 30 52 40 C46 50 28 52 18 46 C12 42 10 36 10 30 Z" fill="#F6E6D8" />
      <Path d="M14 31 C14 21 27 17 40 20 C50 23 53 31 48 38 C43 45 29 47 21 43 C16 40 14 36 14 31 Z" fill="#EFA8A0" />
      <Path d="M44 20 C52 24 54 32 50 38" stroke="#F6E6D8" strokeWidth={5} fill="none" strokeLinecap="round" />
      <Path d="M22 28 Q30 25 38 30" stroke="#F8CFC8" strokeWidth={1.4} fill="none" strokeLinecap="round" />
      <Rect x={22} y={30} width={4} height={10} rx={2} fill="#F4EBDD" />
    </G>
  );
}

/** Bakery: a seeded loaf with slices. */
function Bakery() {
  return (
    <G>
      <Defs>
        <LinearGradient id="crust" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#C98A4B" />
          <Stop offset="1" stopColor="#8F5A2B" />
        </LinearGradient>
      </Defs>
      <Shadow cy={55} rx={26} ry={3.5} />
      <Path d="M6 34 C6 22 16 16 30 16 C44 16 50 24 50 34 L50 48 Q50 52 46 52 L10 52 Q6 52 6 48 Z" fill="url(#crust)" />
      <Path d="M12 24 L18 30 M22 20 L28 27 M33 19 L39 26" stroke="#E7B77E" strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M44 30 C44 26 50 24 56 26 C60 28 60 34 60 38 L60 50 Q60 53 57 53 L46 53 Q44 53 44 50 Z" fill="#E9CFA4" />
      <Path d="M44 30 C44 26 50 24 56 26 C60 28 60 34 60 38" stroke="#8F5A2B" strokeWidth={2.4} fill="none" />
      <Circle cx={50} cy={38} r={0.9} fill="#C9A26E" />
      <Circle cx={54} cy={44} r={0.9} fill="#C9A26E" />
      <Circle cx={49} cy={47} r={0.8} fill="#C9A26E" />
      <Ellipse cx={22} cy={22} rx={8} ry={2.2} fill="#E4AC6E" opacity={0.6} />
    </G>
  );
}

/** Dairy: a milk jug and a wedge of cheese. */
function Dairy() {
  return (
    <G>
      <Shadow cy={56} rx={26} ry={3.5} />
      <Path d="M36 14 L52 14 L54 22 Q58 26 58 34 L58 52 Q58 55 55 55 L35 55 Q32 55 32 52 L32 34 Q32 26 36 22 Z" fill="#FFFFFF" stroke="#DADDE2" strokeWidth={1} />
      <Path d="M58 30 Q63 31 63 38 Q63 45 58 46" stroke="#DADDE2" strokeWidth={2.4} fill="none" />
      <Rect x={36} y={11} width={16} height={4} rx={1.5} fill="#E8EBEF" />
      <Path d="M36 28 L36 50" stroke="#EEF0F3" strokeWidth={3} strokeLinecap="round" />
      <Path d="M4 40 L30 30 L30 52 Q30 55 27 55 L7 55 Q4 55 4 52 Z" fill="#F6C543" />
      <Path d="M4 40 L30 30 L30 34 L4 44 Z" fill="#FAD97A" />
      <Circle cx={12} cy={48} r={2} fill="#E3AE2A" />
      <Circle cx={22} cy={44} r={1.6} fill="#E3AE2A" />
      <Circle cx={20} cy={51} r={1.2} fill="#E3AE2A" />
    </G>
  );
}

/** Seafood: a salmon fillet with a prawn. */
function Seafood() {
  return (
    <G>
      <Shadow cy={55} rx={26} ry={3.5} />
      <Path d="M4 40 Q10 28 30 28 Q48 28 56 36 Q50 50 28 50 Q10 50 4 40 Z" fill="#F38A62" />
      <Path d="M12 34 Q16 42 12 48 M22 31 Q27 40 22 49 M33 30 Q38 40 33 50 M44 32 Q48 40 44 47" stroke="#FCC3A8" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <Path d="M30 28 Q48 28 56 36" stroke="#C0C6CC" strokeWidth={2.4} fill="none" />
      <Prawn x={30} y={8} s={0.62} />
    </G>
  );
}

function Prawn({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      <Path d="M18 16 Q10 6 4 8 M20 14 Q16 4 9 3" stroke="#E0663C" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Path d="M20 17 Q44 10 50 30 Q53 46 38 50" stroke="#F58A5B" strokeWidth={15} fill="none" strokeLinecap="round" />
      <Path d="M22 14 Q42 9 47 26" stroke="#FBB08A" strokeWidth={4} fill="none" strokeLinecap="round" />
      <Path d="M31 9.5 L29 22 M40 13 L35 24 M47 21 L40 28 M52 31 L43 33 M50 41 L42 39" stroke="#E0663C" strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M38 50 L27 56 L31 47 Z" fill="#E0663C" />
      <Path d="M38 50 L32 60 L39 55 Z" fill="#F58A5B" />
      <Ellipse cx={18} cy={19} rx={7} ry={6} fill="#F58A5B" />
      <Circle cx={16} cy={17.5} r={1.8} fill="#1A1A1B" />
    </G>
  );
}

function Fish() {
  return (
    <G>
      <Shadow cy={54} rx={24} ry={3.5} />
      <Path d="M44 32 L60 19 Q57 32 60 45 Z" fill="#7F96A8" />
      <Path d="M5 32 Q18 13 38 16 Q50 19 50 32 Q50 45 38 48 Q18 51 5 32 Z" fill="#A9BCCB" />
      <Path d="M9 34 Q22 47 38 46 Q47 44 49 35 Q30 41 9 34 Z" fill="#E4ECF2" />
      <Path d="M24 17 Q30 8 38 16 Z" fill="#7F96A8" />
      <Path d="M18 23 Q23 32 18 41" stroke="#7F96A8" strokeWidth={2} fill="none" strokeLinecap="round" />
      <Circle cx={12.5} cy={28} r={3} fill="#FFFFFF" />
      <Circle cx={12} cy={28} r={1.6} fill="#1A1A1B" />
      <Path d="M27 27 q3 3 0 6 M33 25 q3 4 0 8 M39 26 q3 3 0 6" stroke="#8FA4B5" strokeWidth={1.4} fill="none" strokeLinecap="round" />
    </G>
  );
}

function Shellfish() {
  return (
    <G>
      <Shadow cy={58} rx={20} ry={3} />
      <Prawn x={2} y={0} s={0.95} />
    </G>
  );
}

/** Pantry items: a tin, a jar of pasta and a jar of lentils. */
function Pantry() {
  return (
    <G>
      <Shadow cy={57} rx={28} ry={3} />
      {/* tin */}
      <Rect x={4} y={24} width={18} height={32} rx={2} fill="#B9C0C7" />
      <Rect x={4} y={30} width={18} height={18} fill="#D8423A" />
      <Rect x={4} y={36} width={18} height={4} fill="#F4F0E6" />
      <Ellipse cx={13} cy={24} rx={9} ry={2.2} fill="#DDE2E6" />
      {/* lentil jar */}
      <Rect x={22} y={18} width={18} height={38} rx={3} fill="#C98B4A" opacity={0.92} />
      <Rect x={22} y={14} width={18} height={6} rx={1.5} fill="#7A4A2D" />
      <Path d="M25 26 L25 52" stroke="#FFFFFF" strokeWidth={2} opacity={0.4} strokeLinecap="round" />
      {/* pasta jar */}
      <Rect x={40} y={20} width={20} height={36} rx={3} fill="#F7D57E" opacity={0.95} />
      <Rect x={40} y={16} width={20} height={6} rx={1.5} fill="#D8423A" />
      <Penne x={46} y={30} r={60} c="#F2B54A" />
      <Penne x={54} y={36} r={-50} c="#F2B54A" />
      <Penne x={47} y={44} r={30} c="#F2B54A" />
      <Penne x={54} y={50} r={-20} c="#F2B54A" />
    </G>
  );
}

/** Other: a bowl of mixed grains and vegetables. */
function Other() {
  return (
    <G>
      <Shadow cy={56} rx={22} ry={3.5} />
      <Path d="M8 30 L56 30 Q54 50 32 52 Q10 50 8 30 Z" fill="#E4E6EA" />
      <Ellipse cx={32} cy={30} rx={24} ry={7} fill="#F2F3F5" />
      <Path d="M11 30 Q20 19 32 20 Q46 19 53 30 Q32 35 11 30 Z" fill="#D9B47A" />
      <Circle cx={18} cy={26} r={2.6} fill="#5AA34B" />
      <Circle cx={24} cy={23} r={2.2} fill="#F07B22" />
      <Circle cx={31} cy={26} r={2.4} fill="#D2402F" />
      <Circle cx={38} cy={22} r={2.2} fill="#5AA34B" />
      <Circle cx={44} cy={26} r={2.4} fill="#F6C543" />
      <Circle cx={36} cy={28} r={1.8} fill="#F07B22" />
      <Circle cx={27} cy={29} r={1.6} fill="#5AA34B" />
      <Parsley x={40} y={21} s={0.9} rotate={20} />
    </G>
  );
}

/** Peels & trimmings: carrot peelings. */
function Peels() {
  return <SourcePreparation />;
}

function Bones() {
  return (
    <G>
      <Shadow cy={54} rx={24} ry={3.5} />
      <G transform="rotate(-25 32 34)">
        <Rect x={14} y={30} width={36} height={8} rx={4} fill="#F1E6D3" />
        <Circle cx={13} cy={29} r={6} fill="#F1E6D3" />
        <Circle cx={13} cy={39} r={6} fill="#F1E6D3" />
        <Circle cx={51} cy={29} r={6} fill="#F1E6D3" />
        <Circle cx={51} cy={39} r={6} fill="#F1E6D3" />
        <Path d="M18 32 L46 32" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
        <Path d="M22 36 Q30 39 38 36" stroke="#C97A70" strokeWidth={2.2} fill="none" strokeLinecap="round" />
      </G>
    </G>
  );
}

/** Shells: cracked egg shells. */
function Shells() {
  return (
    <G>
      <Shadow cy={54} rx={26} ry={3.5} />
      <Path d="M4 34 Q6 52 20 52 Q34 52 36 34 L32 37 L28 32 L24 37 L20 32 L16 37 L12 32 L8 37 Z" fill="#F3DFC9" />
      <Path d="M8 38 Q10 48 20 49" stroke="#FFFFFF" strokeWidth={1.6} fill="none" opacity={0.8} strokeLinecap="round" />
      <Path d="M30 30 Q32 12 46 12 Q60 12 60 30 L56 27 L52 32 L48 27 L44 32 L40 27 L36 32 Z" fill="#EBCDAF" />
      <Path d="M36 30 Q37 26 37 26 L36 32 Z" fill="#FBF3EA" />
      <Path d="M34 50 Q42 56 52 50 L50 46 Q42 50 36 46 Z" fill="#F3DFC9" />
    </G>
  );
}

/** Coffee grounds: a pile with two beans. */
function Coffee() {
  return (
    <G>
      <Path d="M4 52 Q14 30 32 29 Q50 30 60 52 Z" fill="#6B4027" />
      <Path d="M12 50 Q20 36 32 34" stroke="#8A5735" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Circle cx={24} cy={44} r={1.2} fill="#4A2A17" />
      <Circle cx={36} cy={40} r={1.2} fill="#4A2A17" />
      <Circle cx={44} cy={47} r={1.2} fill="#4A2A17" />
      <Rect x={2} y={51} width={60} height={5} rx={2.5} fill="#4A2A17" />
      <G transform="rotate(-25 22 18)">
        <Ellipse cx={22} cy={18} rx={8} ry={11} fill="#8A5735" />
        <Path d="M22 8 Q17 18 22 28" stroke="#4A2A17" strokeWidth={2} fill="none" strokeLinecap="round" />
      </G>
      <G transform="rotate(30 44 16)">
        <Ellipse cx={44} cy={16} rx={7} ry={10} fill="#7A4A2D" />
        <Path d="M44 7 Q39 16 44 25" stroke="#4A2A17" strokeWidth={2} fill="none" strokeLinecap="round" />
      </G>
    </G>
  );
}

const ART: Record<MfcArtKey, () => React.ReactElement> = {
  sourceOverproduction: SourceOverproduction,
  sourceSpoilage: SourceSpoilage,
  sourcePreparation: SourcePreparation,
  sourcePlateScraps: SourcePlateScraps,
  meal: Meal,
  produce: Produce,
  meat: Meat,
  chicken: Chicken,
  beef: Beef,
  lamb: Lamb,
  pork: Pork,
  bakery: Bakery,
  dairy: Dairy,
  seafood: Seafood,
  fish: Fish,
  shellfish: Shellfish,
  pantry: Pantry,
  other: Other,
  peels: Peels,
  bones: Bones,
  shells: Shells,
  coffee: Coffee,
};

/** Every picture, for the dev preview gallery. */
export const MFC_ART_KEYS = Object.keys(ART) as MfcArtKey[];

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tile: { backgroundColor: '#FFFFFF' },
});
