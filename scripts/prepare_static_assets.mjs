import { mkdir, copyFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const publicDataDir = join(root, "public", "data");

await mkdir(publicDataDir, { recursive: true });
await copyFile(
  join(root, "data", "masc-sql-source-rows.csv"),
  join(publicDataDir, "masc-sql-source-rows.csv")
);
await writeFile(join(root, "public", ".nojekyll"), "", "utf8");

console.log("Prepared static assets for Next export.");
