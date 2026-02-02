import path from "path";
import {
  readWebsitesFromExcel,
  writeResultsToExcel,
  CheckResult,
} from "./excel.js";
import { WebsiteChecker, WebsiteCheckResult } from "./checker.js";

async function main() {
  const inputFile = process.argv[2] || path.join(__dirname, "../data/input/websites.xlsx");
  const outputFile = process.argv[3] || path.join(__dirname, "../data/output/results.xlsx");

  console.log(`Reading websites from: ${inputFile}`);

  const websites = await readWebsitesFromExcel(inputFile);
  console.log(websites)

  const checker = new WebsiteChecker();
  await checker.initialize();

  const results: CheckResult[] = [];

  for (let i = 0; i < websites.length; i++) {
    const website = websites[i];
    if (!website) continue;
    console.log(`[${i + 1}/${websites.length}] Checking ${website}...`);

    const result: WebsiteCheckResult = await checker.checkWebsite(website);

    results.push({
      website,
      ...result,
      lastChecked: new Date().toISOString(),
    });

    console.log(
      `  → ${result.isAccessible ? "✓" : "✗"} ${
        result.statusCode || result.error
      }`
    );
  }

  await checker.close();
  await writeResultsToExcel(inputFile, outputFile, results);

  const accessible = results.filter((r) => r.isAccessible).length;
  console.log(`\nSummary: ${accessible}/${results.length} websites accessible`);
}

main().catch(console.error);
