import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockRequireAdmin,
	mockCacheLife,
	mockCacheTag,
	mockBuildOrderWhereClause,
	mockGetSortDirection,
	mockFuzzySearchIds,
	mockBuildCursorPagination,
	mockProcessCursorResults,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findMany: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
	mockBuildOrderWhereClause: vi.fn(),
	mockGetSortDirection: vi.fn(),
	mockFuzzySearchIds: vi.fn(),
	mockBuildCursorPagination: vi.fn(),
	mockProcessCursorResults: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
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

vi.mock("@/shared/lib/fuzzy-search", () => ({
	fuzzySearchIds: mockFuzzySearchIds,
}));

vi.mock("@/shared/utils/sort-direction", () => ({
	getSortDirection: mockGetSortDirection,
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_ORDERS_LIST: "admin-orders-list",
	},
}));

vi.mock("../../constants/order.constants", () => ({
	GET_ORDERS_SELECT: { id: true, orderNumber: true, total: true },
	GET_ORDERS_DEFAULT_PER_PAGE: 10,
	GET_ORDERS_MAX_RESULTS_PER_PAGE: 100,
	GET_ORDERS_SORT_FIELDS: ["created-descending"],
	SORT_LABELS: {},
	SORT_OPTIONS: {
		CREATED_DESC: "created-descending",
		CREATED_ASC: "created-ascending",
		TOTAL_DESC: "total-descending",
		TOTAL_ASC: "total-ascending",
		STATUS_ASC: "status-ascending",
		STATUS_DESC: "status-descending",
		PAYMENT_STATUS_ASC: "paymentStatus-ascending",
		PAYMENT_STATUS_DESC: "paymentStatus-descending",
		FULFILLMENT_STATUS_ASC: "fulfillmentStatus-ascending",
		FULFILLMENT_STATUS_DESC: "fulfillmentStatus-descending",
	},
}));

vi.mock("../../constants/cache", () => ({
	cacheOrdersDashboard: vi.fn((tag?: string) => {
		mockCacheLife("dashboard");
		if (tag) mockCacheTag(tag);
	}),
}));

vi.mock("../../schemas/order.schemas", () => ({
	getOrdersSchema: {
		safeParse: vi.fn((data: unknown) => ({
			success: true,
			data: {
				cursor: undefined,
				direction: "forward",
				perPage: 10,
				sortBy: "created-descending",
				search: undefined,
				filters: undefined,
				...(data as object),
			},
		})),
	},
	orderFiltersSchema: {},
	orderSortBySchema: {},
}));

vi.mock("../../services/order-query-builder", () => ({
	buildOrderWhereClause: mockBuildOrderWhereClause,
}));

// Must be imported after mocks
import { getOrders } from "../get-orders";
import { getOrdersSchema } from "../../schemas/order.schemas";

const mockSchema = getOrdersSchema as unknown as { safeParse: ReturnType<typeof vi.fn> };

// ============================================================================
// Factories
// ============================================================================

function makeOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: `order-${Math.random()}`,
		orderNumber: "ORD-001",
		total: 5000,
		...overrides,
	};
}

function makeEmptyPagination() {
	return {
		nextCursor: null,
		prevCursor: null,
		hasNextPage: false,
		hasPreviousPage: false,
	};
}

function makeValidParams() {
	return {
		cursor: undefined,
		direction: "forward" as const,
		perPage: 10,
		sortBy: "created-descending" as const,
		search: undefined,
		filters: undefined,
	};
}

function setupDefaults() {
	mockRequireAdmin.mockResolvedValue({ admin: true });
	mockBuildOrderWhereClause.mockReturnValue({ deletedAt: null });
	mockGetSortDirection.mockReturnValue("desc");
	mockFuzzySearchIds.mockResolvedValue(null);
	mockBuildCursorPagination.mockReturnValue({ take: 11 });
	const orders = [makeOrder()];
	mockPrisma.order.findMany.mockResolvedValue(orders);
	mockProcessCursorResults.mockReturnValue({
		items: orders,
		pagination: makeEmptyPagination(),
	});
	mockSchema.safeParse.mockReturnValue({ success: true, data: makeValidParams() });
}

