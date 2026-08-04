import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockVoidInvoice, mockLogger } = vi.hoisted(() => ({
	mockPrisma: {
		order: { findMany: vi.fn() },
	},
	mockVoidInvoice: vi.fn(),
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

vi.mock("@/modules/orders/services/void-invoice.service", () => ({
	voidInvoice: mockVoidInvoice,
}));

import { reconcileVoidedInvoices } from "../reconcile-voided-invoices.service";

function buildCandidate(
	overrides: Partial<{
		id: string;
		orderNumber: string;
		invoiceNumber: string | null;
		status: "CANCELLED" | "DELIVERED" | "PROCESSING";
		paymentStatus: "REFUNDED" | "PAID";
	}> = {},
) {
	return {
		id: overrides.id ?? "order-1",
		orderNumber: overrides.orderNumber ?? "SYN-2026-00001",
		invoiceNumber: overrides.invoiceNumber ?? "F-2026-00001",
		status: overrides.status ?? "CANCELLED",
		paymentStatus: overrides.paymentStatus ?? "PAID",
	};
}

describe("reconcileVoidedInvoices", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.order.findMany.mockResolvedValue([]);
	});

	it("returns 0/0/0 when there are no candidates", async () => {
		const result = await reconcileVoidedInvoices();
		expect(result).toMatchObject({ processed: 0, errored: 0, skipped: 0, hasMore: false });
		expect(mockVoidInvoice).not.toHaveBeenCalled();
	});

	it("voids invoice for a CANCELLED order with GENERATED status (EINV-PDF-007)", async () => {
		mockPrisma.order.findMany.mockResolvedValueOnce([buildCandidate({ status: "CANCELLED" })]);
		mockVoidInvoice.mockResolvedValueOnce({
			kind: "voided",
			creditNoteNumber: "A-2026-00001",
			creditNoteGeneratedAt: new Date(),
			invoiceVoidedAt: new Date(),
		});

		const result = await reconcileVoidedInvoices();

		expect(mockVoidInvoice).toHaveBeenCalledOnce();
		expect(mockVoidInvoice.mock.calls[0]?.[0]).toMatchObject({
			orderId: "order-1",
			source: "SYSTEM",
			reason: expect.stringContaining("annulée"),
		});
		expect(result.processed).toBe(1);
		expect(result.errored).toBe(0);
	});

	it("voids invoice for a REFUNDED order with GENERATED status", async () => {
		mockPrisma.order.findMany.mockResolvedValueOnce([
			buildCandidate({ status: "DELIVERED", paymentStatus: "REFUNDED" }),
		]);
		mockVoidInvoice.mockResolvedValueOnce({
			kind: "voided",
			creditNoteNumber: "A-2026-00002",
			creditNoteGeneratedAt: new Date(),
			invoiceVoidedAt: new Date(),
		});

		const result = await reconcileVoidedInvoices();

		expect(mockVoidInvoice.mock.calls[0]?.[0]?.reason).toContain("remboursement");
		expect(result.processed).toBe(1);
	});

	it("skips candidate when voidInvoice returns noop (idempotent — déjà VOIDED)", async () => {
		mockPrisma.order.findMany.mockResolvedValueOnce([buildCandidate()]);
		mockVoidInvoice.mockResolvedValueOnce({ kind: "noop", reason: "already-voided" });

		const result = await reconcileVoidedInvoices();
		expect(result.processed).toBe(0);
		expect(result.skipped).toBe(1);
		expect(result.errored).toBe(0);
	});

	it("counts errored when voidInvoice returns failed kind (MAX_RETRIES atteint)", async () => {
		mockPrisma.order.findMany.mockResolvedValueOnce([buildCandidate()]);
		mockVoidInvoice.mockResolvedValueOnce({ kind: "failed", error: "P2002 after 5 retries" });

		const result = await reconcileVoidedInvoices();
		expect(result.processed).toBe(0);
		expect(result.errored).toBe(1);
		expect(mockLogger.error).toHaveBeenCalled();
	});

	it("counts errored when voidInvoice throws (Sentry caught upstream by withCronGuard)", async () => {
		mockPrisma.order.findMany.mockResolvedValueOnce([buildCandidate()]);
		mockVoidInvoice.mockRejectedValueOnce(new Error("DB unreachable"));

		const result = await reconcileVoidedInvoices();
		expect(result.processed).toBe(0);
		expect(result.errored).toBe(1);
		expect(mockLogger.error).toHaveBeenCalled();
	});

	it("Prisma query filters CANCELLED OR REFUNDED + GENERATED + invoiceNumber NOT NULL + no creditNote", async () => {
		await reconcileVoidedInvoices();
		const findManyArgs = mockPrisma.order.findMany.mock.calls[0]?.[0];
		expect(findManyArgs?.where).toMatchObject({
			OR: [{ status: "CANCELLED" }, { paymentStatus: "REFUNDED" }],
			invoiceStatus: "GENERATED",
			invoiceNumber: { not: null },
			creditNoteNumber: null,
		});
	});
});
