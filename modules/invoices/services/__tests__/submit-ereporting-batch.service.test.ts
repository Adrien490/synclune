import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockLogger, mockProvider, mockSentry, mockFeatureFlags } = vi.hoisted(() => ({
	mockPrisma: {
		eReportingBatch: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
		eReportingTransaction: {
			findMany: vi.fn(),
			updateMany: vi.fn(),
		},
	},
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
	mockProvider: {
		id: "mock-pa",
		submitEReportingBatch: vi.fn(),
	},
	mockSentry: {
		withScope: vi.fn(
			(
				cb: (s: {
					setTag: typeof vi.fn;
					setFingerprint: typeof vi.fn;
					setLevel: typeof vi.fn;
				}) => void,
			) =>
				cb({
					setTag: vi.fn(),
					setFingerprint: vi.fn(),
					setLevel: vi.fn(),
				}),
		),
		captureException: vi.fn(),
		captureMessage: vi.fn(),
		addBreadcrumb: vi.fn(),
		startSpan: vi.fn((_: unknown, fn: (s: unknown) => unknown) => fn({ setAttribute: vi.fn() })),
	},
	mockFeatureFlags: { enable_xml: false, enable_ereporting: true },
}));

vi.mock("@sentry/nextjs", () => mockSentry);

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
vi.mock("@/modules/invoices/providers/factory", () => ({
	getInvoiceProvider: () => mockProvider,
}));
vi.mock("@/modules/invoices/constants/feature-flags", () => ({
	INVOICE_FEATURE_FLAGS: mockFeatureFlags,
}));

import {
	submitEReportingBatchById,
	ProviderBusinessError,
	MAX_RETRY,
} from "../submit-ereporting-batch.service";

function makeBatch(overrides: Record<string, unknown> = {}) {
	return {
		id: "batch-1",
		status: "PENDING",
		retryCount: 0,
		updatedAt: new Date("2026-05-28T00:00:00Z"),
		periodFrom: new Date("2026-05-27T00:00:00Z"),
		periodTo: new Date("2026-05-28T00:00:00Z"),
		transactionCount: 5,
		totalAmountIncTax: 5000,
		totalAmountExclTax: 5000,
		totalTaxAmount: 0,
		...overrides,
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers();
	vi.setSystemTime(new Date("2026-05-28T12:00:00Z"));
	mockFeatureFlags.enable_ereporting = true;
	mockPrisma.eReportingTransaction.findMany.mockResolvedValue([]);
});

describe("submitEReportingBatchById — feature flag", () => {
	it("returns SKIPPED_FLAG_OFF when INVOICE_ENABLE_EREPORTING is OFF, without DB query", async () => {
		mockFeatureFlags.enable_ereporting = false;
		const result = await submitEReportingBatchById("batch-1");
		expect(result).toEqual({ batchId: "batch-1", status: "SKIPPED_FLAG_OFF" });
		expect(mockPrisma.eReportingBatch.findUnique).not.toHaveBeenCalled();
		expect(mockProvider.submitEReportingBatch).not.toHaveBeenCalled();
	});
});

describe("submitEReportingBatchById — batch lookup", () => {
	it("returns NOT_FOUND when batch does not exist", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue(null);
		const result = await submitEReportingBatchById("missing-batch");
		expect(result).toEqual({ batchId: "missing-batch", status: "NOT_FOUND" });
		expect(mockProvider.submitEReportingBatch).not.toHaveBeenCalled();
	});

	it("returns NOT_ELIGIBLE when batch is already ACCEPTED (idempotence)", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue(makeBatch({ status: "ACCEPTED" }));
		const result = await submitEReportingBatchById("batch-1");
		expect(result).toEqual({ batchId: "batch-1", status: "NOT_ELIGIBLE" });
		expect(mockProvider.submitEReportingBatch).not.toHaveBeenCalled();
	});

	it("returns NOT_ELIGIBLE when batch is SENT", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue(makeBatch({ status: "SENT" }));
		const result = await submitEReportingBatchById("batch-1");
		expect(result).toEqual({ batchId: "batch-1", status: "NOT_ELIGIBLE" });
	});

	it("returns NOT_ELIGIBLE when batch is REJECTED", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue(makeBatch({ status: "REJECTED" }));
		const result = await submitEReportingBatchById("batch-1");
		expect(result).toEqual({ batchId: "batch-1", status: "NOT_ELIGIBLE" });
	});

	it("returns NOT_ELIGIBLE when batch is ABANDONED", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue(makeBatch({ status: "ABANDONED" }));
		const result = await submitEReportingBatchById("batch-1");
		expect(result).toEqual({ batchId: "batch-1", status: "NOT_ELIGIBLE" });
	});
});

