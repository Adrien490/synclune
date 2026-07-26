import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression og-image-explicit-include-draft
 *
 * Garantit que `app/(shop)/creations/[slug]/opengraph-image.tsx` appelle
 * `getProductBySlug` avec `includeDraft: false` EXPLICITE.
 *
 * Cette route est publique et les images OG sont cachées par les crawlers
 * (Facebook, Twitter, Google, ...) : elle ne doit JAMAIS dépendre du défaut
 * Zod implicite de `getProductBySlug`. Si le défaut changeait (ou était
 * retiré), un produit DRAFT pourrait fuiter dans une image OG indexée —
 * l'appel explicite verrouille le comportement indépendamment du schéma.
 *
 * Test en source-scan (readFileSync + regex) : le module importe
 * `ImageResponse` de `next/og`, qui ne se charge pas sous Vitest.
 */

const SOURCE_PATH = join(
	process.cwd(),
	"app",
	"(shop)",
	"creations",
	"[slug]",
	"opengraph-image.tsx",
);

describe("OG image produit — includeDraft explicite (og-image-explicit-include-draft)", () => {
	it("source file exists at the expected path", () => {
		expect(existsSync(SOURCE_PATH)).toBe(true);
	});

	it("calls getProductBySlug with an explicit includeDraft: false", () => {
		const source = readFileSync(SOURCE_PATH, "utf-8");
		expect(source).toMatch(
			/getProductBySlug\s*\(\s*\{[^)]*\bincludeDraft\s*:\s*false\b[^)]*\}\s*\)/,
		);
	});

	it("has no getProductBySlug call site without an explicit includeDraft", () => {
		const source = readFileSync(SOURCE_PATH, "utf-8");

		// Tous les call sites (l'import `{ getProductBySlug }` n'est pas suivi
		// d'une parenthèse ouvrante, il n'est donc pas capturé). L'argument est
		// un objet littéral sans parenthèses imbriquées → `[^)]*` suffit, y
		// compris sur plusieurs lignes.
		const callSites = [...source.matchAll(/getProductBySlug\s*\(([^)]*)\)/g)];

		// Au moins un appel doit exister — sinon le test deviendrait vacuous
		// après un refactor qui renommerait/supprimerait l'appel.
		expect(callSites.length).toBeGreaterThan(0);

		for (const [fullMatch, args] of callSites) {
			expect(args, `call site sans includeDraft explicite : ${fullMatch}`).toMatch(
				/\bincludeDraft\s*:\s*false\b/,
			);
		}
	});
});
