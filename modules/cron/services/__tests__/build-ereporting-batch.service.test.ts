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
		eReportingPeriod: {
			upsert: vi.fn(),
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

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	TX_TIMEOUT_LONG: 30000,
	TX_MAX_WAIT_LONG: 10000,
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: mockLogger,
}));

vi.mock("@/modules/cron/constants/limits", () => ({
	BATCH_SIZE_MEDIUM: 100,
	MAX_BATCH_TRANSACTIONS: 1000,
}));

import { buildEReportingBatch } from "../build-ereporting-batch.service";

function makeTransaction(
	id: string,
	occurredAt: Date,
	amountIncTax = 1000,
): {
	id: string;
	occurredAt: Date;
	amountIncTax: number;
	amountExclTax: number;
	taxAmount: number;
} {
	return {
		id,
		occurredAt,
		amountIncTax,
		amountExclTax: amountIncTax, // franchise — exclTax == inclTax
		taxAmount: 0,
	};
}

describe("buildEReportingBatch — aggregation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-05-28T12:00:00Z"));

		// Default: $transaction passes through the callback with a tx that
		// forwards to mockPrisma.
		mockPrisma.$transaction.mockImplementation(
			async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma),
		);
		mockPrisma.eReportingBatch.create.mockImplementation(
			async (args: { data: { transactionCount: number } }) => ({
				id: `batch-${Math.random().toString(36).slice(2, 8)}`,
				...args.data,
			}),
		);
		mockPrisma.eReportingPeriod.upsert.mockImplementation(
			async (args: { create: { periodFrom: Date } }) => ({
				id: `period-${args.create.periodFrom.toISOString()}`,
			}),
		);
		mockPrisma.eReportingTransaction.updateMany.mockResolvedValue({ count: 0 });
	});

	it("returns no-op when no PENDING transactions exist", async () => {
		mockPrisma.eReportingTransaction.findMany.mockResolvedValue([]);
		const result = await buildEReportingBatch();
		expect(result).toEqual({ processed: 0, errored: 0, skipped: 0 });
		expect(mockPrisma.eReportingBatch.create).not.toHaveBeenCalled();
	});

	it("filters out today's transactions (only aggregates strictly prior days)", async () => {
		mockPrisma.eReportingTransaction.findMany.mockResolvedValue([]);
		await buildEReportingBatch();
		expect(mockPrisma.eReportingTransaction.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					batchId: null,
					status: "PENDING",
					occurredAt: { lt: new Date("2026-05-28T00:00:00.000Z") },
				}),
			}),
		);
	});

	it("creates one batch per UTC day with correct totals + transaction count", async () => {
		// 3 transactions le 2026-05-26, 2 transactions le 2026-05-27.
		mockPrisma.eReportingTransaction.findMany.mockResolvedValue([
			makeTransaction("t1", new Date("2026-05-26T08:00:00Z"), 1000),
			makeTransaction("t2", new Date("2026-05-26T15:30:00Z"), 2500),
			makeTransaction("t3", new Date("2026-05-26T22:00:00Z"), 1500),
			makeTransaction("t4", new Date("2026-05-27T09:00:00Z"), 3000),
			makeTransaction("t5", new Date("2026-05-27T18:00:00Z"), 4000),
		]);
		mockPrisma.eReportingTransaction.updateMany.mockResolvedValue({ count: 3 });

		const result = await buildEReportingBatch();

		expect(mockPrisma.eReportingBatch.create).toHaveBeenCalledTimes(2);

		const calls = mockPrisma.eReportingBatch.create.mock.calls;
		// Day 2026-05-26 → 3 transactions, total = 5000
		const day26 = calls.find(
			(c) =>
				(c[0] as { data: { periodFrom: Date } }).data.periodFrom.toISOString() ===
				"2026-05-26T00:00:00.000Z",
		);
		expect(day26).toBeDefined();
		expect((day26![0] as { data: { transactionCount: number } }).data.transactionCount).toBe(3);
		expect((day26![0] as { data: { totalAmountIncTax: number } }).data.totalAmountIncTax).toBe(
			5000,
		);

		// Day 2026-05-27 → 2 transactions, total = 7000
		const day27 = calls.find(
			(c) =>
				(c[0] as { data: { periodFrom: Date } }).data.periodFrom.toISOString() ===
				"2026-05-27T00:00:00.000Z",
		);
		expect(day27).toBeDefined();
		expect((day27![0] as { data: { transactionCount: number } }).data.transactionCount).toBe(2);
		expect((day27![0] as { data: { totalAmountIncTax: number } }).data.totalAmountIncTax).toBe(
			7000,
		);

		expect(result.processed).toBe(5);
		expect(result.errored).toBe(0);
		expect(result.batchCount).toBe(2);
	});

	it("assigns transactions to their batch via updateMany filtered by id list", async () => {
		mockPrisma.eReportingTransaction.findMany.mockResolvedValue([
			makeTransaction("t1", new Date("2026-05-26T08:00:00Z")),
			makeTransaction("t2", new Date("2026-05-26T15:30:00Z")),
		]);

		await buildEReportingBatch();

		expect(mockPrisma.eReportingTransaction.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					id: { in: ["t1", "t2"] },
					batchId: null, // idempotence guard
				}),
				data: expect.objectContaining({ batchId: expect.any(String) }),
			}),
		);
	});

	it("handles negative amounts (REFUND transactions) — totals sum to net", async () => {
		mockPrisma.eReportingTransaction.findMany.mockResolvedValue([
			makeTransaction("sales-1", new Date("2026-05-26T08:00:00Z"), 10000),
			makeTransaction("refund-1", new Date("2026-05-26T18:00:00Z"), -2500),
		]);

		await buildEReportingBatch();

		const created = mockPrisma.eReportingBatch.create.mock.calls[0]![0] as {
			data: { totalAmountIncTax: number };
		};
		expect(created.data.totalAmountIncTax).toBe(7500);
	});

	it("hasMore=true when BATCH_SIZE_MEDIUM is reached", async () => {
		const transactions = Array.from({ length: 100 }, (_, i) =>
			makeTransaction(`t${i}`, new Date("2026-05-26T08:00:00Z"), 100),
		);
		mockPrisma.eReportingTransaction.findMany.mockResolvedValue(transactions);

		const result = await buildEReportingBatch();
		expect(result.hasMore).toBe(true);
	});

	it("hasMore=false when fewer than BATCH_SIZE_MEDIUM transactions returned", async () => {
		mockPrisma.eReportingTransaction.findMany.mockResolvedValue([
			makeTransaction("t1", new Date("2026-05-26T08:00:00Z")),
		]);
		const result = await buildEReportingBatch();
		expect(result.hasMore).toBe(false);
	});

	it("orders transactions by occurredAt ASC (process oldest first)", async () => {
		mockPrisma.eReportingTransaction.findMany.mockResolvedValue([]);
		await buildEReportingBatch();
		expect(mockPrisma.eReportingTransaction.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: { occurredAt: "asc" },
			}),
		);
	});

	it("creates batch with status PENDING (will flip to SENT by transmit cron)", async () => {
		mockPrisma.eReportingTransaction.findMany.mockResolvedValue([
			makeTransaction("t1", new Date("2026-05-26T08:00:00Z")),
		]);

		await buildEReportingBatch();

		const created = mockPrisma.eReportingBatch.create.mock.calls[0]![0] as {
			data: { status: string };
		};
		expect(created.data.status).toBe("PENDING");
	});
});