// ============================================================================
// Tests: getOrders
// ============================================================================

describe("getOrders", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		setupDefaults();
	});

	it("throws when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: "FORBIDDEN", message: "Unauthorized" },
		});

		await expect(getOrders(makeValidParams())).rejects.toThrow("Unauthorized");
	});

	it("throws when validation fails", async () => {
		mockSchema.safeParse.mockReturnValue({
			success: false,
			error: { issues: [{ message: "invalid sortBy" }] },
		});

		await expect(getOrders(makeValidParams())).rejects.toThrow("Invalid parameters");
	});

	it("returns paginated orders for valid admin request", async () => {
		const orders = [makeOrder(), makeOrder()];
		mockPrisma.order.findMany.mockResolvedValue(orders);
		mockProcessCursorResults.mockReturnValue({
			items: orders,
			pagination: makeEmptyPagination(),
		});

		const result = await getOrders(makeValidParams());

		expect(result.orders).toEqual(orders);
		expect(result.pagination).toEqual(makeEmptyPagination());
	});

	it("performs fuzzy search when search term is 3 or more characters", async () => {
		const paramsWithSearch = { ...makeValidParams(), search: "alice" };
		mockSchema.safeParse.mockReturnValue({ success: true, data: paramsWithSearch });
		mockFuzzySearchIds.mockResolvedValue(["order-id-1", "order-id-2"]);

		await getOrders(paramsWithSearch);

		expect(mockFuzzySearchIds).toHaveBeenCalledWith(
			"alice",
			expect.objectContaining({
				columns: expect.arrayContaining([
					{ table: "Order", column: "customerName" },
					{ table: "Order", column: "customerEmail" },
				]),
			}),
		);
		expect(mockBuildOrderWhereClause).toHaveBeenCalledWith(paramsWithSearch, [
			"order-id-1",
			"order-id-2",
		]);
	});

	it("does not perform fuzzy search for search terms shorter than 3 characters", async () => {
		const paramsWithShortSearch = { ...makeValidParams(), search: "ab" };
		mockSchema.safeParse.mockReturnValue({ success: true, data: paramsWithShortSearch });

		await getOrders(paramsWithShortSearch);

		expect(mockFuzzySearchIds).not.toHaveBeenCalled();
		expect(mockBuildOrderWhereClause).toHaveBeenCalledWith(paramsWithShortSearch, null);
	});

	it("does not perform fuzzy search when search is undefined", async () => {
		await getOrders(makeValidParams());

		expect(mockFuzzySearchIds).not.toHaveBeenCalled();
		expect(mockBuildOrderWhereClause).toHaveBeenCalledWith(makeValidParams(), null);
	});

	it("returns empty result on DB error", async () => {
		mockPrisma.order.findMany.mockRejectedValue(new Error("DB connection failed"));

		const result = await getOrders(makeValidParams());

		expect(result.orders).toEqual([]);
		expect(result.pagination).toEqual(makeEmptyPagination());
	});

	it("calls cacheLife with dashboard profile", async () => {
		await getOrders(makeValidParams());

		expect(mockCacheLife).toHaveBeenCalledWith("dashboard");
	});

	it("calls cacheTag with admin-orders-list tag", async () => {
		await getOrders(makeValidParams());

		expect(mockCacheTag).toHaveBeenCalledWith("admin-orders-list");
	});

	it("uses GET_ORDERS_SELECT for the DB query", async () => {
		await getOrders(makeValidParams());

		expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: { id: true, orderNumber: true, total: true },
			}),
		);
	});

	it("passes cursor config from buildCursorPagination to findMany", async () => {
		mockBuildCursorPagination.mockReturnValue({ take: 11, skip: 1, cursor: { id: "cursor-1" } });

		await getOrders(makeValidParams());

		expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				take: 11,
				skip: 1,
				cursor: { id: "cursor-1" },
			}),
		);
	});
});
