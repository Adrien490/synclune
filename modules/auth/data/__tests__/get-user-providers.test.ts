import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockGetCurrentUser,
	mockCacheLife,
	mockCacheTag,
} = vi.hoisted(() => ({
	mockPrisma: {
		account: { findMany: vi.fn() },
	},
	mockGetCurrentUser: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/users/data/get-current-user", () => ({
	getCurrentUser: mockGetCurrentUser,
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

import { getUserProviders } from "../get-user-providers";

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

function makeAccount(providerId: string) {
	return { providerId };
}

function setupDefaults() {
	mockGetCurrentUser.mockResolvedValue(null);
	mockPrisma.account.findMany.mockResolvedValue([]);
}

// ============================================================================
// Tests: getUserProviders
// ============================================================================

describe("getUserProviders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns empty array when no user is authenticated", async () => {
		mockGetCurrentUser.mockResolvedValue(null);

		const result = await getUserProviders();

		expect(result).toEqual([]);
		expect(mockPrisma.account.findMany).not.toHaveBeenCalled();
	});

	it("returns provider IDs for authenticated user", async () => {
		mockGetCurrentUser.mockResolvedValue(makeUser());
		mockPrisma.account.findMany.mockResolvedValue([
			makeAccount("google"),
			makeAccount("credential"),
		]);

		const result = await getUserProviders();

		expect(result).toEqual(["google", "credential"]);
	});

	it("returns empty array when user has no linked accounts", async () => {
		mockGetCurrentUser.mockResolvedValue(makeUser());
		mockPrisma.account.findMany.mockResolvedValue([]);

		const result = await getUserProviders();

		expect(result).toEqual([]);
	});

	it("queries accounts by user ID", async () => {
		mockGetCurrentUser.mockResolvedValue(makeUser({ id: "user-42" }));
		mockPrisma.account.findMany.mockResolvedValue([makeAccount("github")]);

		await getUserProviders();

		expect(mockPrisma.account.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { userId: "user-42" } })
		);
	});

	it("selects only providerId field in DB query", async () => {
		mockGetCurrentUser.mockResolvedValue(makeUser());
		mockPrisma.account.findMany.mockResolvedValue([makeAccount("google")]);

		await getUserProviders();

		expect(mockPrisma.account.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ select: { providerId: true } })
		);
	});

	it("returns a single provider when user has one account", async () => {
		mockGetCurrentUser.mockResolvedValue(makeUser());
		mockPrisma.account.findMany.mockResolvedValue([makeAccount("github")]);

		const result = await getUserProviders();

		expect(result).toEqual(["github"]);
	});

	it("calls cacheLife with session profile", async () => {
		mockGetCurrentUser.mockResolvedValue(makeUser({ id: "user-1" }));
		mockPrisma.account.findMany.mockResolvedValue([]);

		await getUserProviders();

		expect(mockCacheLife).toHaveBeenCalledWith("session");
	});

	it("calls cacheTag with user-specific provider tag", async () => {
		mockGetCurrentUser.mockResolvedValue(makeUser({ id: "user-1" }));
		mockPrisma.account.findMany.mockResolvedValue([]);

		await getUserProviders();

		expect(mockCacheTag).toHaveBeenCalledWith("user-providers-user-1");
	});

	it("does not call DB or set cache when user is not authenticated", async () => {
		mockGetCurrentUser.mockResolvedValue(null);

		await getUserProviders();

		expect(mockPrisma.account.findMany).not.toHaveBeenCalled();
		expect(mockCacheLife).not.toHaveBeenCalled();
		expect(mockCacheTag).not.toHaveBeenCalled();
	});
});