describe("buildEReportingBatch — error handling", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-05-28T12:00:00Z"));

		mockPrisma.$transaction.mockImplementation(
			async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma),
		);
		mockPrisma.eReportingPeriod.upsert.mockImplementation(
			async (args: { create: { periodFrom: Date } }) => ({
				id: `period-${args.create.periodFrom.toISOString()}`,
			}),
		);
		mockPrisma.eReportingTransaction.updateMany.mockResolvedValue({ count: 0 });
	});

	it("isolates per-day failures (one bad day does not block others)", async () => {
		mockPrisma.eReportingTransaction.findMany.mockResolvedValue([
			makeTransaction("t1", new Date("2026-05-26T08:00:00Z")),
			makeTransaction("t2", new Date("2026-05-27T08:00:00Z")),
		]);

		// Fail on first create (day 26), succeed on second (day 27).
		mockPrisma.eReportingBatch.create
			.mockRejectedValueOnce(new Error("DB timeout"))
			.mockResolvedValueOnce({ id: "batch-27", transactionCount: 1 });

		const result = await buildEReportingBatch();

		expect(result.processed).toBe(1); // day 27 OK
		expect(result.errored).toBe(1); // day 26 failed
		expect(mockLogger.error).toHaveBeenCalled();
	});

	it("logs a warn when updateMany count != expected (concurrent rebatch)", async () => {
		mockPrisma.eReportingTransaction.findMany.mockResolvedValue([
			makeTransaction("t1", new Date("2026-05-26T08:00:00Z")),
			makeTransaction("t2", new Date("2026-05-26T09:00:00Z")),
		]);
		// Only 1 of the 2 transactions got assigned (other one stolen by parallel cron).
		mockPrisma.eReportingTransaction.updateMany.mockResolvedValue({ count: 1 });

		await buildEReportingBatch();

		expect(mockLogger.warn).toHaveBeenCalledWith(
			expect.stringContaining("assigned 1/2"),
			expect.any(Object),
		);
	});
});