describe("submitEReportingBatchById — success path", () => {
	it("transitions PENDING → SENT when provider returns SENT", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue(makeBatch());
		mockProvider.submitEReportingBatch.mockResolvedValue({
			providerBatchId: "pa-xyz-001",
			status: "SENT",
			submittedAt: new Date("2026-05-28T12:00:00Z"),
		});

		const result = await submitEReportingBatchById("batch-1");

		expect(result.status).toBe("SENT");
		expect(result.providerBatchId).toBe("pa-xyz-001");
		expect(mockPrisma.eReportingBatch.update).toHaveBeenCalledWith({
			where: { id: "batch-1" },
			data: expect.objectContaining({
				status: "SENT",
				providerBatchId: "pa-xyz-001",
				sentAt: new Date("2026-05-28T12:00:00Z"),
			}),
		});
		expect(mockPrisma.eReportingTransaction.updateMany).toHaveBeenCalledWith({
			where: { batchId: "batch-1" },
			data: { status: "SENT" },
		});
	});

	it("transitions to ACCEPTED + sets acceptedAt when provider returns ACCEPTED", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue(makeBatch());
		mockProvider.submitEReportingBatch.mockResolvedValue({
			providerBatchId: "pa-xyz-002",
			status: "ACCEPTED",
			submittedAt: new Date("2026-05-28T12:00:00Z"),
		});

		const result = await submitEReportingBatchById("batch-1");

		expect(result.status).toBe("ACCEPTED");
		expect(mockPrisma.eReportingBatch.update).toHaveBeenCalledWith({
			where: { id: "batch-1" },
			data: expect.objectContaining({
				status: "ACCEPTED",
				acceptedAt: new Date("2026-05-28T12:00:00Z"),
			}),
		});
	});

	it("returns SKIPPED_DRY_RUN when LocalPdfProvider stub returns PENDING, no DB update", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue(makeBatch());
		mockProvider.submitEReportingBatch.mockResolvedValue({
			providerBatchId: "local:dry-run:abc",
			status: "PENDING",
			submittedAt: new Date(),
		});

		const result = await submitEReportingBatchById("batch-1");

		expect(result.status).toBe("SKIPPED_DRY_RUN");
		expect(result.providerBatchId).toBe("local:dry-run:abc");
		expect(mockPrisma.eReportingBatch.update).not.toHaveBeenCalled();
	});

	it("synchronous ACK REJECTED writes rejectedAt + rejectionReason, NOT sentAt", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue(makeBatch());
		mockProvider.submitEReportingBatch.mockResolvedValue({
			providerBatchId: "pa-reject-001",
			status: "REJECTED",
			submittedAt: new Date("2026-05-28T12:00:00Z"),
			rejectionReason: "INVALID_BATCH_FORMAT",
		});

		const result = await submitEReportingBatchById("batch-1");

		expect(result.status).toBe("REJECTED");
		expect(result.rejectionReason).toBe("INVALID_BATCH_FORMAT");
		const updateCall = mockPrisma.eReportingBatch.update.mock.calls[0]?.[0] as {
			data: Record<string, unknown>;
		};
		expect(updateCall.data.status).toBe("REJECTED");
		expect(updateCall.data.rejectedAt).toEqual(new Date("2026-05-28T12:00:00Z"));
		expect(updateCall.data.rejectionReason).toBe("INVALID_BATCH_FORMAT");
		expect(updateCall.data.sentAt).toBeUndefined();
	});

	it("synchronous ACK REJECTED without rejectionReason falls back to default reason", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue(makeBatch());
		mockProvider.submitEReportingBatch.mockResolvedValue({
			providerBatchId: "pa-reject-002",
			status: "REJECTED",
			submittedAt: new Date("2026-05-28T12:00:00Z"),
		});

		await submitEReportingBatchById("batch-1");

		const updateCall = mockPrisma.eReportingBatch.update.mock.calls[0]?.[0] as {
			data: Record<string, unknown>;
		};
		expect(updateCall.data.rejectionReason).toMatch(/REJECTED without reason/i);
	});

	it("rejectionReason longer than 1000 chars is truncated", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue(makeBatch());
		const longReason = "X".repeat(2000);
		mockProvider.submitEReportingBatch.mockResolvedValue({
			providerBatchId: "pa-reject-003",
			status: "REJECTED",
			submittedAt: new Date("2026-05-28T12:00:00Z"),
			rejectionReason: longReason,
		});

		await submitEReportingBatchById("batch-1");

		const updateCall = mockPrisma.eReportingBatch.update.mock.calls[0]?.[0] as {
			data: Record<string, unknown>;
		};
		expect((updateCall.data.rejectionReason as string).length).toBe(1000);
	});
});

