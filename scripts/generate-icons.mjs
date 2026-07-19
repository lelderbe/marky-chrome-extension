import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, "..", "public", "icons");
const sizes = [16, 32, 48, 128];

function crc32(buffer) {
  let crc = 0xffffffff;

  for (let index = 0; index < buffer.length; index += 1) {
    crc ^= buffer[index];
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function drawStar(size) {
  const pixels = Buffer.alloc(size * size * 4, 0);
  const centerX = (size - 1) / 2;
  const centerY = (size - 1) / 2;
  const outerRadius = size * 0.42;
  const innerRadius = size * 0.18;

  const setPixel = (x, y, red, green, blue, alpha) => {
    if (x < 0 || y < 0 || x >= size || y >= size) {
      return;
    }

    const offset = (y * size + x) * 4;
    pixels[offset] = red;
    pixels[offset + 1] = green;
    pixels[offset + 2] = blue;
    pixels[offset + 3] = alpha;
  };

  const pointInPolygon = (x, y, polygon) => {
    let inside = false;

    for (
      let index = 0, previousIndex = polygon.length - 1;
      index < polygon.length;
      previousIndex = index, index += 1
    ) {
      const [xi, yi] = polygon[index];
      const [xp, yp] = polygon[previousIndex];
      const intersects =
        yi > y !== yp > y &&
        x < ((xp - xi) * (y - yi)) / (yp - yi + Number.EPSILON) + xi;

      if (intersects) {
        inside = !inside;
      }
    }

    return inside;
  };

  const starPoints = [];
  for (let pointIndex = 0; pointIndex < 10; pointIndex += 1) {
    const angle = -Math.PI / 2 + (pointIndex * Math.PI) / 5;
    const radius = pointIndex % 2 === 0 ? outerRadius : innerRadius;
    starPoints.push([
      centerX + Math.cos(angle) * radius,
      centerY + Math.sin(angle) * radius,
    ]);
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (pointInPolygon(x + 0.5, y + 0.5, starPoints)) {
        setPixel(x, y, 251, 188, 5, 255);
      }
    }
  }

  if (size >= 24) {
    const badgeRadius = size * 0.16;
    const badgeCenterX = size * 0.78;
    const badgeCenterY = size * 0.78;

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const distance = Math.hypot(x - badgeCenterX, y - badgeCenterY);
        if (distance <= badgeRadius) {
          setPixel(x, y, 26, 115, 232, 255);
        }
      }
    }
  }

  return pixels;
}

function createPng(size) {
  const raw = Buffer.concat(
    Array.from({ length: size }, (_, row) => {
      const rowStart = row * size * 4;
      const rowData = drawStar(size).subarray(rowStart, rowStart + size * 4);
      return Buffer.concat([Buffer.from([0]), rowData]);
    }),
  );

  const compressed = zlib.deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    signature,
    createChunk("IHDR", ihdr),
    createChunk("IDAT", compressed),
    createChunk("IEND", Buffer.alloc(0)),
  ]);
}

await mkdir(outputDir, { recursive: true });

for (const size of sizes) {
  const png = createPng(size);
  await writeFile(join(outputDir, `icon${size}.png`), png);
}

console.log(`Generated icons in ${outputDir}`);
