import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockLogger, mockSubmitEReportingBatchById, mockFeatureFlags } = vi.hoisted(
	() => ({
		mockPrisma: {
			eReportingBatch: {
				findMany: vi.fn(),
			},
		},
		mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
		mockSubmitEReportingBatchById: vi.fn(),
		mockFeatureFlags: { enable_xml: false, enable_ereporting: true },
	}),
);

vi.mock("@/app/generated/prisma/client", () => ({
	EReportingStatus: {
		PENDING: "PENDING",
		SENT: "SENT",
		ACCEPTED: "ACCEPTED",
		REJECTED: "REJECTED",
		RETRYING: "RETRYING",
		ABANDONED: "ABANDONED",
	},
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("@/modules/cron/constants/limits", () => ({
	BATCH_DEADLINE_MS: 45_000,
}));
vi.mock("@/modules/invoices/constants/feature-flags", () => ({
	INVOICE_FEATURE_FLAGS: mockFeatureFlags,
}));
vi.mock("@/modules/invoices/services/submit-ereporting-batch.service", () => ({
	submitEReportingBatchById: mockSubmitEReportingBatchById,
	MAX_RETRY: 5,
	RETRY_BACKOFF_MS: [],
	ProviderBusinessError: class ProviderBusinessError extends Error {},
	withDeadline: <T>(p: Promise<T>) => p,
}));

import { transmitEReportingBatch } from "../transmit-ereporting-batch.service";

beforeEach(() => {
	vi.clearAllMocks();
	mockFeatureFlags.enable_ereporting = true;
});

describe("transmitEReportingBatch — feature flag", () => {
	it("skips silently when INVOICE_ENABLE_EREPORTING is OFF", async () => {
		mockFeatureFlags.enable_ereporting = false;
		const result = await transmitEReportingBatch();
		expect(result.reason).toBe("feature_flag_disabled");
		expect(mockPrisma.eReportingBatch.findMany).not.toHaveBeenCalled();
		expect(mockSubmitEReportingBatchById).not.toHaveBeenCalled();
	});
});

describe("transmitEReportingBatch — aggregation by service result", () => {
	it("returns no-op when there are no candidates", async () => {
		mockPrisma.eReportingBatch.findMany.mockResolvedValue([]);
		const result = await transmitEReportingBatch();
		expect(result).toEqual({ processed: 0, errored: 0, skipped: 0 });
		expect(mockSubmitEReportingBatchById).not.toHaveBeenCalled();
	});

	it("counts SENT as processed", async () => {
		mockPrisma.eReportingBatch.findMany.mockResolvedValue([{ id: "b1" }]);
		mockSubmitEReportingBatchById.mockResolvedValue({ batchId: "b1", status: "SENT" });
		const result = await transmitEReportingBatch();
		expect(result).toEqual({ processed: 1, errored: 0, skipped: 0, hasMore: false });
	});

	it("counts ACCEPTED as processed", async () => {
		mockPrisma.eReportingBatch.findMany.mockResolvedValue([{ id: "b1" }]);
		mockSubmitEReportingBatchById.mockResolvedValue({ batchId: "b1", status: "ACCEPTED" });
		const result = await transmitEReportingBatch();
		expect(result).toEqual({ processed: 1, errored: 0, skipped: 0, hasMore: false });
	});

	it("counts SKIPPED_BACKOFF / SKIPPED_DRY_RUN / SKIPPED_EMPTY / NOT_FOUND / NOT_ELIGIBLE as skipped", async () => {
		mockPrisma.eReportingBatch.findMany.mockResolvedValue([
			{ id: "b1" },
			{ id: "b2" },
			{ id: "b3" },
			{ id: "b4" },
			{ id: "b5" },
		]);
		mockSubmitEReportingBatchById
			.mockResolvedValueOnce({ batchId: "b1", status: "SKIPPED_BACKOFF" })
			.mockResolvedValueOnce({ batchId: "b2", status: "SKIPPED_DRY_RUN" })
			.mockResolvedValueOnce({ batchId: "b3", status: "NOT_FOUND" })
			.mockResolvedValueOnce({ batchId: "b4", status: "NOT_ELIGIBLE" })
			.mockResolvedValueOnce({ batchId: "b5", status: "SKIPPED_EMPTY" });
		const result = await transmitEReportingBatch();
		expect(result).toEqual({ processed: 0, errored: 0, skipped: 5, hasMore: false });
	});

	it("counts REJECTED / ABANDONED as errored, RETRYING as skipped (EINV-CRON-004)", async () => {
		mockPrisma.eReportingBatch.findMany.mockResolvedValue([
			{ id: "b1" },
			{ id: "b2" },
			{ id: "b3" },
		]);
		mockSubmitEReportingBatchById
			.mockResolvedValueOnce({ batchId: "b1", status: "REJECTED" })
			.mockResolvedValueOnce({ batchId: "b2", status: "RETRYING", retryCount: 2 })
			.mockResolvedValueOnce({ batchId: "b3", status: "ABANDONED", retryCount: 6 });
		const result = await transmitEReportingBatch();
		// RETRYING (transitoire auto-réparant) ne déclenche plus d'alerte admin.
		expect(result).toEqual({ processed: 0, errored: 2, skipped: 1, hasMore: false });
	});

	it("aggregates mixed statuses correctly", async () => {
		mockPrisma.eReportingBatch.findMany.mockResolvedValue([
			{ id: "b1" },
			{ id: "b2" },
			{ id: "b3" },
			{ id: "b4" },
		]);
		mockSubmitEReportingBatchById
			.mockResolvedValueOnce({ batchId: "b1", status: "SENT" })
			.mockResolvedValueOnce({ batchId: "b2", status: "SKIPPED_DRY_RUN" })
			.mockResolvedValueOnce({ batchId: "b3", status: "RETRYING", retryCount: 1 })
			.mockResolvedValueOnce({ batchId: "b4", status: "ACCEPTED" });
		const result = await transmitEReportingBatch();
		// b1=SENT, b4=ACCEPTED → processed=2 ; b2=DRY_RUN + b3=RETRYING → skipped=2.
		expect(result).toEqual({ processed: 2, errored: 0, skipped: 2, hasMore: false });
	});
});

describe("transmitEReportingBatch — resumabilité (CRON-AUDIT-002)", () => {
	it("hasMore=true quand le batch sature le cap de 50 (backlog DGFiP non silencieux)", async () => {
		const candidates = Array.from({ length: 50 }, (_, i) => ({ id: `b${i}` }));
		mockPrisma.eReportingBatch.findMany.mockResolvedValue(candidates);
		mockSubmitEReportingBatchById.mockResolvedValue({ batchId: "b", status: "SENT" });
		const result = await transmitEReportingBatch();
		expect(result.processed).toBe(50);
		expect(result.hasMore).toBe(true);
	});

	it("hasMore=false quand moins de 50 candidats", async () => {
		mockPrisma.eReportingBatch.findMany.mockResolvedValue([{ id: "b1" }, { id: "b2" }]);
		mockSubmitEReportingBatchById.mockResolvedValue({ batchId: "b", status: "SENT" });
		const result = await transmitEReportingBatch();
		expect(result.hasMore).toBe(false);
	});
});

describe("transmitEReportingBatch — hard cap selection", () => {
	it("requests at most 50 batches per run", async () => {
		mockPrisma.eReportingBatch.findMany.mockResolvedValue([]);
		await transmitEReportingBatch();
		expect(mockPrisma.eReportingBatch.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ take: 50 }),
		);
	});

	it("filters by status IN (PENDING, RETRYING) and retryCount <= MAX_RETRY", async () => {
		mockPrisma.eReportingBatch.findMany.mockResolvedValue([]);
		await transmitEReportingBatch();
		expect(mockPrisma.eReportingBatch.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					status: { in: ["PENDING", "RETRYING"] },
					retryCount: { lte: 5 },
				},
			}),
		);
	});
});
