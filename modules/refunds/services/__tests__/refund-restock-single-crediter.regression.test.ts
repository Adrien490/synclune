/**
 * @regression STOCK-DOUBLE-CREDIT-001
 *
 * Contrat transverse : **un seul créditeur de stock par remboursement.**
 *
 * `RefundItem.restock` est la SSOT du crédit d'inventaire côté `processRefund`
 * (process-refund.ts:396-455) et de son jumeau asynchrone partagé webhook + cron
 * (finalize-refund.service.ts) — les deux sont mutuellement exclusifs
 * (claim `status: APPROVED`), donc au plus UN des deux crédite.
 *
 * Corollaire : un writer qui restaure le stock LUI-MÊME doit poser `restock: false`
 * sur les `RefundItem` qu'il crée, sinon le stock est crédité deux fois — une fois
 * par lui, une fois quand le remboursement est traité. Le CHECK
 * `ProductSku_inventory_non_negative` ne borne que le plancher : le sur-comptage
 * passe, l'inventaire dépasse le physique, et la boutique survend.
 *
 * C'est exactement le défaut que portait `cancel-order.ts` (`restock:
 * shouldRestoreStock`, soit le même booléen que son restock inline). Ce test
 * généralise la garde : au lieu de verrouiller ce fichier-là, il verrouille la
 * RÈGLE pour tout futur writer.
 *
 * Volontairement borné aux fichiers qui créditent l'inventaire (4 aujourd'hui)
 * plutôt qu'un scan de tous les usages de `restock` : les `select` Prisma, les
 * schémas Zod et les annotations de type en contiennent aussi, et un garde-fou qui
 * hurle sur eux serait désactivé en une semaine (cf. CLAUDE.md, hover-focus-parity).
 */

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

/**
 * Fichiers autorisés à incrémenter `ProductSku.inventory`. Toute addition à cette
 * liste est une décision : le nouveau writer crédite-t-il déjà le stock lui-même,
 * et si oui pose-t-il `restock: false` ?
 */
const DECLARED_INVENTORY_CREDITERS = [
	// Restock inline à l'annulation admin → pose restock:false (ce bug).
	"modules/orders/actions/cancel-order.ts",
	// Consommateur de RefundItem.restock (chemin admin).
	"modules/refunds/actions/process-refund.ts",
	// Consommateur de RefundItem.restock (finalisation asynchrone partagée
	// webhook refund.updated + cron DLQ — P1-C audit 2026-08-01 ; a remplacé le
	// crédit inliné dans reconcile-refunds.service.ts, exclusif du précédent
	// via le claim `status: APPROVED`).
	"modules/refunds/services/finalize-refund.service.ts",
	// restoreStockForOrder + restock inliné dans le claim markOrderAsCancelled.
	"modules/webhooks/services/payment-intent.service.ts",
	// Delta relatif du formulaire d'édition SKU admin (audit intégrité stock
	// 2026-05-29) — ne touche aucun Refund, donc hors sujet double-crédit.
	"modules/skus/actions/update-sku.ts",
	// Formulaire d'ajustement de stock admin (`UPDATE … RETURNING` conditionnel).
	// Détecté depuis que `creditsInventory` reconnaît la forme SQL brute ; ne crée
	// aucun Refund ⇒ hors sujet double-crédit.
	"modules/skus/actions/adjust-sku-stock.ts",
	// Delta relatif du formulaire d'édition PRODUIT admin (audit « SKUs et variantes »
	// 2026-07-30, STOCK-PHANTOM-001) : ce formulaire écrivait le stock en ABSOLU, il
	// applique désormais un `increment` via la même SSOT que `update-sku`
	// (`applyInventoryDeltaTx`). Ne crée ni Refund ni RefundItem ⇒ hors sujet
	// double-crédit, au même titre que son jumeau ci-dessus.
	"modules/products/actions/update-product.ts",
].sort();

/**
 * Nombre de lignes de CODE en amont où l'on considère être dans le même payload
 * RefundItem. Les commentaires et lignes vides ne comptent pas : le correctif de ce
 * bug a justement inséré 20 lignes de commentaire entre `orderItemId:` et
 * `restock:`, ce qui aurait fait passer le discriminant à côté du payload.
 */
const PAYLOAD_PROXIMITY_LINES = 6;

function moduleSourceFiles(): string[] {
	const out = execFileSync("git", ["ls-files", "modules/*.ts", "modules/**/*.ts"], {
		encoding: "utf-8",
	});
	return (
		out
			.split("\n")
			.filter(Boolean)
			.filter((path) => !path.includes("__tests__"))
			// `git ls-files` liste ce qui est SUIVI, y compris un fichier supprimé dans
			// l'arbre de travail mais pas encore indexé. Sans ce filtre, supprimer un
			// service faisait planter la suite entière sur un ENOENT (donc un message
			// illisible au lieu d'un échec d'assertion) jusqu'au `git add`.
			.filter((path) => existsSync(path))
	);
}

/**
 * Un fichier « créditeur » écrit un increment sur `ProductSku.inventory`.
 *
 * Deux formes coexistent depuis STOCK-LEDGER-001 : l'`increment` Prisma, et le
 * `UPDATE "ProductSku" SET "inventory" = "inventory" + …` en SQL brut (adopté là où
 * il faut le `RETURNING` pour journaliser le mouvement). Ne détecter que la première
 * rendait ce garde-fou aveugle aux fichiers convertis — exactement ce qui est arrivé
 * en écrivant ce lot.
 */
