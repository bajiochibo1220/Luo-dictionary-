// A valid synthetic PNG for provider diagnostics; contains no cultural material.
const { deflateSync } = require('node:zlib');
module.exports = function syntheticTestImage() {
  function chunk(name, bytes) {
    const type = Buffer.from(name), content = Buffer.concat([type, bytes]);
    let crc = 0xffffffff;
    for (const value of content) { crc ^= value; for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1; }
    const length = Buffer.alloc(4), checksum = Buffer.alloc(4);
    length.writeUInt32BE(bytes.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([length, content, checksum]);
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(64); header.writeUInt32BE(64, 4); header[8] = 8; header[9] = 2;
  const pixels = Buffer.alloc(64 * 193);
  for (let row = 0; row < 64; row++) for (let column = 0; column < 64; column++) { const at = row * 193 + 1 + column * 3; pixels[at] = 220; pixels[at + 1] = 170; pixels[at + 2] = 90; }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]);
};
