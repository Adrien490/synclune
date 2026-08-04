/**
 * @regression STOCK-LEDGER-001
 *
 * Contrat : **toute mutation de `ProductSku.inventory` écrit son `StockMovement`.**
 *
 * Le journal ne couvrait que les ajustements saisis par un admin (`MANUAL_ADJUST`,
 * `SKU_UPDATE`). Les valeurs `ORDER` / `WEBHOOK` / `SYSTEM` de l'enum étaient
 * déclarées « réservées », au motif documenté qu'« à ~20 commandes/mois, un
 * ajustement manuel inexpliqué est la seule cause plausible d'un stock incohérent ».
 *
 * STOCK-DOUBLE-CREDIT-001 a démenti ce raisonnement : `cancel-order` restockait
 * l'inventaire PUIS posait `RefundItem.restock: true`, que `processRefund` honorait —
 * un double crédit sans aucun acteur humain, invisible parce que le `CHECK
 * inventory >= 0` ne borne que le plancher et qu'aucun grand livre ne permettait de
 * réconcilier. Le journal a donc été étendu aux chemins commerce.
 *
 * Ce test empêche la régression inverse de celle qu'on corrige d'habitude : non pas
 * « du code fautif est réintroduit », mais « un NOUVEAU writer d'inventaire oublie de
 * journaliser » — auquel cas le prochain écart redeviendrait inexplicable.
 *
 * Il scanne les sources plutôt que le comportement, parce qu'aucun test unitaire ne
 * peut couvrir un site d'écriture qui n'existe pas encore.
 */

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

/**
 * Écrivains autorisés de `ProductSku.inventory`, avec la raison pour laquelle chacun
 * journalise. Ajouter une ligne ici est une décision : ce writer écrit-il bien son
 * mouvement, et sous quelle `source` ?
 */
const DECLARED_INVENTORY_WRITERS: Record<string, string> = {
	// — Chemins admin (journalisés depuis l'audit intégrité stock 2026-05-29)
	"modules/skus/actions/adjust-sku-stock.ts": "MANUAL_ADJUST",
	"modules/skus/actions/update-sku.ts": "SKU_UPDATE",
	"modules/products/actions/update-product.ts": "SKU_UPDATE",
	// — Chemins commerce (journalisés depuis STOCK-LEDGER-001, 2026-07-30)
	"modules/webhooks/services/checkout-order-processing.service.ts": "ORDER (vente)",
	"modules/orders/actions/mark-as-paid.ts": "ORDER (encaissement manuel)",
	"modules/orders/actions/cancel-order.ts": "ORDER (restock annulation)",
	"modules/webhooks/services/payment-intent.service.ts": "WEBHOOK (restauration)",
	// `modules/refunds/services/finalize-refund.service.ts` a quitté cette liste au
	// Lot 6 (2026-08-03) : `RefundItem.restock` est droppée, plus aucun créateur ne
	// la demandait depuis les remboursements Stripe-first (Lot 2). La finalisation
	// n'écrit donc plus l'inventaire — le restock post-refund est redevenu un
	// ajustement manuel de stock SKU (`adjust-sku-stock`, MANUAL_ADJUST), déjà
	// journalisé. Ce n'est PAS une dispense de journal : c'est une écriture en moins.
};

function moduleSourceFiles(): string[] {
	return (
		execFileSync("git", ["ls-files", "modules/*.ts", "modules/**/*.ts"], {
			encoding: "utf-8",
		})
			.split("\n")
			.filter(Boolean)
			.filter((path) => !path.includes("__tests__"))
			// `git ls-files` liste ce qui est SUIVI, y compris un fichier supprimé dans
			// l'arbre de travail mais pas encore indexé (ENOENT = suite entière rouge,
			// message illisible). Cf. les deux garde-fous jumeaux restock.
			.filter((path) => existsSync(path))
	);
}

/**
 * Un fichier « écrit l'inventaire » s'il porte une mutation de `ProductSku.inventory`,
 * sous l'une des trois formes en usage dans le repo :
 *  - `inventory: { increment: … }` / `{ decrement: … }` (Prisma)
 *  - `SET "inventory" = "inventory" ± …` (SQL brut, quand il faut le `RETURNING`)
 *
 * Exclut délibérément les lectures (`inventory: true` dans un `select`, `inventory:
 * { gte: … }` dans un `where`) et les fixtures.
 */
