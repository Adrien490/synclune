/**
 * @regression ereporting-vat-breakdown
 *
 * Verrouille la ventilation TVA + catégorie d'opération e-reporting (DORMANT —
 * préparation sortie de franchise, EINV-EREPORT-007). Garanties :
 *  - **Zéro régression franchise** : `taxAmount === 0` ⇒ `vatBreakdown` null,
 *    `operationCategory` GOODS, et le `payloadSnapshot` (forme figée 10 ans,
 *    Art. L102 B LPF) reste SANS clé `vatBreakdown`/`operationCategory`.
 *  - **Aucun taux réglementaire codé en dur** : la ventilation est data-driven,
 *    `buildVatBreakdown` n'invente jamais de taux.
 *  - **Agrégation batch correcte** : `mergeVatBreakdowns` somme par taux et
 *    conserve l'invariant Σ(lignes) = totaux.
 *
 * Fonctions PURES — aucun mock Prisma nécessaire.
 */
import { describe, expect, it } from "vitest";
import {
	buildSalesTransaction,
	buildRefundTransaction,
	buildVatBreakdown,
	mergeVatBreakdowns,
	parseVatBreakdown,
	DEFAULT_OPERATION_CATEGORY,
	type VatBreakdownLine,
} from "../build-ereporting-transaction";

const baseOrder = {
	id: "order_1",
	orderNumber: "SYN-2026-00001",
	paidAt: new Date("2026-03-15T10:00:00.000Z"),
	total: 5000,
	taxAmount: 0,
	currency: "EUR",
	paymentMethod: "CARD" as const,
	shippingCountry: "FR",
	customerType: "B2C" as const,
	stripePaymentIntentId: "pi_123",
};

const baseRefund = {
	id: "refund_1",
	orderId: "order_1",
	amount: 2000,
	currency: "EUR",
	processedAt: new Date("2026-03-20T10:00:00.000Z"),
	reason: "Defectueux",
};

describe("e-reporting vatBreakdown — franchise (DORMANT, zéro régression)", () => {
	it("SALES franchise → vatBreakdown null, operationCategory GOODS, taxAmount 0", () => {
		const p = buildSalesTransaction({ order: baseOrder });
		expect(p.vatBreakdown).toBeNull();
		expect(p.operationCategory).toBe("GOODS");
		expect(p.taxAmount).toBe(0);
	});

	it("REFUND franchise → vatBreakdown null, operationCategory GOODS", () => {
		const p = buildRefundTransaction({ refund: baseRefund, order: baseOrder });
		expect(p.vatBreakdown).toBeNull();
		expect(p.operationCategory).toBe("GOODS");
	});

	it("payloadSnapshot ne contient NI vatBreakdown NI operationCategory (forme figée)", () => {
		const salesKeys = Object.keys(buildSalesTransaction({ order: baseOrder }).payloadSnapshot);
		expect(salesKeys).not.toContain("vatBreakdown");
		expect(salesKeys).not.toContain("operationCategory");
		const refundKeys = Object.keys(
			buildRefundTransaction({ refund: baseRefund, order: baseOrder }).payloadSnapshot,
		);
		expect(refundKeys).not.toContain("vatBreakdown");
		expect(refundKeys).not.toContain("operationCategory");
	});

	it("DEFAULT_OPERATION_CATEGORY vaut GOODS (réalité Synclune)", () => {
		expect(DEFAULT_OPERATION_CATEGORY).toBe("GOODS");
	});
});

describe("buildVatBreakdown — data-driven, aucun taux en dur", () => {
	it("taxAmount 0 → null même si des lignes sont fournies (franchise prioritaire)", () => {
		expect(buildVatBreakdown(0, [{ rate: 2000, baseExclTax: 5000, taxAmount: 1000 }])).toBeNull();
	});

	it("taxAmount > 0 sans lignes source → null (donnée per-taux pas encore câblée)", () => {
		expect(buildVatBreakdown(1000)).toBeNull();
	});

	it("taxAmount > 0 avec lignes → renvoie exactement les lignes fournies", () => {
		const lines: VatBreakdownLine[] = [{ rate: 2000, baseExclTax: 5000, taxAmount: 1000 }];
		expect(buildVatBreakdown(1000, lines)).toEqual(lines);
	});
});