function creditsInventory(source: string): boolean {
	const code = stripCommentLines(source);
	const touchesSku = code.includes("productSku") || code.includes('"ProductSku"');
	const incrementsPrisma = code.includes("increment:");
	const incrementsRaw = /"inventory"\s*=\s*"inventory"\s*\+/.test(code);
	return touchesSku && (incrementsPrisma || incrementsRaw);
}

/**
 * Retire les lignes de commentaire avant de scanner.
 *
 * Sans ça, un fichier est détecté « créditeur » parce qu'il DÉCRIT un crédit :
 * `apply-inventory-delta.service.ts` documente explicitement « n'écrit PAS
 * l'inventaire : c'est l'appelant qui pose `inventory: { increment: delta }` », et
 * ce `increment:` de prose suffisait à le faire matcher (son `SELECT … FOR UPDATE`
 * fournissant le `"ProductSku"`). Le garde-fou réclamait alors son inscription dans
 * `DECLARED_INVENTORY_CREDITERS` — ce qui aurait affirmé le contraire de ce que fait
 * le fichier, ET l'aurait dispensé pour toujours de la question « double crédit ? »
 * s'il venait à créditer réellement.
 *
 * Filtre volontairement LIGNE À LIGNE, comme `refundItemRestockValues` ci-dessous :
 * un stripper de commentaires « intelligent » (états de chaîne, regex, template
 * literals) est un nid à faux négatifs — il avait avalé 110 lignes de `proxy.ts` dans
 * un précédent audit. Ici on ne retire que ce qui est indiscutablement de la prose.
 */
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
 * Valeurs de `restock:` appartenant à un payload de création de `RefundItem`.
 *
 * Discriminant : un `orderItemId:` dans les lignes juste avant. C'est ce qui
 * distingue un vrai payload d'un `select` Prisma (`restock: true` sans
 * `orderItemId` à proximité dans un bloc de sélection large), d'un `where`
 * (`where: { refundId, restock: true }`) et d'une annotation de type
 * (`restock: boolean;`).
 */
function refundItemRestockValues(source: string): string[] {
	const lines = source.split("\n");
	const values: string[] = [];

	for (const [index, line] of lines.entries()) {
		const match = /^\s*restock:\s*(.+?),?\s*$/.exec(line);
		if (!match) continue;

		const precedingCode = lines
			.slice(0, index)
			.filter((prev) => {
				const trimmed = prev.trim();
				return trimmed !== "" && !trimmed.startsWith("//") && !trimmed.startsWith("*");
			})
			.slice(-PAYLOAD_PROXIMITY_LINES);

		if (precedingCode.some((prev) => prev.includes("orderItemId:"))) {
			values.push(match[1]!.replace(/,$/, "").trim());
		}
	}

	return values;
}

describe("STOCK-DOUBLE-CREDIT-001 — un seul créditeur de stock par remboursement", () => {
	const files = moduleSourceFiles().map((path) => ({
		path,
		source: readFileSync(path, "utf-8"),
	}));

	// Garde-fou du garde-fou : si un nouveau fichier se met à créditer l'inventaire,
	// ce test échoue jusqu'à ce que quelqu'un l'ajoute à la liste — donc jusqu'à ce
	// que la question « double crédit ? » ait été posée.
	it("la liste des créditeurs d'inventaire est à jour", () => {
		const discovered = files
			.filter(({ source }) => creditsInventory(source))
			.map(({ path }) => path)
			.sort();

		expect(discovered).toEqual(DECLARED_INVENTORY_CREDITERS);
	});

	it("tout créditeur d'inventaire pose restock:false sur les RefundItem qu'il crée", () => {
		const violations: Array<{ path: string; value: string }> = [];

		for (const { path, source } of files) {
			if (!creditsInventory(source)) continue;

			for (const value of refundItemRestockValues(source)) {
				if (value !== "false") violations.push({ path, value });
			}
		}

		expect(violations).toEqual([]);
	});

	// Contre-épreuve : le discriminant trouve bien les payloads qu'il doit trouver.
	// Sans elle, une regex cassée rendrait le test ci-dessus vert sur zéro payload
	// inspecté — le mode d'échec le plus courant de ce genre de garde-fou.
	it("le discriminant détecte les payloads RefundItem réels", () => {
		const cancelOrder = readFileSync("modules/orders/actions/cancel-order.ts", "utf-8");
		expect(refundItemRestockValues(cancelOrder)).toEqual(["false"]);

		const autoRefund = readFileSync("modules/webhooks/services/payment-intent.service.ts", "utf-8");
		expect(refundItemRestockValues(autoRefund)).toEqual(["false"]);

		// …et ignore bien les non-payloads : `restock: boolean` (type) et
		// `where: { refundId, restock: true }` (lecture).
		const processRefund = readFileSync("modules/refunds/actions/process-refund.ts", "utf-8");
		expect(refundItemRestockValues(processRefund)).toEqual([]);

		const reconcile = readFileSync("modules/cron/services/reconcile-refunds.service.ts", "utf-8");
		expect(refundItemRestockValues(reconcile)).toEqual([]);

		// Le contre-exemple « writer légitime avec restock: true » était
		// `request-return.ts` (demande de retour client) : l'article revient
		// physiquement, donc il portait `true` sans créditer lui-même l'inventaire.
		// L'action a été supprimée avec l'espace client (2026-07-31) — les retours
		// passent par l'email de contact puis une action admin. Il ne reste donc
		// aucun writer à `true` dans le repo, et l'invariant se réduit à sa
		// moitié haute : tout créditeur écrit `restock: false`.
	});
});