function writesInventory(source: string): boolean {
	// Strippe la PROSE avant de scanner : `apply-inventory-delta.service.ts` documente
	// explicitement « n'écrit PAS l'inventaire : c'est l'appelant qui pose
	// `inventory: { increment: delta }` », et ce fragment de docstring suffisait à le
	// faire matcher. L'inscrire dans DECLARED_INVENTORY_WRITERS aurait affirmé
	// l'inverse de ce que fait le fichier — et l'aurait dispensé pour toujours de la
	// question « journalise-t-il son mouvement ? » s'il venait à écrire réellement.
	// Même correctif que son garde-fou jumeau `refund-restock-single-crediter`.
	const code = stripCommentLines(source);
	const touchesSku = code.includes("productSku") || code.includes('"ProductSku"');
	if (!touchesSku) return false;

	const prismaMutation = /inventory:\s*\{\s*(increment|decrement):/.test(code);
	const rawMutation = /"inventory"\s*=\s*"inventory"\s*[+-]/.test(code);
	return prismaMutation || rawMutation;
}

/** Filtre ligne à ligne (pas de stripper « intelligent » : nid à faux négatifs). */
function stripCommentLines(source: string): string {
	return source
		.split("\n")
		.filter((line) => {
			const trimmed = line.trim();
			return (
				trimmed !== "" &&
				!trimmed.startsWith("//") &&
				!trimmed.startsWith("*") &&
				!trimmed.startsWith("/*")
			);
		})
		.join("\n");
}

/**
 * Le fichier journalise-t-il son mouvement — directement ou par délégation ?
 *
 * Les deux formulaires admin (`update-sku`, `update-product`) passent par
 * `applyInventoryDeltaTx`, qui prend le `FOR UPDATE`, calcule le delta et appelle
 * `recordStockMovementTx` — mais laisse l'`increment` lui-même à son appelant (cf. le
 * docblock du service). Ils sont donc écrivains ET journalisés, sans contenir le nom
 * du helper. Ne reconnaître que l'appel direct les signalerait à tort.
 */
function recordsMovement(source: string): boolean {
	return source.includes("recordStockMovementTx") || source.includes("applyInventoryDeltaTx");
}

describe("STOCK-LEDGER-001 — toute mutation d'inventaire est journalisée", () => {
	const files = moduleSourceFiles().map((path) => ({
		path,
		source: readFileSync(path, "utf-8"),
	}));

	it("la liste des écrivains d'inventaire est à jour", () => {
		const discovered = files
			.filter(({ source }) => writesInventory(source))
			.map(({ path }) => path)
			.sort();

		expect(discovered).toEqual(Object.keys(DECLARED_INVENTORY_WRITERS).sort());
	});

	it("tout écrivain d'inventaire appelle recordStockMovementTx", () => {
		const silentWriters = files
			.filter(({ source }) => writesInventory(source) && !recordsMovement(source))
			.map(({ path }) => path);

		expect(silentWriters).toEqual([]);
	});

	// Contre-épreuve : sans elle, une regex trop stricte ferait passer les deux
	// assertions ci-dessus sur un ensemble VIDE — le mode d'échec classique d'un
	// garde-fou par scan (déjà rencontré sur ce lot : un discriminant de proximité
	// cassé par les commentaires qu'on venait d'écrire).
	it("le détecteur reconnaît les trois formes de mutation réellement utilisées", () => {
		// Prisma decrement — la vente au webhook.
		expect(
			writesInventory("tx.productSku.update({ data: { inventory: { decrement: qty } } })"),
		).toBe(true);
		// Prisma increment — la restauration de stock.
		expect(
			writesInventory("tx.productSku.update({ data: { inventory: { increment: qty } } })"),
		).toBe(true);
		// SQL brut — les chemins qui ont besoin du RETURNING.
		expect(writesInventory('UPDATE "ProductSku" SET "inventory" = "inventory" + ${qty}')).toBe(
			true,
		);

		// …et ne confond pas une LECTURE avec une écriture.
		expect(writesInventory("productSku.findMany({ select: { inventory: true } })")).toBe(false);
		expect(writesInventory("productSku.updateMany({ where: { inventory: { gte: qty } } })")).toBe(
			false,
		);
		// Ni un fichier qui ne parle pas de SKU du tout.
		expect(writesInventory("order.update({ data: { inventory: { increment: 1 } } })")).toBe(false);
	});
});
