// Export the existing shared SVG artwork into native launcher/splash assets.
// This is an asset build step; platform folders retain their own OS settings.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

async function main() {
  const root = path.resolve(__dirname, '..');
  const artwork = await fs.readFile(path.join(root, 'public/icons/luo-heritage.svg'));
  const android = path.join(root, 'clients/mobile/android/app/src/main/res');
  const ios = path.join(root, 'clients/mobile/ios/App/App/Assets.xcassets');
  await Promise.all([fs.access(android), fs.access(ios)]);
  const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  const opaque = size => sharp(artwork).resize(size, size).flatten({ background: '#5c3a1c' }).png();
  const centered = async (width, height, logoSize) => {
    const logo = await sharp(artwork).resize(logoSize, logoSize).png().toBuffer();
    return sharp({ create: { width, height, channels: 4, background: '#5c3a1c' } }).composite([{ input: logo, gravity: 'centre' }]).png();
  };
  for (const [density, scale] of Object.entries(densities)) {
    const directory = path.join(android, 'mipmap-' + density);
    await fs.mkdir(directory, { recursive: true });
    for (const filename of ['ic_launcher.png', 'ic_launcher_round.png']) await opaque(Math.round(48 * scale)).toFile(path.join(directory, filename));
    const size = Math.round(108 * scale);
    const logo = await sharp(artwork).resize(Math.round(66 * scale), Math.round(66 * scale)).png().toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: '#00000000' } }).composite([{ input: logo, gravity: 'centre' }]).png().toFile(path.join(directory, 'ic_launcher_foreground.png'));
  }
  // Existing launch-screen resources already reference these filenames.
  const splashDirectories = (await fs.readdir(android, { withFileTypes: true })).filter(entry => entry.isDirectory() && entry.name.startsWith('drawable'));
  for (const directory of splashDirectories) {
    const file = path.join(android, directory.name, 'splash.png');
    try { await fs.access(file); } catch { continue; }
    const { width, height } = await sharp(file).metadata();
    await (await centered(width, height, Math.round(Math.min(width, height) * 0.24))).toFile(file + '.new.png');
    await fs.rename(file + '.new.png', file);
  }
  await opaque(1024).toFile(path.join(ios, 'AppIcon.appiconset/AppIcon-512@2x.png'));
  for (const file of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
    await (await centered(2732, 2732, 600)).toFile(path.join(ios, 'Splash.imageset', file));
  }
  console.log('Exported shared Luo Heritage artwork to Android and iOS launcher/splash assets.');
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
