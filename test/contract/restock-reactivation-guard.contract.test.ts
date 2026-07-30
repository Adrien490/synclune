/**
 * @regression STOCK-RESTOCK-REACTIVATE-001
 *
 * Garde-fou STATIQUE : tout chemin qui recrédite `ProductSku.inventory` doit
 * consulter `shouldReactivateAfterRestock`.
 *
 * Pourquoi un scan de sources plutôt qu'un test de comportement — la règle avait déjà
 * une implémentation correcte (`payment-intent.service.ts`) et trois chemins qui
 * l'ignoraient. Aucun test de comportement n'aurait rougi, puisque chaque chemin
 * était vert sur SON propre contrat. Ce qui manquait, c'est l'assertion transverse :
 * « qui crédite du stock connaît-il la règle ? ».
 *
 * Le défaut couvert : le webhook d'encaissement désactive un SKU tombé à
 * `inventory: 0` ; un restock sans réactivation recrédite le stock en laissant
 * l'article invisible (`GET_PRODUCT_SELECT` filtre `isActive: true`), et sur un
 * produit mono-SKU la PDP part en `notFound()` — avec un e-mail « revenu en stock »
 * qui pointe dessus.
 *
 * ⚠️ Ce test est volontairement borné aux fichiers qui **créditent** l'inventaire.
 * Les chemins qui le décrémentent (vente) n'ont rien à réactiver, et un scan de tous
 * les usages de `inventory` hurlerait sur les `select`, les schémas Zod et les
 * filtres — un garde-fou qui hurle est un garde-fou désactivé (cf. CLAUDE.md,
 * hover-focus-parity).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

/**
 * Chemins autorisés à recréditer `ProductSku.inventory`, et statut vis-à-vis de la
 * règle de réactivation. Toute addition est une décision : ce writer peut-il rendre
 * un SKU disponible alors qu'il est resté `isActive: false` ?
 */
const RESTOCK_PATHS = [
	// Annulation admin (restock inline dans le claim CANCELLED).
	"modules/orders/actions/cancel-order.ts",
	// Remboursement admin (consommateur de RefundItem.restock).
	"modules/refunds/actions/process-refund.ts",
	// Rattrapage cron du même remboursement (exclusif du précédent).
	"modules/cron/services/reconcile-refunds.service.ts",
	// restoreStockForOrder + restock inliné du claim markOrderAsCancelled.
	"modules/webhooks/services/payment-intent.service.ts",
].sort();

/**
 * Les formulaires admin d'édition de stock sont EXCLUS : ils appliquent un delta
 * saisi par un humain (`applyInventoryDeltaTx`), qui décide lui-même de `isActive`
 * via son propre champ de formulaire. Réactiver automatiquement y contredirait la
 * saisie de l'admin.
 */
const EXEMPT_INVENTORY_WRITERS = [
	"modules/skus/actions/update-sku.ts",
	"modules/products/actions/update-product.ts",
	"modules/skus/actions/adjust-sku-stock.ts",
	"modules/skus/services/apply-inventory-delta.service.ts",
];

function moduleSourceFiles(): string[] {
	const out = execFileSync("git", ["ls-files", "modules/*.ts", "modules/**/*.ts"], {
		encoding: "utf-8",
	});
	return out
		.split("\n")
		.filter(Boolean)
		.filter((path) => !path.includes("__tests__"));
}

/**
 * Un fichier « recrédite » l'inventaire s'il l'augmente. Deux formes coexistent :
 * l'`increment` Prisma et le `SET "inventory" = "inventory" + …` en SQL brut (adopté
 * là où le `RETURNING` sert à journaliser le mouvement). Ne détecter que la première
 * rendrait ce garde-fou aveugle aux fichiers convertis.
 */
