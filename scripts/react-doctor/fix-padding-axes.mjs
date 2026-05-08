#!/usr/bin/env node
/**
 * Mass-fix `px-N py-N` and `py-N px-N` → `p-N` (Tailwind shorthand).
 *
 * Same conventions as fix-size-axes.mjs:
 *  - Match same value on both axes.
 *  - Preserve responsive variants (`md:px-4 md:py-4 → md:p-4`).
 *  - Skip when only one axis is responsive.
 *  - Match arbitrary values: `px-[12px] py-[12px]`.
 *
 * Usage: node scripts/react-doctor/fix-padding-axes.mjs
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

const VALUE = String.raw`(?:\d+(?:\.\d+)?|\[[^\]\s]+\])`;
const PREFIX = String.raw`(?:[a-zA-Z0-9_\-]+:)*`;

const REGEX_PXY = new RegExp(
	String.raw`(?<![\w-])(${PREFIX})px-(${VALUE})\s+\1py-\2(?![\w-])`,
	"g",
);
const REGEX_PYX = new RegExp(
	String.raw`(?<![\w-])(${PREFIX})py-(${VALUE})\s+\1px-\2(?![\w-])`,
	"g",
);

let changed = 0;
let occurrences = 0;
for (const file of files) {
	const src = readFileSync(file, "utf8");
	let next = src;
	let count = 0;
	next = next.replace(REGEX_PXY, (_, prefix, value) => {
		count += 1;
		return `${prefix}p-${value}`;
	});
	next = next.replace(REGEX_PYX, (_, prefix, value) => {
		count += 1;
		return `${prefix}p-${value}`;
	});
	if (next !== src) {
		writeFileSync(file, next, "utf8");
		changed += 1;
		occurrences += count;
		console.log(`  ${file}: ${count} fix${count > 1 ? "es" : ""}`);
	}
}

console.log(`\n${occurrences} occurrence(s) collapsed in ${changed} file(s).`);
