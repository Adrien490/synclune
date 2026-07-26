/**
 * @regression sku-variant-identity-guard
 *
 * L'identité de variante — (produit × taille × ENSEMBLE de couleurs) — n'a AUCUNE
 * contrainte d'unicité en base, et c'est assumé : la vraie clé dépend d'une table
 * de jointure (`ProductSkuColor`), donc elle n'est pas exprimable en index
 * Postgres sans dénormaliser (colonne de signature + trigger de maintenance).
 * À l'échelle de Synclune — une seule admin qui saisit son catalogue, ~20
 * commandes/mois — cette dénormalisation serait de l'over-engineering.
 *
 * L'invariant repose donc ENTIÈREMENT sur `assertUniqueVariantCombination`
 * (`modules/skus/services/persist-sku-helpers.service.ts`), qui prend un advisory
 * lock transactionnel par produit AVANT de lire les candidats — sans quoi deux
 * créations concurrentes de la même combinaison passeraient toutes les deux.
 *
 * Ce que garde CE fichier : que les trois writers l'APPELLENT toujours.
 * Le comportement de la fonction elle-même est couvert par
 * `modules/skus/services/__tests__/variant-identity-lock.regression.test.ts`
 * (ordre du lock, casse de la taille, égalité de sets de couleurs, exclusion du
 * SKU édité). Mais aucun test ne cassait si l'on SUPPRIMAIT l'appel dans un
 * writer : les tests d'action se contentaient de mocker ses dépendances. Un
 * writer qui perd son appel crée des doublons de variante en silence, et le
 * sélecteur de variante du storefront devient ambigu (deux SKU indistinguables).
 *
 * Audit schéma 2026-07-26.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..");

/**
 * Tout writer qui rend une identité de variante VISIBLE au storefront — donc qui
 * doit passer la garde. Ajouter ici tout nouveau chemin d'écriture ou de
 * publication sur (productId, size, colors).
 *
 * `update-sku-status` en fait partie depuis l'audit 2026-07-26 : il n'écrit pas
 * l'identité, mais il PUBLIE (`isActive: true`) une variante qui peut déjà en
 * porter une en collision — cas produit par `duplicate-sku`.
 */
const VARIANT_WRITERS = [
	"modules/skus/actions/create-sku.ts",
	"modules/skus/actions/update-sku.ts",
	// `restore-sku.ts` retiré (audit « Admin catalogue » 2026-07-26) : action morte,
	// aucune surface UI ne l'appelait, et `ProductSku.deletedAt` n'est posé que par
	// le soft-delete produit — lui-même sans chemin de restauration.
	"modules/skus/actions/update-sku-status.ts",
] as const;

/**
 * Writers volontairement HORS garde, avec leur raison. Toute entrée doit
 * expliquer pourquoi la collision est impossible ou inoffensive.
 */
const EXEMPT_WRITERS = new Map<string, string>([
	[
		"modules/skus/actions/duplicate-sku.ts",
		"Crée délibérément une copie à l'identité identique, mais `isActive: false` + " +
			"`inventory: 0` : invisible du storefront (qui filtre isActive). La collision " +
			"est bloquée au moment de la PUBLICATION par update-sku-status / update-sku.",
	],
	[
		"modules/skus/actions/delete-sku.ts",
		"Soft delete : retire une identité, n'en crée jamais. La garde filtre déjà " +
			"`deletedAt: null`, donc une variante supprimée libère son identité.",
	],
]);

const GUARD = "assertUniqueVariantCombination";

function sourceOf(relPath: string): string {
	return readFileSync(join(REPO_ROOT, relPath), "utf-8");
}

/** Retire commentaires de ligne et de bloc : un appel cité en commentaire ne compte pas. */
function stripComments(src: string): string {
	return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, "");
}

