import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const projectRoot = resolve(import.meta.dirname, "..");
const sourceDir = resolve(projectRoot, "firebase-assets");
const destinationDir = resolve(projectRoot, "dist", "public", "oju-assets");
const assets = [
  "oju-midia-marca.png",
  "orixas-transicao-ritual-cinematografica.mp4",
];

const missingAssets = assets.filter((asset) => !existsSync(resolve(sourceDir, asset)));
if (missingAssets.length > 0) {
  console.error(
    `Ativos obrigatórios da prévia Firebase ausentes em ${sourceDir}: ${missingAssets.join(", ")}. ` +
      "A pasta firebase-assets deve acompanhar o projeto entregue."
  );
  process.exit(1);
}

mkdirSync(destinationDir, { recursive: true });
for (const asset of assets) {
  cpSync(resolve(sourceDir, asset), resolve(destinationDir, asset));
}

console.log(`Ativos oficiais da prévia Firebase copiados para ${destinationDir}.`);
