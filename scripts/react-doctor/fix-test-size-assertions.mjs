#!/usr/bin/env node
/**
 * Convert paired `toContain("h-N")` + `toContain("w-N")` (same N) test assertions
 * into a single `toContain("size-N")` after the source size-axes mass migration.
 *
 * Conservative pairing: only collapse when the two assertions appear on
 * adjacent lines AND share the same numeric value. Asymmetric assertions
 * (`h-10` next to `w-28`) are left untouched.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const ROOTS = ["app", "modules", "shared"];
const TEST_PATTERN = /(?:__tests__|\.test)\.(?:tsx?|jsx?)$/;
const EXCLUDES = /\/(node_modules|\.next|dist|coverage|generated)\//;

const files = execSync(`git ls-files ${ROOTS.join(" ")}`, { cwd: process.cwd() })
	.toString()
	.split("\n")
	.filter((f) => f && TEST_PATTERN.test(f) && !EXCLUDES.test(f) && existsSync(f));

let totalReplaced = 0;
let changedFiles = 0;

for (const file of files) {
	const src = readFileSync(file, "utf8");
	const lines = src.split("\n");
	const out = [];
	let i = 0;
	let count = 0;

	while (i < lines.length) {
		const line = lines[i];
		const matchH = line.match(/toContain\(\s*"h-(\d+(?:\.\d+)?)"\s*\)/);
		const matchW = line.match(/toContain\(\s*"w-(\d+(?:\.\d+)?)"\s*\)/);
		if (i + 1 < lines.length) {
			const next = lines[i + 1];
			const nextH = next.match(/toContain\(\s*"h-(\d+(?:\.\d+)?)"\s*\)/);
			const nextW = next.match(/toContain\(\s*"w-(\d+(?:\.\d+)?)"\s*\)/);

			// Pattern: `toContain("h-N")` then `toContain("w-N")`
			if (matchH && nextW && matchH[1] === nextW[1]) {
				const value = matchH[1];
				out.push(line.replace(matchH[0], `toContain("size-${value}")`));
				// Skip the next line entirely (replaced by combined size-N)
				count += 2;
				i += 2;
				continue;
			}
			// Pattern: `toContain("w-N")` then `toContain("h-N")`
			if (matchW && nextH && matchW[1] === nextH[1]) {
				const value = matchW[1];
				out.push(line.replace(matchW[0], `toContain("size-${value}")`));
				count += 2;
				i += 2;
				continue;
			}
		}

		// Single assertion on a line that may now be `size-N` only (e.g. test only checks h-N)
		// In this case the source previously had `w-N h-N` and the script collapsed to size-N.
		// We need a way to identify these. Since we don't have static knowledge, we update
		// only when the matching value is in a known list of sizes typically collapsed:
		// 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 40, 48
		out.push(line);
		i += 1;
	}

	const updated = out.join("\n");
	if (updated !== src) {
		writeFileSync(file, updated, "utf8");
		changedFiles += 1;
		totalReplaced += count;
		console.log(`  ${file}: ${count} fix${count > 1 ? "es" : ""}`);
	}
}

console.log(`\n${totalReplaced} paired assertion update(s) in ${changedFiles} file(s).`);
