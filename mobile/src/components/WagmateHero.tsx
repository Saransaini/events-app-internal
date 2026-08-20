import Svg, {
  Circle,
  Ellipse,
  G,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

// The login screen's hero: a couple sitting on top of the Wagmate wordmark
// with their backs to us, holding hands above their two dogs.
//
// The figures sit ON the lettering, so their vertical placement is tied to
// the wordmark's cap line rather than chosen freely. SEAT_Y below is that
// line — the top of the capital W — derived from the baseline and font size.
// Everything resting on the letters shares it, so the group stays planted if
// the type is resized.
//
// Only the vertical fit is exact. The word's rendered WIDTH varies slightly
// with the platform's bold system font, which is why nothing is aligned to a
// particular letter — the group is centred over the word as a whole and reads
// correctly whether the type sets a little wide or narrow.
//
// The horizontal spacing is doing real work and is easy to break: the couple
// are set far enough apart to leave a clear channel between them, because
// both dogs AND the joined hands have to be legible in that gap. Moving them
// closer merges the dogs into a single silhouette and buries the hands
// behind them.

const WORDMARK_BASELINE = 218;
const WORDMARK_SIZE = 54;
// Cap height runs ~0.72em in the bold grotesques this resolves to across
// iOS, Android and web.
const SEAT_Y = WORDMARK_BASELINE - WORDMARK_SIZE * 0.72;

const GIRL_X = 108;
const BOY_X = 252;
// Hands meet above the dogs' heads — the only placement where the clasp
// stays visible with two dogs sitting between them.
const HANDS = { x: 180, y: 128 };

const DOG_LEFT_X = 160;
const DOG_RIGHT_X = 202;

const COLORS = {
  ink: '#1f1f1f',
  skin: '#eabc94',
  skinShade: '#dda87e',
  girlHair: '#5c3a2e',
  girlTop: '#fe3c72',
  boyHair: '#2e2a28',
  boyTop: '#3f7fbf',
  dogGold: '#d99b54',
  dogBrown: '#7a4a2e',
  dogEarGold: '#a9702f',
  dogEarBrown: '#573320',
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
//
// The ears carry the whole read here. Upright pointed triangles plus a tail
// curling up over the back is a cat silhouette, near enough that an earlier
// version of this was unmistakably two cats on a dog app. Long ears HANGING
// past the jaw, and a tail low and out to the side, is what makes these
// unambiguously dogs at favicon size.
function Dog({
  x,
  coat,
  ear,
  tailDir = 1,
}: {
  x: number;
  coat: string;
  ear: string;
  tailDir?: number;
}) {
  const headY = SEAT_Y - 25;
  return (
    <G>
      {/* tail: low, sweeping out to the side, never up over the back */}
      <Path
        d={`M ${x + tailDir * 9} ${SEAT_Y - 3} q ${tailDir * 10} 1 ${tailDir * 12} -7`}
        stroke={coat}
        strokeWidth={4.5}
        strokeLinecap="round"
        fill="none"
      />
      {/* haunches */}
      <Path d={`M ${x - 11} ${SEAT_Y} q 0 -17 11 -17 q 11 0 11 17 Z`} fill={coat} />
      {/* head, a little oversized for puppy proportions */}
      <Circle cx={x} cy={headY} r={9.5} fill={coat} />
      {/* floppy ears hanging either side of the head */}
      <Ellipse
        cx={x - 9}
        cy={headY + 3}
        rx={4.2}
        ry={8.5}
        fill={ear}
        transform={`rotate(-14 ${x - 9} ${headY + 3})`}
      />
      <Ellipse
        cx={x + 9}
        cy={headY + 3}
        rx={4.2}
        ry={8.5}
        fill={ear}
        transform={`rotate(14 ${x + 9} ${headY + 3})`}
      />
    </G>
  );
}

export function WagmateHero({ width = 320 }: { width?: number }) {
  const height = (width * 250) / 360;

  return (
    <Svg width={width} height={height} viewBox="0 0 360 250">
      {/* The wordmark is painted FIRST so everything sitting on it overlaps
          the tops of the letters rather than being clipped by them. That
          ordering is what sells "sitting on top of" instead of "standing
          behind", and it also absorbs the small differences in cap height
          between platform fonts: whatever the letters do, the figures are
          drawn over them and stay whole. */}
      <SvgText
        x={180}
        y={WORDMARK_BASELINE}
        fontSize={WORDMARK_SIZE}
        fontWeight="800"
        textAnchor="middle"
        fill={COLORS.ink}
      >
        Wagmate
      </SvgText>

      {/* A heart above each of them, and a small one over the dogs */}
      <Heart x={GIRL_X} y={62} scale={1.15} />
      <Heart x={BOY_X} y={58} scale={1.15} />
      <Heart x={180} y={96} scale={0.5} />

      {/* ---- Girl, on the left ---- */}
      <G>
        {/* outer arm, hanging down her far side */}
        <Path
          d={`M ${GIRL_X - 21} 147 q -6 12 -5 ${SEAT_Y - 154}`}
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
        {/* inner arm, reaching up and across to his */}
        <Path
          d={`M ${GIRL_X + 19} 144 Q ${GIRL_X + 40} 132 ${HANDS.x - 7} ${HANDS.y + 1}`}
          stroke={COLORS.girlTop}
          strokeWidth={9.5}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={`M ${HANDS.x - 22} ${HANDS.y + 5} Q ${HANDS.x - 14} ${HANDS.y + 1} ${HANDS.x - 5} ${HANDS.y}`}
          stroke={COLORS.skin}
          strokeWidth={8.5}
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
        {/* outer arm, hanging down his far side */}
        <Path
          d={`M ${BOY_X + 23} 145 q 6 12 5 ${SEAT_Y - 152}`}
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
          d={`M ${BOY_X - 21} 142 Q ${BOY_X - 42} 130 ${HANDS.x + 7} ${HANDS.y + 1}`}
          stroke={COLORS.boyTop}
          strokeWidth={9.5}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={`M ${HANDS.x + 22} ${HANDS.y + 5} Q ${HANDS.x + 14} ${HANDS.y + 1} ${HANDS.x + 5} ${HANDS.y}`}
          stroke={COLORS.skin}
          strokeWidth={8.5}
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx={BOY_X} cy={108} r={19} fill={COLORS.boyHair} />
        <Path d={`M ${BOY_X - 19} 114 q 19 10 38 0 l 0 -8 q -19 -8 -38 0 Z`} fill={COLORS.boyHair} />
      </G>

      {/* Clasped hands last, so the join reads on top of both arms */}
      <Circle cx={HANDS.x} cy={HANDS.y + 2} r={6} fill={COLORS.skin} />

      {/* ---- Their two dogs, between them ---- */}
      <Dog x={DOG_LEFT_X} coat={COLORS.dogGold} ear={COLORS.dogEarGold} tailDir={-1} />
      <Dog x={DOG_RIGHT_X} coat={COLORS.dogBrown} ear={COLORS.dogEarBrown} tailDir={1} />
    </Svg>
  );
}
