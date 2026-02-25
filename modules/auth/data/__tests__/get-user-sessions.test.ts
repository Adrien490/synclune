import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockGetCurrentUser,
	mockAuthApiGetSession,
	mockHeaders,
	mockCacheLife,
	mockCacheTag,
} = vi.hoisted(() => ({
	mockPrisma: {
		session: { findMany: vi.fn() },
	},
	mockGetCurrentUser: vi.fn(),
	mockAuthApiGetSession: vi.fn(),
	mockHeaders: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/users/data/get-current-user", () => ({
	getCurrentUser: mockGetCurrentUser,
}));

vi.mock("@/modules/auth/lib/auth", () => ({
	auth: {
		api: {
			getSession: mockAuthApiGetSession,
		},
	},
}));

vi.mock("next/headers", () => ({
	headers: mockHeaders,
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	SESSION_CACHE_TAGS: {
		SESSIONS: (userId: string) => `sessions-user-${userId}`,
	},
}));

vi.mock("@/shared/lib/cache", () => ({
	cacheDefault: (tag?: string) => {
		mockCacheLife("dashboard");
		if (tag) mockCacheTag(tag);
	},
}));

import { getUserSessions, fetchUserSessions } from "../get-user-sessions";

// ============================================================================
// Factories
// ============================================================================

function makeUser(overrides: Record<string, unknown> = {}) {
	return {
		id: "user-1",
		email: "test@example.com",
		name: "Test User",
		...overrides,
	};
}

function makeSession(overrides: Record<string, unknown> = {}) {
	return {
		id: "session-1",
		ipAddress: "127.0.0.1",
		userAgent: "Mozilla/5.0",
		createdAt: new Date("2024-01-01"),
		expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
		...overrides,
	};
}

function setupDefaults() {
	mockGetCurrentUser.mockResolvedValue(null);
	mockHeaders.mockResolvedValue(new Headers());
	mockAuthApiGetSession.mockResolvedValue(null);
	mockPrisma.session.findMany.mockResolvedValue([]);
}

// ============================================================================
// Tests: getUserSessions
// ============================================================================

describe("getUserSessions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns empty array when user is not authenticated", async () => {
		mockGetCurrentUser.mockResolvedValue(null);

		const result = await getUserSessions();

		expect(result).toEqual([]);
		expect(mockPrisma.session.findMany).not.toHaveBeenCalled();
	});

	it("retrieves sessions for authenticated user", async () => {
		mockGetCurrentUser.mockResolvedValue(makeUser({ id: "user-1" }));
		mockAuthApiGetSession.mockResolvedValue({ session: { id: "session-1" } });
		const session = makeSession({ id: "session-1" });
		mockPrisma.session.findMany.mockResolvedValue([session]);

		const result = await getUserSessions();

		expect(result).toHaveLength(1);
		expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { userId: "user-1" } })
		);
	});

	it("passes the current session ID to fetchUserSessions", async () => {
		mockGetCurrentUser.mockResolvedValue(makeUser({ id: "user-1" }));
		mockAuthApiGetSession.mockResolvedValue({ session: { id: "current-session-id" } });
		mockPrisma.session.findMany.mockResolvedValue([
			makeSession({ id: "current-session-id" }),
		]);

		const result = await getUserSessions();

		expect(result[0]?.isCurrentSession).toBe(true);
	});

	it("passes undefined currentSessionId when auth.api.getSession returns null", async () => {
		mockGetCurrentUser.mockResolvedValue(makeUser({ id: "user-1" }));
		mockAuthApiGetSession.mockResolvedValue(null);
		mockPrisma.session.findMany.mockResolvedValue([makeSession({ id: "session-1" })]);

		const result = await getUserSessions();

		expect(result[0]?.isCurrentSession).toBe(false);
	});
});

// ============================================================================
// Tests: fetchUserSessions
// ============================================================================

describe("fetchUserSessions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.session.findMany.mockResolvedValue([]);
	});

	it("returns empty array when user has no sessions", async () => {
		mockPrisma.session.findMany.mockResolvedValue([]);

		const result = await fetchUserSessions("user-1");

		expect(result).toEqual([]);
	});

	it("marks the current session with isCurrentSession=true", async () => {
		const sessions = [
			makeSession({ id: "session-A" }),
			makeSession({ id: "session-B" }),
		];
		mockPrisma.session.findMany.mockResolvedValue(sessions);

		const result = await fetchUserSessions("user-1", "session-A");

		const sessionA = result.find((s) => s.id === "session-A");
		const sessionB = result.find((s) => s.id === "session-B");
		expect(sessionA?.isCurrentSession).toBe(true);
		expect(sessionB?.isCurrentSession).toBe(false);
	});

	it("marks all sessions as isCurrentSession=false when no currentSessionId provided", async () => {
		mockPrisma.session.findMany.mockResolvedValue([
			makeSession({ id: "session-A" }),
			makeSession({ id: "session-B" }),
		]);

		const result = await fetchUserSessions("user-1");

		expect(result.every((s) => s.isCurrentSession === false)).toBe(true);
	});

	it("marks expired sessions with isExpired=true", async () => {
		const pastDate = new Date(Date.now() - 1000 * 60 * 60);
		mockPrisma.session.findMany.mockResolvedValue([
			makeSession({ id: "session-expired", expiresAt: pastDate }),
		]);

		const result = await fetchUserSessions("user-1");

		expect(result[0]?.isExpired).toBe(true);
	});

	it("marks active sessions with isExpired=false", async () => {
		const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24);
		mockPrisma.session.findMany.mockResolvedValue([
			makeSession({ id: "session-active", expiresAt: futureDate }),
		]);

		const result = await fetchUserSessions("user-1");

		expect(result[0]?.isExpired).toBe(false);
	});

	it("queries sessions by userId", async () => {
		await fetchUserSessions("user-42");

		expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { userId: "user-42" } })
		);
	});

	it("orders sessions by createdAt descending", async () => {
		await fetchUserSessions("user-1");

		expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ orderBy: { createdAt: "desc" } })
		);
	});

	it("includes enriched fields isCurrentSession and isExpired in result", async () => {
		const session = makeSession({ id: "session-1" });
		mockPrisma.session.findMany.mockResolvedValue([session]);

		const result = await fetchUserSessions("user-1", "session-1");

		expect(result[0]).toHaveProperty("isCurrentSession");
		expect(result[0]).toHaveProperty("isExpired");
	});

	it("returns empty array on DB error without throwing", async () => {
		mockPrisma.session.findMany.mockRejectedValue(new Error("Connection failed"));

		const result = await fetchUserSessions("user-1");

		expect(result).toEqual([]);
	});

	it("calls cacheLife with dashboard profile", async () => {
		await fetchUserSessions("user-1");

		expect(mockCacheLife).toHaveBeenCalledWith("dashboard");
	});

	it("calls cacheTag with user-specific sessions tag", async () => {
		await fetchUserSessions("user-1");

		expect(mockCacheTag).toHaveBeenCalledWith("sessions-user-user-1");
	});

	it("preserves raw session fields alongside enriched ones", async () => {
		const session = makeSession({ id: "s-1", ipAddress: "192.168.1.1", userAgent: "Safari" });
		mockPrisma.session.findMany.mockResolvedValue([session]);

		const result = await fetchUserSessions("user-1");

		expect(result[0]).toMatchObject({
			id: "s-1",
			ipAddress: "192.168.1.1",
			userAgent: "Safari",
		});
	});
});
