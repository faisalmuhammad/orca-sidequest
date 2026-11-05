// Rasterize our code-native SVG art. Uses an existing Sharp install for tooling only.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const sharp = (
  await import(
    process.env.SHARP_MODULE ??
      new URL(
        '../../graphiql/build/node_modules/sharp/dist/index.mjs',
        import.meta.url,
      ).href
  )
).default;
const root = new URL('../assets/', import.meta.url);
await mkdir(new URL('source/', root), { recursive: true });
const app = await readFile(
  new URL('../panel/app.mjs', import.meta.url),
  'utf8',
);
const puzzle = app.match(/game: '(<path[^']+)'/)[1];
const glyph = (x, y, size, color = '#083d38') =>
  '<g transform="translate(' +
  x +
  ' ' +
  y +
  ') scale(' +
  size / 24 +
  ')" fill="none" stroke="' +
  color +
  '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
  puzzle +
  '</g>';
const defs =
  '<defs><linearGradient id="mint" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#a0f0c9"/><stop offset=".5" stop-color="#44d8b4"/><stop offset="1" stop-color="#16968a"/></linearGradient><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#17232d"/><stop offset="1" stop-color="#142d35"/></linearGradient><radialGradient id="halo"><stop stop-color="#5be1bb" stop-opacity=".19"/><stop offset="1" stop-color="#5be1bb" stop-opacity="0"/></radialGradient><filter id="shadow" x="-50%" y="-50%" width="200%" height="210%"><feDropShadow dx="0" dy="24" stdDeviation="32" flood-color="#071418" flood-opacity=".45"/></filter></defs>';
const icon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">' +
  defs +
  '<rect x="8" y="8" width="496" height="496" rx="124" fill="url(#mint)"/><rect x="8.5" y="8.5" width="495" height="495" rx="123" fill="none" stroke="#d9ffed" stroke-opacity=".5"/>' +
  glyph(94, 94, 324) +
  '</svg>';
const dots = Array.from(
  { length: 150 },
  (_, i) =>
    '<circle cx="' +
    (70 + (i % 15) * 110) +
    '" cy="' +
    (60 + Math.floor(i / 15) * 110) +
    '" r="1" fill="#a8d6c9" opacity=".1"/>',
).join('');
const cover =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000">' +
  defs +
  '<rect width="1600" height="1000" fill="url(#bg)"/>' +
  dots +
  '<circle cx="1180" cy="480" r="520" fill="url(#halo)"/><g fill="none" stroke="#84d9be" stroke-opacity=".14"><circle cx="1200" cy="500" r="342"/><circle cx="1200" cy="500" r="435" stroke-dasharray="4 15"/><circle cx="1200" cy="500" r="535"/></g><rect x="94" y="101" width="68" height="68" rx="20" fill="url(#mint)"/>' +
  glyph(108, 115, 40) +
  '<text x="182" y="145" fill="#edf5f2" font-family="Arial, sans-serif" font-size="28" font-weight="700">SIDEQUEST</text><text x="96" y="292" fill="#8cc4b6" font-family="Arial, sans-serif" font-size="16" letter-spacing="4">QUICK GAMES. RIGHT WHERE YOU WORK.</text><text x="88" y="454" fill="#f0f5f2" font-family="Arial, sans-serif" font-size="133" font-weight="700" letter-spacing="-7">Sidequest<tspan fill="#69dbb9">.</tspan></text><text x="96" y="541" fill="#abc0bd" font-family="Arial, sans-serif" font-size="29">Refresh your mind with a quick game</text><text x="96" y="588" fill="#abc0bd" font-family="Arial, sans-serif" font-size="29">while your agents work.</text><g transform="translate(981 279) rotate(-11 213 213)" filter="url(#shadow)"><rect y="10" width="426" height="426" rx="102" fill="#0c7063"/><rect width="426" height="426" rx="102" fill="url(#mint)"/><rect x="1" y="1" width="424" height="424" rx="101" fill="none" stroke="#caffeb" stroke-opacity=".6"/>' +
  glyph(74, 74, 278) +
  '</g><g transform="translate(891 219) rotate(-15)"><rect width="65" height="65" rx="17" fill="#eec66a"/>' +
  glyph(13, 13, 39, '#755a26') +
  '</g><g transform="translate(1422 714) rotate(13)"><rect width="77" height="77" rx="19" fill="#ab94de"/>' +
  glyph(17, 17, 43, '#493460') +
  '</g><circle cx="928" cy="754" r="9" fill="#6cbaaf"/><circle cx="1470" cy="242" r="5" fill="#d8bf7d"/><path d="m1340 147 4 12 12 4-12 4-4 12-4-12-12-4 12-4Z" fill="#a9daca"/><path d="M96 826h1408" stroke="#a0c7bc" stroke-opacity=".16"/><text x="96" y="883" fill="#c2d7d0" font-family="Arial, sans-serif" font-size="19">One compact sidebar. Pick up where you left off.</text><text x="96" y="932" fill="#729c92" font-family="Arial, sans-serif" font-size="15">INDEPENDENT COMMUNITY PLUGIN FOR ORCA</text></svg>';
for (const [name, svg] of [
  ['icon', icon],
  ['cover', cover],
]) {
  await writeFile(new URL('source/' + name + '.svg', root), svg);
  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9 })
    .toFile(new URL(name + '.png', root).pathname);
}
await sharp(Buffer.from(cover))
  .resize(1200, 750)
  .png({ compressionLevel: 9 })
  .toFile(new URL('social.png', root).pathname);
console.log('Created matching icon, cover and social art.');
