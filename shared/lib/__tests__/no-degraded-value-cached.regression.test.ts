import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression CACHE-DEGRADED-VALUE-001
 *
 * Audit « cache catalogue » (2026-07-31).
 *
 * Contrat : **un `try/catch` ne doit pas vivre dans un scope `"use cache"` quand sa
 * valeur de repli est indiscernable d'une donnée légitime.**
 *
 * Le piège est que le repli *retourne normalement* : Next met donc la valeur
 * dégradée en cache exactement comme un vrai résultat, pour toute la fenêtre du
 * profil. `Promise.allSettled` est la même évasion sans le mot `catch` — c'est
 * par lui que `getNavbarMenuData` a mis des menus vides en cache 24 h sous le
 * radar de ce garde (audit navbar 2026-08-03) ; le scope cache agrégé a été
 * déposé, et la détection couvre désormais les deux formes. Une panne DB d'une
 * seconde pendant un cache miss donnait :
 *
 *  - `getProducts` → catalogue vide pendant 5 min (revalidate `catalog`), 15 min stale ;
 *  - `getCollections` → « aucune collection » jusqu'à **24 h** (profil `reference`) ;
 *  - `getPublicProductCount` → « 0 création » en home ;
 *  - `getMaxProductPrice` → plafond du filtre prix bloqué à 200 €.
 *
 * Aucun de ces états ne se distingue d'une boutique réellement vide — ni pour
 * l'utilisateur, ni pour l'exploitante.
 *
 * ⚠️ ALLOWLIST POSITIVE, volontairement pas un scan repo-wide. Les fetchers de
 * DÉTAIL (`get-product`, `get-collection`, `get-product-type`, `get-sku`) replient
 * sur `null`, qui produit un 404 : c'est un signal, pas un mensonge, et les garder
 * dans le périmètre ferait hurler le garde-fou sur du légitime — la recette pour
 * qu'il soit désactivé en une semaine (même doctrine que `hover-focus-parity`).
 */

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");

/**
 * Fetchers dont la valeur de repli est indiscernable d'une donnée légitime (liste
 * vide, compteur à 0, plafond par défaut). Leur `catch` doit vivre dans le wrapper.
 */
const MUST_NOT_CATCH_INSIDE_CACHE = [
	"modules/products/data/get-products.ts",
	"modules/products/data/get-max-product-price.ts",
	"modules/products/data/get-product-counts-by-status.ts",
	"modules/products/data/get-product-collections.ts",
	"modules/collections/data/get-collections.ts",
	"modules/collections/data/get-collection-options.ts",
	"modules/collections/data/get-collection-counts-by-status.ts",
	"modules/skus/data/fetch-skus.ts",
];

/**
 * Extrait les corps de fonction contenant une directive `"use cache"`, par
 * appariement d'accolades — une heuristique « de la directive à la fin du fichier »
 * confondrait le wrapper et la fonction cachée, et rendrait le test faux-rouge.
 */
function cachedFunctionBodies(source: string): string[] {
	const lines = source.split("\n");
	const bodies: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		if (!/^\s*["']use cache["'];?\s*$/.test(lines[i]!)) continue;

		// Remonter à l'accolade ouvrante de la fonction englobante.
		let open = i;
		while (open >= 0 && !lines[open]!.includes("{")) open--;
		if (open < 0) continue;

		let depth = 0;
		let started = false;
		let end = lines.length - 1;
		for (let k = open; k < lines.length; k++) {
			for (const ch of lines[k]!) {
				if (ch === "{") {
					depth++;
					started = true;
				} else if (ch === "}") depth--;
			}
			if (started && depth <= 0) {
				end = k;
				break;
			}
		}
		bodies.push(lines.slice(open, end + 1).join("\n"));
	}

	return bodies;
}

/** Retire les commentaires : le mot `catch` cité en prose ne doit pas déclencher. */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

describe("CACHE-DEGRADED-VALUE-001 — aucune valeur dégradée mise en cache", () => {
	/**
	 * Garde-fou du garde-fou : si l'extraction rend zéro corps, l'assertion
	 * principale passerait sur rien. On exige que chaque fichier surveillé expose
	 * bien au moins un scope caché.
	 */
	it.each(MUST_NOT_CATCH_INSIDE_CACHE)("%s expose bien un scope caché (sanity)", (rel) => {
		const source = stripComments(readFileSync(join(REPO_ROOT, rel), "utf8"));
		expect(cachedFunctionBodies(source).length).toBeGreaterThan(0);
	});

	it.each(MUST_NOT_CATCH_INSIDE_CACHE)(
		"%s n'a ni catch ni allSettled dans son scope caché",
		(rel) => {
			const source = stripComments(readFileSync(join(REPO_ROOT, rel), "utf8"));
			const offending = cachedFunctionBodies(source).filter((body) =>
				/\bcatch\s*\(|\ballSettled\b/.test(body),
			);

			expect(
				offending.length,
				`\`${rel}\` avale une erreur DANS son scope "use cache" (try/catch ou ` +
					`Promise.allSettled). Le repli retourne normalement, donc Next met la valeur ` +
					`dégradée en cache pour toute la fenêtre du profil — indiscernable d'une ` +
					`donnée légitime. Déplacer le repli dans le wrapper appelant (modèle : ` +
					`\`modules/skus/data/fetch-skus.ts\`).`,
			).toBe(0);
		},
	);

	/**
	 * Contre-épreuve de l'extracteur : sur un fichier synthétique portant un catch
	 * dans le wrapper ET un dans le scope caché, seul le second doit être vu. Sans
	 * elle, un extracteur qui rendrait toujours `[]` ferait passer tout le reste.
	 */
	it("l'extracteur distingue le catch du wrapper de celui du scope caché", () => {
		const wrapperOnly = `
export async function wrap() {
	try {
		return await inner();
	} catch (e) {
		return 0;
	}
}

async function inner() {
	"use cache";
	return prisma.thing.count();
}`;
		expect(cachedFunctionBodies(wrapperOnly).filter((b) => /\bcatch\s*\(/.test(b))).toHaveLength(0);

		const insideCache = `
export async function wrap() {
	return inner();
}

async function inner() {
	"use cache";
	try {
		return await prisma.thing.count();
	} catch (e) {
		return 0;
	}
}`;
		expect(cachedFunctionBodies(insideCache).filter((b) => /\bcatch\s*\(/.test(b))).toHaveLength(1);
	});

	/**
	 * Contre-épreuve `allSettled` : la forme sans `catch` doit être vue elle aussi
	 * (c'est exactement l'évasion de `getNavbarMenuData`, audit navbar 2026-08-03),
	 * et un `allSettled` dans le wrapper ne doit PAS déclencher.
	 */
	it("l'extracteur voit un allSettled dans le scope caché, pas dans le wrapper", () => {
		const detector = (b: string) => /\bcatch\s*\(|\ballSettled\b/.test(b);

		const insideCache = `
export async function wrap() {
	return inner();
}

async function inner() {
	"use cache";
	const [a, b] = await Promise.allSettled([one(), two()]);
	return { a, b };
}`;
		expect(cachedFunctionBodies(insideCache).filter(detector)).toHaveLength(1);

		const wrapperOnly = `
export async function wrap() {
	const [a, b] = await Promise.allSettled([inner(), other()]);
	return { a, b };
}

async function inner() {
	"use cache";
	return prisma.thing.count();
}`;
		expect(cachedFunctionBodies(wrapperOnly).filter(detector)).toHaveLength(0);
	});
});
