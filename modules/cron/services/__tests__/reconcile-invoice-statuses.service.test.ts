import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockProvider, mockPersistPdpTransmission, mockLogger } = vi.hoisted(() => ({
	mockPrisma: { order: { findMany: vi.fn() } },
	mockProvider: {
		id: "test-provider",
		capabilities: { submitInvoice: true },
		getInvoiceStatus: vi.fn(),
	},
	mockPersistPdpTransmission: vi.fn(),
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

vi.mock("@/modules/invoices/providers/factory", () => ({
	getInvoiceProvider: () => mockProvider,
}));

vi.mock("@/modules/orders/services/persist-pdp-transmission.service", () => ({
	persistPdpTransmission: mockPersistPdpTransmission,
}));

import { reconcileInvoiceStatuses } from "../reconcile-invoice-statuses.service";

function buildCandidate(overrides: Partial<{ id: string; pdpProviderRef: string | null }> = {}) {
	return {
		id: overrides.id ?? "order-1",
		// Explicit `in` check so an explicit null override is honored
		// (nullish coalescing would replace null with the default).
		pdpProviderRef: "pdpProviderRef" in overrides ? overrides.pdpProviderRef : "pdp:abc-123",
	};
}

describe("reconcileInvoiceStatuses (OPS-AUDIT-002)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockProvider.capabilities.submitInvoice = true;
		mockPrisma.order.findMany.mockResolvedValue([]);
	});

	it("returns skipped+reason when provider has no submitInvoice capability", async () => {
		mockProvider.capabilities.submitInvoice = false;
		const result = await reconcileInvoiceStatuses();
		expect(result).toMatchObject({
			processed: 0,
			errored: 0,
			skipped: 0,
			reason: "provider-no-submit-capability",
		});
		expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
	});

	it("returns zeros when no stale candidates", async () => {
		const result = await reconcileInvoiceStatuses();
		expect(result).toMatchObject({ processed: 0, errored: 0, skipped: 0 });
		expect(mockProvider.getInvoiceStatus).not.toHaveBeenCalled();
	});

	it("filters candidates : pdpStatus=SENT + pdpTransmittedAt < now-24h + pdpProviderRef not null", async () => {
		await reconcileInvoiceStatuses();
		const args = mockPrisma.order.findMany.mock.calls[0]?.[0];
		expect(args?.where).toMatchObject({
			pdpStatus: "SENT",
			pdpProviderRef: { not: null },
			pdpTransmittedAt: { lt: expect.any(Date) },
		});
		const cutoff = args?.where?.pdpTransmittedAt?.lt as Date;
		const expectedMs = Date.now() - 24 * 60 * 60 * 1000;
		expect(Math.abs(cutoff.getTime() - expectedMs)).toBeLessThan(2000);
	});

	it("persists ACCEPTED status and counts as processed", async () => {
		mockPrisma.order.findMany.mockResolvedValueOnce([buildCandidate()]);
		mockProvider.getInvoiceStatus.mockResolvedValueOnce({
			status: "ACCEPTED",
			receivedAt: new Date(),
		});

		const result = await reconcileInvoiceStatuses();

		expect(mockPersistPdpTransmission).toHaveBeenCalledWith(
			expect.objectContaining({
				orderId: "order-1",
				providerName: "test-provider",
				result: expect.objectContaining({
					providerInvoiceId: "pdp:abc-123",
					status: "ACCEPTED",
				}),
			}),
		);
		expect(result.processed).toBe(1);
		expect(result.errored).toBe(0);
		expect(result.skipped).toBe(0);
	});

	it("persists REJECTED status with rejectionReason as errorMessage", async () => {
		mockPrisma.order.findMany.mockResolvedValueOnce([buildCandidate()]);
		mockProvider.getInvoiceStatus.mockResolvedValueOnce({
			status: "REJECTED",
			rejectionReason: "SIRET invalide",
		});

		const result = await reconcileInvoiceStatuses();

		expect(mockPersistPdpTransmission).toHaveBeenCalledWith(
			expect.objectContaining({
				orderId: "order-1",
				errorMessage: "SIRET invalide",
			}),
		);
		expect(result.processed).toBe(1);
	});

	it("skips when provider reports SUBMITTED (no transition yet) without re-persisting", async () => {
		mockPrisma.order.findMany.mockResolvedValueOnce([buildCandidate()]);
		mockProvider.getInvoiceStatus.mockResolvedValueOnce({ status: "SUBMITTED" });

		const result = await reconcileInvoiceStatuses();
		expect(result.skipped).toBe(1);
		expect(result.processed).toBe(0);
		expect(mockPersistPdpTransmission).not.toHaveBeenCalled();
	});

	it("skips PENDING_SUBMISSION (e-reporting batch waiting upstream)", async () => {
		mockPrisma.order.findMany.mockResolvedValueOnce([buildCandidate()]);
		mockProvider.getInvoiceStatus.mockResolvedValueOnce({ status: "PENDING_SUBMISSION" });

		const result = await reconcileInvoiceStatuses();
		expect(result.skipped).toBe(1);
		expect(mockPersistPdpTransmission).not.toHaveBeenCalled();
	});

	it("counts errored when provider.getInvoiceStatus throws", async () => {
		mockPrisma.order.findMany.mockResolvedValueOnce([buildCandidate()]);
		mockProvider.getInvoiceStatus.mockRejectedValueOnce(new Error("provider 5xx"));

		const result = await reconcileInvoiceStatuses();
		expect(result.errored).toBe(1);
		expect(result.processed).toBe(0);
		expect(mockLogger.error).toHaveBeenCalled();
	});

	it("skips candidate with null pdpProviderRef defensively", async () => {
		mockPrisma.order.findMany.mockResolvedValueOnce([buildCandidate({ pdpProviderRef: null })]);
		const result = await reconcileInvoiceStatuses();
		expect(result.skipped).toBe(1);
		expect(mockProvider.getInvoiceStatus).not.toHaveBeenCalled();
	});

	it("propagates hasMore=true when batch is saturated (25 candidates)", async () => {
		const fullBatch = Array.from({ length: 25 }, (_, i) =>
			buildCandidate({ id: `order-${i}`, pdpProviderRef: `pdp:${i}` }),
		);
		mockPrisma.order.findMany.mockResolvedValueOnce(fullBatch);
		mockProvider.getInvoiceStatus.mockResolvedValue({ status: "ACCEPTED" });

		const result = await reconcileInvoiceStatuses();
		expect(result.hasMore).toBe(true);
	});

	it("s'arrête sur deadline sans appeler le provider et signale hasMore (CRON-AUDIT-001)", async () => {
		mockPrisma.order.findMany.mockResolvedValueOnce([buildCandidate()]);
		// cutoff(1000), deadline(1000 → +45s = 46000), loop-check(1_000_000 ≥ 46000 → break)
		const nowSpy = vi
			.spyOn(Date, "now")
			.mockReturnValueOnce(1_000)
			.mockReturnValueOnce(1_000)
			.mockReturnValue(1_000_000);

		const result = await reconcileInvoiceStatuses();

		expect(mockProvider.getInvoiceStatus).not.toHaveBeenCalled();
		expect(result.processed).toBe(0);
		expect(result.hasMore).toBe(true);
		expect(mockLogger.warn).toHaveBeenCalled();
		nowSpy.mockRestore();
	});
});
