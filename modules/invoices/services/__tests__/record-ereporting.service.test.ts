import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, mockLogger, mockFeatureFlags } = vi.hoisted(() => ({
	mockPrisma: {
		eReportingTransaction: {
			findFirst: vi.fn(),
			create: vi.fn(),
		},
		order: { findUnique: vi.fn() },
		refund: { findUnique: vi.fn() },
	},
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
	mockFeatureFlags: { enable_xml: false, enable_ereporting: true },
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
		EReportingTransactionType: { SALES: "SALES", REFUND: "REFUND", PAYMENT: "PAYMENT" },
		CustomerType: { B2C: "B2C", B2B: "B2B", B2G: "B2G" },
		Prisma: { PrismaClientKnownRequestError: FakePrismaClientKnownRequestError },
	};
});

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("../../constants/feature-flags", () => ({
	INVOICE_FEATURE_FLAGS: mockFeatureFlags,
}));

import { recordSalesEReporting, recordRefundEReporting } from "../record-ereporting.service";

beforeEach(() => {
	vi.clearAllMocks();
	mockFeatureFlags.enable_ereporting = true;
});

afterEach(() => {
	mockFeatureFlags.enable_ereporting = false;
});

describe("recordSalesEReporting — feature flag gating", () => {
	it("returns 'skipped' when enable_ereporting is OFF", async () => {
		mockFeatureFlags.enable_ereporting = false;
		const result = await recordSalesEReporting("order-1");
		expect(result).toBe("skipped");
		expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
		expect(mockPrisma.eReportingTransaction.create).not.toHaveBeenCalled();
	});
});

describe("recordSalesEReporting — happy path", () => {
	it("creates a SALES transaction when no existing record", async () => {
		mockPrisma.eReportingTransaction.findFirst.mockResolvedValue(null);
		mockPrisma.order.findUnique.mockResolvedValue({
			id: "order-1",
			orderNumber: "SYN-2026-0001",
			paidAt: new Date("2026-05-27T18:00:00Z"),
			total: 9500,
			taxAmount: 0,
			currency: "EUR",
			paymentMethod: "CARD",
			shippingCountry: "FR",
			customerType: "B2C",
			stripePaymentIntentId: "pi_test_1",
			items: [{ operationCategory: "GOODS" }],
		});
		mockPrisma.eReportingTransaction.create.mockResolvedValue({ id: "tx-new" });

		const result = await recordSalesEReporting("order-1");

		expect(result).toBe("tx-new");
		expect(mockPrisma.eReportingTransaction.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				orderId: "order-1",
				type: "SALES",
				amountIncTax: 9500,
			}),
			select: { id: true },
		});
	});
});

describe("recordSalesEReporting — gate B2C (EINV-EREPORT-001)", () => {
	it.each(["B2B", "B2G"])(
		"returns 'skipped' and does NOT create for customerType=%s (e-invoicing scope)",
		async (customerType) => {
			mockPrisma.eReportingTransaction.findFirst.mockResolvedValue(null);
			mockPrisma.order.findUnique.mockResolvedValue({
				id: "order-b2b",
				orderNumber: "SYN-2026-0099",
				paidAt: new Date("2026-05-27T18:00:00Z"),
				total: 9500,
				taxAmount: 0,
				currency: "EUR",
				paymentMethod: "CARD",
				shippingCountry: "FR",
				customerType,
				stripePaymentIntentId: "pi_b2b",
			});

			const result = await recordSalesEReporting("order-b2b");

			expect(result).toBe("skipped");
			expect(mockPrisma.eReportingTransaction.create).not.toHaveBeenCalled();
		},
	);
});

describe("recordSalesEReporting — idempotence", () => {
	it("returns 'skipped' when a SALES transaction already exists for this order", async () => {
		mockPrisma.eReportingTransaction.findFirst.mockResolvedValue({ id: "tx-existing" });

		const result = await recordSalesEReporting("order-1");

		expect(result).toBe("skipped");
		expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
		expect(mockPrisma.eReportingTransaction.create).not.toHaveBeenCalled();
	});

	it("findFirst scopes by (orderId, type=SALES) — different order doesn't match", async () => {
		mockPrisma.eReportingTransaction.findFirst.mockResolvedValue(null);
		mockPrisma.order.findUnique.mockResolvedValue({
			id: "order-1",
			orderNumber: "SYN-2026-0001",
			paidAt: new Date("2026-05-27T18:00:00Z"),
			total: 9500,
			taxAmount: 0,
			currency: "EUR",
			paymentMethod: "CARD",
			shippingCountry: "FR",
			customerType: "B2C",
			stripePaymentIntentId: null,
			items: [{ operationCategory: "GOODS" }],
		});
		mockPrisma.eReportingTransaction.create.mockResolvedValue({ id: "tx-new" });

		await recordSalesEReporting("order-1");

		expect(mockPrisma.eReportingTransaction.findFirst).toHaveBeenCalledWith({
			where: { orderId: "order-1", type: "SALES" },
			select: { id: true },
		});
	});
});

