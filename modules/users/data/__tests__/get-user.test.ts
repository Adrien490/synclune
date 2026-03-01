import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockGetSession,
	mockIsAdmin,
	mockCacheLife,
	mockCacheTag,
	mockCacheCurrentUser,
} = vi.hoisted(() => ({
	mockPrisma: {
		user: { findUnique: vi.fn() },
	},
	mockGetSession: vi.fn(),
	mockIsAdmin: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
	mockCacheCurrentUser: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));

vi.mock("@/modules/auth/utils/guards", () => ({
	isAdmin: mockIsAdmin,
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

vi.mock("../../constants/cache", () => ({
	cacheCurrentUser: mockCacheCurrentUser,
	USERS_CACHE_TAGS: {
		CURRENT_USER: (userId: string) => `user-${userId}`,
	},
}));

vi.mock("../../constants/user.constants", () => ({
	GET_USER_SELECT: { id: true, email: true, name: true, role: true },
}));

vi.mock("../../schemas/user.schemas", () => ({
	getUserSchema: {
		safeParse: vi.fn((data: unknown) => ({
			success: true,
			data: { userId: (data as { userId?: string }).userId },
		})),
	},
}));

// Must be imported after mocks
import { getUser, fetchUser } from "../get-user";
import { getUserSchema } from "../../schemas/user.schemas";

const mockGetUserSchema = getUserSchema as unknown as { safeParse: ReturnType<typeof vi.fn> };

// ============================================================================
// Factories
// ============================================================================

function makeUser(overrides: Record<string, unknown> = {}) {
	return {
		id: "user-1",
		email: "user@example.com",
		name: "Alice",
		role: "USER",
		...overrides,
	};
}

function setupDefaults() {
	mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
	mockIsAdmin.mockResolvedValue(false);
	mockPrisma.user.findUnique.mockResolvedValue(makeUser());
	mockGetUserSchema.safeParse.mockReturnValue({
		success: true,
		data: { userId: undefined },
	});
}

// ============================================================================
// Tests: getUser
// ============================================================================

describe("getUser", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns null when schema validation fails", async () => {
		mockGetUserSchema.safeParse.mockReturnValue({
			success: false,
			error: { issues: [{ message: "Invalid params" }] },
		});

		const result = await getUser({ userId: "bad" } as Record<string, unknown>);

		expect(result).toBeNull();
		expect(mockGetSession).not.toHaveBeenCalled();
	});

	it("returns null when no session exists", async () => {
		mockGetSession.mockResolvedValue(null);

		const result = await getUser();

		expect(result).toBeNull();
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	it("returns null when session has no user", async () => {
		mockGetSession.mockResolvedValue({});

		const result = await getUser();

		expect(result).toBeNull();
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	it("fetches current session user when no userId is provided", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(makeUser());

		const result = await getUser();

		expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ id: "user-1" }),
			}),
		);
		expect(result).toEqual(makeUser());
	});

	it("fetches any user for admin when userId is provided", async () => {
		mockGetUserSchema.safeParse.mockReturnValue({
			success: true,
			data: { userId: "user-2" },
		});
		mockIsAdmin.mockResolvedValue(true);
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ id: "user-2" }));

		const result = await getUser({ userId: "user-2" });

		expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ id: "user-2" }),
			}),
		);
		expect(result).toEqual(makeUser({ id: "user-2" }));
	});

	it("returns null when non-admin requests another user's profile", async () => {
		mockGetUserSchema.safeParse.mockReturnValue({
			success: true,
			data: { userId: "user-99" },
		});
		mockIsAdmin.mockResolvedValue(false);
		mockGetSession.mockResolvedValue({ user: { id: "user-1" } });

		const result = await getUser({ userId: "user-99" });

		expect(result).toBeNull();
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	it("returns own profile for non-admin when userId matches session userId", async () => {
		mockGetUserSchema.safeParse.mockReturnValue({
			success: true,
			data: { userId: "user-1" },
		});
		mockIsAdmin.mockResolvedValue(false);
		mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
		mockPrisma.user.findUnique.mockResolvedValue(makeUser());

		const result = await getUser({ userId: "user-1" });

		expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ id: "user-1" }),
			}),
		);
		expect(result).toEqual(makeUser());
	});

	it("does not call isAdmin when no userId is provided", async () => {
		mockGetUserSchema.safeParse.mockReturnValue({
			success: true,
			data: { userId: undefined },
		});

		await getUser();

		expect(mockIsAdmin).not.toHaveBeenCalled();
	});
});

// ============================================================================
// Tests: fetchUser
// ============================================================================

describe("fetchUser", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.user.findUnique.mockResolvedValue(makeUser());
	});

	it("calls cacheCurrentUser with the userId", async () => {
		await fetchUser("user-1");

		expect(mockCacheCurrentUser).toHaveBeenCalledWith("user-1");
	});

	it("queries prisma with correct userId and notDeleted filter", async () => {
		await fetchUser("user-1");

		expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "user-1", deletedAt: null },
			}),
		);
	});

	it("uses GET_USER_SELECT for the DB query", async () => {
		await fetchUser("user-1");

		expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				select: { id: true, email: true, name: true, role: true },
			}),
		);
	});

	it("returns the user when found", async () => {
		const user = makeUser({ name: "Bob" });
		mockPrisma.user.findUnique.mockResolvedValue(user);

		const result = await fetchUser("user-1");

		expect(result).toEqual(user);
	});

	it("returns null when user is not found", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(null);

		const result = await fetchUser("user-1");

		expect(result).toBeNull();
	});

	it("returns null on DB error", async () => {
		mockPrisma.user.findUnique.mockRejectedValue(new Error("DB connection failed"));

		const result = await fetchUser("user-1");

		expect(result).toBeNull();
	});
});
