// Generate Capacitor icon sources (client/assets/) from the existing brand logo
// (public/logo.jpg: white background + deep-blue mark).
//
// Produces:
//   - icon-only.png       legacy launcher icon (deep-blue bg + white mark)
//   - icon-foreground.png adaptive-icon foreground (transparent bg + white mark, 66% safe zone)
//   - icon-background.png adaptive-icon background (solid deep-blue)
//
// Run:  node scripts/gen-icon.mjs
import sharp from 'sharp';

const SIZE = 1024;
const BG = { r: 18, g: 32, b: 97 }; // #122061 (sampled from the logo center)

async function main() {
  const logo = sharp('public/logo.jpg');

  // Alpha mask: white where the logo mark is, black (transparent) elsewhere.
  const mask = await logo
    .clone()
    .greyscale()
    .threshold(200)
    .negate({ alpha: false })
    .resize(SIZE, SIZE, { fit: 'contain' })
    .toBuffer();

  // White mark on transparent background.
  const mark = await sharp({
    create: { width: SIZE, height: SIZE, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .joinChannel(mask)
    .png()
    .toBuffer();

  // 1. Legacy icon: deep-blue bg + white mark (mark centered, contain-fit).
  await sharp({
    create: { width: SIZE, height: SIZE, channels: 3, background: BG },
  })
    .composite([{ input: mark }])
    .png()
    .toFile('assets/icon-only.png');

  // 2. Adaptive foreground: transparent bg + white mark scaled to 66% (safe zone).
  const fgSize = Math.floor(SIZE * 0.66);
  const fgMark = await sharp(mark).resize(fgSize, fgSize, { fit: 'contain' }).png().toBuffer();
  await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      {
        input: fgMark,
        left: Math.floor((SIZE - fgSize) / 2),
        top: Math.floor((SIZE - fgSize) / 2),
      },
    ])
    .png()
    .toFile('assets/icon-foreground.png');

  // 3. Adaptive background: solid deep-blue.
  await sharp({
    create: { width: SIZE, height: SIZE, channels: 3, background: BG },
  })
    .png()
    .toFile('assets/icon-background.png');

  console.log('generated icon-only.png, icon-foreground.png, icon-background.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