describe("submitEReportingBatchById — error handling", () => {
	it("network error → RETRYING + retryCount++ (1st failure)", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue(makeBatch());
		mockProvider.submitEReportingBatch.mockRejectedValue(new Error("ECONNRESET"));

		const result = await submitEReportingBatchById("batch-1");

		expect(result.status).toBe("RETRYING");
		expect(result.retryCount).toBe(1);
		expect(mockPrisma.eReportingBatch.update).toHaveBeenCalledWith({
			where: { id: "batch-1" },
			data: expect.objectContaining({
				status: "RETRYING",
				retryCount: 1,
			}),
		});
	});

	it("business error (4xx) → REJECTED direct, no retry", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue(makeBatch());
		mockProvider.submitEReportingBatch.mockRejectedValue(
			new ProviderBusinessError("Invalid payload schema", 422),
		);

		const result = await submitEReportingBatchById("batch-1");

		expect(result.status).toBe("REJECTED");
		expect(result.rejectionReason).toBe("Invalid payload schema");
		expect(mockPrisma.eReportingBatch.update).toHaveBeenCalledWith({
			where: { id: "batch-1" },
			data: expect.objectContaining({
				status: "REJECTED",
				rejectionReason: "Invalid payload schema",
			}),
		});
	});

	it("retryCount === MAX_RETRY → ABANDONED + Sentry alert", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue(
			makeBatch({ status: "RETRYING", retryCount: MAX_RETRY, updatedAt: new Date(0) }),
		);
		mockProvider.submitEReportingBatch.mockRejectedValue(new Error("ETIMEDOUT"));

		const result = await submitEReportingBatchById("batch-1");

		expect(result.status).toBe("ABANDONED");
		expect(result.retryCount).toBe(MAX_RETRY + 1);
		expect(mockPrisma.eReportingBatch.update).toHaveBeenCalledWith({
			where: { id: "batch-1" },
			data: expect.objectContaining({
				status: "ABANDONED",
				retryCount: MAX_RETRY + 1,
			}),
		});
		expect(mockSentry.captureException).toHaveBeenCalledWith(
			expect.objectContaining({
				message: expect.stringContaining("abandoned"),
			}),
		);
	});
});

describe("submitEReportingBatchById — idempotence + backoff", () => {
	it("RETRYING with retryCount=1 within backoff window → SKIPPED_BACKOFF", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue(
			makeBatch({
				status: "RETRYING",
				retryCount: 1,
				updatedAt: new Date("2026-05-28T11:30:00Z"), // 30 min ago, < 1h required
			}),
		);

		const result = await submitEReportingBatchById("batch-1");

		expect(result.status).toBe("SKIPPED_BACKOFF");
		expect(result.retryCount).toBe(1);
		expect(mockProvider.submitEReportingBatch).not.toHaveBeenCalled();
	});

	it("RETRYING with retryCount=1 past backoff window → attempt transmission", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue(
			makeBatch({
				status: "RETRYING",
				retryCount: 1,
				updatedAt: new Date("2026-05-28T10:00:00Z"), // 2h ago > 1h required
			}),
		);
		mockProvider.submitEReportingBatch.mockResolvedValue({
			providerBatchId: "pa-retry-ok",
			status: "SENT",
			submittedAt: new Date("2026-05-28T12:00:00Z"),
		});

		const result = await submitEReportingBatchById("batch-1");

		expect(result.status).toBe("SENT");
		expect(mockProvider.submitEReportingBatch).toHaveBeenCalled();
	});
});
