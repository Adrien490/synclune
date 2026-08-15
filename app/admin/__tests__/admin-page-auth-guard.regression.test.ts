/**
 * @regression admin-page-auth-guard
 *
 * Garde-fou : CHAQUE `page.tsx` sous `app/admin/(protected)` DOIT appeler
 * `assertAdminPage()` — le layout partagé n'est PAS ré-exécuté lors d'une
 * navigation client entre deux routes qui le partagent (rendu partiel de
 * l'App Router), et `proxy.ts` ne vérifie que la PRÉSENCE du cookie, pas sa
 * signature HMAC. La validation réelle vit donc dans la page, ou nulle part.
 *
 * Ce test était promis à trois endroits (`assert-admin-page.ts`, `proxy.ts`,
 * `app/admin/connexion/page.tsx`) avant d'exister — et le commentaire du proxy
 * raconte qu'avant l'audit du 2026-07-31, l'invariant était déjà affirmé sans
 * être tenu par les 50 pages d'alors. Ne pas le laisser redevenir une promesse.
 *
 * Exemption : `app/admin/connexion/page.tsx` vit HORS de `(protected)` et ne
 * doit PAS porter la garde — un verrou sur la porte d'entrée. Le test
 * l'asserte explicitement pour que déplacer la page sous `(protected)` casse.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const PROTECTED_DIR = join("app", "admin", "(protected)");

/** Tous les `page.tsx` sous `(protected)`, chemins relatifs au repo. */
function listProtectedPages(): string[] {
	const pages: string[] = [];

	function walk(dir: string) {
		for (const entry of readdirSync(join(REPO_ROOT, dir), { withFileTypes: true })) {
			if (entry.isDirectory()) {
				if (entry.name === "__tests__") continue;
				walk(join(dir, entry.name));
				continue;
			}
			if (entry.name === "page.tsx") pages.push(join(dir, entry.name));
		}
	}

	walk(PROTECTED_DIR);
	return pages.sort();
}

const IMPORT_PATTERN =
	/import\s+\{[^}]*\bassertAdminPage\b[^}]*\}\s+from\s+["']@\/modules\/admin-auth\/lib\/assert-admin-page["']/;
const CALL_PATTERN = /await\s+assertAdminPage\s*\(\s*\)/;

describe("@regression admin-page-auth-guard", () => {
	const pages = listProtectedPages();

	it("scanne un nombre plausible de pages (le test ne doit pas passer à vide)", () => {
		// 33 pages au moment de l'écriture — si tout le dossier bouge, le scan
		// passerait à vide et la garantie serait celle qu'on croit avoir.
		expect(pages.length).toBeGreaterThanOrEqual(30);
	});

	it.each(pages)("%s importe et await assertAdminPage()", (page) => {
		const source = readFileSync(join(REPO_ROOT, page), "utf-8");
		expect(source, `${page} doit importer assertAdminPage`).toMatch(IMPORT_PATTERN);
		expect(source, `${page} doit await assertAdminPage()`).toMatch(CALL_PATTERN);
	});

	it("le layout (protected) porte aussi la garde (chargement dur)", () => {
		// Le layout valide via hasValidAdminSession() directement (il redirige
		// lui-même) — même validation HMAC, mémoïsée par requête.
		const source = readFileSync(join(REPO_ROOT, PROTECTED_DIR, "layout.tsx"), "utf-8");
		expect(source).toMatch(/await\s+hasValidAdminSession\s*\(\s*\)/);
	});

	it("exemption : la page de connexion ne porte PAS la garde", () => {
		const source = readFileSync(join(REPO_ROOT, "app", "admin", "connexion", "page.tsx"), "utf-8");
		expect(source).not.toMatch(CALL_PATTERN);
	});
});
