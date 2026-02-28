import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockGetCurrentUser, mockCacheUserAccounts } = vi.hoisted(() => ({
	mockPrisma: {
		account: { findMany: vi.fn() },
	},
	mockGetCurrentUser: vi.fn(),
	mockCacheUserAccounts: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("../get-current-user", () => ({
	getCurrentUser: mockGetCurrentUser,
}));

vi.mock("../../constants/cache", () => ({
	cacheUserAccounts: mockCacheUserAccounts,
	USERS_CACHE_TAGS: {
		ACCOUNTS: (userId: string) => `accounts-user-${userId}`,
	},
}));

// Must be imported after mocks
import { getUserAccounts, fetchUserAccounts } from "../get-user-accounts";

// ============================================================================
// Factories
// ============================================================================

function makeLinkedAccount(overrides: Record<string, unknown> = {}) {
	return {
		id: "acc-1",
		providerId: "google",
		accountId: "google-ext-id",
		createdAt: new Date("2024-01-01"),
		...overrides,
	};
}

function setupDefaults() {
	mockGetCurrentUser.mockResolvedValue({ id: "user-1", name: "Alice", email: "alice@example.com" });
	mockPrisma.account.findMany.mockResolvedValue([makeLinkedAccount()]);
}

// ============================================================================
// Tests: getUserAccounts
// ============================================================================

describe("getUserAccounts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns empty array when getCurrentUser returns null", async () => {
		mockGetCurrentUser.mockResolvedValue(null);

		const result = await getUserAccounts();

		expect(result).toEqual([]);
		expect(mockPrisma.account.findMany).not.toHaveBeenCalled();
	});

	it("fetches accounts for the current user", async () => {
		await getUserAccounts();

		expect(mockPrisma.account.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ userId: "user-1" }),
			}),
		);
	});

	it("returns the linked accounts for authenticated user", async () => {
		const accounts = [
			makeLinkedAccount(),
			makeLinkedAccount({ id: "acc-2", providerId: "github" }),
		];
		mockPrisma.account.findMany.mockResolvedValue(accounts);

		const result = await getUserAccounts();

		expect(result).toEqual(accounts);
	});

	it("returns empty array when user has no linked accounts", async () => {
		mockPrisma.account.findMany.mockResolvedValue([]);

		const result = await getUserAccounts();

		expect(result).toEqual([]);
	});

	it("delegates fetching to fetchUserAccounts with user id", async () => {
		mockGetCurrentUser.mockResolvedValue({ id: "user-99" });

		await getUserAccounts();

		expect(mockPrisma.account.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ userId: "user-99" }),
			}),
		);
	});
});

// ============================================================================
// Tests: fetchUserAccounts
// ============================================================================

describe("fetchUserAccounts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.account.findMany.mockResolvedValue([makeLinkedAccount()]);
	});

	it("calls cacheUserAccounts with the userId", async () => {
		await fetchUserAccounts("user-1");

		expect(mockCacheUserAccounts).toHaveBeenCalledWith("user-1");
	});

	it("queries accounts filtering by userId", async () => {
		await fetchUserAccounts("user-1");

		expect(mockPrisma.account.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ userId: "user-1" }),
			}),
		);
	});

	it("excludes credential provider accounts", async () => {
		await fetchUserAccounts("user-1");

		expect(mockPrisma.account.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					providerId: { not: "credential" },
				}),
			}),
		);
	});

	it("selects only id, providerId, accountId, and createdAt", async () => {
		await fetchUserAccounts("user-1");

		expect(mockPrisma.account.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: {
					id: true,
					providerId: true,
					accountId: true,
					createdAt: true,
				},
			}),
		);
	});

	it("orders accounts by createdAt descending", async () => {
		await fetchUserAccounts("user-1");

		expect(mockPrisma.account.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: { createdAt: "desc" },
			}),
		);
	});

	it("returns the list of linked accounts", async () => {
		const accounts = [
			makeLinkedAccount(),
			makeLinkedAccount({ id: "acc-2", providerId: "github" }),
		];
		mockPrisma.account.findMany.mockResolvedValue(accounts);

		const result = await fetchUserAccounts("user-1");

		expect(result).toEqual(accounts);
	});

	it("returns empty array when no accounts found", async () => {
		mockPrisma.account.findMany.mockResolvedValue([]);

		const result = await fetchUserAccounts("user-1");

		expect(result).toEqual([]);
	});

	it("returns empty array on DB error", async () => {
		mockPrisma.account.findMany.mockRejectedValue(new Error("DB connection failed"));

		const result = await fetchUserAccounts("user-1");

		expect(result).toEqual([]);
	});

	it("does not expose accessToken or refreshToken", async () => {
		mockPrisma.account.findMany.mockResolvedValue([makeLinkedAccount()]);

		const selectArg = mockPrisma.account.findMany.mock.calls[0]?.[0] as
			| {
					select: Record<string, unknown>;
			  }
			| undefined;

		// Run the function first
		await fetchUserAccounts("user-1");

		const select = (
			mockPrisma.account.findMany.mock.calls[0]![0] as {
				select: Record<string, unknown>;
			}
		).select;

		expect(select).not.toHaveProperty("accessToken");
		expect(select).not.toHaveProperty("refreshToken");
		void selectArg; // suppress unused variable warning
	});
});