describe("@regression sku-variant-identity-guard — les writers appellent la garde", () => {
	for (const writer of VARIANT_WRITERS) {
		describe(writer, () => {
			const code = stripComments(sourceOf(writer));

			it(`importe ${GUARD}`, () => {
				expect(
					new RegExp(`import[\\s\\S]*?${GUARD}[\\s\\S]*?from`).test(code),
					`${writer} n'importe plus ${GUARD}. Sans cette garde, deux variantes ` +
						`identiques (même produit, même taille, même ensemble de couleurs) ` +
						`peuvent coexister — aucune contrainte DB ne l'empêche.`,
				).toBe(true);
			});

			it(`appelle ${GUARD} avec await`, () => {
				expect(
					new RegExp(`await\\s+${GUARD}\\s*\\(`).test(code),
					`${writer} n'appelle plus \`await ${GUARD}(...)\`. Un appel non-awaité ` +
						`serait pire que pas d'appel : la garde résoudrait après le commit.`,
				).toBe(true);
			});

			it(`appelle la garde à l'intérieur d'une transaction (le lock est transactionnel)`, () => {
				// `pg_advisory_xact_lock` n'est tenu que jusqu'à la fin de la transaction :
				// appelée hors `$transaction`, la garde relâche son lock immédiatement et
				// la sérialisation devient nulle.
				const txStart = code.search(/\$transaction\s*\(/);
				const guardCall = code.search(new RegExp(`await\\s+${GUARD}\\s*\\(`));
				expect(txStart, `${writer} : aucun $transaction trouvé`).toBeGreaterThanOrEqual(0);
				expect(
					guardCall,
					`${writer} appelle ${GUARD} AVANT d'ouvrir la transaction — l'advisory ` +
						`lock (pg_advisory_xact_lock) serait relâché aussitôt et ne sérialiserait rien.`,
				).toBeGreaterThan(txStart);
			});
		});
	}

	it("la garde prend bien un advisory lock transactionnel par produit", () => {
		const guardSrc = stripComments(
			sourceOf("modules/skus/services/persist-sku-helpers.service.ts"),
		);
		// `pg_advisory_xact_lock` (et pas `pg_advisory_lock`) : libéré au commit/rollback,
		// donc impossible de fuiter un lock sur une transaction avortée.
		expect(guardSrc).toContain("pg_advisory_xact_lock");
		expect(
			/pg_advisory_xact_lock[\s\S]{0,120}hashtext/.test(guardSrc),
			"Le lock doit être dérivé du productId (hashtext) pour ne sérialiser que les " +
				"écritures d'un même produit — un lock global sérialiserait tout le catalogue.",
		).toBe(true);
	});

	it("aucun autre writer n'échappe à l'inventaire", () => {
		// Filet : si un nouveau fichier écrit ProductSku.colors/size sans être listé
		// dans VARIANT_WRITERS, il échappe silencieusement aux assertions ci-dessus.
		let raw = "";
		try {
			raw = execSync(
				`git grep -ln -- 'productSku\\.\\(create\\|update\\)\\|productSku: {' modules/skus/actions || true`,
				{ cwd: REPO_ROOT, encoding: "utf-8" },
			);
		} catch {
			raw = "";
		}
		const suspects = raw
			.split("\n")
			.map((l) => l.trim())
			.filter(Boolean)
			.filter((f) => f.endsWith(".ts") && !f.includes("__tests__"))
			.filter((f) => {
				const code = stripComments(sourceOf(f));
				// Ne concerne que les fichiers qui touchent à l'identité de variante.
				return /colors\s*:|size\s*:/.test(code);
			})
			.filter((f) => !VARIANT_WRITERS.includes(f as (typeof VARIANT_WRITERS)[number]))
			.filter((f) => !EXEMPT_WRITERS.has(f));

		expect(
			suspects,
			`Ces fichiers touchent à une identité de variante sans figurer ni dans ` +
				`VARIANT_WRITERS ni dans EXEMPT_WRITERS :\n  ${suspects.join("\n  ")}\n\n` +
				`Soit ils doivent appeler ${GUARD} (→ VARIANT_WRITERS), soit la collision ` +
				`y est impossible/inoffensive (→ EXEMPT_WRITERS + justification).`,
		).toEqual([]);
	});

	it("chaque exemption porte une justification explicite", () => {
		const thin = Array.from(EXEMPT_WRITERS.entries())
			.filter(([, reason]) => reason.trim().length < 40)
			.map(([f]) => f);
		expect(thin, `Justification trop courte : ${thin.join(", ")}`).toEqual([]);
	});

	it("l'exemption de duplicate-sku reste valide : la copie est créée inactive", () => {
		// C'est la SEULE raison pour laquelle duplicate-sku peut se passer de la garde.
		// Si `isActive: false` disparaît, l'exemption devient un trou : la duplication
		// publierait directement deux variantes indistinguables.
		const code = stripComments(sourceOf("modules/skus/actions/duplicate-sku.ts"));
		expect(
			/isActive:\s*false/.test(code),
			"duplicate-sku ne crée plus la copie avec `isActive: false` — son exemption " +
				"de la garde d'identité de variante n'est plus justifiée. Soit rétablir " +
				"`isActive: false`, soit appeler " +
				GUARD +
				" (ce qui ferait échouer toute duplication, la copie étant par nature identique).",
		).toBe(true);
	});
});
