#!/usr/bin/env node
// Wrap components that use useSearchParams() in a <Suspense> boundary.
// Pattern B (encapsulation at definition): rename exported component to *Inner,
// append outer wrapper that delegates inside Suspense.
import { readFileSync, writeFileSync } from "node:fs";

const TARGETS = process.argv.slice(2);
if (TARGETS.length === 0) {
	console.error("Usage: node wrap-search-params-suspense.mjs <file1> <file2> ...");
	process.exit(1);
}

let processed = 0;
let skipped = 0;

for (const file of TARGETS) {
	const src = readFileSync(file, "utf8");

	if (!src.includes("useSearchParams")) {
		console.log(`⚠ skip (no useSearchParams): ${file}`);
		skipped += 1;
		continue;
	}

	if (/from\s+["']react["'][^;]*\bSuspense\b/.test(src) && /\bSuspense\b\s*[,}]/.test(src)) {
		// Already wrapped (Suspense imported). Heuristic: check if there's also <Suspense in the file.
		if (/<Suspense\b/.test(src)) {
			console.log(`⚠ skip (already wrapped): ${file}`);
			skipped += 1;
			continue;
		}
	}

	// 1. Find the `export function Name(` declaration that uses useSearchParams
	const exportFnRe = /export\s+function\s+(\w+)\s*\(/g;
	const matches = [...src.matchAll(exportFnRe)];
	if (matches.length === 0) {
		console.log(`✗ no export function found: ${file}`);
		skipped += 1;
		continue;
	}
	if (matches.length > 1) {
		console.log(`✗ multiple exported functions (manual fix needed): ${file}`);
		skipped += 1;
		continue;
	}

	const componentName = matches[0][1];
	const declStart = matches[0].index;
	const declStr = matches[0][0];

	// Detect whether the component has zero parameters (e.g., `Component()`)
	const afterOpenParen = src.slice(declStart + declStr.length);
	const closingParenIdx = afterOpenParen.search(/\)/);
	const paramListContent =
		closingParenIdx >= 0 ? afterOpenParen.slice(0, closingParenIdx).trim() : "";
	const hasZeroParams = paramListContent === "";

	// 2a. Find the matching closing `)` of the parameter list (skipping nested `(`/`{`/strings)
	let i = declStart + declStr.length; // points after the opening `(`
	let parenDepth = 1;
	let braceDepth = 0;
	while (i < src.length && parenDepth > 0) {
		const ch = src[i];
		if (ch === "(") parenDepth += 1;
		else if (ch === ")") {
			if (braceDepth === 0) parenDepth -= 1;
			if (parenDepth === 0) break;
		} else if (ch === "{") braceDepth += 1;
		else if (ch === "}") braceDepth -= 1;
		else if (ch === '"' || ch === "'" || ch === "`") {
			const quote = ch;
			i += 1;
			while (i < src.length && src[i] !== quote) {
				if (src[i] === "\\") i += 1;
				i += 1;
			}
		}
		i += 1;
	}
	if (parenDepth !== 0) {
		console.log(`✗ cannot locate parameter list close: ${file}`);
		skipped += 1;
		continue;
	}
	// i is at the closing `)`. Now scan past optional `: ReturnType` to the body `{`.
	i += 1;
	let bodyOpen = -1;
	for (; i < src.length; i += 1) {
		if (src[i] === "{") {
			bodyOpen = i;
			break;
		}
	}
	if (bodyOpen === -1) {
		console.log(`✗ cannot locate function body opening brace: ${file}`);
		skipped += 1;
		continue;
	}
	let depth = 1;
	i = bodyOpen + 1;
	for (; i < src.length; i += 1) {
		const ch = src[i];
		if (ch === "{") depth += 1;
		else if (ch === "}") {
			depth -= 1;
			if (depth === 0) {
				break;
			}
		} else if (ch === "/" && src[i + 1] === "/") {
			// Skip line comment
			while (i < src.length && src[i] !== "\n") i += 1;
		} else if (ch === "/" && src[i + 1] === "*") {
			// Skip block comment
			i += 2;
			while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i += 1;
			i += 1;
		} else if (ch === '"' || ch === "'" || ch === "`") {
			const quote = ch;
			i += 1;
			while (i < src.length && src[i] !== quote) {
				if (src[i] === "\\") i += 1;
				i += 1;
			}
		}
	}
	if (depth !== 0) {
		console.log(`✗ cannot locate function body closing brace: ${file}`);
		skipped += 1;
		continue;
	}
	const bodyClose = i; // position of the `}`

	// 3. Build the new source
	const innerName = `${componentName}Inner`;
	const beforeDecl = src.slice(0, declStart);
	const declAndBody = src.slice(declStart, bodyClose + 1);
	const afterBody = src.slice(bodyClose + 1);

	// Rename the export declaration to internal
	const newDeclAndBody = declAndBody.replace(
		/^export\s+function\s+\w+\s*\(/,
		`function ${innerName}(`,
	);

	// Build the wrapper. If the inner component takes no parameters, render it without spreading props.
	const wrapper = hasZeroParams
		? `

export function ${componentName}() {
\treturn (
\t\t<Suspense fallback={null}>
\t\t\t<${innerName} />
\t\t</Suspense>
\t);
}
`
		: `

export function ${componentName}(props: ComponentProps<typeof ${innerName}>) {
\treturn (
\t\t<Suspense fallback={null}>
\t\t\t<${innerName} {...props} />
\t\t</Suspense>
\t);
}
`;

	let next = beforeDecl + newDeclAndBody + wrapper + afterBody;

	// 4. Ensure `Suspense` (value) and `ComponentProps` (type-only) are imported from "react".
	//    `verbatimModuleSyntax: true` requires `type` keyword for type-only imports.
	const namedImportMatch = next.match(/import\s*\{\s*([^}]*)\s*\}\s*from\s*["']react["'];?/);
	if (namedImportMatch) {
		const importedNames = namedImportMatch[1];
		const additions = [];
		if (!/\bSuspense\b/.test(importedNames)) additions.push("Suspense");
		if (!hasZeroParams && !/\bComponentProps\b/.test(importedNames)) {
			additions.push("type ComponentProps");
		}
		if (additions.length > 0) {
			const updatedImport = namedImportMatch[0].replace(
				/\{\s*([^}]*)\s*\}/,
				(_, names) => `{ ${names.trim().replace(/,?\s*$/, "")}, ${additions.join(", ")} }`,
			);
			next = next.replace(namedImportMatch[0], updatedImport);
		}
	} else {
		const useClientMatch = next.match(/^("use client";?\s*\n)/);
		const parts = ["Suspense"];
		if (!hasZeroParams) parts.push("type ComponentProps");
		const importLine = `import { ${parts.join(", ")} } from "react";\n`;
		if (useClientMatch) {
			next = useClientMatch[0] + "\n" + importLine + next.slice(useClientMatch[0].length);
		} else {
			next = importLine + next;
		}
	}

	writeFileSync(file, next, "utf8");
	processed += 1;
	console.log(`✓ wrapped: ${file} (${componentName} → ${componentName} + ${innerName})`);
}

console.log(`\n${processed} processed, ${skipped} skipped.`);