describe("recordSalesEReporting — graceful failures (best-effort)", () => {
	it("returns 'skipped' (not 'error') when order is missing", async () => {
		mockPrisma.eReportingTransaction.findFirst.mockResolvedValue(null);
		mockPrisma.order.findUnique.mockResolvedValue(null);

		const result = await recordSalesEReporting("order-missing");

		expect(result).toBe("skipped");
		expect(mockLogger.warn).toHaveBeenCalled();
		expect(mockPrisma.eReportingTransaction.create).not.toHaveBeenCalled();
	});

	it("returns 'skipped' when order is not paid (paidAt null)", async () => {
		mockPrisma.eReportingTransaction.findFirst.mockResolvedValue(null);
		mockPrisma.order.findUnique.mockResolvedValue({
			id: "order-1",
			orderNumber: "SYN-2026-0001",
			paidAt: null,
			total: 9500,
			taxAmount: 0,
			currency: "EUR",
			paymentMethod: "CARD",
			shippingCountry: "FR",
			customerType: "B2C",
			stripePaymentIntentId: null,
		});

		const result = await recordSalesEReporting("order-1");

		expect(result).toBe("skipped");
		expect(mockPrisma.eReportingTransaction.create).not.toHaveBeenCalled();
	});

	it("returns 'error' + logs Sentry (does NOT throw) on DB failure", async () => {
		mockPrisma.eReportingTransaction.findFirst.mockRejectedValue(new Error("DB connection lost"));

		const result = await recordSalesEReporting("order-1");

		expect(result).toBe("error");
		expect(mockLogger.error).toHaveBeenCalledWith(
			"recordSalesEReporting failed",
			expect.any(Error),
			expect.objectContaining({ service: "record-ereporting", orderId: "order-1" }),
		);
	});
});

describe("recordRefundEReporting — feature flag + idempotence", () => {
	it("returns 'skipped' when feature flag is OFF", async () => {
		mockFeatureFlags.enable_ereporting = false;
		const result = await recordRefundEReporting("refund-1");
		expect(result).toBe("skipped");
		expect(mockPrisma.refund.findUnique).not.toHaveBeenCalled();
	});

	it("returns 'skipped' when REFUND transaction already exists", async () => {
		mockPrisma.eReportingTransaction.findFirst.mockResolvedValue({ id: "tx-existing" });
		const result = await recordRefundEReporting("refund-1");
		expect(result).toBe("skipped");
	});
});

describe("recordRefundEReporting — happy path", () => {
	it("creates a REFUND transaction with negative amountIncTax", async () => {
		mockPrisma.eReportingTransaction.findFirst.mockResolvedValue(null);
		mockPrisma.refund.findUnique.mockResolvedValue({
			id: "refund-1",
			orderId: "order-1",
			amount: 2500,
			currency: "EUR",
			processedAt: new Date("2026-05-28T10:00:00Z"),
			reason: "CUSTOMER_REQUEST",
			order: {
				orderNumber: "SYN-2026-0001",
				paymentMethod: "CARD",
				shippingCountry: "FR",
				customerType: "B2C",
				stripePaymentIntentId: "pi_test_1",
				total: 2500,
				taxAmount: 0,
				items: [{ operationCategory: "GOODS" }],
			},
		});
		mockPrisma.eReportingTransaction.create.mockResolvedValue({ id: "tx-refund-new" });

		const result = await recordRefundEReporting("refund-1");

		expect(result).toBe("tx-refund-new");
		expect(mockPrisma.eReportingTransaction.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				refundId: "refund-1",
				orderId: null,
				type: "REFUND",
				amountIncTax: -2500,
			}),
			select: { id: true },
		});
	});
});

describe("recordRefundEReporting — graceful failures", () => {
	it("returns 'skipped' when refund is missing", async () => {
		mockPrisma.eReportingTransaction.findFirst.mockResolvedValue(null);
		mockPrisma.refund.findUnique.mockResolvedValue(null);

		const result = await recordRefundEReporting("refund-missing");
		expect(result).toBe("skipped");
		expect(mockLogger.warn).toHaveBeenCalled();
	});

	it("returns 'skipped' when refund has no processedAt", async () => {
		mockPrisma.eReportingTransaction.findFirst.mockResolvedValue(null);
		mockPrisma.refund.findUnique.mockResolvedValue({
			id: "refund-1",
			orderId: "order-1",
			amount: 2500,
			currency: "EUR",
			processedAt: null,
			reason: "OTHER",
			order: {
				orderNumber: "SYN-2026-0001",
				paymentMethod: "CARD",
				shippingCountry: "FR",
				customerType: "B2C",
				stripePaymentIntentId: null,
			},
		});

		const result = await recordRefundEReporting("refund-1");
		expect(result).toBe("skipped");
	});

	it("returns 'error' (no throw) on DB exception", async () => {
		mockPrisma.eReportingTransaction.findFirst.mockResolvedValue(null);
		mockPrisma.refund.findUnique.mockRejectedValue(new Error("DB down"));

		const result = await recordRefundEReporting("refund-1");
		expect(result).toBe("error");
		expect(mockLogger.error).toHaveBeenCalled();
	});
});
