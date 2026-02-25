import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockGetSession,
	mockIsAdmin,
	mockCacheUserAccounts,
	mockCacheDefault,
} = vi.hoisted(() => ({
	mockPrisma: {
		account: { findFirst: vi.fn() },
	},
	mockGetSession: vi.fn(),
	mockIsAdmin: vi.fn(),
	mockCacheUserAccounts: vi.fn(),
	mockCacheDefault: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));

vi.mock("@/modules/auth/utils/guards", () => ({
	isAdmin: mockIsAdmin,
}));

vi.mock("@/shared/lib/cache", () => ({
	cacheDefault: mockCacheDefault,
}));

vi.mock("../../constants/cache", () => ({
	cacheUserAccounts: mockCacheUserAccounts,
	USERS_CACHE_TAGS: {
		ACCOUNTS: (userId: string) => `accounts-user-${userId}`,
	},
}));

vi.mock("../../constants/account.constants", () => ({
	GET_ACCOUNT_DEFAULT_SELECT: {
		id: true,
		accountId: true,
		providerId: true,
		userId: true,
		scope: true,
		createdAt: true,
		updatedAt: true,
	},
}));

vi.mock("../../schemas/accounts.schemas", () => ({
	getAccountSchema: {
		safeParse: vi.fn((data: unknown) => ({
			success: true,
			data: { id: (data as { id?: string }).id ?? "acc-1" },
		})),
	},
	accountFiltersSchema: {},
	accountSortBySchema: {},
}));

// Must be imported after mocks
import { getAccount, fetchAccount } from "../get-account";
import { getAccountSchema } from "../../schemas/accounts.schemas";

const mockGetAccountSchema = getAccountSchema as { safeParse: ReturnType<typeof vi.fn> };

// ============================================================================
// Factories
// ============================================================================

function makeAccount(overrides: Record<string, unknown> = {}) {
	return {
		id: "acc-1",
		accountId: "ext-id-1",
		providerId: "google",
		userId: "user-1",
		scope: "email",
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
		...overrides,
	};
}

function setupDefaults() {
	mockIsAdmin.mockResolvedValue(true);
	mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
	mockPrisma.account.findFirst.mockResolvedValue(makeAccount());
	mockGetAccountSchema.safeParse.mockReturnValue({
		success: true,
		data: { id: "acc-1" },
	});
}

// ============================================================================
// Tests: getAccount
// ============================================================================

describe("getAccount", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns null when user is not admin", async () => {
		mockIsAdmin.mockResolvedValue(false);

		const result = await getAccount({ id: "acc-1" });

		expect(result).toBeNull();
		expect(mockPrisma.account.findFirst).not.toHaveBeenCalled();
	});

	it("returns null when schema validation fails", async () => {
		mockGetAccountSchema.safeParse.mockReturnValue({
			success: false,
			error: { issues: [{ message: "Invalid ID" }] },
		});

		const result = await getAccount({ id: "bad-id" });

		expect(result).toBeNull();
		expect(mockPrisma.account.findFirst).not.toHaveBeenCalled();
	});

	it("calls both isAdmin and getSession", async () => {
		await getAccount({ id: "acc-1" });

		expect(mockIsAdmin).toHaveBeenCalledOnce();
		expect(mockGetSession).toHaveBeenCalledOnce();
	});

	it("returns account for admin", async () => {
		const account = makeAccount();
		mockPrisma.account.findFirst.mockResolvedValue(account);

		const result = await getAccount({ id: "acc-1" });

		expect(result).toEqual(account);
	});

	it("passes admin context to fetchAccount", async () => {
		mockIsAdmin.mockResolvedValue(true);

		await getAccount({ id: "acc-1" });

		// For admin: the where clause should NOT restrict by userId
		const call = mockPrisma.account.findFirst.mock.calls[0][0] as {
			where: Record<string, unknown>;
		};
		expect(call.where).not.toHaveProperty("userId");
	});

	it("passes userId from session to fetchAccount context", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user-42" } });

		await getAccount({ id: "acc-1" });

		// Admin = true, so cacheUserAccounts should be called with the session userId
		expect(mockCacheUserAccounts).toHaveBeenCalledWith("user-42");
	});

	it("uses cacheDefault when session has no userId", async () => {
		mockGetSession.mockResolvedValue(null);

		await getAccount({ id: "acc-1" });

		expect(mockCacheDefault).toHaveBeenCalledOnce();
		expect(mockCacheUserAccounts).not.toHaveBeenCalled();
	});
});

// ============================================================================
// Tests: fetchAccount
// ============================================================================

describe("fetchAccount", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.account.findFirst.mockResolvedValue(makeAccount());
	});

	it("calls cacheUserAccounts with userId when context.userId is provided", async () => {
		await fetchAccount({ id: "acc-1" }, { admin: true, userId: "user-1" });

		expect(mockCacheUserAccounts).toHaveBeenCalledWith("user-1");
	});

	it("calls cacheDefault when context has no userId", async () => {
		await fetchAccount({ id: "acc-1" }, { admin: true, userId: undefined });

		expect(mockCacheDefault).toHaveBeenCalledOnce();
		expect(mockCacheUserAccounts).not.toHaveBeenCalled();
	});

	it("queries by account id in where clause", async () => {
		await fetchAccount({ id: "acc-1" }, { admin: true, userId: "user-1" });

		expect(mockPrisma.account.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ id: "acc-1" }),
			})
		);
	});

	it("does not restrict by userId when admin is true", async () => {
		await fetchAccount({ id: "acc-1" }, { admin: true, userId: "user-1" });

		const call = mockPrisma.account.findFirst.mock.calls[0][0] as {
			where: Record<string, unknown>;
		};
		expect(call.where).not.toHaveProperty("userId");
	});

	it("restricts by userId for non-admin with userId in context", async () => {
		await fetchAccount({ id: "acc-1" }, { admin: false, userId: "user-1" });

		expect(mockPrisma.account.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					id: "acc-1",
					userId: "user-1",
				}),
			})
		);
	});

	it("does not restrict by userId for non-admin without userId", async () => {
		await fetchAccount({ id: "acc-1" }, { admin: false, userId: undefined });

		const call = mockPrisma.account.findFirst.mock.calls[0][0] as {
			where: Record<string, unknown>;
		};
		expect(call.where).not.toHaveProperty("userId");
	});

	it("uses GET_ACCOUNT_DEFAULT_SELECT for the DB query", async () => {
		await fetchAccount({ id: "acc-1" }, { admin: true, userId: "user-1" });

		expect(mockPrisma.account.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				select: expect.objectContaining({ id: true, providerId: true }),
			})
		);
	});

	it("returns the account when found", async () => {
		const account = makeAccount({ providerId: "github" });
		mockPrisma.account.findFirst.mockResolvedValue(account);

		const result = await fetchAccount({ id: "acc-1" }, { admin: true, userId: "user-1" });

		expect(result).toEqual(account);
	});

	it("returns null when account is not found", async () => {
		mockPrisma.account.findFirst.mockResolvedValue(null);

		const result = await fetchAccount({ id: "acc-1" }, { admin: true, userId: "user-1" });

		expect(result).toBeNull();
	});

	it("returns null on DB error", async () => {
		mockPrisma.account.findFirst.mockRejectedValue(new Error("DB connection failed"));

		const result = await fetchAccount({ id: "acc-1" }, { admin: true, userId: "user-1" });

		expect(result).toBeNull();
	});
});
