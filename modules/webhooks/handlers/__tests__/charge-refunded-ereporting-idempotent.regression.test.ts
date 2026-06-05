/**
 * @regression charge-refunded-ereporting-idempotent
 *
 * Idempotence e-reporting REFUND : si Stripe replay `refund.updated` (DLQ
 * retry-webhooks, replay manuel via Stripe CLI, hors-ordre cross-instance
 * Vercel), `recordRefundEReporting()` doit court-circuiter sur le findFirst
 * `(refundId, type=REFUND)` et NE PAS créer une seconde EReportingTransaction.
 *
 * EINV-TEST-018 — verrouille la garantie déjà énoncée par
 * record-ereporting.service.ts:91-95.
 *
 * Note : appel direct du service. Le webhook lui-même n'appelle pas
 * `recordRefundEReporting` (déclenché par `processRefund` admin + cron
 * `reconcile-refunds`). On valide la propriété d'idempotence du service
 * partagé pour tous les chemins de replay (webhook DLQ, cron, admin re-click).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockFeatureFlags, mockBuildRefundTransaction } = vi.hoisted(() => ({
	mockPrisma: {
		eReportingTransaction: { findFirst: vi.fn(), create: vi.fn() },
		refund: { findUnique: vi.fn() },
	},
	mockFeatureFlags: { enable_ereporting: true, enable_xml: false },
	mockBuildRefundTransaction: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/modules/invoices/constants/feature-flags", () => ({
	INVOICE_FEATURE_FLAGS: mockFeatureFlags,
}));

vi.mock("@/modules/invoices/services/build-ereporting-transaction", () => ({
	buildSalesTransaction: vi.fn(),
	buildRefundTransaction: mockBuildRefundTransaction,
	deriveOperationCategory: vi.fn(() => "GOODS"),
}));

vi.mock("@/app/generated/prisma/client", () => {
	class FakePrismaClientKnownRequestError extends Error {
		code: string;
		meta?: { target?: string | string[] };
		constructor(message: string, opts: { code: string; meta?: { target?: string | string[] } }) {
			super(message);
			this.code = opts.code;
			this.meta = opts.meta;
		}
	}
	return {
		EReportingTransactionType: {
			SALES: "SALES",
			REFUND: "REFUND",
			PAYMENT: "PAYMENT",
		},
		CustomerType: { B2C: "B2C", B2B: "B2B", B2G: "B2G" },
		Prisma: { PrismaClientKnownRequestError: FakePrismaClientKnownRequestError },
	};
});

import { recordRefundEReporting } from "@/modules/invoices/services/record-ereporting.service";

const REFUND_ID = "refund-replay-1";
const SAMPLE_PAYLOAD = {
	orderId: null,
	refundId: REFUND_ID,
	type: "REFUND" as const,
	occurredAt: new Date("2026-05-28T10:00:00Z"),
	countryCode: "FR",
	paymentMethod: "card",
	amountIncTax: -4999,
	amountExclTax: -4999,
	taxAmount: 0,
	currency: "EUR",
	payloadSnapshot: { parentOrderNumber: "SYN-2026-0001", refundReason: "CUSTOMER_REQUEST" },
};

describe("@regression charge-refunded-ereporting-idempotent — EINV-TEST-018", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFeatureFlags.enable_ereporting = true;
		mockBuildRefundTransaction.mockReturnValue(SAMPLE_PAYLOAD);
		mockPrisma.refund.findUnique.mockResolvedValue({
			id: REFUND_ID,
			orderId: "order-1",
			amount: 4999,
			currency: "EUR",
			processedAt: new Date("2026-05-28T10:00:00Z"),
			reason: "CUSTOMER_REQUEST",
			order: {
				orderNumber: "SYN-2026-0001",
				paymentMethod: "card",
				shippingCountry: "FR",
				customerType: "B2C",
				stripePaymentIntentId: "pi_xyz",
				total: 4999,
				taxAmount: 0,
				// EINV-EREPORT-007/F3 — l'avoir hérite de la catégorie d'opération
				// des lignes de la commande parente (dérivée via deriveOperationCategory).
				items: [{ operationCategory: "GOODS" }],
			},
		});
	});

	it("1er appel : pas de transaction existante → create + retourne id", async () => {
		mockPrisma.eReportingTransaction.findFirst.mockResolvedValue(null);
		mockPrisma.eReportingTransaction.create.mockResolvedValue({ id: "etx-new-1" });

		const result = await recordRefundEReporting(REFUND_ID);

		expect(result).toBe("etx-new-1");
		expect(mockPrisma.eReportingTransaction.create).toHaveBeenCalledTimes(1);
		expect(mockPrisma.eReportingTransaction.findFirst).toHaveBeenCalledWith({
			where: { refundId: REFUND_ID, type: "REFUND" },
			select: { id: true },
		});
	});

	it("2e appel (replay) : transaction existante → skipped + create NOT called", async () => {
		mockPrisma.eReportingTransaction.findFirst.mockResolvedValue({ id: "etx-existing" });

		const result = await recordRefundEReporting(REFUND_ID);

		expect(result).toBe("skipped");
		expect(mockPrisma.eReportingTransaction.create).not.toHaveBeenCalled();
	});

	it("5 replays simulés successifs → exactement 1 create au 1er, 0 sur les 4 suivants", async () => {
		mockPrisma.eReportingTransaction.findFirst
			.mockResolvedValueOnce(null)
			.mockResolvedValue({ id: "etx-created-1" });
		mockPrisma.eReportingTransaction.create.mockResolvedValue({ id: "etx-created-1" });

		const results: Array<string | "skipped" | "error"> = [];
		for (let i = 0; i < 5; i++) {
			results.push(await recordRefundEReporting(REFUND_ID));
		}

		expect(mockPrisma.eReportingTransaction.create).toHaveBeenCalledTimes(1);
		expect(results[0]).toBe("etx-created-1");
		expect(results.slice(1)).toEqual(["skipped", "skipped", "skipped", "skipped"]);
	});

	it("idempotence scope strict (refundId, type=REFUND) — un order avec SALES n'empêche pas REFUND", async () => {
		mockPrisma.eReportingTransaction.findFirst.mockResolvedValue(null);
		mockPrisma.eReportingTransaction.create.mockResolvedValue({ id: "etx-refund-new" });

		await recordRefundEReporting(REFUND_ID);

		// Le findFirst doit explicitement scoper sur type=REFUND (pas SALES)
		const callArgs = mockPrisma.eReportingTransaction.findFirst.mock.calls[0]?.[0];
		expect(callArgs?.where?.type).toBe("REFUND");
		expect(callArgs?.where?.refundId).toBe(REFUND_ID);
	});

	it("feature flag OFF → skipped sans toucher findFirst (early return)", async () => {
		mockFeatureFlags.enable_ereporting = false;

		const result = await recordRefundEReporting(REFUND_ID);

		expect(result).toBe("skipped");
		expect(mockPrisma.eReportingTransaction.findFirst).not.toHaveBeenCalled();
		expect(mockPrisma.eReportingTransaction.create).not.toHaveBeenCalled();
	});

	it("refund processedAt=null → skipped (state invalide, race admin/cron)", async () => {
		mockPrisma.eReportingTransaction.findFirst.mockResolvedValue(null);
		mockPrisma.refund.findUnique.mockResolvedValue({
			id: REFUND_ID,
			orderId: "order-1",
			amount: 4999,
			currency: "EUR",
			processedAt: null,
			reason: "CUSTOMER_REQUEST",
			order: { orderNumber: "X" },
		});

		const result = await recordRefundEReporting(REFUND_ID);

		expect(result).toBe("skipped");
		expect(mockPrisma.eReportingTransaction.create).not.toHaveBeenCalled();
	});
});
