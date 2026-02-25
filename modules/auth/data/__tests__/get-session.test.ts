import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockIsAdmin,
	mockGetCurrentSession,
	mockCacheLife,
	mockCacheTag,
} = vi.hoisted(() => ({
	mockPrisma: {
		session: { findFirst: vi.fn() },
	},
	mockIsAdmin: vi.fn(),
	mockGetCurrentSession: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/auth/utils/guards", () => ({
	isAdmin: mockIsAdmin,
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetCurrentSession,
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

vi.mock("../constants/session.constants", () => ({
	GET_SESSION_SELECT: {
		id: true,
		expiresAt: true,
		token: true,
		createdAt: true,
		updatedAt: true,
		ipAddress: true,
		userAgent: true,
		userId: true,
		user: { select: { id: true, email: true, role: true, name: true } },
	},
}));

vi.mock("../utils/cache.utils", () => ({
	cacheAuthSession: (sessionId: string) => {
		mockCacheLife("dashboard");
		mockCacheTag(`auth-session-${sessionId}`);
	},
}));

vi.mock("../schemas/session.schemas", () => ({
	getSessionSchema: {
		safeParse: (params: { id?: string }) => {
			if (!params.id || params.id.trim() === "") {
				return {
					success: false,
					error: { issues: [{ message: "id is required" }] },
				};
			}
			return { success: true, data: { id: params.id.trim() } };
		},
	},
}));

import { getSession, fetchSession } from "../get-session";

// ============================================================================
// Factories
// ============================================================================

function makeRawSession(overrides: Record<string, unknown> = {}) {
	return {
		id: "session-1",
		token: "abcd1234efgh5678",
		expiresAt: new Date(Date.now() + 1000 * 60 * 60),
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
		ipAddress: "127.0.0.1",
		userAgent: "Mozilla/5.0",
		userId: "user-1",
		user: { id: "user-1", email: "test@example.com", role: "USER", name: "Test User" },
		...overrides,
	};
}

function setupDefaults() {
	mockIsAdmin.mockResolvedValue(false);
	mockGetCurrentSession.mockResolvedValue({ user: { id: "user-1" } });
	mockPrisma.session.findFirst.mockResolvedValue(null);
}

// ============================================================================
// Tests: getSession
// ============================================================================

describe("getSession", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns null when params validation fails (missing id)", async () => {
		const result = await getSession({});

		expect(result).toBeNull();
		expect(mockPrisma.session.findFirst).not.toHaveBeenCalled();
	});

	it("returns null when params validation fails (empty id)", async () => {
		const result = await getSession({ id: "  " });

		expect(result).toBeNull();
		expect(mockPrisma.session.findFirst).not.toHaveBeenCalled();
	});

	it("returns null when not admin and no authenticated user", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockGetCurrentSession.mockResolvedValue(null);

		const result = await getSession({ id: "session-1" });

		expect(result).toBeNull();
		expect(mockPrisma.session.findFirst).not.toHaveBeenCalled();
	});

	it("calls fetchSession for authenticated non-admin user", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockGetCurrentSession.mockResolvedValue({ user: { id: "user-1" } });
		mockPrisma.session.findFirst.mockResolvedValue(makeRawSession());

		const result = await getSession({ id: "session-1" });

		expect(result).not.toBeNull();
		expect(mockPrisma.session.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: "session-1", userId: "user-1" } })
		);
	});

	it("calls fetchSession for admin without userId constraint", async () => {
		mockIsAdmin.mockResolvedValue(true);
		mockGetCurrentSession.mockResolvedValue(null);
		mockPrisma.session.findFirst.mockResolvedValue(makeRawSession());

		const result = await getSession({ id: "session-1" });

		expect(result).not.toBeNull();
		expect(mockPrisma.session.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: "session-1" } })
		);
		const call = mockPrisma.session.findFirst.mock.calls[0][0];
		expect(call.where.userId).toBeUndefined();
	});
});

// ============================================================================
// Tests: fetchSession
// ============================================================================

describe("fetchSession", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.session.findFirst.mockResolvedValue(null);
	});

	it("returns null when session is not found", async () => {
		mockPrisma.session.findFirst.mockResolvedValue(null);

		const result = await fetchSession({ id: "session-999" }, { admin: true });

		expect(result).toBeNull();
	});

	it("masks the token and removes it from the result", async () => {
		mockPrisma.session.findFirst.mockResolvedValue(makeRawSession({ token: "abcd1234efgh5678" }));

		const result = await fetchSession({ id: "session-1" }, { admin: true });

		expect(result).not.toBeNull();
		expect(result).not.toHaveProperty("token");
		expect(result?.tokenMasked).toBe("abcd...78");
	});

	it("masks a short token correctly", async () => {
		mockPrisma.session.findFirst.mockResolvedValue(makeRawSession({ token: "ab12" }));

		const result = await fetchSession({ id: "session-1" }, { admin: true });

		expect(result?.tokenMasked).toBe("ab12...12");
	});

	it("returns tokenMasked as null when token is null", async () => {
		mockPrisma.session.findFirst.mockResolvedValue(makeRawSession({ token: null }));

		const result = await fetchSession({ id: "session-1" }, { admin: true });

		expect(result?.tokenMasked).toBeNull();
	});

	it("adds userId constraint to query for non-admin user", async () => {
		mockPrisma.session.findFirst.mockResolvedValue(makeRawSession());

		await fetchSession({ id: "session-1" }, { admin: false, userId: "user-1" });

		expect(mockPrisma.session.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: "session-1", userId: "user-1" } })
		);
	});

	it("does not add userId constraint when admin", async () => {
		mockPrisma.session.findFirst.mockResolvedValue(makeRawSession());

		await fetchSession({ id: "session-1" }, { admin: true, userId: "user-1" });

		const call = mockPrisma.session.findFirst.mock.calls[0][0];
		expect(call.where.userId).toBeUndefined();
	});

	it("returns null and does not throw on DB error", async () => {
		mockPrisma.session.findFirst.mockRejectedValue(new Error("DB connection lost"));

		const result = await fetchSession({ id: "session-1" }, { admin: true });

		expect(result).toBeNull();
	});

	it("calls cacheLife with dashboard profile", async () => {
		mockPrisma.session.findFirst.mockResolvedValue(makeRawSession());

		await fetchSession({ id: "session-1" }, { admin: true });

		expect(mockCacheLife).toHaveBeenCalledWith("dashboard");
	});

	it("calls cacheTag with session-specific tag", async () => {
		mockPrisma.session.findFirst.mockResolvedValue(makeRawSession());

		await fetchSession({ id: "session-1" }, { admin: true });

		expect(mockCacheTag).toHaveBeenCalledWith("auth-session-session-1");
	});

	it("includes all expected fields except token in result", async () => {
		const raw = makeRawSession();
		mockPrisma.session.findFirst.mockResolvedValue(raw);

		const result = await fetchSession({ id: "session-1" }, { admin: true });

		expect(result).toMatchObject({
			id: raw.id,
			userId: raw.userId,
			ipAddress: raw.ipAddress,
			userAgent: raw.userAgent,
			user: raw.user,
			tokenMasked: expect.any(String),
		});
		expect(result).not.toHaveProperty("token");
	});
});
