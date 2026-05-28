import { beforeEach, describe, expect, it, vi } from "vitest";

const mockOrderFindMany = vi.fn();
const mockProvider = {
	id: "mock",
	capabilities: {
		submitInvoice: true,
		receiveInvoice: true,
		eReporting: true,
		directoryLookup: true,
	},
};
const mockSubmitInvoiceById = vi.fn();
const mockShouldTransmitInvoice = vi.fn();

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		order: {
			findMany: (...args: unknown[]) => mockOrderFindMany(...args),
		},
	},
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/modules/invoices/providers/factory", () => ({
	getInvoiceProvider: () => mockProvider,
}));

vi.mock("@/modules/invoices/services/should-transmit-invoice", () => ({
	shouldTransmitInvoice: (...args: unknown[]) => mockShouldTransmitInvoice(...args),
}));

vi.mock("@/modules/invoices/services/submit-invoice-by-id.service", () => ({
	submitInvoiceById: (...args: unknown[]) => mockSubmitInvoiceById(...args),
}));

import { transmitInvoices } from "../transmit-invoices.service";

function makeCandidate(id: string, total = 5000) {
	return { id, total };
}

describe("transmitInvoices", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockShouldTransmitInvoice.mockReturnValue(true);
		mockProvider.capabilities.submitInvoice = true;
	});

	it("returns reason='provider-no-submit-capability' when capability is disabled (no DB query)", async () => {
		mockProvider.capabilities.submitInvoice = false;
		const result = await transmitInvoices();
		expect(result.reason).toBe("provider-no-submit-capability");
		expect(result.processed).toBe(0);
		expect(mockOrderFindMany).not.toHaveBeenCalled();
		expect(mockSubmitInvoiceById).not.toHaveBeenCalled();
	});

	it("returns zeros when no candidates", async () => {
		mockOrderFindMany.mockResolvedValueOnce([]);
		const result = await transmitInvoices();
		expect(result.processed).toBe(0);
		expect(result.errored).toBe(0);
		expect(result.skipped).toBe(0);
		expect(result.transmittedSent).toBe(0);
		expect(result.transmittedRejected).toBe(0);
		expect(mockSubmitInvoiceById).not.toHaveBeenCalled();
	});

	it("filters candidates on the right WHERE clause (pdpStatus null + grace window)", async () => {
		mockOrderFindMany.mockResolvedValueOnce([]);
		await transmitInvoices();
		const args = mockOrderFindMany.mock.calls[0]?.[0];
		expect(args.where.pdpStatus).toBeNull();
		expect(args.where.pdpProviderRef).toBeNull();
		expect(args.where.invoiceNumber).toEqual({ not: null });
		expect(args.where.invoicePdfUrl).toEqual({ not: null });
		expect(args.where.paidAt).toMatchObject({ not: null });
		expect(args.where.paidAt.lt).toBeInstanceOf(Date);
		// grace = 5 min : la borne haute doit être ~ now - 5min
		const expectedMin = Date.now() - 5 * 60 * 1000;
		const actualMs = args.where.paidAt.lt.getTime();
		expect(Math.abs(actualMs - expectedMin)).toBeLessThan(2000);
	});

	it("skips a candidate when shouldTransmitInvoice returns false (canary)", async () => {
		mockOrderFindMany.mockResolvedValueOnce([makeCandidate("ord_1")]);
		mockShouldTransmitInvoice.mockReturnValueOnce(false);

		const result = await transmitInvoices();
		expect(result.skipped).toBe(1);
		expect(result.skippedCanary).toBe(1);
		expect(result.processed).toBe(0);
		expect(mockSubmitInvoiceById).not.toHaveBeenCalled();
	});

	it("counts SUBMITTED as transmittedSent + processed", async () => {
		mockOrderFindMany.mockResolvedValueOnce([makeCandidate("ord_1")]);
		mockSubmitInvoiceById.mockResolvedValueOnce({
			orderId: "ord_1",
			status: "SUBMITTED",
			providerInvoiceId: "pdp:abc",
		});

		const result = await transmitInvoices();
		expect(result.processed).toBe(1);
		expect(result.transmittedSent).toBe(1);
		expect(result.transmittedRejected).toBe(0);
		expect(result.errored).toBe(0);
		expect(mockSubmitInvoiceById).toHaveBeenCalledWith(
			"ord_1",
			expect.objectContaining({ deadline: expect.any(Number) }),
		);
	});

	it("counts REJECTED as transmittedRejected + processed (work was done, retry cron will handle)", async () => {
		mockOrderFindMany.mockResolvedValueOnce([makeCandidate("ord_1")]);
		mockSubmitInvoiceById.mockResolvedValueOnce({
			orderId: "ord_1",
			status: "REJECTED",
			errorMessage: "SIRET unknown",
		});

		const result = await transmitInvoices();
		expect(result.processed).toBe(1);
		expect(result.transmittedRejected).toBe(1);
		expect(result.transmittedSent).toBe(0);
		expect(result.errored).toBe(0);
	});

	it("counts ALREADY_SENT and ORDER_NOT_FOUND as skippedNotEligible", async () => {
		mockOrderFindMany.mockResolvedValueOnce([makeCandidate("ord_1"), makeCandidate("ord_2")]);
		mockSubmitInvoiceById
			.mockResolvedValueOnce({ orderId: "ord_1", status: "ALREADY_SENT" })
			.mockResolvedValueOnce({ orderId: "ord_2", status: "ORDER_NOT_FOUND" });

		const result = await transmitInvoices();
		expect(result.skipped).toBe(2);
		expect(result.skippedNotEligible).toBe(2);
		expect(result.processed).toBe(0);
	});

	it("sets hasMore=true when batch is saturated", async () => {
		const fullBatch = Array.from({ length: 25 }, (_, i) => makeCandidate(`ord_${i}`));
		mockOrderFindMany.mockResolvedValueOnce(fullBatch);
		mockSubmitInvoiceById.mockResolvedValue({
			orderId: "ord_x",
			status: "SUBMITTED",
			providerInvoiceId: "pdp:x",
		});

		const result = await transmitInvoices();
		expect(result.hasMore).toBe(true);
		expect(result.processed).toBe(25);
	});

	it("counts unexpected throw from submitInvoiceById as errored without breaking the batch", async () => {
		mockOrderFindMany.mockResolvedValueOnce([makeCandidate("ord_1"), makeCandidate("ord_2")]);
		mockSubmitInvoiceById.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce({
			orderId: "ord_2",
			status: "SUBMITTED",
			providerInvoiceId: "pdp:ok",
		});

		const result = await transmitInvoices();
		expect(result.errored).toBe(1);
		expect(result.transmittedSent).toBe(1);
		expect(result.processed).toBe(1);
	});

	it("orders candidates by paidAt asc (oldest first)", async () => {
		mockOrderFindMany.mockResolvedValueOnce([]);
		await transmitInvoices();
		const args = mockOrderFindMany.mock.calls[0]?.[0];
		expect(args.orderBy).toEqual({ paidAt: "asc" });
	});

	it("takes at most BATCH_SIZE_MEDIUM (25) candidates per run", async () => {
		mockOrderFindMany.mockResolvedValueOnce([]);
		await transmitInvoices();
		const args = mockOrderFindMany.mock.calls[0]?.[0];
		expect(args.take).toBe(25);
	});
});