function creditsInventory(source: string): boolean {
	const touchesSku = source.includes("productSku") || source.includes('"ProductSku"');
	const incrementsPrisma = /inventory:\s*\{\s*increment:/.test(source);
	const incrementsRaw = /"inventory"\s*=\s*"inventory"\s*\+/.test(source);
	return touchesSku && (incrementsPrisma || incrementsRaw);
}

/**
 * Le fichier APPELLE-t-il réellement la règle ?
 *
 * ⚠️ Un simple `source.includes("shouldReactivateAfterRestock")` ne suffit pas, et
 * c'est vérifié par la contre-épreuve plus bas : en neutralisant l'appel
 * (`const reactivate = false;`) l'import et les commentaires mentionnant la fonction
 * SUBSISTENT, et le test restait vert sur sa propre documentation. On exige donc la
 * forme APPEL (`identifiant(`), sur une ligne qui n'est ni un commentaire ni un
 * import.
 *
 * Pas de stripping global des commentaires : un stripper naïf avale des lignes
 * légitimes (déjà vu sur `proxy.ts`). Filtrer ligne à ligne suffit ici.
 */
function consultsReactivationRule(source: string): boolean {
	return source.split("\n").some((line) => {
		const trimmed = line.trim();
		if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
			return false;
		}
		if (trimmed.startsWith("import ")) return false;
		return trimmed.includes("shouldReactivateAfterRestock(");
	});
}

describe("STOCK-RESTOCK-REACTIVATE-001 — tout restock consulte la règle de réactivation", () => {
	const files = moduleSourceFiles().map((path) => ({
		path,
		source: readFileSync(path, "utf-8"),
	}));

	// Garde-fou du garde-fou : un nouveau créditeur d'inventaire fait échouer ce test
	// jusqu'à ce que quelqu'un tranche — règle applicable, ou exemption justifiée ?
	it("la liste des chemins de restock est à jour", () => {
		const discovered = files
			.filter(({ source }) => creditsInventory(source))
			.map(({ path }) => path)
			.filter((path) => !EXEMPT_INVENTORY_WRITERS.includes(path))
			.sort();

		expect(discovered).toEqual(RESTOCK_PATHS);
	});

	it.each(RESTOCK_PATHS)("%s consulte shouldReactivateAfterRestock", (path) => {
		const source = readFileSync(path, "utf-8");
		expect(consultsReactivationRule(source)).toBe(true);
	});

	// Contre-épreuve : le détecteur trouve bien ce qu'il doit trouver. Sans elle, un
	// `creditsInventory` cassé rendrait le test ci-dessus vert sur zéro fichier
	// inspecté — le mode d'échec le plus courant de ce genre de garde-fou.
	it("le détecteur reconnaît les deux formes de crédit et rejette un décrément", () => {
		expect(
			creditsInventory("tx.productSku.update({ data: { inventory: { increment: 2 } } })"),
		).toBe(true);
		expect(creditsInventory('UPDATE "ProductSku" SET "inventory" = "inventory" + 3')).toBe(true);
		// Un décrément de vente n'est pas un crédit.
		expect(
			creditsInventory("tx.productSku.update({ data: { inventory: { decrement: 2 } } })"),
		).toBe(false);
		// Un fichier qui ne touche pas ProductSku non plus.
		expect(creditsInventory("data: { inventory: { increment: 1 } }")).toBe(false);
	});

	// Contre-épreuve du détecteur d'appel : c'est CE test qui a rattrapé un
	// garde-fou vert sur son propre commentaire. En neutralisant l'appel dans
	// `reconcile-refunds` (`const reactivate = false;`), l'import et le commentaire
	// restaient — et `includes("shouldReactivateAfterRestock")` passait.
	it("un import ou un commentaire seuls ne comptent PAS comme consultation", () => {
		const importOnly = `import { shouldReactivateAfterRestock } from "@/x";\nconst reactivate = false;`;
		expect(consultsReactivationRule(importOnly)).toBe(false);

		const commentOnly = `// on pourrait utiliser shouldReactivateAfterRestock(sku) ici\nconst r = false;`;
		expect(consultsReactivationRule(commentOnly)).toBe(false);

		const jsdocOnly = ` * cf. shouldReactivateAfterRestock(sku)\nconst r = false;`;
		expect(consultsReactivationRule(jsdocOnly)).toBe(false);

		const realCall = `const reactivate = shouldReactivateAfterRestock(beforeById.get(skuId));`;
		expect(consultsReactivationRule(realCall)).toBe(true);
	});

	it("les exemptions sont réelles (formulaires admin, delta saisi)", () => {
		// Si un fichier exempté cessait de créditer l'inventaire, l'exemption serait du
		// bruit : on la retirerait. Au moins un doit encore créditer.
		const stillCrediting = EXEMPT_INVENTORY_WRITERS.filter((path) => {
			const entry = files.find((f) => f.path === path);
			return entry ? creditsInventory(entry.source) : false;
		});
		expect(stillCrediting.length).toBeGreaterThan(0);
	});
});
