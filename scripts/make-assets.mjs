// Draws the app icon, Android adaptive icon layers, splash image and favicon from the Счётик mascot.
// Run: npm run assets
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const BODY = '#FF9F43';
const BODY_DARK = '#E8822A';
const BELLY = '#FFE3C2';
const INK = '#3B2A20';

/** Mascot drawn in its own 200×210 box (same shapes as src/components/Mascot.tsx). */
function mascot({ cheer = false } = {}) {
  const arms = cheer
    ? `<ellipse cx="36" cy="106" rx="12" ry="24" fill="${BODY_DARK}" transform="rotate(-30 36 106)"/>
       <ellipse cx="164" cy="106" rx="12" ry="24" fill="${BODY_DARK}" transform="rotate(30 164 106)"/>`
    : `<ellipse cx="40" cy="156" rx="12" ry="22" fill="${BODY_DARK}" transform="rotate(20 40 156)"/>
       <ellipse cx="160" cy="156" rx="12" ry="22" fill="${BODY_DARK}" transform="rotate(-20 160 156)"/>`;
  const face = cheer
    ? `<path d="M68 120 Q78 106 88 120" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>
       <path d="M112 120 Q122 106 132 120" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>
       <path d="M80 134 Q100 164 120 134 Z" fill="#B23A3A"/>
       <path d="M90 144 Q100 154 110 144" fill="#FF8A8A"/>`
    : `<circle cx="78" cy="116" r="13" fill="#fff"/><circle cx="122" cy="116" r="13" fill="#fff"/>
       <circle cx="78" cy="117" r="7" fill="${INK}"/><circle cx="122" cy="117" r="7" fill="${INK}"/>
       <circle cx="80" cy="114" r="2.5" fill="#fff"/><circle cx="124" cy="114" r="2.5" fill="#fff"/>
       <path d="M84 138 Q100 152 116 138" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  return `
    <circle cx="56" cy="82" r="20" fill="${BODY_DARK}"/><circle cx="144" cy="82" r="20" fill="${BODY_DARK}"/>
    <circle cx="56" cy="82" r="10" fill="#FFB8A8"/><circle cx="144" cy="82" r="10" fill="#FFB8A8"/>
    <ellipse cx="76" cy="198" rx="20" ry="10" fill="${BODY_DARK}"/><ellipse cx="124" cy="198" rx="20" ry="10" fill="${BODY_DARK}"/>
    ${arms}
    <circle cx="100" cy="134" r="66" fill="${BODY}"/>
    <ellipse cx="100" cy="162" rx="40" ry="30" fill="${BELLY}"/>
    <path d="M92 162 h16 M100 154 v16" stroke="${BODY}" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="64" cy="138" rx="10" ry="6" fill="#FF7B7B" opacity="0.45"/>
    <ellipse cx="136" cy="138" rx="10" ry="6" fill="#FF7B7B" opacity="0.45"/>
    ${face}`;
}

/** Same outline in one colour with the face cut out — for Android's themed (monochrome) icon. */
function silhouette() {
  return `
    <defs><mask id="face">
      <rect x="0" y="0" width="200" height="210" fill="#fff"/>
      <circle cx="78" cy="116" r="11" fill="#000"/><circle cx="122" cy="116" r="11" fill="#000"/>
      <path d="M84 138 Q100 152 116 138" stroke="#000" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M92 162 h16 M100 154 v16" stroke="#000" stroke-width="6" stroke-linecap="round"/>
    </mask></defs>
    <g mask="url(#face)" fill="#fff">
      <circle cx="56" cy="82" r="20"/><circle cx="144" cy="82" r="20"/>
      <ellipse cx="76" cy="198" rx="20" ry="10"/><ellipse cx="124" cy="198" rx="20" ry="10"/>
      <ellipse cx="40" cy="156" rx="12" ry="22" transform="rotate(20 40 156)"/>
      <ellipse cx="160" cy="156" rx="12" ry="22" transform="rotate(-20 160 156)"/>
      <circle cx="100" cy="134" r="66"/>
    </g>`;
}

const BG = `
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="70%">
      <stop offset="0%" stop-color="#FFF8EE"/>
      <stop offset="100%" stop-color="#FFD7A8"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>`;

/** Coloured maths signs floating around the mascot (topic colours from the app). */
const SIGNS = [
  { t: '+', x: 170, y: 250, c: '#4CAF50', r: -12 },
  { t: '−', x: 850, y: 240, c: '#2196F3', r: 0 },
  { t: '×', x: 160, y: 830, c: '#9C27B0', r: 10 },
  { t: '÷', x: 860, y: 820, c: '#FF5722', r: -8 },
]
  .map(
    (s) =>
      `<text x="${s.x}" y="${s.y}" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="190"
         fill="${s.c}" text-anchor="middle" dominant-baseline="central" transform="rotate(${s.r} ${s.x} ${s.y})">${s.t}</text>`,
  )
  .join('');

/** Place the 200×210 mascot so it is `width` px wide, centred at (cx, cy). */
function place(markup, width, cx, cy) {
  const k = width / 200;
  return `<g transform="translate(${cx - 100 * k} ${cy - 105 * k}) scale(${k})">${markup}</g>`;
}

const svg = (inner, size = 1024) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${inner}</svg>`);

async function out(file, inner, { flatten = false, size = 1024 } = {}) {
  let img = sharp(svg(inner)).resize(size, size);
  if (flatten) img = img.flatten({ background: '#FFE6C7' }).removeAlpha();
  await img.png().toFile(fileURLToPath(new URL(`../assets/${file}`, import.meta.url)));
  console.log(`assets/${file}  ${size}×${size}`);
}

// iOS / general icon: full square, no transparency.
await out('icon.png', `${BG}${SIGNS}${place(mascot(), 700, 512, 520)}`, { flatten: true });
// Android adaptive icon: mascot inside the central safe zone, background as a separate layer.
await out('android-icon-foreground.png', place(mascot(), 520, 512, 530));
await out('android-icon-background.png', BG, { flatten: true });
await out('android-icon-monochrome.png', place(silhouette(), 520, 512, 530));
// Splash: transparent mascot, shown on the #FFF7EC background from app.json.
await out('splash-icon.png', place(mascot({ cheer: true }), 900, 512, 512));
// Web favicon.
await out('favicon.png', `${BG}${place(mascot(), 820, 512, 530)}`, { flatten: true, size: 48 });
