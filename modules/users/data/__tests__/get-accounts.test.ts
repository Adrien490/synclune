import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockIsAdmin,
	mockCacheLife,
	mockCacheTag,
	mockBuildCursorPagination,
	mockProcessCursorResults,
	mockBuildAccountsWhereClause,
} = vi.hoisted(() => ({
	mockPrisma: {
		account: { findMany: vi.fn() },
	},
	mockIsAdmin: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
	mockBuildCursorPagination: vi.fn(),
	mockProcessCursorResults: vi.fn(),
	mockBuildAccountsWhereClause: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/auth/utils/guards", () => ({
	isAdmin: mockIsAdmin,
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

vi.mock("@/shared/lib/pagination", () => ({
	buildCursorPagination: mockBuildCursorPagination,
	processCursorResults: mockProcessCursorResults,
}));

vi.mock("../../constants/cache", () => ({
	USERS_CACHE_TAGS: {
		ACCOUNTS_LIST: "accounts-list",
	},
}));

vi.mock("../../constants/accounts.constants", () => ({
	GET_ACCOUNTS_DEFAULT_SELECT: {
		id: true,
		accountId: true,
		providerId: true,
		userId: true,
		accessTokenExpiresAt: true,
		refreshTokenExpiresAt: true,
		scope: true,
		createdAt: true,
		updatedAt: true,
	},
	GET_ACCOUNTS_DEFAULT_PER_PAGE: 50,
	GET_ACCOUNTS_MAX_RESULTS_PER_PAGE: 200,
	GET_ACCOUNTS_DEFAULT_SORT_BY: "createdAt",
	GET_ACCOUNTS_DEFAULT_SORT_ORDER: "desc",
	GET_ACCOUNTS_SORT_FIELDS: ["createdAt", "updatedAt", "providerId"],
}));

vi.mock("../../schemas/accounts.schemas", () => ({
	getAccountsSchema: {
		safeParse: vi.fn((data: unknown) => ({
			success: true,
			data: {
				sortBy: "createdAt",
				sortOrder: "desc",
				perPage: 50,
				filters: {},
				...(data as object),
			},
		})),
	},
	accountFiltersSchema: {},
	accountSortBySchema: {},
}));

vi.mock("../../services/accounts-query-builder", () => ({
	buildAccountsWhereClause: mockBuildAccountsWhereClause,
}));

// Must be imported after mocks
import { getAccounts } from "../get-accounts";
import { getAccountsSchema } from "../../schemas/accounts.schemas";

const mockGetAccountsSchema = getAccountsSchema as { safeParse: ReturnType<typeof vi.fn> };

// ============================================================================
// Factories
// ============================================================================

function makeAccount(overrides: Record<string, unknown> = {}) {
	return {
		id: "acc-1",
		accountId: "ext-id-1",
		providerId: "google",
		userId: "user-1",
		accessToken: "tok_access",
		refreshToken: "tok_refresh",
		accessTokenExpiresAt: null,
		refreshTokenExpiresAt: null,
		scope: "email",
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
		...overrides,
	};
}

function makeValidParams(overrides: Record<string, unknown> = {}) {
	return {
		sortBy: "createdAt" as const,
		sortOrder: "desc" as const,
		perPage: 50,
		filters: {},
		...overrides,
	};
}

function makePagination() {
	return {
		nextCursor: null,
		prevCursor: null,
		hasNextPage: false,
		hasPreviousPage: false,
	};
}

function setupDefaults() {
	mockIsAdmin.mockResolvedValue(true);
	mockGetAccountsSchema.safeParse.mockReturnValue({
		success: true,
		data: makeValidParams(),
	});
	mockBuildAccountsWhereClause.mockReturnValue({});
	mockBuildCursorPagination.mockReturnValue({ take: 51 });
	mockPrisma.account.findMany.mockResolvedValue([makeAccount()]);
	mockProcessCursorResults.mockReturnValue({
		items: [
			{
				...makeAccount(),
				hasAccessToken: true,
				hasRefreshToken: true,
				isAccessTokenExpired: false,
				isRefreshTokenExpired: false,
			},
		],
		pagination: makePagination(),
	});
}

// ============================================================================
// Tests: getAccounts
// ============================================================================

describe("getAccounts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("throws when user is not admin", async () => {
		mockIsAdmin.mockResolvedValue(false);

		await expect(getAccounts(makeValidParams())).rejects.toThrow("Admin access required");
	});

	it("throws when params fail schema validation", async () => {
		mockGetAccountsSchema.safeParse.mockReturnValue({
			success: false,
			error: { issues: [{ message: "Invalid" }] },
		});

		await expect(getAccounts(makeValidParams())).rejects.toThrow("Invalid parameters");
	});

	it("calls cacheLife with dashboard profile", async () => {
		await getAccounts(makeValidParams());

		expect(mockCacheLife).toHaveBeenCalledWith("dashboard");
	});

	it("calls cacheTag with accounts-list tag", async () => {
		await getAccounts(makeValidParams());

		expect(mockCacheTag).toHaveBeenCalledWith("accounts-list");
	});

	it("returns accounts and pagination on success", async () => {
		const result = await getAccounts(makeValidParams());

		expect(result).toMatchObject({
			accounts: expect.any(Array),
			pagination: makePagination(),
		});
	});

	it("fetches accounts with accessToken and refreshToken fields", async () => {
		await getAccounts(makeValidParams());

		expect(mockPrisma.account.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: expect.objectContaining({
					accessToken: true,
					refreshToken: true,
				}),
			})
		);
	});

	it("strips raw tokens and replaces with boolean flags", async () => {
		mockPrisma.account.findMany.mockResolvedValue([
			makeAccount({ accessToken: "tok_access", refreshToken: "tok_refresh" }),
		]);

		// processCursorResults just returns items as-is for this test
		mockProcessCursorResults.mockImplementation(
			(items: Record<string, unknown>[], take: number, direction: string, cursor: string) => ({
				items,
				pagination: makePagination(),
			})
		);

		const result = await getAccounts(makeValidParams());
		const account = result.accounts[0] as Record<string, unknown>;

		expect(account).not.toHaveProperty("accessToken");
		expect(account).not.toHaveProperty("refreshToken");
		expect(account.hasAccessToken).toBe(true);
		expect(account.hasRefreshToken).toBe(true);
	});

	it("marks hasAccessToken as false when token is null", async () => {
		mockPrisma.account.findMany.mockResolvedValue([
			makeAccount({ accessToken: null, refreshToken: null }),
		]);

		mockProcessCursorResults.mockImplementation(
			(items: Record<string, unknown>[]) => ({
				items,
				pagination: makePagination(),
			})
		);

		const result = await getAccounts(makeValidParams());
		const account = result.accounts[0] as Record<string, unknown>;

		expect(account.hasAccessToken).toBe(false);
		expect(account.hasRefreshToken).toBe(false);
	});

	it("marks isAccessTokenExpired true when token has past expiry date", async () => {
		const pastDate = new Date(Date.now() - 1000 * 60 * 60);
		mockPrisma.account.findMany.mockResolvedValue([
			makeAccount({
				accessToken: "tok",
				accessTokenExpiresAt: pastDate,
				refreshToken: null,
				refreshTokenExpiresAt: null,
			}),
		]);

		mockProcessCursorResults.mockImplementation(
			(items: Record<string, unknown>[]) => ({
				items,
				pagination: makePagination(),
			})
		);

		const result = await getAccounts(makeValidParams());
		const account = result.accounts[0] as Record<string, unknown>;

		expect(account.isAccessTokenExpired).toBe(true);
	});

	it("marks isAccessTokenExpired false when expiry date is in the future", async () => {
		const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24);
		mockPrisma.account.findMany.mockResolvedValue([
			makeAccount({
				accessToken: "tok",
				accessTokenExpiresAt: futureDate,
				refreshToken: null,
				refreshTokenExpiresAt: null,
			}),
		]);

		mockProcessCursorResults.mockImplementation(
			(items: Record<string, unknown>[]) => ({
				items,
				pagination: makePagination(),
			})
		);

		const result = await getAccounts(makeValidParams());
		const account = result.accounts[0] as Record<string, unknown>;

		expect(account.isAccessTokenExpired).toBe(false);
	});

	it("marks isAccessTokenExpired false when accessTokenExpiresAt is null", async () => {
		mockPrisma.account.findMany.mockResolvedValue([
			makeAccount({
				accessToken: "tok",
				accessTokenExpiresAt: null,
				refreshToken: null,
				refreshTokenExpiresAt: null,
			}),
		]);

		mockProcessCursorResults.mockImplementation(
			(items: Record<string, unknown>[]) => ({
				items,
				pagination: makePagination(),
			})
		);

		const result = await getAccounts(makeValidParams());
		const account = result.accounts[0] as Record<string, unknown>;

		expect(account.isAccessTokenExpired).toBe(false);
	});

	it("returns empty accounts and pagination on DB error", async () => {
		mockPrisma.account.findMany.mockRejectedValue(new Error("DB unavailable"));

		const result = await getAccounts(makeValidParams());

		expect(result).toMatchObject({
			accounts: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		});
	});

	it("respects perPage capped at max results", async () => {
		mockGetAccountsSchema.safeParse.mockReturnValue({
			success: true,
			data: makeValidParams({ perPage: 999 }),
		});

		await getAccounts(makeValidParams({ perPage: 999 }));

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(
			expect.objectContaining({ take: 200 })
		);
	});

	it("adds secondary createdAt desc sort when sortBy is not createdAt", async () => {
		mockGetAccountsSchema.safeParse.mockReturnValue({
			success: true,
			data: makeValidParams({ sortBy: "providerId" }),
		});

		await getAccounts(makeValidParams({ sortBy: "providerId" }));

		const call = mockPrisma.account.findMany.mock.calls[0][0] as {
			orderBy: Record<string, unknown>[];
		};
		expect(call.orderBy).toEqual(
			expect.arrayContaining([{ createdAt: "desc" }])
		);
	});

	it("does not add secondary createdAt sort when sortBy is already createdAt", async () => {
		mockGetAccountsSchema.safeParse.mockReturnValue({
			success: true,
			data: makeValidParams({ sortBy: "createdAt" }),
		});

		await getAccounts(makeValidParams({ sortBy: "createdAt" }));

		const call = mockPrisma.account.findMany.mock.calls[0][0] as {
			orderBy: Record<string, unknown>[];
		};
		// Should only have { createdAt: 'desc' } once plus { id: 'asc' }, not a duplicate
		const createdAtEntries = call.orderBy.filter(
			(o: Record<string, unknown>) => "createdAt" in o
		);
		expect(createdAtEntries).toHaveLength(1);
	});
});
