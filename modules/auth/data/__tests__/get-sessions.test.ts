import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockIsAdmin,
	mockGetSession,
	mockBuildCursorPagination,
	mockProcessCursorResults,
	mockBuildSessionWhereClause,
	mockCacheAuthSessions,
	mockCacheLife,
	mockCacheTag,
} = vi.hoisted(() => ({
	mockPrisma: {
		session: { findMany: vi.fn() },
	},
	mockIsAdmin: vi.fn(),
	mockGetSession: vi.fn(),
	mockBuildCursorPagination: vi.fn(),
	mockProcessCursorResults: vi.fn(),
	mockBuildSessionWhereClause: vi.fn(),
	mockCacheAuthSessions: vi.fn(),
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
	getSession: mockGetSession,
}));

vi.mock("@/shared/lib/pagination", () => ({
	buildCursorPagination: mockBuildCursorPagination,
	processCursorResults: mockProcessCursorResults,
}));

vi.mock("@/modules/auth/services/session-query-builder", () => ({
	buildSessionWhereClause: mockBuildSessionWhereClause,
}));

vi.mock("@/modules/auth/utils/cache.utils", () => ({
	cacheAuthSessions: mockCacheAuthSessions,
}));

vi.mock("@/modules/auth/constants/session.constants", () => ({
	GET_SESSIONS_SELECT: {
		id: true,
		expiresAt: true,
		createdAt: true,
		updatedAt: true,
		ipAddress: true,
		userAgent: true,
		userId: true,
	},
	GET_SESSIONS_DEFAULT_PER_PAGE: 30,
	GET_SESSIONS_MAX_RESULTS_PER_PAGE: 200,
	GET_SESSIONS_DEFAULT_SORT_BY: "createdAt",
	GET_SESSIONS_DEFAULT_SORT_ORDER: "desc",
	GET_SESSIONS_SORT_FIELDS: ["createdAt", "updatedAt", "expiresAt"],
}));

vi.mock("@/modules/auth/schemas/session.schemas", () => ({
	getSessionsSchema: {
		safeParse: vi.fn((params) => ({ success: true, data: params })),
	},
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

import { getSessions } from "../get-sessions";
import { getSessionsSchema } from "@/modules/auth/schemas/session.schemas";

// ============================================================================
// Factories
// ============================================================================

function makeValidParams(overrides: Record<string, unknown> = {}) {
	return {
		cursor: undefined,
		direction: "forward" as const,
		perPage: 30,
		sortBy: "createdAt" as const,
		sortOrder: "desc" as const,
		filters: {},
		...overrides,
	};
}

function makeRawSession(overrides: Record<string, unknown> = {}) {
	return {
		id: "session-1",
		expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
		ipAddress: "127.0.0.1",
		userAgent: "Mozilla/5.0",
		userId: "user-1",
		token: "abcdefghij1234567890",
		...overrides,
	};
}

function makePaginationInfo(overrides: Record<string, unknown> = {}) {
	return {
		nextCursor: null,
		prevCursor: null,
		hasNextPage: false,
		hasPreviousPage: false,
		...overrides,
	};
}

function setupAdminContext() {
	mockIsAdmin.mockResolvedValue(true);
	mockGetSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
}

function setupUserContext(userId = "user-1") {
	mockIsAdmin.mockResolvedValue(false);
	mockGetSession.mockResolvedValue({ user: { id: userId, role: "USER" } });
}

// ============================================================================
// Tests: getSessions — authentication guards
// ============================================================================

describe("getSessions — authentication", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsAdmin.mockResolvedValue(false);
		mockGetSession.mockResolvedValue(null);
		mockBuildSessionWhereClause.mockReturnValue({});
		mockBuildCursorPagination.mockReturnValue({ take: 31 });
		mockPrisma.session.findMany.mockResolvedValue([]);
		mockProcessCursorResults.mockReturnValue({
			items: [],
			pagination: makePaginationInfo(),
		});
	});

	it("throws when not admin and no session", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockGetSession.mockResolvedValue(null);

		await expect(getSessions(makeValidParams())).rejects.toThrow("Authentication required");
	});

	it("throws when not admin and session has no user id", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockGetSession.mockResolvedValue({ user: {} });

		await expect(getSessions(makeValidParams())).rejects.toThrow("Authentication required");
	});

	it("resolves when admin even with no session", async () => {
		mockIsAdmin.mockResolvedValue(true);
		mockGetSession.mockResolvedValue(null);

		await expect(getSessions(makeValidParams())).resolves.toBeDefined();
	});

	it("resolves when non-admin with valid session", async () => {
		setupUserContext("user-1");

		await expect(getSessions(makeValidParams())).resolves.toBeDefined();
	});
});

// ============================================================================
// Tests: getSessions — param validation
// ============================================================================

