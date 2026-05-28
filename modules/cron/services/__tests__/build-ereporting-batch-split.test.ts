import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockLogger } = vi.hoisted(() => ({
	mockPrisma: {
		eReportingTransaction: {
			findMany: vi.fn(),
			updateMany: vi.fn(),
		},
		eReportingBatch: {
			create: vi.fn(),
		},
		$transaction: vi.fn(),
	},
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: {},
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
vi.mock("@/shared/lib/prisma-tx-options", () => ({
	TX_TIMEOUT_LONG: 30000,
	TX_MAX_WAIT_LONG: 10000,
}));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

// Cap volontairement bas (3) pour vérifier le split. BATCH_SIZE_MEDIUM élevé
// pour que findMany remonte toutes les transactions seedées.
vi.mock("@/modules/cron/constants/limits", () => ({
	BATCH_SIZE_MEDIUM: 100,
	MAX_BATCH_TRANSACTIONS: 3,
}));

import { buildEReportingBatch } from "../build-ereporting-batch.service";

function makeTransaction(id: string, occurredAt: Date, amountIncTax = 1000) {
	return {
		id,
		occurredAt,
		amountIncTax,
		amountExclTax: amountIncTax,
		taxAmount: 0,
	};
}

describe("buildEReportingBatch — split by MAX_BATCH_TRANSACTIONS (EINV-EREPORT-005)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-05-28T12:00:00Z"));

		mockPrisma.$transaction.mockImplementation(
			async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma),
		);
		mockPrisma.eReportingBatch.create.mockImplementation(
			async (args: { data: { transactionCount: number } }) => ({
				id: `batch-${Math.random().toString(36).slice(2, 8)}`,
				...args.data,
			}),
		);
		mockPrisma.eReportingTransaction.updateMany.mockResolvedValue({ count: 0 });
	});

	it("splits a 7-tx day into 3 batches (3 + 3 + 1) when MAX_BATCH_TRANSACTIONS=3", async () => {
		const day26 = new Date("2026-05-26T08:00:00Z");
		mockPrisma.eReportingTransaction.findMany.mockResolvedValue([
			makeTransaction("t1", day26, 100),
			makeTransaction("t2", day26, 200),
			makeTransaction("t3", day26, 300),
			makeTransaction("t4", day26, 400),
			makeTransaction("t5", day26, 500),
			makeTransaction("t6", day26, 600),
			makeTransaction("t7", day26, 700),
		]);

		const result = await buildEReportingBatch();

		// 3 batches créés pour la même journée
		expect(mockPrisma.eReportingBatch.create).toHaveBeenCalledTimes(3);

		const sizes = mockPrisma.eReportingBatch.create.mock.calls
			.map((c) => (c[0] as { data: { transactionCount: number } }).data.transactionCount)
			.sort((a, b) => b - a);
		expect(sizes).toEqual([3, 3, 1]);

		expect(result.processed).toBe(7);
		expect(result.errored).toBe(0);
		expect(result.batchCount).toBe(3);
	});

	it("each chunk has its own correct totalAmountIncTax (no global sum leak)", async () => {
		const day26 = new Date("2026-05-26T08:00:00Z");
		mockPrisma.eReportingTransaction.findMany.mockResolvedValue([
			makeTransaction("t1", day26, 100),
			makeTransaction("t2", day26, 200),
			makeTransaction("t3", day26, 300), // chunk 1 = 600
			makeTransaction("t4", day26, 400),
			makeTransaction("t5", day26, 500),
			makeTransaction("t6", day26, 600), // chunk 2 = 1500
			makeTransaction("t7", day26, 700), // chunk 3 = 700
		]);

		await buildEReportingBatch();

		const totals = mockPrisma.eReportingBatch.create.mock.calls
			.map((c) => (c[0] as { data: { totalAmountIncTax: number } }).data.totalAmountIncTax)
			.sort((a, b) => a - b);
		expect(totals).toEqual([600, 700, 1500]);
	});

	it("does NOT split when day fits in one batch (≤ MAX_BATCH_TRANSACTIONS)", async () => {
		const day26 = new Date("2026-05-26T08:00:00Z");
		mockPrisma.eReportingTransaction.findMany.mockResolvedValue([
			makeTransaction("t1", day26, 100),
			makeTransaction("t2", day26, 200),
		]);

		await buildEReportingBatch();
		expect(mockPrisma.eReportingBatch.create).toHaveBeenCalledTimes(1);
	});

	it("logs split notice when chunks > 1", async () => {
		const day26 = new Date("2026-05-26T08:00:00Z");
		mockPrisma.eReportingTransaction.findMany.mockResolvedValue([
			makeTransaction("t1", day26),
			makeTransaction("t2", day26),
			makeTransaction("t3", day26),
			makeTransaction("t4", day26), // 4 > cap 3 → split
		]);

		await buildEReportingBatch();

		expect(mockLogger.info).toHaveBeenCalledWith(
			expect.stringContaining("split into 2 batches"),
			expect.objectContaining({ day: "2026-05-26", chunkCount: 2 }),
		);
	});

	it("splits independently per day (no cross-day leakage)", async () => {
		const day26 = new Date("2026-05-26T08:00:00Z");
		const day27 = new Date("2026-05-27T08:00:00Z");
		mockPrisma.eReportingTransaction.findMany.mockResolvedValue([
			makeTransaction("t1-26", day26, 100),
			makeTransaction("t2-26", day26, 100),
			makeTransaction("t3-26", day26, 100),
			makeTransaction("t4-26", day26, 100), // day 26 = 4 → split en 3 + 1
			makeTransaction("t1-27", day27, 50),
			makeTransaction("t2-27", day27, 50), // day 27 = 2 → 1 batch
		]);

		const result = await buildEReportingBatch();

		// 2 batches pour day 26 + 1 batch pour day 27 = 3 batches
		expect(result.batchCount).toBe(3);
		expect(result.processed).toBe(6);
	});
});
