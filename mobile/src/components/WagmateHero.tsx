import Svg, {
  Circle,
  Ellipse,
  G,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

// The login screen's hero: a couple sitting on top of the Wagmate wordmark
// with their backs to us, holding hands behind their two dogs.
//
// The figures sit ON the lettering, so their vertical placement is tied to
// the wordmark's cap line rather than chosen freely. SEAT_Y below is that
// line — the top of the capital W — derived from the baseline and font size.
// Everything resting on the letters shares it, so the group stays planted if
// the type is resized.
//
// Only the vertical fit is exact. The word's rendered WIDTH varies slightly
// between typefaces, which is why nothing is aligned to a particular letter —
// the group is centred over the word as a whole.

const WORDMARK_BASELINE = 218;
const WORDMARK_SIZE = 54;
// Cap height runs ~0.72em across the bold display faces used here.
const SEAT_Y = WORDMARK_BASELINE - WORDMARK_SIZE * 0.72;

const GIRL_X = 108;
const BOY_X = 252;

// The dogs' bodies are sized and spaced to just overlap at the midline, and
// they are painted AFTER the arms. That overlap is what hides the join: the
// arms run down behind the dogs and meet out of sight, rather than the hands
// showing through a gap between them. There is deliberately no drawn clasp —
// the converging arms imply it, and any visible hand would sit in front of
// the dogs, which is precisely what this arrangement avoids.
//
// The heads stay far enough apart to read as two animals, and the strong
// coat contrast does the rest of that work.
const DOG_LEFT_X = 169;
const DOG_RIGHT_X = 193;
const HAND_LEFT = { x: 175, y: SEAT_Y - 8 };
const HAND_RIGHT = { x: 187, y: SEAT_Y - 8 };

const COLORS = {
  ink: '#1f1f1f',
  // Only the necks show skin — the forearms run behind the dogs and are never
  // drawn, since any visible hand would sit in front of them.
  skinShade: '#dda87e',
  girlHair: '#5c3a2e',
  girlTop: '#fe3c72',
  boyHair: '#2e2a28',
  boyTop: '#3f7fbf',
  dogGold: '#d99b54',
  dogBrown: '#6f4126',
  dogEarGold: '#a9702f',
  dogEarBrown: '#4a2a17',
  heart: '#fe3c72',
};

function Heart({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`}>
      <Path
        d="M0 15 C -9 8, -13 2, -13 -3 C -13 -9, -7 -12, -3 -9 C -1.5 -8, -0.5 -6.5, 0 -5 C 0.5 -6.5, 1.5 -8, 3 -9 C 7 -12, 13 -9, 13 -3 C 13 2, 9 8, 0 15 Z"
        fill={COLORS.heart}
      />
    </G>
  );
}

// Sitting dog seen from behind, haunches planted on the letters.
// No tail: each one landed exactly where an arm disappears behind the dog,
// so it read as a hand curling around the dog's front — the opposite of the
// arrangement everything else here is built to achieve. A dog sitting with
// its back to us has little tail showing regardless.
function Dog({ x, coat, ear }: { x: number; coat: string; ear: string }) {
  const headY = SEAT_Y - 25;
  return (
    <G>
      <Path d={`M ${x - 13} ${SEAT_Y} q 0 -18 13 -18 q 13 0 13 18 Z`} fill={coat} />
      <Circle cx={x} cy={headY} r={9.5} fill={coat} />
      <Ellipse
        cx={x - 7.5}
        cy={headY - 4}
        rx={3.2}
        ry={5.8}
        fill={ear}
        transform={`rotate(-24 ${x - 7.5} ${headY - 4})`}
      />
      <Ellipse
        cx={x + 7.5}
        cy={headY - 4}
        rx={3.2}
        ry={5.8}
        fill={ear}
        transform={`rotate(24 ${x + 7.5} ${headY - 4})`}
      />
    </G>
  );
}

export function WagmateHero({
  width = 320,
  fontFamily = 'Baloo2_800ExtraBold',
}: {
  width?: number;
  /** Wordmark typeface; falls back to the platform's bold system font. */
  fontFamily?: string;
}) {
  const height = (width * 250) / 360;

  return (
    <Svg width={width} height={height} viewBox="0 0 360 250">
      {/* A heart tucked between each of their heads and shoulders */}
      <Heart x={74} y={120} scale={0.6} />
      <Heart x={286} y={116} scale={0.6} />

      {/* ---- Girl, on the left ---- */}
      <G>
        <Path
          d={`M ${GIRL_X - 22} 150 q -9 13 -7 25`}
          stroke={COLORS.girlTop}
          strokeWidth={10}
          strokeLinecap="round"
          fill="none"
        />
        <Rect x={GIRL_X - 6} y={124} width={12} height={16} rx={5} fill={COLORS.skinShade} />
        <Path
          d={`M ${GIRL_X - 24} ${SEAT_Y} L ${GIRL_X - 21} 142 q ${21} -12 ${42} 0 L ${GIRL_X + 24} ${SEAT_Y} Z`}
          fill={COLORS.girlTop}
        />
        {/* inner arm, dropping down behind the dogs */}
        <Path
          d={`M ${GIRL_X + 19} 146 Q ${GIRL_X + 40} 162 ${HAND_LEFT.x} ${HAND_LEFT.y}`}
          stroke={COLORS.girlTop}
          strokeWidth={9.5}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={`M ${GIRL_X - 20} 110 q 0 -23 20 -23 q 20 0 20 23 l 3 38 q -23 9 -46 0 Z`}
          fill={COLORS.girlHair}
        />
      </G>

      {/* ---- Boy, on the right ---- */}
      <G>
        <Path
          d={`M ${BOY_X + 22} 148 q 9 13 7 27`}
          stroke={COLORS.boyTop}
          strokeWidth={10}
          strokeLinecap="round"
          fill="none"
        />
        <Rect x={BOY_X - 6} y={122} width={12} height={16} rx={5} fill={COLORS.skinShade} />
        <Path
          d={`M ${BOY_X - 26} ${SEAT_Y} L ${BOY_X - 23} 140 q ${23} -13 ${46} 0 L ${BOY_X + 26} ${SEAT_Y} Z`}
          fill={COLORS.boyTop}
        />
        <Path
          d={`M ${BOY_X - 21} 144 Q ${BOY_X - 40} 160 ${HAND_RIGHT.x} ${HAND_RIGHT.y}`}
          stroke={COLORS.boyTop}
          strokeWidth={9.5}
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx={BOY_X} cy={108} r={19} fill={COLORS.boyHair} />
        <Path d={`M ${BOY_X - 19} 114 q 19 10 38 0 l 0 -8 q -19 -8 -38 0 Z`} fill={COLORS.boyHair} />
      </G>

      {/* ---- The dogs, painted over the arms so the join stays hidden ---- */}
      <Dog x={DOG_LEFT_X} coat={COLORS.dogGold} ear={COLORS.dogEarGold} />
      <Dog x={DOG_RIGHT_X} coat={COLORS.dogBrown} ear={COLORS.dogEarBrown} />

      {/* A small heart on the inner side of each dog */}
      <Heart x={175} y={137} scale={0.28} />
      <Heart x={189} y={130} scale={0.28} />

      {/* ---- The wordmark they're all sitting on ---- */}
      <SvgText
        x={180}
        y={WORDMARK_BASELINE}
        fontSize={WORDMARK_SIZE}
        fontWeight="800"
        fontFamily={fontFamily}
        textAnchor="middle"
        fill={COLORS.ink}
      >
        Wagmate
      </SvgText>
    </Svg>
  );
}
