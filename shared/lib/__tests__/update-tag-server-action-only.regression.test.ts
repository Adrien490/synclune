import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression update-tag-route-handler-2026-07-31
 *
 * `updateTag` (next/cache) throw hors Server Action. Next teste la ROUTE en cours
 * d'exécution, pas le module où l'appel est écrit
 * (`node_modules/next/dist/server/web/spec-extension/revalidate.js:53`) :
 *
 *   if (!workStore || workStore.page.endsWith('/route')) { throw ... } // E872
 *
 * Déléguer l'invalidation à un `services/` ne protège donc de rien : invoqué
 * depuis `app/api/cron/<job>/route.ts`, il throw. Ce test verrouille l'invariant
 * au niveau du FICHIER, seul niveau observable statiquement : un fichier sans
 * directive `"use server"` en tête ne peut pas garantir son contexte d'appel et
 * doit passer par `revalidateTagsInBackground` (`@/shared/lib/cache`).
 *
 * Contexte de la régression (audit « usage correct du cache Next.js », 2026-07-31) :
 * la migration intégrale `revalidateTag` → `updateTag` de l'audit 2026-07-06 avait
 * emporté 14 fichiers non-`"use server"` (7 crons, le runner de tâches webhook, la
 * route de téléchargement de facture, le hook Better Auth). Conséquences observées :
 *   - tâche `INVALIDATE_CACHE` post-paiement en `FAILED` silencieux → stock vitrine
 *     périmé jusqu'à 6 h (`catalog.expire`) après une vente ;
 *   - `cleanup-pending-orders` / `reconcile-invoices` en 500 + alerte admin les
 *     jours où ils ont du travail (boucle `updateTag` hors try/catch) ;
 *   - route facture en 503 + flag DLQ parasites.
 *
 * Complémentarité des trois filets — aucun ne remplace les autres :
 *   1. ce scan statique — attrape la réintroduction à la revue, sur TOUT le repo ;
 *   2. `local/no-update-tag-outside-server-action` (ESLint) — même invariant, mais
 *      à l'écriture, avec la position exacte ;
 *   3. `test/contract/cache-invalidation-context.contract.test.ts` — exerce la
 *      VRAIE implémentation Next (sans mock) et prouve que la contrainte existe
 *      toujours après une montée de version.
 *
 * Le mock est ici l'ennemi : 247 fichiers de test font `vi.mock("next/cache")`, où
 * `updateTag` est un `vi.fn()` qui ne throw jamais. C'est pourquoi cet invariant
 * est vérifié sur les SOURCES et non via un test d'exécution mocké.
 */

const REPO_ROOT = process.cwd();

/**
 * Seul fichier autorisé à importer `updateTag` hors `"use server"` : il expose
 * `updateTagsAfterMutation`, dont le nom porte la contrainte. Toute autre entrée
 * ici doit être justifiée en revue — c'est le point du verrou.
 */
const ALLOWLIST = new Set<string>(["shared/lib/cache.ts"]);

/** `import { ..., updateTag, ... } from "next/cache"` */
const STATIC_IMPORT = /import\s*\{[^}]*\bupdateTag\b[^}]*\}\s*from\s*["']next\/cache["']/;
/** `const { updateTag } = await import("next/cache")` — forme anti-cycle du repo */
const DYNAMIC_IMPORT =
	/\{[^}]*\bupdateTag\b[^}]*\}\s*=\s*await\s+import\(\s*["']next\/cache["']\s*\)/;

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
	let entries: string[];
	try {
		entries = readdirSync(dir);
	} catch {
		return acc;
	}
	for (const entry of entries) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			if (entry === "__tests__" || entry === "node_modules") continue;
			collectSourceFiles(full, acc);
		} else if (
			(entry.endsWith(".ts") || entry.endsWith(".tsx")) &&
			!entry.endsWith(".test.ts") &&
			!entry.endsWith(".test.tsx")
		) {
			acc.push(full);
		}
	}
	return acc;
}

