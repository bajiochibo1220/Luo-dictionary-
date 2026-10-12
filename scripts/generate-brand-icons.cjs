// Render the original vector artwork for browser, Android, and Apple icons.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

async function main() {
  const directory = path.resolve(__dirname, '../public/icons');
  const artwork = await fs.readFile(path.join(directory, 'luo-heritage.svg'), 'utf8');
  // Both installed apps and all device platforms use the same artwork.
  const adminArtwork = artwork;
  await fs.writeFile(path.join(directory, 'luo-heritage-admin.svg'), adminArtwork);
  const render = async (source, file, size, opaque = false) => {
    let renderer = sharp(Buffer.from(source)).resize(size, size);
    if (opaque) renderer = renderer.flatten({ background: '#291b16' });
    await renderer.png().toFile(path.join(directory, file));
  };
  for (const size of [32, 180, 192, 512, 1024]) await render(artwork, `luo-heritage-${size}.png`, size, true);
  await render(artwork, 'luo-heritage-maskable-512.png', 512, true);
  for (const size of [192, 512]) await render(adminArtwork, `luo-heritage-admin-${size}.png`, size, true);
  await render(adminArtwork, 'luo-heritage-admin-maskable-512.png', 512, true);
  // Preserve existing icon URLs for previously installed apps and bookmarks.
  await fs.writeFile(path.join(directory, 'public-app.svg'), artwork);
  await fs.writeFile(path.join(directory, 'super-admin-app.svg'), adminArtwork);
  await fs.copyFile(path.join(directory, 'luo-heritage-180.png'), path.join(directory, '../apple-touch-icon.png'));
  // Native ICO entries give Windows shortcuts a real full-color fallback.
  const sizes = [16, 32, 48, 256];
  const entries = [];
  for (const size of sizes) {
    const renderer = sharp(Buffer.from(artwork)).resize(size, size).flatten({ background: '#291b16' });
    if (size === 256) { entries.push(await renderer.png().toBuffer()); continue; }
    const rgba = await renderer.ensureAlpha().raw().toBuffer();
    const pixels = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const source = (y * size + x) * 4;
      const target = ((size - y - 1) * size + x) * 4;
      pixels[target] = rgba[source + 2];
      pixels[target + 1] = rgba[source + 1];
      pixels[target + 2] = rgba[source];
      pixels[target + 3] = 255;
    }
    const header = Buffer.alloc(40);
    header.writeUInt32LE(40, 0);
    header.writeInt32LE(size, 4);
    header.writeInt32LE(size * 2, 8);
    header.writeUInt16LE(1, 12);
    header.writeUInt16LE(32, 14);
    header.writeUInt32LE(pixels.length, 20);
    const mask = Buffer.alloc(Math.ceil(size / 32) * 4 * size);
    entries.push(Buffer.concat([header, pixels, mask]));
  }
  const directoryHeader = Buffer.alloc(6 + 16 * sizes.length);
  directoryHeader.writeUInt16LE(1, 2);
  directoryHeader.writeUInt16LE(sizes.length, 4);
  let offset = directoryHeader.length;
  sizes.forEach((size, index) => {
    const entry = 6 + index * 16;
    directoryHeader[entry] = size === 256 ? 0 : size;
    directoryHeader[entry + 1] = size === 256 ? 0 : size;
    directoryHeader.writeUInt16LE(1, entry + 4);
    directoryHeader.writeUInt16LE(32, entry + 6);
    directoryHeader.writeUInt32LE(entries[index].length, entry + 8);
    directoryHeader.writeUInt32LE(offset, entry + 12);
    offset += entries[index].length;
  });
  await fs.writeFile(path.join(directory, '../favicon.ico'), Buffer.concat([directoryHeader, ...entries]));
  console.log('Generated high-resolution Luo Heritage app icons and legacy icon aliases.');
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
