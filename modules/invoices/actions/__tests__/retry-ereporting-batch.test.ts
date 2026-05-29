import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, mockLogger, mockFeatureFlags, mockRequireAdmin, mockUpdateTag } = vi.hoisted(
	() => ({
		mockPrisma: {
			eReportingBatch: {
				findUnique: vi.fn(),
				update: vi.fn(),
			},
		},
		mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
		mockFeatureFlags: { enable_xml: false, enable_ereporting: true },
		mockRequireAdmin: vi.fn(),
		mockUpdateTag: vi.fn(),
	}),
);

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("@/modules/invoices/constants/feature-flags", () => ({
	INVOICE_FEATURE_FLAGS: mockFeatureFlags,
}));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdmin,
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
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

import { retryEReportingBatch } from "../retry-ereporting-batch";

function makeFormData(id: string): FormData {
	const fd = new FormData();
	fd.append("id", id);
	return fd;
}

beforeEach(() => {
	vi.clearAllMocks();
	mockFeatureFlags.enable_ereporting = true;
	mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1" } });
});

afterEach(() => {
	mockFeatureFlags.enable_ereporting = false;
});

describe("retryEReportingBatch — feature flag gating", () => {
	it("returns error when INVOICE_ENABLE_EREPORTING is OFF", async () => {
		mockFeatureFlags.enable_ereporting = false;
		const result = await retryEReportingBatch(undefined, makeFormData("batch-1"));
		expect(result.status).toBe("error");
		expect(mockPrisma.eReportingBatch.update).not.toHaveBeenCalled();
	});
});

describe("retryEReportingBatch — éligibilité statut", () => {
	it("rejects PENDING/SENT/ACCEPTED/RETRYING batches", async () => {
		for (const status of ["PENDING", "SENT", "ACCEPTED", "RETRYING"] as const) {
			mockPrisma.eReportingBatch.findUnique.mockResolvedValue({
				id: "batch-1",
				status,
				retryCount: 0,
			});
			const result = await retryEReportingBatch(undefined, makeFormData("batch-1"));
			expect(result.status).toBe("error");
			expect(mockPrisma.eReportingBatch.update).not.toHaveBeenCalled();
		}
	});

	it("accepts REJECTED batch (legacy : transactions encore rattachées)", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue({
			id: "batch-1",
			status: "REJECTED",
			retryCount: 2,
			_count: { transactions: 2 },
		});
		mockPrisma.eReportingBatch.update.mockResolvedValue({});

		const result = await retryEReportingBatch(undefined, makeFormData("batch-1"));

		expect(result.status).toBe("success");
		expect(mockPrisma.eReportingBatch.update).toHaveBeenCalled();
	});

	it("accepts ABANDONED batch (legacy : transactions encore rattachées)", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue({
			id: "batch-1",
			status: "ABANDONED",
			retryCount: 6,
			_count: { transactions: 2 },
		});
		mockPrisma.eReportingBatch.update.mockResolvedValue({});

		const result = await retryEReportingBatch(undefined, makeFormData("batch-1"));

		expect(result.status).toBe("success");
	});

	it("ne reset PAS un tombstone déjà re-queué (0 transaction vivante) — message info", async () => {
		// Les transactions ont déjà été détachées + repassées PENDING par le
		// service submit (re-queue auto). Remettre ce batch vidé en PENDING
		// transmettrait un batch fantôme : on bloque le reset.
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue({
			id: "batch-empty",
			status: "REJECTED",
			retryCount: 2,
			_count: { transactions: 0 },
		});

		const result = await retryEReportingBatch(undefined, makeFormData("batch-empty"));

		expect(result.status).toBe("success");
		expect(result.message).toMatch(/re-mises en file automatiquement/i);
		expect(mockPrisma.eReportingBatch.update).not.toHaveBeenCalled();
	});

	it("returns error when batch is missing", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue(null);
		const result = await retryEReportingBatch(undefined, makeFormData("batch-missing"));
		expect(result.status).toBe("error");
		expect(mockPrisma.eReportingBatch.update).not.toHaveBeenCalled();
	});
});

describe("retryEReportingBatch — reset retryCount=0 (EINV-AUDIT-005)", () => {
	it("resets retryCount to 0 for an ABANDONED batch (retryCount > MAX_RETRY)", async () => {
		// Sans reset, retryCount=6 + increment=7 ferait dépasser le filtre cron
		// `retryCount: { lte: MAX_RETRY=5 }` → batch coincé en PENDING ad vitam.
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue({
			id: "batch-abandoned",
			status: "ABANDONED",
			retryCount: 6,
			_count: { transactions: 2 },
		});
		mockPrisma.eReportingBatch.update.mockResolvedValue({});

		await retryEReportingBatch(undefined, makeFormData("batch-abandoned"));

		const updateCall = mockPrisma.eReportingBatch.update.mock.calls[0]?.[0] as {
			data: Record<string, unknown>;
		};
		expect(updateCall.data.retryCount).toBe(0);
		expect(updateCall.data.status).toBe("PENDING");
		expect(updateCall.data.providerBatchId).toBeNull();
		expect(updateCall.data.rejectedAt).toBeNull();
		expect(updateCall.data.rejectionReason).toBeNull();
		expect(updateCall.data.sentAt).toBeNull();
	});

	it("resets retryCount to 0 for a REJECTED batch (regardless of previous retryCount)", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue({
			id: "batch-rejected",
			status: "REJECTED",
			retryCount: 3,
			_count: { transactions: 2 },
		});
		mockPrisma.eReportingBatch.update.mockResolvedValue({});

		await retryEReportingBatch(undefined, makeFormData("batch-rejected"));

		const updateCall = mockPrisma.eReportingBatch.update.mock.calls[0]?.[0] as {
			data: Record<string, unknown>;
		};
		expect(updateCall.data.retryCount).toBe(0);
	});

	it("invalidates the admin orders cache tag", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue({
			id: "batch-1",
			status: "REJECTED",
			retryCount: 1,
			_count: { transactions: 2 },
		});
		mockPrisma.eReportingBatch.update.mockResolvedValue({});

		await retryEReportingBatch(undefined, makeFormData("batch-1"));

		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("logs admin action with previous status + retryCount", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue({
			id: "batch-1",
			status: "ABANDONED",
			retryCount: 6,
			_count: { transactions: 2 },
		});
		mockPrisma.eReportingBatch.update.mockResolvedValue({});

		await retryEReportingBatch(undefined, makeFormData("batch-1"));

		expect(mockLogger.info).toHaveBeenCalledWith(
			expect.stringContaining("reset to PENDING"),
			expect.objectContaining({
				adminUserId: "admin-1",
				previousStatus: "ABANDONED",
				previousRetryCount: 6,
			}),
		);
	});
});