describe("getSessions — param validation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupAdminContext();
		mockBuildSessionWhereClause.mockReturnValue({});
		mockBuildCursorPagination.mockReturnValue({ take: 31 });
		mockPrisma.session.findMany.mockResolvedValue([]);
		mockProcessCursorResults.mockReturnValue({
			items: [],
			pagination: makePaginationInfo(),
		});
	});

	it("throws when schema validation fails", async () => {
		vi.mocked(getSessionsSchema.safeParse).mockReturnValueOnce({
			success: false,
			error: { errors: [{ message: "Invalid" }] },
		} as unknown as ReturnType<typeof getSessionsSchema.safeParse>);

		await expect(getSessions(makeValidParams())).rejects.toThrow("Invalid parameters");
	});

	it("proceeds when schema validation succeeds", async () => {
		vi.mocked(getSessionsSchema.safeParse).mockReturnValueOnce({
			success: true,
			data: makeValidParams(),
		} as ReturnType<typeof getSessionsSchema.safeParse>);

		await expect(getSessions(makeValidParams())).resolves.toBeDefined();
	});
});

// ============================================================================
// Tests: getSessions — authorization scoping
// ============================================================================

describe("getSessions — authorization scoping", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getSessionsSchema.safeParse).mockImplementation((params) => ({
			success: true,
			data: params as ReturnType<typeof makeValidParams>,
		}));
		mockBuildSessionWhereClause.mockReturnValue({});
		mockBuildCursorPagination.mockReturnValue({ take: 31 });
		mockPrisma.session.findMany.mockResolvedValue([]);
		mockProcessCursorResults.mockReturnValue({
			items: [],
			pagination: makePaginationInfo(),
		});
	});

	it("admin gets no userId scope (can see all sessions)", async () => {
		setupAdminContext();

		await getSessions(makeValidParams());

		// cacheAuthSessions should be called with undefined for admin
		expect(mockCacheAuthSessions).toHaveBeenCalledWith(undefined);
	});

	it("non-admin gets scoped to own userId", async () => {
		setupUserContext("user-42");

		await getSessions(makeValidParams());

		expect(mockCacheAuthSessions).toHaveBeenCalledWith("user-42");
	});

	it("non-admin where clause receives userId scope", async () => {
		setupUserContext("user-99");
		const whereClause: Record<string, unknown> = {};
		mockBuildSessionWhereClause.mockReturnValue(whereClause);

		await getSessions(makeValidParams());

		expect(whereClause.userId).toBe("user-99");
	});

	it("admin where clause does not inject userId", async () => {
		setupAdminContext();
		const whereClause: Record<string, unknown> = {};
		mockBuildSessionWhereClause.mockReturnValue(whereClause);

		await getSessions(makeValidParams());

		expect(whereClause.userId).toBeUndefined();
	});
});

// ============================================================================
// Tests: maskToken — tested through getSessions result
// ============================================================================

describe("maskToken — via getSessions results", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupAdminContext();
		vi.mocked(getSessionsSchema.safeParse).mockImplementation((params) => ({
			success: true,
			data: params as ReturnType<typeof makeValidParams>,
		}));
		mockBuildSessionWhereClause.mockReturnValue({});
		mockBuildCursorPagination.mockReturnValue({ take: 31 });
	});

	function setupSessionResult(token: string) {
		const rawSession = makeRawSession({ token });
		mockPrisma.session.findMany.mockResolvedValue([rawSession]);
		mockProcessCursorResults.mockReturnValue({
			items: [rawSession],
			pagination: makePaginationInfo(),
		});
	}

	it("returns '***' for token with exactly 8 chars", async () => {
		setupSessionResult("12345678");

		const result = await getSessions(makeValidParams());

		expect(result.sessions[0]?.tokenPreview).toBe("***");
	});

	it("returns '***' for token shorter than 8 chars", async () => {
		setupSessionResult("short");

		const result = await getSessions(makeValidParams());

		expect(result.sessions[0]?.tokenPreview).toBe("***");
	});

	it("returns '***' for single char token", async () => {
		setupSessionResult("x");

		const result = await getSessions(makeValidParams());

		expect(result.sessions[0]?.tokenPreview).toBe("***");
	});

	it("returns first4...last4 for token with 9 chars", async () => {
		setupSessionResult("123456789");

		const result = await getSessions(makeValidParams());

		expect(result.sessions[0]?.tokenPreview).toBe("1234...6789");
	});

	it("returns first4...last4 for token longer than 8 chars", async () => {
		setupSessionResult("abcdefghij1234567890");

		const result = await getSessions(makeValidParams());

		expect(result.sessions[0]?.tokenPreview).toBe("abcd...7890");
	});

	it("token field is stripped from session results", async () => {
		setupSessionResult("abcdefghij1234567890");

		const result = await getSessions(makeValidParams());

		expect(result.sessions[0]).not.toHaveProperty("token");
	});
});

