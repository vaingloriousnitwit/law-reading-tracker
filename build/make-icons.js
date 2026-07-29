const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const BUILD_DIR = __dirname;
const SVG_PATH = path.join(BUILD_DIR, "icon.svg");
const ICONSET_DIR = path.join(BUILD_DIR, "icon.iconset");

// macOS iconset naming convention consumed by `iconutil -c icns`.
const SIZES = [
  { file: "icon_16x16.png", size: 16 },
  { file: "icon_16x16@2x.png", size: 32 },
  { file: "icon_32x32.png", size: 32 },
  { file: "icon_32x32@2x.png", size: 64 },
  { file: "icon_128x128.png", size: 128 },
  { file: "icon_128x128@2x.png", size: 256 },
  { file: "icon_256x256.png", size: 256 },
  { file: "icon_256x256@2x.png", size: 512 },
  { file: "icon_512x512.png", size: 512 },
  { file: "icon_512x512@2x.png", size: 1024 },
];

async function main() {
  fs.mkdirSync(ICONSET_DIR, { recursive: true });

  for (const { file, size } of SIZES) {
    await sharp(SVG_PATH, { density: 384 })
      .resize(size, size)
      .png()
      .toFile(path.join(ICONSET_DIR, file));
    console.log(`wrote ${file} (${size}x${size})`);
  }

  // Also drop a flat 1024 PNG at build/icon.png for Windows/Linux packaging.
  await sharp(SVG_PATH, { density: 384 })
    .resize(1024, 1024)
    .png()
    .toFile(path.join(BUILD_DIR, "icon.png"));
  console.log("wrote icon.png (1024x1024)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
