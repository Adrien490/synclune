import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockIsAdmin,
	mockCacheLife,
	mockCacheTag,
	mockFuzzySearchIds,
	mockBuildCursorPagination,
	mockProcessCursorResults,
	mockBuildUserWhereClause,
} = vi.hoisted(() => ({
	mockPrisma: {
		user: { findMany: vi.fn() },
	},
	mockIsAdmin: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
	mockFuzzySearchIds: vi.fn(),
	mockBuildCursorPagination: vi.fn(),
	mockProcessCursorResults: vi.fn(),
	mockBuildUserWhereClause: vi.fn(),
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

vi.mock("@/shared/lib/fuzzy-search", () => ({
	fuzzySearchIds: mockFuzzySearchIds,
}));

vi.mock("@/shared/lib/pagination", () => ({
	buildCursorPagination: mockBuildCursorPagination,
	processCursorResults: mockProcessCursorResults,
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_CUSTOMERS_LIST: "admin-customers-list",
	},
}));

vi.mock("../../constants/user.constants", () => ({
	GET_USERS_SELECT: { id: true, name: true, email: true },
	GET_USERS_DEFAULT_PER_PAGE: 50,
	GET_USERS_MAX_RESULTS_PER_PAGE: 200,
	GET_USERS_DEFAULT_SORT_BY: "createdAt",
	GET_USERS_DEFAULT_SORT_ORDER: "desc",
	GET_USERS_ADMIN_FALLBACK_SORT_BY: "updatedAt",
	GET_USERS_SORT_FIELDS: ["createdAt", "updatedAt", "name", "email", "role"],
}));

vi.mock("../../schemas/user.schemas", () => ({
	getUsersSchema: {
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
	userFiltersSchema: {},
	userSortBySchema: {},
}));

vi.mock("../../services/user-query-builder", () => ({
	buildUserWhereClause: mockBuildUserWhereClause,
}));

// Must be imported after mocks
import { getUsers } from "../get-users";
import { getUsersSchema } from "../../schemas/user.schemas";

const mockGetUsersSchema = getUsersSchema as unknown as { safeParse: ReturnType<typeof vi.fn> };

// ============================================================================
// Factories
// ============================================================================

function makeUser(overrides: Record<string, unknown> = {}) {
	return {
		id: "user-1",
		name: "Alice",
		email: "alice@example.com",
		...overrides,
	};
}

function makeValidParams(overrides: Record<string, unknown> = {}) {
	return {
		direction: "forward" as const,
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
	mockGetUsersSchema.safeParse.mockReturnValue({
		success: true,
		data: makeValidParams(),
	});
	mockBuildUserWhereClause.mockReturnValue({ deletedAt: null });
	mockBuildCursorPagination.mockReturnValue({ take: 51 });
	mockPrisma.user.findMany.mockResolvedValue([makeUser()]);
	mockProcessCursorResults.mockReturnValue({
		items: [makeUser()],
		pagination: makePagination(),
	});
	mockFuzzySearchIds.mockResolvedValue(null);
}

// ============================================================================
// Tests: getUsers
// ============================================================================

describe("getUsers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("throws when user is not admin", async () => {
		mockIsAdmin.mockResolvedValue(false);

		await expect(getUsers(makeValidParams())).rejects.toThrow("Admin access required");
	});

	it("throws when params fail schema validation", async () => {
		mockGetUsersSchema.safeParse.mockReturnValue({
			success: false,
			error: { issues: [{ message: "Invalid params" }] },
		});

		await expect(getUsers(makeValidParams())).rejects.toThrow("Invalid parameters");
	});

	it("calls cacheLife with dashboard profile", async () => {
		await getUsers(makeValidParams());

		expect(mockCacheLife).toHaveBeenCalledWith("dashboard");
	});

	it("calls cacheTag with admin-customers-list tag", async () => {
		await getUsers(makeValidParams());

		expect(mockCacheTag).toHaveBeenCalledWith("admin-customers-list");
	});

	it("returns users and pagination on success", async () => {
		const result = await getUsers(makeValidParams());

		expect(result).toEqual({
			users: [makeUser()],
			pagination: makePagination(),
		});
	});

	it("does not call fuzzySearchIds when search is absent", async () => {
		mockGetUsersSchema.safeParse.mockReturnValue({
			success: true,
			data: makeValidParams({ search: undefined }),
		});

		await getUsers(makeValidParams());

		expect(mockFuzzySearchIds).not.toHaveBeenCalled();
	});

	it("does not call fuzzySearchIds when search is shorter than 3 chars", async () => {
		mockGetUsersSchema.safeParse.mockReturnValue({
			success: true,
			data: makeValidParams({ search: "ab" }),
		});

		await getUsers(makeValidParams({ search: "ab" }));

		expect(mockFuzzySearchIds).not.toHaveBeenCalled();
	});

	it("calls fuzzySearchIds when search is 3+ characters", async () => {
		mockGetUsersSchema.safeParse.mockReturnValue({
			success: true,
			data: makeValidParams({ search: "alice" }),
		});
		mockFuzzySearchIds.mockResolvedValue(["user-1"]);

		await getUsers(makeValidParams({ search: "alice" }));

		expect(mockFuzzySearchIds).toHaveBeenCalledWith(
			"alice",
			expect.objectContaining({
				columns: expect.arrayContaining([
					expect.objectContaining({ table: "User", column: "name" }),
					expect.objectContaining({ table: "User", column: "email" }),
				]),
			})
		);
	});

	it("uses updatedAt as sortBy fallback when default createdAt is implicit", async () => {
		// When sortBy is the default "createdAt" and no sortBy was explicitly provided
		// in the original params, the function switches to ADMIN_FALLBACK_SORT_BY "updatedAt"
		mockGetUsersSchema.safeParse.mockReturnValue({
			success: true,
			data: makeValidParams({ sortBy: "createdAt" }),
		});

		// Pass params WITHOUT an explicit sortBy so !params?.sortBy is true
		const paramsWithoutSortBy = {
			direction: "forward" as const,
			sortOrder: "desc" as const,
			perPage: 50,
			filters: {},
		};

		await getUsers(paramsWithoutSortBy as Parameters<typeof getUsers>[0]);

		// The final query should sort by updatedAt (fallback)
		expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: expect.arrayContaining([
					expect.objectContaining({ updatedAt: "desc" }),
				]),
			})
		);
	});

	it("keeps explicit sortBy when provided by caller", async () => {
		mockGetUsersSchema.safeParse.mockReturnValue({
			success: true,
			data: makeValidParams({ sortBy: "name" }),
		});

		await getUsers(makeValidParams({ sortBy: "name" }));

		expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: expect.arrayContaining([
					expect.objectContaining({ name: "desc" }),
				]),
			})
		);
	});

	it("queries prisma with correct select", async () => {
		await getUsers(makeValidParams());

		expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: { id: true, name: true, email: true },
			})
		);
	});

	it("returns empty users and pagination on DB error", async () => {
		mockPrisma.user.findMany.mockRejectedValue(new Error("DB unavailable"));

		const result = await getUsers(makeValidParams());

		expect(result).toMatchObject({
			users: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		});
	});

	it("passes buildUserWhereClause result to prisma query", async () => {
		mockBuildUserWhereClause.mockReturnValue({ deletedAt: null, role: "USER" });

		await getUsers(makeValidParams());

		expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { deletedAt: null, role: "USER" },
			})
		);
	});

	it("respects perPage capped at max results", async () => {
		mockGetUsersSchema.safeParse.mockReturnValue({
			success: true,
			data: makeValidParams({ perPage: 999 }),
		});

		await getUsers(makeValidParams({ perPage: 999 }));

		// take should be capped at GET_USERS_MAX_RESULTS_PER_PAGE (200)
		expect(mockBuildCursorPagination).toHaveBeenCalledWith(
			expect.objectContaining({ take: 200 })
		);
	});
});
