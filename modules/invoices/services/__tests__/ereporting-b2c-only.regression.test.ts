import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * @regression einv-ereport-001-b2c-only
 *
 * Verrouille l'invariant de flux exclusif : une transaction e-reporting de
 * transactions (SALES/REFUND) n'est créée QUE pour `customerType === "B2C"`.
 *
 * Le B2B/B2G domestique relèverait de la facturation électronique structurée
 * (e-invoice transmise à une PDP) : créer en plus une transaction e-reporting
 * pour ces commandes doublonnerait la déclaration DGFiP des mêmes montants
 * (e-invoice ⊕ e-reporting). NB : Synclune est 100 % B2C — le flux B2B/B2G a été
 * supprimé du code au recentrage B2C (2026-05-28), ce gate reste un filet.
 * Toute modification du gate `customerType` dans `record-ereporting.service.ts`
 * doit passer par une review explicite.
 */

const { mockPrisma, mockLogger, mockFeatureFlags } = vi.hoisted(() => ({
	mockPrisma: {
		eReportingTransaction: { findFirst: vi.fn(), create: vi.fn() },
		order: { findUnique: vi.fn() },
		refund: { findUnique: vi.fn() },
	},
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
	mockFeatureFlags: { enable_xml: false, enable_ereporting: true },
}));

vi.mock("@/app/generated/prisma/client", () => ({
	EReportingTransactionType: { SALES: "SALES", REFUND: "REFUND", PAYMENT: "PAYMENT" },
	CustomerType: { B2C: "B2C", B2B: "B2B", B2G: "B2G" },
	Prisma: { PrismaClientKnownRequestError: class extends Error {} },
}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("../../constants/feature-flags", () => ({ INVOICE_FEATURE_FLAGS: mockFeatureFlags }));

import { recordSalesEReporting, recordRefundEReporting } from "../record-ereporting.service";

beforeEach(() => {
	vi.clearAllMocks();
	mockFeatureFlags.enable_ereporting = true;
	mockPrisma.eReportingTransaction.findFirst.mockResolvedValue(null);
});

afterEach(() => {
	mockFeatureFlags.enable_ereporting = false;
});

describe("@regression einv-ereport-001 — e-reporting réservé au B2C", () => {
	it.each(["B2B", "B2G"] as const)(
		"recordSalesEReporting NE crée PAS de transaction pour une vente %s",
		async (customerType) => {
			mockPrisma.order.findUnique.mockResolvedValue({
				id: "order-x",
				orderNumber: "SYN-2026-1000",
				paidAt: new Date("2026-05-27T18:00:00Z"),
				total: 12000,
				taxAmount: 0,
				currency: "EUR",
				paymentMethod: "CARD",
				shippingCountry: "FR",
				customerType,
				stripePaymentIntentId: "pi_x",
			});

			const result = await recordSalesEReporting("order-x");

			expect(result).toBe("skipped");
			expect(mockPrisma.eReportingTransaction.create).not.toHaveBeenCalled();
		},
	);

	it.each(["B2B", "B2G"] as const)(
		"recordRefundEReporting NE crée PAS de transaction pour un avoir %s",
		async (customerType) => {
			mockPrisma.refund.findUnique.mockResolvedValue({
				id: "refund-x",
				orderId: "order-x",
				amount: 3000,
				currency: "EUR",
				processedAt: new Date("2026-05-28T10:00:00Z"),
				reason: "CUSTOMER_REQUEST",
				order: {
					orderNumber: "SYN-2026-1000",
					paymentMethod: "CARD",
					shippingCountry: "FR",
					customerType,
					stripePaymentIntentId: "pi_x",
					total: 3000,
					taxAmount: 0,
				},
			});

			const result = await recordRefundEReporting("refund-x");

			expect(result).toBe("skipped");
			expect(mockPrisma.eReportingTransaction.create).not.toHaveBeenCalled();
		},
	);

	it("recordSalesEReporting crée bien la transaction pour une vente B2C (contre-épreuve)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			id: "order-b2c",
			orderNumber: "SYN-2026-1001",
			paidAt: new Date("2026-05-27T18:00:00Z"),
			total: 12000,
			taxAmount: 0,
			currency: "EUR",
			paymentMethod: "CARD",
			shippingCountry: "FR",
			customerType: "B2C",
			stripePaymentIntentId: "pi_b2c",
			items: [{ operationCategory: "GOODS" }],
		});
		mockPrisma.eReportingTransaction.create.mockResolvedValue({ id: "tx-b2c" });

		const result = await recordSalesEReporting("order-b2c");

		expect(result).toBe("tx-b2c");
		expect(mockPrisma.eReportingTransaction.create).toHaveBeenCalledOnce();
	});
});
