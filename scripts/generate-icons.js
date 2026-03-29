const sharp = require('sharp');
const path = require('path');

const src = path.join(__dirname, '..', 'public', 'icon-512.png');
const resDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

// Standard icon sizes (ic_launcher.png)
const launcherSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

// Foreground sizes for adaptive icons (108dp canvas)
const foregroundSizes = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

async function generateIcons() {
  const srcBuf = await sharp(src).toBuffer();

  // Generate standard launcher icons
  for (const [folder, size] of Object.entries(launcherSizes)) {
    const outPath = path.join(resDir, folder, 'ic_launcher.png');
    await sharp(srcBuf)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(outPath);
    console.log(`Created ${outPath} (${size}x${size})`);
  }

  // Generate round launcher icons (circular mask)
  for (const [folder, size] of Object.entries(launcherSizes)) {
    const outPath = path.join(resDir, folder, 'ic_launcher_round.png');
    const r = Math.floor(size / 2);
    const mask = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${r}" cy="${r}" r="${r}" fill="white"/></svg>`
    );
    await sharp(srcBuf)
      .resize(size, size, { fit: 'cover' })
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toFile(outPath);
    console.log(`Created ${outPath} (round ${size}x${size})`);
  }

  // Generate foreground icons for adaptive icons
  // Icon occupies ~66.67% of canvas (72dp of 108dp), centered with safe zone
  for (const [folder, fgSize] of Object.entries(foregroundSizes)) {
    const outPath = path.join(resDir, folder, 'ic_launcher_foreground.png');
    const iconSize = Math.round(fgSize * 0.6667);
    const padding = Math.round((fgSize - iconSize) / 2);

    const resizedIcon = await sharp(srcBuf)
      .resize(iconSize, iconSize, { fit: 'cover' })
      .toBuffer();

    await sharp({
      create: {
        width: fgSize,
        height: fgSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: resizedIcon, left: padding, top: padding }])
      .png()
      .toFile(outPath);
    console.log(`Created ${outPath} (foreground ${fgSize}x${fgSize})`);
  }

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch((err) => console.error('Error:', err));
