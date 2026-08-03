import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockLogger, mockSentryWithScope } = vi.hoisted(() => ({
	mockPrisma: {
		session: {
			findMany: vi.fn(),
			deleteMany: vi.fn(),
		},
	},
	mockLogger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
	mockSentryWithScope: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: mockLogger,
}));

vi.mock("@sentry/nextjs", () => ({
	captureException: vi.fn(),
	withScope: mockSentryWithScope,
	captureMessage: vi.fn(),
	addBreadcrumb: vi.fn(),
	startSpan: vi.fn(async (_opts: unknown, cb: () => unknown) => cb()),
}));

import { cleanupExpiredSessions } from "../cleanup-sessions.service";
import { CLEANUP_DELETE_LIMIT } from "@/modules/cron/constants/limits";

const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

describe("cleanupExpiredSessions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSentryWithScope.mockImplementation((cb: (scope: unknown) => void) => {
			cb({ setTag: vi.fn(), setLevel: vi.fn(), setFingerprint: vi.fn(), setContext: vi.fn() });
		});
	});

	it("deletes sessions expired for more than the 24h grace period", async () => {
		mockPrisma.session.findMany.mockResolvedValue([{ id: "s1" }, { id: "s2" }]);
		mockPrisma.session.deleteMany.mockResolvedValue({ count: 2 });

		const before = Date.now();
		const result = await cleanupExpiredSessions();
		const after = Date.now();

		const where = mockPrisma.session.findMany.mock.calls[0]![0].where;
		const cutoff = (where.expiresAt.lt as Date).getTime();
		expect(cutoff).toBeGreaterThanOrEqual(before - GRACE_PERIOD_MS);
		expect(cutoff).toBeLessThanOrEqual(after - GRACE_PERIOD_MS);

		expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
			where: { id: { in: ["s1", "s2"] } },
		});
		expect(result).toMatchObject({
			processed: 2,
			errored: 0,
			skipped: 0,
			deletedSessions: 2,
			hasMore: false,
		});
	});

	it("is a no-op when no session is expired", async () => {
		mockPrisma.session.findMany.mockResolvedValue([]);

		const result = await cleanupExpiredSessions();

		expect(mockPrisma.session.deleteMany).not.toHaveBeenCalled();
		expect(result).toMatchObject({ processed: 0, errored: 0, deletedSessions: 0, hasMore: false });
	});

	it("bounds the batch and reports hasMore when the limit is hit", async () => {
		const batch = Array.from({ length: CLEANUP_DELETE_LIMIT }, (_, i) => ({ id: `s${i}` }));
		mockPrisma.session.findMany.mockResolvedValue(batch);
		mockPrisma.session.deleteMany.mockResolvedValue({ count: CLEANUP_DELETE_LIMIT });

		const result = await cleanupExpiredSessions();

		expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ take: CLEANUP_DELETE_LIMIT }),
		);
		expect(result.hasMore).toBe(true);
		expect(result.processed).toBe(CLEANUP_DELETE_LIMIT);
	});

	it("reports errored without throwing when the delete fails", async () => {
		mockPrisma.session.findMany.mockRejectedValue(new Error("db down"));

		const result = await cleanupExpiredSessions();

		expect(result).toMatchObject({ processed: 0, errored: 1 });
		expect(mockLogger.error).toHaveBeenCalled();
		expect(mockSentryWithScope).toHaveBeenCalled();
	});
});
