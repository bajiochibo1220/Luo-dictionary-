// Render the original vector artwork for browser, Android, and Apple icons.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

async function main() {
  const directory = path.resolve(__dirname, '../public/icons');
  const artwork = await fs.readFile(path.join(directory, 'luo-heritage.svg'), 'utf8');
  const adminArtwork = artwork.replace('</svg>', '<g transform="translate(370 370)"><circle r="43" fill="#294d40" stroke="#f5d186" stroke-width="5"/><path d="M0-25 23-16v19c0 13-10 22-23 27C-13 25-23 16-23 3v-19Z" fill="none" stroke="#fff5d9" stroke-width="4" stroke-linejoin="round"/><path d="m-10 1 7 7 14-15" fill="none" stroke="#fff5d9" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g></svg>');
  await fs.writeFile(path.join(directory, 'luo-heritage-admin.svg'), adminArtwork);
  const render = async (source, file, size, opaque = false) => {
    let renderer = sharp(Buffer.from(source)).resize(size, size);
    if (opaque) renderer = renderer.flatten({ background: '#291b16' });
    await renderer.png().toFile(path.join(directory, file));
  };
  for (const size of [32, 180, 192, 512, 1024]) await render(artwork, `luo-heritage-${size}.png`, size, size === 180);
  await render(artwork, 'luo-heritage-maskable-512.png', 512, true);
  for (const size of [192, 512]) await render(adminArtwork, `luo-heritage-admin-${size}.png`, size);
  await render(adminArtwork, 'luo-heritage-admin-maskable-512.png', 512, true);
  // Preserve existing icon URLs for previously installed apps and bookmarks.
  await fs.writeFile(path.join(directory, 'public-app.svg'), artwork);
  await fs.writeFile(path.join(directory, 'super-admin-app.svg'), adminArtwork);
  console.log('Generated high-resolution Luo Heritage app icons and legacy icon aliases.');
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
