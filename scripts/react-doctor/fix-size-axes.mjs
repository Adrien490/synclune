#!/usr/bin/env node
/**
 * Mass-fix `w-N h-N` and `h-N w-N` → `size-N` (Tailwind v3.4+ shorthand).
 *
 * Safe rules:
 *  - Only inside `className="..."`, `className={cn(...)}`, `className={cva(...)}`
 *    or template literals (we use a content-agnostic approach: any quoted string
 *    in .tsx/.ts that contains the pattern).
 *  - Match `w-` and `h-` with the same value (digits / fractional `0.5` / arbitrary `[42px]`).
 *  - Skip when value differs.
 *  - Preserve responsive variants (`md:w-4 md:h-4 → md:size-4`).
 *  - Preserve `min-w-N`/`max-w-N` (only `\b w-` and `\b h-`).
 *
 * Usage: node scripts/react-doctor/fix-size-axes.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const ROOTS = ["app", "modules", "shared"];
const EXTS = /\.(tsx|ts|jsx|js)$/;
const EXCLUDES = /\/(node_modules|\.next|dist|coverage|generated)\//;

const files = execSync(`git ls-files ${ROOTS.join(" ")}`, { cwd: process.cwd() })
	.toString()
	.split("\n")
	.filter((f) => f && EXTS.test(f) && !EXCLUDES.test(f) && existsSync(f));

const SIZE_VALUE = String.raw`(?:\d+(?:\.\d+)?|\[[^\]\s]+\])`;
// Variant prefix: anything ending in `:` (e.g., `md:`, `hover:`, `dark:lg:`)
const PREFIX = String.raw`(?:[a-zA-Z0-9_\-]+:)*`;

// Match `w-N h-N` (forward) and `h-N w-N` (reverse) with optional shared variant prefix.
// We require the value to be identical between w- and h-.
const REGEX_WH = new RegExp(
	String.raw`(?<![\w-])(${PREFIX})w-(${SIZE_VALUE})\s+\1h-\2(?![\w-])`,
	"g",
);
const REGEX_HW = new RegExp(
	String.raw`(?<![\w-])(${PREFIX})h-(${SIZE_VALUE})\s+\1w-\2(?![\w-])`,
	"g",
);

let changed = 0;
let occurrences = 0;
for (const file of files) {
	const src = readFileSync(file, "utf8");
	let next = src;
	let count = 0;
	next = next.replace(REGEX_WH, (_, prefix, value) => {
		count += 1;
		return `${prefix}size-${value}`;
	});
	next = next.replace(REGEX_HW, (_, prefix, value) => {
		count += 1;
		return `${prefix}size-${value}`;
	});
	if (next !== src) {
		writeFileSync(file, next, "utf8");
		changed += 1;
		occurrences += count;
		console.log(`  ${file}: ${count} fix${count > 1 ? "es" : ""}`);
	}
}

console.log(`\n${occurrences} occurrence(s) collapsed in ${changed} file(s).`);
