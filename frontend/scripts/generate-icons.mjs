import sharp from "sharp";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

const svg = `
<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#05050a"/>
      <stop offset="100%" stop-color="#160f2e"/>
    </linearGradient>
    <linearGradient id="mic" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#9b6bff"/>
      <stop offset="100%" stop-color="#2dd4ee"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <g transform="translate(256,235)">
    <rect x="-46" y="-130" width="92" height="170" rx="46" fill="url(#mic)"/>
    <path d="M-78 -6 C-78 60 -43 98 0 98 C43 98 78 60 78 -6"
      fill="none" stroke="#f7f7fb" stroke-opacity="0.9" stroke-width="14" stroke-linecap="round"/>
    <line x1="0" y1="98" x2="0" y2="140" stroke="#f7f7fb" stroke-opacity="0.9" stroke-width="14" stroke-linecap="round"/>
    <line x1="-46" y1="140" x2="46" y2="140" stroke="#f7f7fb" stroke-opacity="0.9" stroke-width="14" stroke-linecap="round"/>
  </g>
</svg>
`;

const targets = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "maskable-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
];

for (const t of targets) {
  await sharp(Buffer.from(svg))
    .resize(t.size, t.size)
    .png()
    .toFile(path.join(outDir, t.file));
  console.log("wrote", t.file);
}

await sharp(Buffer.from(svg)).resize(32, 32).png().toFile(path.join(__dirname, "..", "public", "favicon-32.png"));
console.log("wrote favicon-32.png");
