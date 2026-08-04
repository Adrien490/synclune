/**
 * @regression STOCK-DOUBLE-CREDIT-001
 *
 * Contrat transverse : **aucun crédit de stock piloté par un remboursement.**
 *
 * Historique : `RefundItem.restock` était la SSOT du crédit d'inventaire à la
 * finalisation d'un refund. `cancel-order.ts` posait `restock: shouldRestoreStock`
 * — le même booléen que son restock inline — et le stock était crédité DEUX fois
 * (le CHECK `ProductSku_inventory_non_negative` ne borne que le plancher : le
 * sur-comptage passe, l'inventaire dépasse le physique, la boutique survend).
 *
 * Depuis le Lot 6 (2026-08-03), la colonne `RefundItem.restock` est DROPPÉE et
 * `finalize-refund.service.ts` ne touche plus à l'inventaire : le vecteur de
 * double crédit est structurellement mort, et tout restock post-refund est un
 * ajustement manuel de stock SKU. Ce test verrouille ce nouvel état :
 *
 * 1. la liste fermée des créditeurs d'inventaire (aucun chemin refund n'y figure) ;
 * 2. aucun payload de création `RefundItem` ne porte de champ `restock` — en
 *    réintroduire un sans re-poser la question du double crédit est une régression.
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
	// Restock inline à l'annulation admin (unique crédit lié à une annulation —
	// le Refund créé ensuite ne déclenche plus rien, cf. en-tête).
	"modules/orders/actions/cancel-order.ts",
	// finalize-refund.service.ts est SORTI de cette liste au Lot 6 : la
	// finalisation d'un refund ne crédite plus l'inventaire (RefundItem.restock
	// droppée). L'y réinscrire = réintroduire un créditeur refund, donc re-poser
	// TOUTE la question du double crédit avec cancel-order.
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

	// Lot 6 : la colonne est droppée — AUCUN payload RefundItem ne doit porter
	// `restock`, quel que soit le fichier. Un `restock:` qui réapparaît dans un
	// payload de création signifie qu'on a ré-ajouté la colonne sans re-poser la
	// question du double crédit.
	it("aucun payload de création RefundItem ne porte de champ restock", () => {
		const violations: Array<{ path: string; value: string }> = [];

		for (const { path, source } of files) {
			for (const value of refundItemRestockValues(source)) {
				violations.push({ path, value });
			}
		}

		expect(violations).toEqual([]);
	});

	// Contre-épreuve : le discriminant trouve bien les payloads qu'il doit trouver.
	// Sans elle, une regex cassée rendrait le test ci-dessus vert sur zéro payload
	// inspecté — le mode d'échec le plus courant de ce genre de garde-fou. Plus
	// aucun payload réel n'existe dans le repo (c'est le point du Lot 6) : la
	// contre-épreuve porte sur une fixture synthétique reproduisant la forme
	// exacte des anciens payloads de cancel-order.
	it("le discriminant détecte un payload RefundItem (fixture synthétique)", () => {
		const fixture = [
			"\t\t\t\t\t\t\t\tcreate: found.items.map((item) => ({",
			"\t\t\t\t\t\t\t\t\torderItemId: item.id,",
			"\t\t\t\t\t\t\t\t\tquantity: item.quantity,",
			"\t\t\t\t\t\t\t\t\tamount: item.price * item.quantity,",
			"\t\t\t\t\t\t\t\t\trestock: false,",
			"\t\t\t\t\t\t\t\t})),",
		].join("\n");
		expect(refundItemRestockValues(fixture)).toEqual(["false"]);

		// …et ignore bien les non-payloads : un `where` de lecture sans
		// `orderItemId:` à proximité.
		const nonPayload = [
			"\t\tconst refundItems = await tx.refundItem.findMany({",
			"\t\t\twhere: { refundId, restock: true },",
			"\t\t});",
		].join("\n");
		expect(refundItemRestockValues(nonPayload)).toEqual([]);
	});
});
