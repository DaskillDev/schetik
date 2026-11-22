import Svg, { Circle, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';

import type { HatId } from '@/lib/hats';

export type Mood = 'happy' | 'cheer' | 'think' | 'oops';

const BODY = '#FF9F43';
const BODY_DARK = '#E8822A';
const BELLY = '#FFE3C2';
const INK = '#3B2A20';

/** «Счётик» — the app's own round orange mascot, drawn in SVG. */
export function Mascot({ size = 160, mood = 'happy', hat = 'none' }: { size?: number; mood?: Mood; hat?: HatId }) {
  const armsUp = mood === 'cheer';
  return (
    <Svg width={size} height={size * 1.05} viewBox="0 -8 200 210">
      {/* ears */}
      <Circle cx={56} cy={74} r={20} fill={BODY_DARK} />
      <Circle cx={144} cy={74} r={20} fill={BODY_DARK} />
      <Circle cx={56} cy={74} r={10} fill="#FFB8A8" />
      <Circle cx={144} cy={74} r={10} fill="#FFB8A8" />

      {/* feet */}
      <Ellipse cx={76} cy={190} rx={20} ry={10} fill={BODY_DARK} />
      <Ellipse cx={124} cy={190} rx={20} ry={10} fill={BODY_DARK} />

      {/* arms */}
      {armsUp ? (
        <G>
          <Ellipse cx={36} cy={98} rx={12} ry={24} fill={BODY_DARK} transform="rotate(-30 36 98)" />
          <Ellipse cx={164} cy={98} rx={12} ry={24} fill={BODY_DARK} transform="rotate(30 164 98)" />
        </G>
      ) : (
        <G>
          <Ellipse cx={40} cy={148} rx={12} ry={22} fill={BODY_DARK} transform="rotate(20 40 148)" />
          <Ellipse cx={160} cy={148} rx={12} ry={22} fill={BODY_DARK} transform="rotate(-20 160 148)" />
        </G>
      )}

      {/* body */}
      <Circle cx={100} cy={126} r={66} fill={BODY} />
      <Ellipse cx={100} cy={154} rx={40} ry={30} fill={BELLY} />
      <Path d="M92 154 h16 M100 146 v16" stroke={BODY} strokeWidth={5} strokeLinecap="round" />

      {/* cheeks */}
      <Ellipse cx={64} cy={130} rx={10} ry={6} fill="#FF7B7B" opacity={0.45} />
      <Ellipse cx={136} cy={130} rx={10} ry={6} fill="#FF7B7B" opacity={0.45} />

      <Face mood={mood} />
      <Hat id={hat} />
    </Svg>
  );
}

function Face({ mood }: { mood: Mood }) {
  if (mood === 'cheer') {
    return (
      <G>
        <Path d="M68 112 Q78 98 88 112" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />
        <Path d="M112 112 Q122 98 132 112" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />
        <Path d="M80 126 Q100 156 120 126 Z" fill="#B23A3A" />
        <Path d="M90 136 Q100 146 110 136" fill="#FF8A8A" />
      </G>
    );
  }
  const look = mood === 'think' ? { dx: 3, dy: -4 } : { dx: 0, dy: 1 };
  return (
    <G>
      <Circle cx={78} cy={108} r={13} fill="#fff" />
      <Circle cx={122} cy={108} r={13} fill="#fff" />
      <Circle cx={78 + look.dx} cy={108 + look.dy} r={7} fill={INK} />
      <Circle cx={122 + look.dx} cy={108 + look.dy} r={7} fill={INK} />
      <Circle cx={80 + look.dx} cy={105 + look.dy} r={2.5} fill="#fff" />
      <Circle cx={124 + look.dx} cy={105 + look.dy} r={2.5} fill="#fff" />
      {mood === 'happy' && (
        <Path d="M84 130 Q100 144 116 130" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />
      )}
      {mood === 'think' && <Path d="M90 134 L112 130" stroke={INK} strokeWidth={5} strokeLinecap="round" />}
      {mood === 'oops' && <Ellipse cx={100} cy={134} rx={7} ry={9} fill={INK} />}
    </G>
  );
}

function Hat({ id }: { id: HatId }) {
  switch (id) {
    case 'cap':
      return (
        <G>
          <Path d="M56 76 Q100 14 144 76 Z" fill="#E53935" />
          <Path d="M100 76 L168 72 Q174 80 164 84 L100 84 Z" fill="#B71C1C" />
          <Circle cx={100} cy={34} r={6} fill="#B71C1C" />
        </G>
      );
    case 'bow':
      return (
        <G>
          <Path d="M132 62 L106 44 L110 78 Z" fill="#FF4081" />
          <Path d="M132 62 L158 44 L154 78 Z" fill="#FF4081" />
          <Circle cx={132} cy={62} r={9} fill="#C2185B" />
        </G>
      );
    case 'headphones':
      return (
        <G>
          <Path d="M40 108 Q40 30 100 30 Q160 30 160 108" stroke="#37474F" strokeWidth={10} fill="none" />
          <Rect x={24} y={92} width={26} height={42} rx={10} fill="#26C6DA" />
          <Rect x={150} y={92} width={26} height={42} rx={10} fill="#26C6DA" />
        </G>
      );
    case 'crown':
      return (
        <G>
          <Polygon points="64,72 64,34 82,52 100,24 118,52 136,34 136,72" fill="#FFC107" stroke="#FF8F00" strokeWidth={3} />
          <Circle cx={100} cy={58} r={6} fill="#E91E63" />
          <Circle cx={78} cy={62} r={4} fill="#2196F3" />
          <Circle cx={122} cy={62} r={4} fill="#4CAF50" />
        </G>
      );
    case 'wizard':
      return (
        <G>
          <Path d="M58 74 L104 -4 L142 74 Z" fill="#5E35B1" />
          <Ellipse cx={100} cy={74} rx={54} ry={10} fill="#4527A0" />
          <Path d="M96 30 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1 Z" fill="#FFEB3B" />
          <Circle cx={116} cy={54} r={3} fill="#FFEB3B" />
          <Circle cx={84} cy={58} r={2.5} fill="#FFEB3B" />
        </G>
      );
    case 'flower':
      return (
        <G>
          <Path d="M134 66 Q150 76 148 90 Q136 84 134 66 Z" fill="#66BB6A" />
          {[0, 72, 144, 216, 288].map((deg) => {
            const r = (deg * Math.PI) / 180;
            return <Circle key={deg} cx={134 + 11 * Math.cos(r)} cy={58 + 11 * Math.sin(r)} r={9} fill="#FF80AB" />;
          })}
          <Circle cx={134} cy={58} r={7} fill="#FFEB3B" />
        </G>
      );
    case 'party':
      return (
        <G>
          <Polygon points="72,70 100,2 128,70" fill="#29B6F6" />
          <Path d="M86 36 L112 46 M80 54 L120 66" stroke="#FFEB3B" strokeWidth={6} strokeLinecap="round" />
          <Ellipse cx={100} cy={70} rx={30} ry={6} fill="#0288D1" />
          <Circle cx={100} cy={2} r={9} fill="#FF4081" />
        </G>
      );
    case 'pirate':
      return (
        <G>
          <Path d="M40 76 Q100 46 160 76 Q150 26 100 22 Q50 26 40 76 Z" fill="#263238" />
          <Path d="M40 76 Q100 46 160 76" stroke="#FFC107" strokeWidth={4} fill="none" />
          <Circle cx={100} cy={44} r={9} fill="#fff" />
          <Circle cx={96} cy={43} r={2.5} fill="#263238" />
          <Circle cx={104} cy={43} r={2.5} fill="#263238" />
          <Path d="M88 56 L112 64 M112 56 L88 64" stroke="#fff" strokeWidth={3} strokeLinecap="round" />
        </G>
      );
    case 'unicorn':
      return (
        <G>
          <Polygon points="88,66 100,0 112,66" fill="#FFD54F" />
          <Path d="M90 54 L110 46 M92 38 L107 31 M95 22 L104 17" stroke="#FFA000" strokeWidth={3} strokeLinecap="round" />
          <Circle cx={70} cy={62} r={7} fill="#CE93D8" />
          <Circle cx={130} cy={62} r={7} fill="#80DEEA" />
        </G>
      );
    default:
      return null;
  }
}