describe("mergeVatBreakdowns — agrégation batch par taux", () => {
	it("toutes les entrées null (franchise) → null", () => {
		expect(mergeVatBreakdowns([null, null])).toBeNull();
	});

	it("somme par taux + tri croissant", () => {
		const a: VatBreakdownLine[] = [
			{ rate: 2000, baseExclTax: 1000, taxAmount: 200 },
			{ rate: 550, baseExclTax: 2000, taxAmount: 110 },
		];
		const b: VatBreakdownLine[] = [{ rate: 2000, baseExclTax: 500, taxAmount: 100 }];
		expect(mergeVatBreakdowns([a, null, b])).toEqual([
			{ rate: 550, baseExclTax: 2000, taxAmount: 110 },
			{ rate: 2000, baseExclTax: 1500, taxAmount: 300 },
		]);
	});

	it("invariant somme : Σ baseExclTax / Σ taxAmount conservés après merge", () => {
		const lines: VatBreakdownLine[] = [
			{ rate: 2000, baseExclTax: 1000, taxAmount: 200 },
			{ rate: 550, baseExclTax: 2000, taxAmount: 110 },
		];
		const merged = mergeVatBreakdowns([lines]);
		expect(merged).not.toBeNull();
		const sumBase = merged!.reduce((s, l) => s + l.baseExclTax, 0);
		const sumTax = merged!.reduce((s, l) => s + l.taxAmount, 0);
		expect(sumBase).toBe(3000);
		expect(sumTax).toBe(310);
	});

	it("supporte les montants signés (REFUND négatifs)", () => {
		const refundLines: VatBreakdownLine[] = [{ rate: 2000, baseExclTax: -1667, taxAmount: -333 }];
		expect(mergeVatBreakdowns([refundLines])).toEqual(refundLines);
	});
});

describe("réconciliation Σ(lignes) = totaux transaction (sortie de franchise, DORMANT)", () => {
	// Aucune contrainte DB n'exprime cette cohérence (CHECK jsonb se limite à
	// `jsonb_typeof = 'array'`). Garde forward-looking : le jour où OrderItem.taxRate
	// est câblé (sortie de franchise), Σ des lignes DOIT réconcilier avec les champs
	// globaux de la transaction (taxAmount / amountExclTax). Ce test verrouille
	// l'invariant attendu sur une ventilation construite à la main.
	it("Σ line.taxAmount === transaction.taxAmount et Σ line.baseExclTax === amountExclTax", () => {
		const transactionTaxAmount = 1100;
		const transactionAmountExclTax = 6000;
		const lines: VatBreakdownLine[] = [
			{ rate: 2000, baseExclTax: 5000, taxAmount: 1000 },
			{ rate: 550, baseExclTax: 1000, taxAmount: 100 },
		];

		const breakdown = buildVatBreakdown(transactionTaxAmount, lines);
		expect(breakdown).not.toBeNull();

		const sumTax = breakdown!.reduce((s, l) => s + l.taxAmount, 0);
		const sumBase = breakdown!.reduce((s, l) => s + l.baseExclTax, 0);
		expect(sumTax).toBe(transactionTaxAmount);
		expect(sumBase).toBe(transactionAmountExclTax);
	});
});

describe("parseVatBreakdown — lecture DB tolérante", () => {
	it("null / undefined → null", () => {
		expect(parseVatBreakdown(null)).toBeNull();
		expect(parseVatBreakdown(undefined)).toBeNull();
	});

	it("forme invalide → null (legacy/corruption, sans crash d'agrégation)", () => {
		expect(parseVatBreakdown({ rate: 2000 })).toBeNull();
		expect(parseVatBreakdown([{ rate: "x", baseExclTax: 1, taxAmount: 1 }])).toBeNull();
		expect(parseVatBreakdown([])).toBeNull();
	});

	it("tableau valide → parsé tel quel", () => {
		const v = [{ rate: 2000, baseExclTax: 5000, taxAmount: 1000 }];
		expect(parseVatBreakdown(v)).toEqual(v);
	});
});
