import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockAuthGetSession,
	mockHeaders,
	mockCacheLife,
	mockCacheTag,
} = vi.hoisted(() => ({
	mockPrisma: {
		user: { findUnique: vi.fn() },
	},
	mockAuthGetSession: vi.fn(),
	mockHeaders: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/lib/auth", () => ({
	auth: {
		api: {
			getSession: mockAuthGetSession,
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

vi.mock("../../constants/current-user.constants", () => ({
	GET_CURRENT_USER_DEFAULT_SELECT: {
		id: true,
		name: true,
		email: true,
		role: true,
	},
}));

vi.mock("../../constants/cache", () => ({
	USERS_CACHE_TAGS: {
		CURRENT_USER: (userId: string) => `user-${userId}`,
	},
}));

// Must be imported after mocks
import { getCurrentUser, fetchCurrentUser } from "../get-current-user";

// ============================================================================
// Factories
// ============================================================================

function makeUser(overrides: Record<string, unknown> = {}) {
	return {
		id: "user-1",
		name: "Alice",
		email: "alice@example.com",
		role: "USER",
		...overrides,
	};
}

function setupDefaults() {
	mockHeaders.mockResolvedValue(new Headers());
	mockAuthGetSession.mockResolvedValue({ user: { id: "user-1" } });
	mockPrisma.user.findUnique.mockResolvedValue(makeUser());
}

// ============================================================================
// Tests: getCurrentUser
// ============================================================================

describe("getCurrentUser", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns null when auth returns no session", async () => {
		mockAuthGetSession.mockResolvedValue(null);

		const result = await getCurrentUser();

		expect(result).toBeNull();
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	it("returns null when session has no user", async () => {
		mockAuthGetSession.mockResolvedValue({ user: null });

		const result = await getCurrentUser();

		expect(result).toBeNull();
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	it("calls auth.api.getSession with resolved headers", async () => {
		const fakeHeaders = new Headers({ "x-test": "value" });
		mockHeaders.mockResolvedValue(fakeHeaders);

		await getCurrentUser();

		expect(mockAuthGetSession).toHaveBeenCalledWith({ headers: fakeHeaders });
	});

	it("fetches user from DB using session userId", async () => {
		mockAuthGetSession.mockResolvedValue({ user: { id: "user-42" } });
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ id: "user-42" }));

		await getCurrentUser();

		expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ id: "user-42" }),
			})
		);
	});

	it("returns the user fetched from DB", async () => {
		const user = makeUser();
		mockPrisma.user.findUnique.mockResolvedValue(user);

		const result = await getCurrentUser();

		expect(result).toEqual(user);
	});

	it("returns null when user is not found in DB", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(null);

		const result = await getCurrentUser();

		expect(result).toBeNull();
	});
});

// ============================================================================
// Tests: fetchCurrentUser
// ============================================================================

describe("fetchCurrentUser", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.user.findUnique.mockResolvedValue(makeUser());
	});

	it("calls cacheLife with session profile", async () => {
		await fetchCurrentUser("user-1");

		expect(mockCacheLife).toHaveBeenCalledWith("session");
	});

	it("calls cacheTag with user-specific current-user tag", async () => {
		await fetchCurrentUser("user-1");

		expect(mockCacheTag).toHaveBeenCalledWith("user-user-1");
	});

	it("queries prisma with correct userId and notDeleted filter", async () => {
		await fetchCurrentUser("user-1");

		expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "user-1", deletedAt: null },
			})
		);
	});

	it("uses GET_CURRENT_USER_DEFAULT_SELECT for the DB query", async () => {
		await fetchCurrentUser("user-1");

		expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				select: { id: true, name: true, email: true, role: true },
			})
		);
	});

	it("returns the user when found", async () => {
		const user = makeUser({ name: "Bob" });
		mockPrisma.user.findUnique.mockResolvedValue(user);

		const result = await fetchCurrentUser("user-1");

		expect(result).toEqual(user);
	});

	it("returns null when user is not found", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(null);

		const result = await fetchCurrentUser("user-1");

		expect(result).toBeNull();
	});

	it("tags cache with userId-specific tag for different users", async () => {
		await fetchCurrentUser("user-99");

		expect(mockCacheTag).toHaveBeenCalledWith("user-user-99");
	});
});
