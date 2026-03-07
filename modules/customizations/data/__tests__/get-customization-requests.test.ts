import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockRequireAdmin,
	mockCacheLife,
	mockCacheTag,
	mockBuildCursorPagination,
	mockProcessCursorResults,
	mockBuildWhereClause,
} = vi.hoisted(() => ({
	mockPrisma: {
		customizationRequest: { findMany: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
	mockBuildCursorPagination: vi.fn(),
	mockProcessCursorResults: vi.fn(),
	mockBuildWhereClause: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

vi.mock("../constants/cache", () => ({
	cacheCustomizationList: () => {
		mockCacheLife("dashboard");
		mockCacheTag("customization-requests-list");
	},
}));

vi.mock("@/shared/lib/pagination", () => ({
	buildCursorPagination: mockBuildCursorPagination,
	processCursorResults: mockProcessCursorResults,
	DEFAULT_PER_PAGE: 20,
}));

vi.mock("../../services/customization-query-builder", () => ({
	buildCustomizationWhereClause: mockBuildWhereClause,
}));

vi.mock("../../constants/sort.constants", () => ({
	SORT_OPTIONS: {
		CREATED_DESC: "createdAt_desc",
		CREATED_ASC: "createdAt_asc",
		STATUS_ASC: "status_asc",
	},
}));

import { getCustomizationRequests } from "../get-customization-requests";

// ============================================================================
// Factories
// ============================================================================

const EMPTY_RESULT = {
	items: [],
	pagination: {
		nextCursor: null,
		prevCursor: null,
		hasNextPage: false,
		hasPreviousPage: false,
	},
};

function makeRequest(overrides: Record<string, unknown> = {}) {
	return {
		id: "req-1",
		createdAt: new Date("2024-03-01"),
		firstName: "Marie",
		email: "marie@example.com",
		phone: "+33612345678",
		productTypeLabel: "Bracelet",
		status: "PENDING",
		adminNotes: null,
		respondedAt: null,
		_count: { inspirationProducts: 0 },
		...overrides,
	};
}

function setupDefaults() {
	mockRequireAdmin.mockResolvedValue({ admin: true });
	mockBuildWhereClause.mockReturnValue({ deletedAt: null });
	mockBuildCursorPagination.mockReturnValue({});
	mockPrisma.customizationRequest.findMany.mockResolvedValue([]);
	mockProcessCursorResults.mockReturnValue(EMPTY_RESULT);
}

// ============================================================================
// Tests: getCustomizationRequests
// ============================================================================

describe("getCustomizationRequests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	// ──────────── Auth guard ────────────

	it("returns empty result when user is not admin", async () => {
		mockRequireAdmin.mockResolvedValue({ error: { status: "FORBIDDEN", message: "Non autorisé" } });

		const result = await getCustomizationRequests();

		expect(result).toEqual(EMPTY_RESULT);
		expect(mockPrisma.customizationRequest.findMany).not.toHaveBeenCalled();
	});

	it("does not call cache functions when user is not admin", async () => {
		mockRequireAdmin.mockResolvedValue({ error: { status: "FORBIDDEN", message: "Non autorisé" } });

		await getCustomizationRequests();

		expect(mockCacheLife).not.toHaveBeenCalled();
		expect(mockCacheTag).not.toHaveBeenCalled();
	});

	// ──────────── Cache ────────────

	it("calls cacheLife with dashboard profile", async () => {
		await getCustomizationRequests();

		expect(mockCacheLife).toHaveBeenCalledWith("dashboard");
	});

	it("calls cacheTag with list tag", async () => {
		await getCustomizationRequests();

		expect(mockCacheTag).toHaveBeenCalledWith("customization-requests-list");
	});

	// ──────────── Default parameters ────────────

	it("uses default sort (createdAt desc) when no sortBy provided", async () => {
		await getCustomizationRequests();

		expect(mockPrisma.customizationRequest.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: { createdAt: "desc" },
			}),
		);
	});

	it("uses DEFAULT_PER_PAGE when no perPage provided", async () => {
		await getCustomizationRequests();

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(expect.objectContaining({ take: 20 }));
	});

	// ──────────── Sort options ────────────

	it("sorts by createdAt ascending when sortBy is CREATED_ASC", async () => {
		await getCustomizationRequests({ sortBy: "createdAt_asc" });

		expect(mockPrisma.customizationRequest.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: { createdAt: "asc" },
			}),
		);
	});

	it("sorts by status then createdAt when sortBy is STATUS_ASC", async () => {
		await getCustomizationRequests({ sortBy: "status_asc" });

		expect(mockPrisma.customizationRequest.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: [{ status: "asc" }, { createdAt: "desc" }],
			}),
		);
	});

	// ──────────── Pagination ────────────

	it("passes cursor and direction to buildCursorPagination", async () => {
		await getCustomizationRequests({
			cursor: "cursor-abc",
			direction: "backward",
			perPage: 10,
		});

		expect(mockBuildCursorPagination).toHaveBeenCalledWith({
			cursor: "cursor-abc",
			direction: "backward",
			take: 10,
		});
	});

	it("constrains perPage to MAX_RESULTS_PER_PAGE (200)", async () => {
		await getCustomizationRequests({ perPage: 500 });

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(expect.objectContaining({ take: 200 }));
	});

	it("constrains perPage to minimum 1", async () => {
		await getCustomizationRequests({ perPage: -5 });

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(expect.objectContaining({ take: 1 }));
	});

	it("passes items to processCursorResults", async () => {
		const items = [makeRequest()];
		mockPrisma.customizationRequest.findMany.mockResolvedValue(items);
		mockProcessCursorResults.mockReturnValue({
			items,
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		});

		const result = await getCustomizationRequests();

		expect(mockProcessCursorResults).toHaveBeenCalledWith(items, 20, "forward", undefined);
		expect(result.items).toHaveLength(1);
	});

	// ──────────── Filters ────────────

	it("passes filters to buildCustomizationWhereClause", async () => {
		const filters = { status: "PENDING" as const, search: "marie" };
		await getCustomizationRequests({ filters });

		expect(mockBuildWhereClause).toHaveBeenCalledWith(filters);
	});

	it("calls buildCustomizationWhereClause with undefined when no filters", async () => {
		await getCustomizationRequests();

		expect(mockBuildWhereClause).toHaveBeenCalledWith(undefined);
	});

	// ──────────── Select ────────────

	it("selects the required fields including _count", async () => {
		await getCustomizationRequests();

		expect(mockPrisma.customizationRequest.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: expect.objectContaining({
					id: true,
					createdAt: true,
					firstName: true,
					email: true,
					phone: true,
					productTypeLabel: true,
					status: true,
					adminNotes: true,
					respondedAt: true,
					_count: { select: { inspirationProducts: true } },
				}),
			}),
		);
	});

	// ──────────── Error handling ────────────

	it("returns empty result on DB error without throwing", async () => {
		mockPrisma.customizationRequest.findMany.mockRejectedValue(new Error("DB timeout"));

		const result = await getCustomizationRequests();

		expect(result).toEqual(EMPTY_RESULT);
	});
});