// ============================================================================
// Tests: getSessions — enriched fields
// ============================================================================

describe("getSessions — enriched fields", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupAdminContext();
		vi.mocked(getSessionsSchema.safeParse).mockImplementation((params) => ({
			success: true,
			data: params as ReturnType<typeof makeValidParams>,
		}));
		mockBuildSessionWhereClause.mockReturnValue({});
		mockBuildCursorPagination.mockReturnValue({ take: 31 });
	});

	it("isExpired is true when expiresAt is in the past", async () => {
		const pastDate = new Date(Date.now() - 1000 * 60 * 60);
		const rawSession = makeRawSession({ expiresAt: pastDate });
		mockPrisma.session.findMany.mockResolvedValue([rawSession]);
		mockProcessCursorResults.mockReturnValue({
			items: [rawSession],
			pagination: makePaginationInfo(),
		});

		const result = await getSessions(makeValidParams());

		expect(result.sessions[0]?.isExpired).toBe(true);
	});

	it("isExpired is false when expiresAt is in the future", async () => {
		const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24);
		const rawSession = makeRawSession({ expiresAt: futureDate });
		mockPrisma.session.findMany.mockResolvedValue([rawSession]);
		mockProcessCursorResults.mockReturnValue({
			items: [rawSession],
			pagination: makePaginationInfo(),
		});

		const result = await getSessions(makeValidParams());

		expect(result.sessions[0]?.isExpired).toBe(false);
	});

	it("isActive is true when expiresAt is in the future", async () => {
		const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24);
		const rawSession = makeRawSession({ expiresAt: futureDate });
		mockPrisma.session.findMany.mockResolvedValue([rawSession]);
		mockProcessCursorResults.mockReturnValue({
			items: [rawSession],
			pagination: makePaginationInfo(),
		});

		const result = await getSessions(makeValidParams());

		expect(result.sessions[0]?.isActive).toBe(true);
	});

	it("isActive is false when expiresAt is in the past", async () => {
		const pastDate = new Date(Date.now() - 1000 * 60 * 60);
		const rawSession = makeRawSession({ expiresAt: pastDate });
		mockPrisma.session.findMany.mockResolvedValue([rawSession]);
		mockProcessCursorResults.mockReturnValue({
			items: [rawSession],
			pagination: makePaginationInfo(),
		});

		const result = await getSessions(makeValidParams());

		expect(result.sessions[0]?.isActive).toBe(false);
	});

	it("session result contains tokenPreview, isExpired, and isActive fields", async () => {
		const rawSession = makeRawSession();
		mockPrisma.session.findMany.mockResolvedValue([rawSession]);
		mockProcessCursorResults.mockReturnValue({
			items: [rawSession],
			pagination: makePaginationInfo(),
		});

		const result = await getSessions(makeValidParams());

		expect(result.sessions[0]).toHaveProperty("tokenPreview");
		expect(result.sessions[0]).toHaveProperty("isExpired");
		expect(result.sessions[0]).toHaveProperty("isActive");
	});

	it("session result preserves raw fields alongside enriched ones", async () => {
		const rawSession = makeRawSession({
			id: "s-99",
			ipAddress: "192.168.1.1",
			userAgent: "Safari",
		});
		mockPrisma.session.findMany.mockResolvedValue([rawSession]);
		mockProcessCursorResults.mockReturnValue({
			items: [rawSession],
			pagination: makePaginationInfo(),
		});

		const result = await getSessions(makeValidParams());

		expect(result.sessions[0]).toMatchObject({
			id: "s-99",
			ipAddress: "192.168.1.1",
			userAgent: "Safari",
		});
	});
});

// ============================================================================
// Tests: getSessions — error handling
// ============================================================================

describe("getSessions — error handling", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupAdminContext();
		vi.mocked(getSessionsSchema.safeParse).mockImplementation((params) => ({
			success: true,
			data: params as ReturnType<typeof makeValidParams>,
		}));
		mockBuildSessionWhereClause.mockReturnValue({});
		mockBuildCursorPagination.mockReturnValue({ take: 31 });
	});

	it("returns empty sessions with empty pagination on DB error", async () => {
		mockPrisma.session.findMany.mockRejectedValue(new Error("DB connection failed"));

		const result = await getSessions(makeValidParams());

		expect(result.sessions).toEqual([]);
		expect(result.pagination).toMatchObject({
			nextCursor: null,
			prevCursor: null,
			hasNextPage: false,
			hasPreviousPage: false,
		});
	});

	it("calls cacheAuthSessions before attempting DB query", async () => {
		setupAdminContext();
		mockPrisma.session.findMany.mockResolvedValue([]);
		mockProcessCursorResults.mockReturnValue({
			items: [],
			pagination: makePaginationInfo(),
		});

		await getSessions(makeValidParams());

		expect(mockCacheAuthSessions).toHaveBeenCalled();
	});
});
