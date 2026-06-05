/**
 * Catégorie d'opération e-reporting (EINV-EREPORT-007/F3).
 *
 * `deriveOperationCategory` dérive GOODS/SERVICES/MIXED depuis les catégories
 * snapshotées des lignes ; les builders SALES/REFUND honorent la catégorie passée
 * tout en gardant GOODS comme défaut (zéro régression franchise).
 *
 * Fonctions PURES — aucun mock.
 */
import { describe, expect, it } from "vitest";
import {
	deriveOperationCategory,
	buildSalesTransaction,
	buildRefundTransaction,
	DEFAULT_OPERATION_CATEGORY,
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

describe("deriveOperationCategory", () => {
	it("aucune ligne → GOODS (défaut sûr)", () => {
		expect(deriveOperationCategory([])).toBe("GOODS");
	});

	it("toutes GOODS → GOODS", () => {
		expect(deriveOperationCategory(["GOODS", "GOODS"])).toBe("GOODS");
	});

	it("toutes SERVICES → SERVICES", () => {
		expect(deriveOperationCategory(["SERVICES", "SERVICES"])).toBe("SERVICES");
	});

	it("mélange biens + services → MIXED", () => {
		expect(deriveOperationCategory(["GOODS", "SERVICES"])).toBe("MIXED");
	});

	it("une ligne déjà MIXED → MIXED", () => {
		expect(deriveOperationCategory(["GOODS", "MIXED"])).toBe("MIXED");
	});
});

describe("builders honorent operationCategory (défaut GOODS)", () => {
	it("SALES sans paramètre → GOODS (rétro-compat)", () => {
		expect(buildSalesTransaction({ order: baseOrder }).operationCategory).toBe(
			DEFAULT_OPERATION_CATEGORY,
		);
	});

	it("SALES avec SERVICES → SERVICES", () => {
		expect(
			buildSalesTransaction({ order: baseOrder, operationCategory: "SERVICES" }).operationCategory,
		).toBe("SERVICES");
	});

	it("REFUND avec MIXED → MIXED", () => {
		expect(
			buildRefundTransaction({
				refund: baseRefund,
				order: baseOrder,
				operationCategory: "MIXED",
			}).operationCategory,
		).toBe("MIXED");
	});

	it("la catégorie n'est PAS écrite dans le payloadSnapshot figé (Art. L102 B)", () => {
		const keys = Object.keys(
			buildSalesTransaction({ order: baseOrder, operationCategory: "SERVICES" }).payloadSnapshot,
		);
		expect(keys).not.toContain("operationCategory");
	});
});
