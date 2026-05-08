#!/usr/bin/env node
/**
 * Mass-fix `...` → `…` in JSX text and JSX string attributes.
 *
 * Conservative replacement rules (line-by-line):
 *  - `>...</` and `>...>` (JSX text ending tag) → `>…</` `>…>`
 *  - `…(closing tag)` like `Loading...</span>` → `Loading…</span>`
 *  - `aria-label="...stuff..."` `title="..."` `placeholder="..."` `alt="..."` → trailing `...` → `…`
 *
 * What it AVOIDS:
 *  - Spread/rest patterns: `...rest`, `...args`, `{...props}` (we never touch `...identifier`)
 *  - Optional chaining: not applicable to `...`
 *  - Template literal interpolations: skip lines containing `\${...}`
 *  - Comments: skip lines starting with `*` or `//` after trim
 *
 * Usage: node scripts/react-doctor/fix-ellipses.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const ROOTS = ["app", "modules", "shared"];
const EXTS = /\.(tsx|jsx)$/;
const EXCLUDES = /\/(node_modules|\.next|dist|coverage|generated|__tests__|\.test\.)/;

const files = execSync(`git ls-files ${ROOTS.join(" ")}`, { cwd: process.cwd() })
	.toString()
	.split("\n")
	.filter((f) => f && EXTS.test(f) && !EXCLUDES.test(f) && existsSync(f));

let changedFiles = 0;
let totalReplaced = 0;

for (const file of files) {
	const src = readFileSync(file, "utf8");
	const lines = src.split("\n");
	let touched = 0;

	for (let i = 0; i < lines.length; i += 1) {
		const original = lines[i];
		// Skip comments
		const trimmed = original.trim();
		if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
			continue;
		}
		let next = original;

		// Pattern 1: `...` directly followed by `<` (JSX text ending with ellipsis)
		//   Example: Loading...</span>  (Unicode-aware: accents OK)
		next = next.replace(/([\p{L}\p{N}_'»\)\]\?!])\.{3}(?=\s*<)/gu, (match, prefix) => {
			touched += 1;
			return `${prefix}…`;
		});

		// Pattern 2: `...` at end of double-quoted JSX string attributes
		//   placeholder="Search..."  aria-label="Loading..."
		next = next.replace(
			/(\b(?:placeholder|aria-label|title|alt|sr-only)\s*=\s*"[^"]*?)\.{3}(")/g,
			(_, head, tail) => {
				touched += 1;
				return `${head}…${tail}`;
			},
		);

		// Pattern 4: `...` at end of double-quoted string ending JSX expression literal
		//   Example: <span>{phase || "Traitement..."}</span>
		//   Match: "(content)...(")  where content does NOT contain another `"` and ends with a word char
		next = next.replace(/("[^"\n]*[\p{L}\p{N}_])\.{3}(")/gu, (full, head, tail) => {
			// Skip imports/from/require/export
			if (/\b(?:from|import|require|export)\b/.test(original)) return full;
			touched += 1;
			return `${head}…${tail}`;
		});

		// Pattern 3: JSX text-only line with trailing ellipsis (e.g., `\t\tLoading...`)
		//   We only allow when not preceded by an identifier char (rules out spreads).
		if (/^\s+[A-ZÀ-ÿa-z][^<>{}\n]*\.{3}\s*$/.test(next)) {
			next = next.replace(/(\S)\.{3}(\s*)$/, (_, prefix, tail) => {
				touched += 1;
				return `${prefix}…${tail}`;
			});
		}

		lines[i] = next;
	}

	if (touched > 0) {
		writeFileSync(file, lines.join("\n"), "utf8");
		changedFiles += 1;
		totalReplaced += touched;
		console.log(`  ${file}: ${touched} fix${touched > 1 ? "es" : ""}`);
	}
}

console.log(`\n${totalReplaced} ellipsis replacement(s) in ${changedFiles} file(s).`);
