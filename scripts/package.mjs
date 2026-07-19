import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const distDir = join(root, "dist");
const releaseDir = join(root, "release");
const zipPath = join(releaseDir, "marky-extension.zip");

if (!existsSync(join(distDir, "manifest.json"))) {
  console.error("Папка dist/ не найдена. Сначала выполните `npm run build`.");
  process.exit(1);
}

mkdirSync(releaseDir, { recursive: true });

if (existsSync(zipPath)) {
  rmSync(zipPath);
}

execFileSync("zip", ["-r", zipPath, "."], { cwd: distDir, stdio: "inherit" });

console.log(`Архив создан: ${zipPath}`);
