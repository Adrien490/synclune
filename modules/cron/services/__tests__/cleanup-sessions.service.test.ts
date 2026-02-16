import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
	mockPrisma: {
		session: {
			findMany: vi.fn(),
			deleteMany: vi.fn(),
		},
		verification: {
			findMany: vi.fn(),
			deleteMany: vi.fn(),
		},
		account: {
			findMany: vi.fn(),
			updateMany: vi.fn(),
		},
	},
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

import { cleanupExpiredSessions } from "../cleanup-sessions.service";

describe("cleanupExpiredSessions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-02-16T10:00:00Z"));
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});

		// Default: all findMany return empty, all mutations return 0
		mockPrisma.session.findMany.mockResolvedValue([]);
		mockPrisma.session.deleteMany.mockResolvedValue({ count: 0 });
		mockPrisma.verification.findMany.mockResolvedValue([]);
		mockPrisma.verification.deleteMany.mockResolvedValue({ count: 0 });
		mockPrisma.account.findMany.mockResolvedValue([]);
		mockPrisma.account.updateMany.mockResolvedValue({ count: 0 });
	});

	it("should delete expired sessions", async () => {
		const sessionIds = [{ id: "s-1" }, { id: "s-2" }, { id: "s-3" }, { id: "s-4" }, { id: "s-5" }];
		mockPrisma.session.findMany.mockResolvedValue(sessionIds);
		mockPrisma.session.deleteMany.mockResolvedValue({ count: 5 });

		const result = await cleanupExpiredSessions();

		expect(mockPrisma.session.findMany).toHaveBeenCalledWith({
			where: { expiresAt: { lt: new Date("2026-02-16T10:00:00Z") } },
			select: { id: true },
			take: 1000,
		});
		expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
			where: { id: { in: ["s-1", "s-2", "s-3", "s-4", "s-5"] } },
		});
		expect(result.sessionsDeleted).toBe(5);
	});

	it("should delete expired verifications", async () => {
		const verificationIds = Array.from({ length: 12 }, (_, i) => ({ id: `v-${i}` }));
		mockPrisma.verification.findMany.mockResolvedValue(verificationIds);
		mockPrisma.verification.deleteMany.mockResolvedValue({ count: 12 });

		const result = await cleanupExpiredSessions();

		expect(mockPrisma.verification.findMany).toHaveBeenCalledWith({
			where: { expiresAt: { lt: new Date("2026-02-16T10:00:00Z") } },
			select: { id: true },
			take: 1000,
		});
		expect(mockPrisma.verification.deleteMany).toHaveBeenCalledWith({
			where: { id: { in: verificationIds.map((v) => v.id) } },
		});
		expect(result.verificationsDeleted).toBe(12);
	});

	it("should clear expired access tokens", async () => {
		const accountIds = Array.from({ length: 8 }, (_, i) => ({ id: `a-${i}` }));
		mockPrisma.account.findMany.mockResolvedValueOnce(accountIds).mockResolvedValueOnce([]);
		mockPrisma.account.updateMany
			.mockResolvedValueOnce({ count: 8 })
			.mockResolvedValueOnce({ count: 0 });

		const result = await cleanupExpiredSessions();

		expect(mockPrisma.account.findMany).toHaveBeenNthCalledWith(1, {
			where: { accessTokenExpiresAt: { lt: new Date("2026-02-16T10:00:00Z") } },
			select: { id: true },
			take: 1000,
		});
		expect(mockPrisma.account.updateMany).toHaveBeenNthCalledWith(1, {
			where: { id: { in: accountIds.map((a) => a.id) } },
			data: {
				accessToken: null,
				accessTokenExpiresAt: null,
			},
		});
		expect(result.tokensCleared).toBe(8);
	});

	it("should clear expired refresh tokens", async () => {
		const accountIds = [{ id: "r-1" }, { id: "r-2" }, { id: "r-3" }];
		mockPrisma.account.findMany
			.mockResolvedValueOnce([]) // access tokens
			.mockResolvedValueOnce(accountIds); // refresh tokens
		mockPrisma.account.updateMany
			.mockResolvedValueOnce({ count: 0 })
			.mockResolvedValueOnce({ count: 3 });

		const result = await cleanupExpiredSessions();

		expect(mockPrisma.account.findMany).toHaveBeenNthCalledWith(2, {
			where: { refreshTokenExpiresAt: { lt: new Date("2026-02-16T10:00:00Z") } },
			select: { id: true },
			take: 1000,
		});
		expect(mockPrisma.account.updateMany).toHaveBeenNthCalledWith(2, {
			where: { id: { in: ["r-1", "r-2", "r-3"] } },
			data: {
				refreshToken: null,
				refreshTokenExpiresAt: null,
			},
		});
		expect(result.tokensCleared).toBe(3);
	});

	it("should return combined token count (access + refresh)", async () => {
		const accessIds = Array.from({ length: 7 }, (_, i) => ({ id: `at-${i}` }));
		const refreshIds = Array.from({ length: 4 }, (_, i) => ({ id: `rt-${i}` }));
		mockPrisma.account.findMany
			.mockResolvedValueOnce(accessIds)
			.mockResolvedValueOnce(refreshIds);
		mockPrisma.account.updateMany
			.mockResolvedValueOnce({ count: 7 }) // access tokens
			.mockResolvedValueOnce({ count: 4 }); // refresh tokens

		const result = await cleanupExpiredSessions();

		expect(result.tokensCleared).toBe(11);
	});

	it("should handle zero of everything", async () => {
		const result = await cleanupExpiredSessions();

		expect(result).toEqual({
			sessionsDeleted: 0,
			verificationsDeleted: 0,
			tokensCleared: 0,
			hasMore: false,
		});
	});

	it("should handle mixed counts (all operations have results)", async () => {
		const sessionIds = Array.from({ length: 15 }, (_, i) => ({ id: `s-${i}` }));
		const verificationIds = Array.from({ length: 23 }, (_, i) => ({ id: `v-${i}` }));
		const accessIds = Array.from({ length: 10 }, (_, i) => ({ id: `at-${i}` }));
		const refreshIds = Array.from({ length: 5 }, (_, i) => ({ id: `rt-${i}` }));

		mockPrisma.session.findMany.mockResolvedValue(sessionIds);
		mockPrisma.session.deleteMany.mockResolvedValue({ count: 15 });
		mockPrisma.verification.findMany.mockResolvedValue(verificationIds);
		mockPrisma.verification.deleteMany.mockResolvedValue({ count: 23 });
		mockPrisma.account.findMany
			.mockResolvedValueOnce(accessIds)
			.mockResolvedValueOnce(refreshIds);
		mockPrisma.account.updateMany
			.mockResolvedValueOnce({ count: 10 })
			.mockResolvedValueOnce({ count: 5 });

		const result = await cleanupExpiredSessions();

		expect(result).toEqual({
			sessionsDeleted: 15,
			verificationsDeleted: 23,
			tokensCleared: 15,
			hasMore: false,
		});
		expect(mockPrisma.session.findMany).toHaveBeenCalledTimes(1);
		expect(mockPrisma.session.deleteMany).toHaveBeenCalledTimes(1);
		expect(mockPrisma.verification.findMany).toHaveBeenCalledTimes(1);
		expect(mockPrisma.verification.deleteMany).toHaveBeenCalledTimes(1);
		expect(mockPrisma.account.findMany).toHaveBeenCalledTimes(2);
		expect(mockPrisma.account.updateMany).toHaveBeenCalledTimes(2);
	});

	it("should pass found IDs to deleteMany/updateMany", async () => {
		mockPrisma.session.findMany.mockResolvedValue([{ id: "sess-abc" }, { id: "sess-def" }]);
		mockPrisma.session.deleteMany.mockResolvedValue({ count: 2 });
		mockPrisma.verification.findMany.mockResolvedValue([{ id: "ver-123" }]);
		mockPrisma.verification.deleteMany.mockResolvedValue({ count: 1 });
		mockPrisma.account.findMany
			.mockResolvedValueOnce([{ id: "acc-1" }])
			.mockResolvedValueOnce([{ id: "acc-2" }, { id: "acc-3" }]);
		mockPrisma.account.updateMany
			.mockResolvedValueOnce({ count: 1 })
			.mockResolvedValueOnce({ count: 2 });

		await cleanupExpiredSessions();

		expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
			where: { id: { in: ["sess-abc", "sess-def"] } },
		});
		expect(mockPrisma.verification.deleteMany).toHaveBeenCalledWith({
			where: { id: { in: ["ver-123"] } },
		});
		expect(mockPrisma.account.updateMany).toHaveBeenNthCalledWith(1, {
			where: { id: { in: ["acc-1"] } },
			data: { accessToken: null, accessTokenExpiresAt: null },
		});
		expect(mockPrisma.account.updateMany).toHaveBeenNthCalledWith(2, {
			where: { id: { in: ["acc-2", "acc-3"] } },
			data: { refreshToken: null, refreshTokenExpiresAt: null },
		});
	});

	it("should log warning when session delete limit is reached", async () => {
		const consoleWarnSpy = vi.spyOn(console, "warn");
		const sessionIds = Array.from({ length: 1000 }, (_, i) => ({ id: `s-${i}` }));
		mockPrisma.session.findMany.mockResolvedValue(sessionIds);
		mockPrisma.session.deleteMany.mockResolvedValue({ count: 1000 });

		await cleanupExpiredSessions();

		expect(consoleWarnSpy).toHaveBeenCalledWith(
			"[CRON:cleanup-sessions] Session delete limit reached, remaining will be cleaned on next run"
		);
	});

	it("should not log warning when under delete limit", async () => {
		const consoleWarnSpy = vi.spyOn(console, "warn");
		const sessionIds = Array.from({ length: 999 }, (_, i) => ({ id: `s-${i}` }));
		mockPrisma.session.findMany.mockResolvedValue(sessionIds);
		mockPrisma.session.deleteMany.mockResolvedValue({ count: 999 });

		await cleanupExpiredSessions();

		expect(consoleWarnSpy).not.toHaveBeenCalled();
	});

	it("should log cleanup progress to console", async () => {
		const consoleLogSpy = vi.spyOn(console, "log");
		const sessionIds = Array.from({ length: 8 }, (_, i) => ({ id: `s-${i}` }));
		const verificationIds = Array.from({ length: 3 }, (_, i) => ({ id: `v-${i}` }));
		const accessIds = Array.from({ length: 2 }, (_, i) => ({ id: `at-${i}` }));
		const refreshIds = Array.from({ length: 1 }, (_, i) => ({ id: `rt-${i}` }));

		mockPrisma.session.findMany.mockResolvedValue(sessionIds);
		mockPrisma.session.deleteMany.mockResolvedValue({ count: 8 });
		mockPrisma.verification.findMany.mockResolvedValue(verificationIds);
		mockPrisma.verification.deleteMany.mockResolvedValue({ count: 3 });
		mockPrisma.account.findMany
			.mockResolvedValueOnce(accessIds)
			.mockResolvedValueOnce(refreshIds);
		mockPrisma.account.updateMany
			.mockResolvedValueOnce({ count: 2 })
			.mockResolvedValueOnce({ count: 1 });

		await cleanupExpiredSessions();

		expect(consoleLogSpy).toHaveBeenCalledWith(
			"[CRON:cleanup-sessions] Starting expired sessions cleanup..."
		);
		expect(consoleLogSpy).toHaveBeenCalledWith(
			"[CRON:cleanup-sessions] Deleted 8 expired sessions"
		);
		expect(consoleLogSpy).toHaveBeenCalledWith(
			"[CRON:cleanup-sessions] Deleted 3 expired verifications"
		);
		expect(consoleLogSpy).toHaveBeenCalledWith(
			"[CRON:cleanup-sessions] Cleared 2 expired access tokens, 1 expired refresh tokens"
		);
		expect(consoleLogSpy).toHaveBeenCalledWith(
			"[CRON:cleanup-sessions] Cleanup completed"
		);
	});

	it("should use current timestamp for expiresAt comparison", async () => {
		const mockDate = new Date("2026-06-15T12:30:00Z");
		vi.setSystemTime(mockDate);

		await cleanupExpiredSessions();

		const sessionWhere = mockPrisma.session.findMany.mock.calls[0][0].where;
		expect(sessionWhere.expiresAt.lt).toEqual(mockDate);

		const verificationWhere = mockPrisma.verification.findMany.mock.calls[0][0].where;
		expect(verificationWhere.expiresAt.lt).toEqual(mockDate);

		const accessWhere = mockPrisma.account.findMany.mock.calls[0][0].where;
		expect(accessWhere.accessTokenExpiresAt.lt).toEqual(mockDate);

		const refreshWhere = mockPrisma.account.findMany.mock.calls[1][0].where;
		expect(refreshWhere.refreshTokenExpiresAt.lt).toEqual(mockDate);
	});
});
