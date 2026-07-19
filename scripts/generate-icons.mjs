import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourceImage = join(__dirname, "..", "assets", "icon-source.png");
const outputDir = join(__dirname, "..", "public", "icons");
const sizes = [16, 32, 48, 128];
const renderSize = 512;
const contentScale = 0.96;

const colors = {
  stroke: { r: 26, g: 115, b: 232 },
  fill: { r: 138, g: 180, b: 248 },
  shadow: { r: 66, g: 133, b: 244 },
};

function markExterior(strokeMask, width, height) {
  const exterior = new Uint8Array(width * height);
  const queue = [];

  const tryPush = (x, y) => {
    const index = y * width + x;
    if (x < 0 || y < 0 || x >= width || y >= height || exterior[index] || strokeMask[index]) {
      return;
    }

    exterior[index] = 1;
    queue.push(index);
  };

  for (let x = 0; x < width; x += 1) {
    tryPush(x, 0);
    tryPush(x, height - 1);
  }

  for (let y = 0; y < height; y += 1) {
    tryPush(0, y);
    tryPush(width - 1, y);
  }

  while (queue.length > 0) {
    const index = queue.pop();
    const x = index % width;
    const y = Math.floor(index / width);

    tryPush(x - 1, y);
    tryPush(x + 1, y);
    tryPush(x, y - 1);
    tryPush(x, y + 1);
  }

  return exterior;
}

function setPixel(pixels, width, x, y, color, alpha = 255) {
  if (x < 0 || y < 0 || x >= width || y >= pixels.length / (width * 4)) {
    return;
  }

  const offset = (y * width + x) * 4;
  pixels[offset] = color.r;
  pixels[offset + 1] = color.g;
  pixels[offset + 2] = color.b;
  pixels[offset + 3] = alpha;
}

function createColoredIcon(sourceData, width, height) {
  const pixels = Buffer.alloc(width * height * 4, 0);
  const strokeMask = new Uint8Array(width * height);

  for (let index = 0; index < width * height; index += 1) {
    const alpha = sourceData[index * 4 + 3];
    strokeMask[index] = alpha > 64 ? 1 : 0;
  }

  const exterior = markExterior(strokeMask, width, height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;

      if (strokeMask[index]) {
        setPixel(pixels, width, x, y, colors.stroke);
        continue;
      }

      if (exterior[index]) {
        continue;
      }

      const shadowStart = width * 0.84;
      const fillColor = x >= shadowStart ? colors.shadow : colors.fill;
      setPixel(pixels, width, x, y, fillColor);
    }
  }

  return pixels;
}

const maxContentSize = Math.round(renderSize * contentScale);
const preparedSource = await sharp(sourceImage)
  .trim()
  .resize(maxContentSize, maxContentSize, {
    fit: "inside",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .toBuffer();

const { data, info } = await sharp({
  create: {
    width: renderSize,
    height: renderSize,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([{ input: preparedSource, gravity: "center" }])
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const coloredIcon = createColoredIcon(data, info.width, info.height);

await mkdir(outputDir, { recursive: true });

for (const size of sizes) {
  await sharp(coloredIcon, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .resize(size, size)
    .png()
    .toFile(join(outputDir, `icon${size}.png`));
}

console.log(`Generated icons in ${outputDir}`);
