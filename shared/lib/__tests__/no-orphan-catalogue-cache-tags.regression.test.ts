import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

/**
 * @regression CACHE-CATALOG-ORPHAN-TAGS-001
 *
 * Audit « cache catalogue » (2026-07-31).
 *
 * Contrat : **un tag n'existe que s'il a un LECTEUR et un MUTATEUR.** Les deux
 * orphelins possibles sont silencieux, et le repo avait les deux :
 *
 *  - `SKUS(productId)` et `SKU_DETAIL(sku)` étaient invalidés par une dizaine de
 *    mutateurs, et posés par personne : leurs uniques poseurs (`cacheProductSkus`,
 *    `cacheSkuDetail`) n'avaient aucun appelant en production. Dix invalidations
 *    dans le vide, plus une régression (`inventory-invalidation-covers-reader`) qui
 *    vérifiait la couverture de ce lecteur fantôme.
 *  - `recent-searches-list` était émis par trois Server Actions alors que
 *    `get-recent-searches.ts` est une lecture de cookie délibérément NON cachée.
 *
 * `cache-scoping.regression.test.ts` ne peut pas les voir : son invariant 4 vérifie
 * qu'un fichier `"use cache"` pose UN tag, jamais qu'un tag donné est lu ou busté.
 *
 * Méthode : on compare les FABRIQUES de tags déclarées dans les SSOT catalogue aux
 * fabriques réellement citées côté lecteur (`cacheTag(...)`) et côté mutateur
 * (helpers d'invalidation + `updateTag`/`revalidateTag` directs). On raisonne sur le
 * nom symbolique (`PRODUCTS_CACHE_TAGS.SKUS`), pas sur la valeur produite : le repo
 * interdit déjà les littéraux au point d'appel, et un `X.DETAIL(id)` posé avec une
 * forme d'argument et invalidé avec une autre reste invisible à une comparaison de
 * chaînes.
 */

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");

