import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, mockPersistInvoiceNumber, mockLogger } = vi.hoisted(() => ({
	mockPrisma: {
		order: {
			findUnique: vi.fn(),
		},
	},
	mockPersistInvoiceNumber: vi.fn(),
	mockLogger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("../persist-invoice-number.service", () => ({
	persistInvoiceNumber: mockPersistInvoiceNumber,
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: mockLogger,
}));

import { ensureInvoiceNumberPersisted } from "../ensure-invoice-number.service";

/**
 * @regression ORD-COMPLY-002 (audit conformité 2026-05-27)
 *
 * Verrouille que la facture est générée à l'encaissement Stripe et non lazy.
 */
describe("ensureInvoiceNumberPersisted", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("persists invoice number when order is PAID and invoiceNumber is null", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			invoiceNumber: null,
			userId: "user-1",
			paymentStatus: "PAID",
		});
		mockPersistInvoiceNumber.mockResolvedValue({
			invoiceNumber: "F-2026-00042",
			invoiceGeneratedAt: new Date(),
		});

		await ensureInvoiceNumberPersisted("order-1");

		expect(mockPersistInvoiceNumber).toHaveBeenCalledWith("order-1", "user-1");
	});

	it("is idempotent — noop when invoiceNumber already set", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			invoiceNumber: "F-2026-00001",
			userId: "user-1",
			paymentStatus: "PAID",
		});

		await ensureInvoiceNumberPersisted("order-1");

		expect(mockPersistInvoiceNumber).not.toHaveBeenCalled();
	});

	it("skips when order is not PAID (defensive)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			invoiceNumber: null,
			userId: "user-1",
			paymentStatus: "PENDING",
		});

		await ensureInvoiceNumberPersisted("order-1");

		expect(mockPersistInvoiceNumber).not.toHaveBeenCalled();
		expect(mockLogger.warn).toHaveBeenCalled();
	});

	it("supports guest orders (userId null)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			invoiceNumber: null,
			userId: null,
			paymentStatus: "PAID",
		});
		mockPersistInvoiceNumber.mockResolvedValue({
			invoiceNumber: "F-2026-00043",
			invoiceGeneratedAt: new Date(),
		});

		await ensureInvoiceNumberPersisted("order-guest-1");

		expect(mockPersistInvoiceNumber).toHaveBeenCalledWith("order-guest-1", null);
	});

	it("does not throw when persist fails — webhook must succeed regardless", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			invoiceNumber: null,
			userId: "user-1",
			paymentStatus: "PAID",
		});
		mockPersistInvoiceNumber.mockResolvedValue(null);

		await expect(ensureInvoiceNumberPersisted("order-1")).resolves.toBeUndefined();
		expect(mockLogger.error).toHaveBeenCalled();
	});

	it("does not throw when DB read throws — webhook must succeed regardless", async () => {
		mockPrisma.order.findUnique.mockRejectedValue(new Error("connection lost"));

		await expect(ensureInvoiceNumberPersisted("order-1")).resolves.toBeUndefined();
		expect(mockLogger.error).toHaveBeenCalled();
	});

	it("warns when order is missing instead of throwing", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);

		await ensureInvoiceNumberPersisted("missing");

		expect(mockPersistInvoiceNumber).not.toHaveBeenCalled();
		expect(mockLogger.warn).toHaveBeenCalled();
	});
});
