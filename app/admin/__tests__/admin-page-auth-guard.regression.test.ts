/**
 * @regression admin-page-self-guard — chaque page admin porte sa propre garde
 *
 * Invariant : toute `page.tsx` sous `app/admin/` appelle `assertAdminPage()`.
 *
 * ## Le défaut corrigé (audit « Admin role & re-check DB », 2026-07-31)
 *
 * `proxy.ts` (étape 4) laisse passer une requête vers `/admin` dès que le
 * cookie-cache Better Auth a expiré — il ne connaît alors plus le rôle. Ce
 * fail-open est délibéré et documenté, mais il s'appuie sur une promesse écrite
 * dans son propre commentaire : « les pages/actions admin DOIVENT toujours
 * utiliser `requireAdmin()` ». Au moment de l'audit, **0 des 50 pages admin** ne
 * le faisait : la seule garde de toute la surface était `app/admin/layout.tsx`.
 *
 * Or un layout partagé n'est pas ré-exécuté lors d'une navigation client entre
 * deux routes qui le partagent (rendu partiel de l'App Router — c'est pourquoi la
 * doc Next.js déconseille de placer l'autorisation dans un layout). La garde ne
 * couvrait donc de façon certaine que le chargement dur.
 *
 * ## Pourquoi cette forme, et pas « vérifier que les fetchers sont gardés »
 *
 * Parce que la réponse « ce fetcher est-il sensible ? » n'a pas de réponse
 * mécanique. `getMaterialOptions()` est consommé par `/admin/catalogue/produits`
 * ET par les filtres publics de `/produits` : le garder viderait la vitrine.
 * `getProducts()` ne refuse pas, il *force* `status: PUBLIC` pour un non-admin.
 * `getDiscounts()`, lui, doit refuser sec. Trois sémantiques, une allowlist à
 * arbitrer fetcher par fetcher, et un garde-fou qu'on finit par désactiver.
 *
 * La garde au niveau page n'a besoin d'aucun de ces arbitrages : une ligne, zéro
 * exemption, et le coût est nul (`getSession()` et `fetchUserForAuth()` sont tous
 * deux mémoïsés par `cache()` sur la durée de la requête, donc layout + page +
 * fetchers partagent la même lecture).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const ADMIN_DIR = join(REPO_ROOT, "app", "admin");

const GUARD_CALL = /\bassertAdminPage\s*\(\s*\)/;
const GUARD_IMPORT =
	/import\s+\{[^}]*\bassertAdminPage\b[^}]*\}\s+from\s+["']@\/modules\/auth\/lib\/assert-admin-page["']/;

function collectAdminPages(): string[] {
	const pages: string[] = [];

	function walk(absDir: string) {
		for (const entry of readdirSync(absDir)) {
			if (entry === "__tests__") continue;
			const abs = join(absDir, entry);
			if (statSync(abs).isDirectory()) {
				walk(abs);
				continue;
			}
			if (entry !== "page.tsx") continue;
			pages.push(relative(REPO_ROOT, abs).split(sep).join("/"));
		}
	}

	walk(ADMIN_DIR);
	return pages.sort();
}

describe("@regression admin-page-self-guard", () => {
	const pages = collectAdminPages();

	it("finds the admin pages (sanity — un walker cassé passerait à vide)", () => {
		// 50 pages au 2026-07-31. Le seuil est bas pour ne pas rougir à chaque
		// ajout/retrait de page, mais non nul pour attraper un walker cassé.
		expect(pages.length).toBeGreaterThanOrEqual(40);
	});

	it("every admin page calls assertAdminPage()", () => {
		const offenders = pages.filter((relativePath) => {
			const source = readFileSync(join(REPO_ROOT, relativePath), "utf-8");
			return !GUARD_CALL.test(source) || !GUARD_IMPORT.test(source);
		});

		expect(
			offenders,
			`Ces pages admin n'ont aucune garde propre — elles ne sont protégées que par ` +
				`app/admin/layout.tsx, qu'une navigation client ne ré-exécute pas, et par le ` +
				`pré-filtre fail-open de proxy.ts.\n` +
				`Ajouter en première instruction du composant :\n` +
				`  await assertAdminPage();\n` +
				`  // import { assertAdminPage } from "@/modules/auth/lib/assert-admin-page";\n` +
				`Fautives : ${offenders.join(", ")}`,
		).toEqual([]);
	});

	it("assertAdminPage delegates to a DB-verified helper", () => {
		// L'invariant ne vaut que si le helper re-vérifie en base. S'il repassait à
		// une lecture du rôle du cookie, les 50 gardes ci-dessus deviendraient
		// décoratives d'un coup — et ce fichier continuerait de passer.
		const source = readFileSync(join(REPO_ROOT, "modules/auth/lib/assert-admin-page.ts"), "utf-8");

		expect(source).toMatch(
			/import\s+\{[^}]*\brequireAdminWithUser\b[^}]*\}\s+from\s+["']@\/modules\/auth\/lib\/require-auth["']/,
		);
		expect(source).toMatch(/\brequireAdminWithUser\s*\(\s*\)/);
	});

	it("the admin layout keeps its own guard (la page est un filet, pas un remplacement)", () => {
		// Le layout reste la garde du chargement dur : c'est lui qui produit la
		// redirection propre vers /connexion et qui alimente le chrome admin.
		const source = readFileSync(join(REPO_ROOT, "app/admin/layout.tsx"), "utf-8");
		expect(source).toMatch(/\brequireAdminWithUser\s*\(\s*\)/);
	});
});
