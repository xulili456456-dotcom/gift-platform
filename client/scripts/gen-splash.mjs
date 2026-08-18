import sharp from 'sharp';
const SIZE = 2048;
const BG = { r: 18, g: 32, b: 97 }; // #122061 deep blue, matches app icon
async function main() {
  const logo = sharp('public/logo.jpg');
  const mask = await logo.clone().greyscale().threshold(200).negate({ alpha: false }).resize(SIZE, SIZE, { fit: 'contain' }).toBuffer();
  const mark = await sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: { r: 255, g: 255, b: 255 } } }).joinChannel(mask).png().toBuffer();
  const markSize = Math.floor(SIZE * 0.3);
  const splashMark = await sharp(mark).resize(markSize, markSize, { fit: 'contain' }).png().toBuffer();
  await sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: BG } }).composite([{ input: splashMark, left: Math.floor((SIZE - markSize) / 2), top: Math.floor((SIZE - markSize) / 2) }]).png().toFile('assets/splash.png');
  console.log('generated assets/splash.png');
}
main().catch(e => { console.error(e); process.exit(1); });
