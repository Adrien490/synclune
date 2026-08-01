/**
 * @regression refund-items-unique
 *
 * Deux lignes de remboursement ne peuvent pas porter le même `orderItemId`.
 *
 * ⚠️ `createRefundSchema.items` bornait la TAILLE du tableau (1–100) mais pas
 * l'unicité — contrairement aux lignes de panier au checkout, où l'invariant est
 * explicitement refiné et longuement motivé.
 *
 * La boucle de `create-refund.ts` calcule `availableQuantity` **ligne par ligne
 * depuis la DB**, sans voir les autres lignes de la même requête : deux entrées du
 * même `orderItemId` à `quantity = availableQuantity` passaient chacune leur
 * contrôle, puis cumulaient leur montant. Seul le plafond global
 * `totalAmount > maxRefundable` pouvait les rattraper — ce qui n'arrive pas quand
 * l'article ne pèse qu'une fraction du total de la commande. Aucune contrainte DB
 * n'y fait obstacle non plus : `RefundItem` n'a pas de `@@unique([refundId,
 * orderItemId])`.
 *
 * `process-refund.ts` ré-agrège bien par `orderItemId` avant l'appel Stripe
 * (`ITEM_QUANTITY_EXCEEDS`), mais à ce stade un `Refund` PENDING a déjà été créé
 * pour rien. Le refus doit se faire à l'entrée.
 */

import { describe, expect, it } from "vitest";

import { createRefundSchema } from "../refund.schemas";

const ORDER_ID = "ekxpqzvlyfvmqbhjwvxkzqct";
const ITEM_A = "hqvnzjxlmwtpkbdfrycsuoag";
const ITEM_B = "tzqmkbwrxhcvnlpsdyfgjoae";

const item = (orderItemId: string, amount = 1000) => ({
	orderItemId,
	quantity: 1,
	amount,
	restock: true,
});

const base = { orderId: ORDER_ID, reason: "DEFECTIVE" as const };

describe("@regression createRefundSchema — unicité des orderItemId", () => {
	it("rejette deux lignes portant le même orderItemId", () => {
		const result = createRefundSchema.safeParse({
			...base,
			items: [item(ITEM_A), item(ITEM_A)],
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toMatch(/double/i);
		}
	});

	it("rejette un doublon noyé au milieu de lignes distinctes", () => {
		const result = createRefundSchema.safeParse({
			...base,
			items: [item(ITEM_A), item(ITEM_B), item(ITEM_A, 500)],
		});

		expect(result.success).toBe(false);
	});

	it("accepte des orderItemId distincts (contre-épreuve)", () => {
		const result = createRefundSchema.safeParse({
			...base,
			items: [item(ITEM_A), item(ITEM_B)],
		});

		expect(result.success).toBe(true);
	});

	it("accepte une ligne unique", () => {
		expect(createRefundSchema.safeParse({ ...base, items: [item(ITEM_A)] }).success).toBe(true);
	});

	it("continue de rejeter un tableau vide (borne préexistante toujours en place)", () => {
		expect(createRefundSchema.safeParse({ ...base, items: [] }).success).toBe(false);
	});
});
