#!/usr/bin/env node
/**
 * Mass-fix `space-x/y-N` on flex/grid parents → `gap-x/y-N` (or remove if `space-y-0` in `flex-row`).
 *
 * Conservative pattern matching:
 *  1) `flex flex-row ... space-y-0 ...` → drop `space-y-0` (dead weight in horizontal flex)
 *  2) `flex ... space-x-N` → `flex ... gap-x-N`
 *  3) `flex flex-col ... space-y-N` → `flex flex-col ... gap-y-N`
 *  4) `grid ... space-y-N` → `grid ... gap-y-N`
 *
 * SAFETY: the script only matches WITHIN a className string when both `flex|grid`
 *  and `space-{x,y}-` co-occur on the same className. It will NOT touch `space-`
 *  utilities that aren't in flex/grid contexts.
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

let totalReplaced = 0;
let changedFiles = 0;

for (const file of files) {
	const src = readFileSync(file, "utf8");
	let replaced = 0;

	// We process className="..." values. Naive but adequate: regex over the whole source
	// only swaps when the SAME value contains a flex/grid keyword.
	const next = src.replace(/className=(["'`])([^"'`]*?)\1/g, (full, quote, content) => {
		// Only touch classNames that have flex or grid co-occurring
		if (!/\b(flex|grid)\b/.test(content)) return full;

		let updated = content;
		let wasChanged = false;

		// Rule 1: flex-row + space-y-0 → drop space-y-0
		if (/\bflex-row\b/.test(updated)) {
			const before = updated;
			updated = updated.replace(
				new RegExp(`\\s+(${PREFIX})space-y-0(?![\\w-])`, "g"),
				(m, prefix) => {
					wasChanged = true;
					return "";
				},
			);
			if (updated !== before) replaced += (before.match(/space-y-0/g) || []).length;
		}

		// Rule 2: any flex/grid + space-{x,y}-N → gap-{x,y}-N
		const re = new RegExp(`(?<![\\w-])(${PREFIX})space-([xy])-(${VALUE})(?![\\w-])`, "g");
		updated = updated.replace(re, (m, prefix, axis, value) => {
			wasChanged = true;
			replaced += 1;
			return `${prefix}gap-${axis}-${value}`;
		});

		return wasChanged ? `className=${quote}${updated}${quote}` : full;
	});

	if (next !== src) {
		writeFileSync(file, next, "utf8");
		changedFiles += 1;
		console.log(`  ${file}: ${replaced} fix${replaced > 1 ? "es" : ""}`);
		totalReplaced += replaced;
	}
}

console.log(`\n${totalReplaced} space-/gap- fix(es) in ${changedFiles} file(s).`);