/** Fichiers de production (hors tests, hors code généré) — même marche que `cache-scoping`. */
function collectSources(dir: string, acc: string[] = []): string[] {
	let entries: string[];
	try {
		entries = readdirSync(dir);
	} catch {
		return acc;
	}
	for (const entry of entries) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			if (entry === "__tests__" || entry === "node_modules" || entry === "generated") continue;
			collectSources(full, acc);
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

function productionSources(): string[] {
	const files: string[] = [];
	for (const root of ["modules", "shared", "app"]) {
		collectSources(join(REPO_ROOT, root), files);
	}
	return files;
}

/** Membres déclarés sur un objet `X_CACHE_TAGS = { … } as const`. */
function declaredMembers(source: string, objectName: string): string[] {
	const block = new RegExp(`export const ${objectName} = \\{([\\s\\S]*?)\\n\\} as const;`).exec(
		source,
	);
	if (!block) return [];
	return [...block[1]!.matchAll(/^\t(\w+):/gm)].map((m) => m[1]!);
}

const SOURCES = productionSources().map((path) => ({ path, text: readFileSync(path, "utf8") }));
const ALL_TEXT = SOURCES.map((s) => s.text).join("\n");

/** Le corps de tous les appels `cacheTag(...)` du repo — donc le côté LECTEUR. */
const READER_TEXT = [...ALL_TEXT.matchAll(/cacheTag\(([\s\S]*?)\)\s*;/g)]
	.map((m) => m[1]!)
	.join("\n");

/**
 * Le côté MUTATEUR : les helpers `getXxxInvalidationTags` (qui composent les listes
 * poussées à `updateTag`/`revalidateTag`) et les invalidations écrites en direct.
 * On prend le texte des fichiers `utils/cache.utils.ts` / `constants/cache.ts` plus
 * tout appel direct — c'est là que vivent les seules mentions d'un tag côté écriture.
 */
const MUTATOR_TEXT = SOURCES.filter(
	(s) =>
		/(utils\/cache\.utils|constants\/cache)\.ts$/.test(s.path) ||
		/actions\/|services\//.test(s.path),
)
	.map((s) => s.text)
	.join("\n");

const CATALOGUE_TAG_OBJECTS = [
	{
		name: "PRODUCTS_CACHE_TAGS",
		file: join(REPO_ROOT, "modules/products/constants/cache.ts"),
		/** Aucun tag posé sans lecteur aujourd'hui. */
		knownPosterless: [] as string[],
		/**
		 * Plus aucun écart : `RELATED_USER` — le seul toléré, orphelin d'invalidation
		 * assumé — est parti avec le carrousel personnalisé et `Order.userId`
		 * (audit schéma V1, 2026-08-05).
		 */
		knownMutatorless: [] as string[],
	},
	{
		name: "COLLECTIONS_CACHE_TAGS",
		file: join(REPO_ROOT, "modules/collections/constants/cache.ts"),
		knownPosterless: [] as string[],
		knownMutatorless: [] as string[],
	},
	// Les 4 SSOT suivantes étaient hors périmètre jusqu'à l'audit 2026-08-01
	// (vérifiées manuellement : 0 orphelin) — le filet doit le GARDER vrai.
	{
		name: "COLORS_CACHE_TAGS",
		file: join(REPO_ROOT, "modules/colors/constants/cache.ts"),
		knownPosterless: [] as string[],
		knownMutatorless: [] as string[],
	},
	{
		name: "MATERIALS_CACHE_TAGS",
		file: join(REPO_ROOT, "modules/materials/constants/cache.ts"),
		knownPosterless: [] as string[],
		knownMutatorless: [] as string[],
	},
	{
		name: "PRODUCT_TYPES_CACHE_TAGS",
		file: join(REPO_ROOT, "modules/product-types/constants/cache.ts"),
		knownPosterless: [] as string[],
		knownMutatorless: [] as string[],
	},
	{
		name: "RECENT_PRODUCTS_CACHE_TAGS",
		file: join(REPO_ROOT, "modules/products/constants/cache.ts"),
		knownPosterless: [] as string[],
		knownMutatorless: [] as string[],
	},
] as const;

describe("CACHE-CATALOG-ORPHAN-TAGS-001 — aucun tag catalogue orphelin", () => {
	it("trouve les sources et les SSOT de tags (sanity)", () => {
		expect(SOURCES.length).toBeGreaterThan(100);
		expect(READER_TEXT.length).toBeGreaterThan(0);
		for (const { name, file } of CATALOGUE_TAG_OBJECTS) {
			expect(declaredMembers(readFileSync(file, "utf8"), name).length).toBeGreaterThan(0);
		}
	});

	it.each(CATALOGUE_TAG_OBJECTS)(
		"$name — chaque tag déclaré est POSÉ par au moins un lecteur",
		({ name, file, knownPosterless }) => {
			const members = declaredMembers(readFileSync(file, "utf8"), name);
			const orphans = members.filter(
				(member) => !knownPosterless.includes(member) && !READER_TEXT.includes(`${name}.${member}`),
			);

			expect(
				orphans,
				`Tags déclarés dans ${name} mais posés par aucun cacheTag() :\n  ${orphans.join(
					"\n  ",
				)}\n\nSoit un lecteur les pose, soit ils doivent être supprimés — avec leurs ` +
					`sites d'invalidation. C'est le défaut qui a laissé SKUS/SKU_DETAIL invalidés ` +
					`par ~10 mutateurs et posés par personne.`,
			).toEqual([]);
		},
	);

	it.each(CATALOGUE_TAG_OBJECTS)(
		"$name — chaque tag déclaré est INVALIDÉ par au moins un mutateur",
		({ name, file, knownMutatorless }) => {
			const members = declaredMembers(readFileSync(file, "utf8"), name);
			const orphans = members.filter((member) => {
				if (knownMutatorless.includes(member)) return false;
				// Une mention dans un fichier d'invalidation / action / service.
				return !new RegExp(`${name}\\.${member}\\b`).test(MUTATOR_TEXT);
			});

			expect(
				orphans,
				`Tags déclarés dans ${name} que personne n'invalide :\n  ${orphans.join("\n  ")}\n\n` +
					`Une entrée cachée sous un tag jamais busté ne se rafraîchit qu'à expiration ` +
					`du profil.`,
			).toEqual([]);
		},
	);

	/**
	 * Contre-épreuve : les deux assertions ci-dessus passeraient sur un ensemble vide
	 * de membres (mauvaise regex, fichier renommé). On vérifie qu'un tag connu est
	 * bien vu des deux côtés — si celle-ci casse, les deux précédentes sont aveugles.
	 */
	it("garde-fou du garde-fou : un tag connu est vu côté lecteur ET côté mutateur", () => {
		expect(READER_TEXT).toContain("PRODUCTS_CACHE_TAGS.SKUS_LIST");
		expect(MUTATOR_TEXT).toContain("PRODUCTS_CACHE_TAGS.SKUS_LIST");
	});

	/**
	 * Le tag cookie supprimé ne doit pas revenir sans lecteur. On cible le CODE, pas
	 * le texte brut : les commentaires qui documentent le retrait citent forcément le
	 * nom du tag, et une assertion `not.toContain` sur tout le repo rougirait dessus.
	 */
	it("recent-searches-list n'est plus posé ni invalidé", () => {
		const offenders = SOURCES.filter(({ text }) => {
			const code = text.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
			return (
				/getRecentSearchesInvalidationTags/.test(code) ||
				/["'`]recent-searches-list["'`]/.test(code)
			);
		}).map(({ path }) => path.replace(REPO_ROOT, ""));

		expect(offenders, `Fichiers citant encore le tag :\n  ${offenders.join("\n  ")}`).toEqual([]);
	});
});