function getSourceFiles(): string[] {
	const files: string[] = [];
	for (const root of ["modules", "shared", "app"]) {
		collectSourceFiles(join(REPO_ROOT, root), files);
	}
	return files;
}

/** Retire les commentaires : un `updateTag` cité en JSDoc n'est pas un appel. */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/** `"use server"` en tête de fichier (avant tout import). */
function hasUseServerDirective(source: string): boolean {
	return /^\s*(?:\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*["']use server["']\s*;?/.test(source);
}

function importsUpdateTag(strippedSource: string): boolean {
	return STATIC_IMPORT.test(strippedSource) || DYNAMIC_IMPORT.test(strippedSource);
}

describe("Cache — `updateTag` réservé aux Server Actions", () => {
	const sourceFiles = getSourceFiles();

	it("trouve les fichiers source (sanity — un scan vide passerait pour vert)", () => {
		expect(sourceFiles.length).toBeGreaterThan(50);
	});

	it('aucun fichier hors `"use server"` n\'importe `updateTag` depuis next/cache', () => {
		const offenders: string[] = [];

		for (const file of sourceFiles) {
			const relativePath = relative(REPO_ROOT, file);
			if (ALLOWLIST.has(relativePath)) continue;

			const source = readFileSync(file, "utf-8");
			if (!importsUpdateTag(stripComments(source))) continue;
			if (hasUseServerDirective(source)) continue;

			offenders.push(relativePath);
		}

		expect(
			offenders,
			`Ces fichiers importent \`updateTag\` sans directive "use server" en tête. ` +
				`\`updateTag\` throw (E872) dès qu'ils sont atteints depuis un route handler ` +
				`(cron, webhook, \`after()\`, route API). Utilise \`revalidateTagsInBackground\` ` +
				`de \`@/shared/lib/cache\`.\n  - ${offenders.join("\n  - ")}`,
		).toEqual([]);
	});

	it("les Server Actions gardent bien le droit d'utiliser `updateTag` (contre-épreuve)", () => {
		// Sans cette assertion, une régression du détecteur (regex cassée, scan qui ne
		// trouve plus rien) rendrait le test précédent vert pour de mauvaises raisons.
		const serverActionsUsingUpdateTag = sourceFiles.filter((file) => {
			const source = readFileSync(file, "utf-8");
			return hasUseServerDirective(source) && importsUpdateTag(stripComments(source));
		});

		expect(serverActionsUsingUpdateTag.length).toBeGreaterThan(50);
	});

	it("le détecteur voit les deux formes d'import (contre-épreuve du garde-fou)", () => {
		const staticForm = `import { updateTag } from "next/cache";`;
		const dynamicForm = `const { updateTag } = await import("next/cache");`;
		const namedAlongside = `import { cacheTag, updateTag } from "next/cache";`;
		const unrelated = `import { revalidateTag } from "next/cache";`;

		expect(importsUpdateTag(staticForm)).toBe(true);
		expect(importsUpdateTag(dynamicForm)).toBe(true);
		expect(importsUpdateTag(namedAlongside)).toBe(true);
		expect(importsUpdateTag(unrelated)).toBe(false);
	});

	it("la directive `\"use server\"` n'est reconnue qu'en tête de fichier", () => {
		expect(hasUseServerDirective(`"use server";\nimport x from "y";`)).toBe(true);
		expect(hasUseServerDirective(`// commentaire\n"use server";\n`)).toBe(true);
		expect(hasUseServerDirective(`/* bloc */\n"use server";\n`)).toBe(true);
		// Une Server Action inline en corps de fonction ne rend PAS le fichier
		// entier sûr : le reste du module peut tourner en contexte route handler.
		expect(hasUseServerDirective(`export function f() {\n\t"use server";\n}`)).toBe(false);
	});
});
