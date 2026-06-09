import fs from "node:fs/promises";
import path from "node:path";
import { normalizeDataset } from "@/lib/analytics";

const STATIC_DATA_PATH = path.join(process.cwd(), "data", "council-data.js");

async function loadStaticSqlExport(reason = "Static SQL export for GitHub Pages") {
  const text = await fs.readFile(STATIC_DATA_PATH, "utf8");
  const match = text.match(/window\.MASC_DASHBOARD_DATA\s*=\s*(\{[\s\S]*\});?\s*$/);
  if (!match) {
    throw new Error("data/council-data.js does not expose window.MASC_DASHBOARD_DATA");
  }
  const payload = JSON.parse(match[1]);
  return normalizeDataset({
    ...payload,
    metadata: {
      ...payload.metadata,
      runtimeSource: reason
    }
  });
}

export async function getDashboardDataset() {
  return loadStaticSqlExport();
}
