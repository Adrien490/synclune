#!/usr/bin/env tsx
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const AUDIT_DIR = join(REPO_ROOT, "docs/audit");

// Files where references are historical (changelog) or examples — skip
const SKIP_FILES = new Set(["CHANGELOG.md"]);

// Match `modules/<module>/...` or `shared/...` or `app/...` paths inside markdown.
// Captures backtick-wrapped paths and bare paths in lists/sentences.
const PATH_REGEX =
	/`?\b((?:modules|shared|app|prisma|emails|scripts)\/[A-Za-z0-9_\-./]+\.(?:tsx|prisma|json|sql|md|ts))`?/g;

// Match service/file mentions like `services/order-state-machine.ts` (relative)
// inside an audit prompt that scoped a module above. We extract them but only
// flag when the module context is inferable from the same file's audit header.
const RELATIVE_SERVICE_REGEX =
	/`(?:services|data|actions|schemas|constants|hooks|types|utils|lib|components)\/([A-Za-z0-9_\-./]+\.(?:tsx|ts))`/g;

type Issue = {
	file: string;
	line: number;
	path: string;
	hint: string;
};

function* walk(dir: string): Generator<string> {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) {
			yield* walk(full);
		} else if (entry.endsWith(".md")) {
			yield full;
		}
	}
}

function fileExists(absPath: string): boolean {
	try {
		statSync(absPath);
		return true;
	} catch {
		return false;
	}
}

function inferModuleFromContext(content: string, atIndex: number): string | null {
	// Look backwards for the most recent `Audit modules/<name>` or `# X — module/<name>`
	const before = content.slice(0, atIndex);
	const match = before.match(/(?:Audit|audit)\s+modules\/([a-z0-9-]+)(?!\w)/g);
	if (!match || match.length === 0) return null;
	const last = match[match.length - 1];
	const moduleName = last?.match(/modules\/([a-z0-9-]+)/)?.[1];
	return moduleName ?? null;
}

const IGNORE_MARKER = "audit-lint-ignore";

function checkAbsolutePaths(file: string, content: string): Issue[] {
	const issues: Issue[] = [];
	const lines = content.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? "";
		if (line.includes(IGNORE_MARKER)) continue;
		PATH_REGEX.lastIndex = 0;
		let m: RegExpExecArray | null;
		while ((m = PATH_REGEX.exec(line)) !== null) {
			const path = m[1];
			if (!path) continue;
			// Skip glob-like or wildcard
			if (path.includes("*") || path.includes("...")) continue;
			const abs = join(REPO_ROOT, path);
			if (!fileExists(abs)) {
				issues.push({
					file,
					line: i + 1,
					path,
					hint: "absolute path not found in repo (use `<!-- audit-lint-ignore -->` if intentional)",
				});
			}
		}
	}
	return issues;
}

function checkRelativeServicePaths(file: string, content: string): Issue[] {
	const issues: Issue[] = [];
	const lines = content.split("\n");
	let runningOffset = 0;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? "";
		if (line.includes(IGNORE_MARKER)) {
			runningOffset += line.length + 1;
			continue;
		}
		RELATIVE_SERVICE_REGEX.lastIndex = 0;
		let m: RegExpExecArray | null;
		while ((m = RELATIVE_SERVICE_REGEX.exec(line)) !== null) {
			const fullMatch = m[0];
			const fileName = m[1];
			if (!fileName) continue;
			// Determine layer from full match (services/data/actions/...)
			const layer = fullMatch.match(/`(\w+)\//)?.[1];
			if (!layer) continue;
			const moduleAtIdx = runningOffset + (m.index ?? 0);
			const moduleName = inferModuleFromContext(content, moduleAtIdx);
			if (!moduleName) continue;
			const abs = join(REPO_ROOT, "modules", moduleName, layer, fileName);
			if (!fileExists(abs)) {
				issues.push({
					file,
					line: i + 1,
					path: `modules/${moduleName}/${layer}/${fileName}`,
					hint: `inferred from audit context (module=${moduleName})`,
				});
			}
		}
		runningOffset += line.length + 1;
	}
	return issues;
}

function main() {
	const issues: Issue[] = [];
	const fileCount = { total: 0, scanned: 0 };
	for (const file of walk(AUDIT_DIR)) {
		fileCount.total++;
		const basename = file.split("/").pop() ?? "";
		if (SKIP_FILES.has(basename)) continue;
		fileCount.scanned++;
		const content = readFileSync(file, "utf8");
		issues.push(...checkAbsolutePaths(file, content));
		issues.push(...checkRelativeServicePaths(file, content));
	}

	const rel = (p: string) => p.replace(REPO_ROOT + "/", "");
	if (issues.length > 0) {
		console.error(`\n✖ audit:lint — ${issues.length} broken reference(s) in docs/audit/\n`);
		for (const issue of issues) {
			console.error(`  ${rel(issue.file)}:${issue.line}`);
			console.error(`    → ${issue.path}`);
			console.error(`    ${issue.hint}\n`);
		}
		console.error(
			`Scanned ${fileCount.scanned}/${fileCount.total} files (${SKIP_FILES.size} skipped).`,
		);
		process.exit(1);
	}

	console.log(
		`✓ audit:lint — all references in docs/audit/ resolve (scanned ${fileCount.scanned}/${fileCount.total} files).`,
	);
}

main();
