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
	mockBuildOrderItemsWhereClause,
	mockBuildCursorPagination,
	mockProcessCursorResults,
} = vi.hoisted(() => ({
	mockPrisma: {
		orderItem: { findMany: vi.fn() },
	},
	mockGetSession: vi.fn(),
	mockIsAdmin: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
	mockBuildOrderItemsWhereClause: vi.fn(),
	mockBuildCursorPagination: vi.fn(),
	mockProcessCursorResults: vi.fn(),
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

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

vi.mock("@/shared/lib/pagination", () => ({
	buildCursorPagination: mockBuildCursorPagination,
	processCursorResults: mockProcessCursorResults,
}));

vi.mock("../../constants/order-items.constants", () => ({
	GET_ORDER_ITEMS_DEFAULT_SELECT: { id: true, orderId: true, productTitle: true },
	GET_ORDER_ITEMS_DEFAULT_PER_PAGE: 50,
	GET_ORDER_ITEMS_MAX_RESULTS_PER_PAGE: 200,
	GET_ORDER_ITEMS_DEFAULT_SORT_BY: "createdAt",
	GET_ORDER_ITEMS_DEFAULT_SORT_ORDER: "desc",
	GET_ORDER_ITEMS_SORT_FIELDS: ["createdAt", "updatedAt", "price", "quantity"],
}));

vi.mock("../../constants/cache", () => ({
	cacheOrdersDashboard: vi.fn((tag?: string) => {
		mockCacheLife("dashboard");
		if (tag) mockCacheTag(tag);
	}),
	ORDERS_CACHE_TAGS: {
		LIST: "orders-list",
	},
}));

vi.mock("../../schemas/order-items.schemas", () => ({
	getOrderItemsSchema: {
		safeParse: vi.fn((data: unknown) => ({
			success: true,
			data: {
				cursor: undefined,
				direction: "forward",
				perPage: 50,
				sortBy: "createdAt",
				sortOrder: "desc",
				filters: {},
				...(data as object),
			},
		})),
	},
	orderItemFiltersSchema: {},
	orderItemSortBySchema: {},
}));

vi.mock("../../services/order-items-query-builder", () => ({
	buildOrderItemsWhereClause: mockBuildOrderItemsWhereClause,
}));

// Must be imported after mocks
import { getOrderItems } from "../get-order-items";
import { getOrderItemsSchema } from "../../schemas/order-items.schemas";

const mockSchema = getOrderItemsSchema as unknown as { safeParse: ReturnType<typeof vi.fn> };

// ============================================================================
// Factories
// ============================================================================

function makeOrderItem(overrides: Record<string, unknown> = {}) {
	return {
		id: `item-${Math.random()}`,
		orderId: "order-id-1",
		productTitle: "Test Product",
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
		perPage: 50,
		sortBy: "createdAt" as const,
		sortOrder: "desc" as const,
		filters: {},
	};
}

function setupDefaults() {
	mockIsAdmin.mockResolvedValue(false);
	mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
	mockBuildOrderItemsWhereClause.mockReturnValue({});
	mockBuildCursorPagination.mockReturnValue({ take: 51 });
	const items = [makeOrderItem()];
	mockPrisma.orderItem.findMany.mockResolvedValue(items);
	mockProcessCursorResults.mockReturnValue({
		items,
		pagination: makeEmptyPagination(),
	});
	mockSchema.safeParse.mockReturnValue({ success: true, data: makeValidParams() });
}

// ============================================================================
// Tests: getOrderItems
// ============================================================================

describe("getOrderItems", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		setupDefaults();
	});

	it("throws when not authenticated and not admin", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockGetSession.mockResolvedValue(null);

		await expect(getOrderItems(makeValidParams())).rejects.toThrow("Authentication required");
	});

	it("throws when validation fails", async () => {
		mockSchema.safeParse.mockReturnValue({
			success: false,
			error: { issues: [{ message: "Invalid params" }] },
		});

		await expect(getOrderItems(makeValidParams())).rejects.toThrow("Invalid parameters");
	});

	it("returns paginated items for admin without userId scope", async () => {
		mockIsAdmin.mockResolvedValue(true);
		mockGetSession.mockResolvedValue(null);
		const items = [makeOrderItem(), makeOrderItem()];
		mockPrisma.orderItem.findMany.mockResolvedValue(items);
		mockProcessCursorResults.mockReturnValue({
			items,
			pagination: makeEmptyPagination(),
		});

		const result = await getOrderItems(makeValidParams());

		expect(result.orderItems).toEqual(items);
		// Admin should not scope by userId - no order filter added
		const call = mockPrisma.orderItem.findMany.mock.calls[0]![0];
		expect((call as { where: { order?: unknown } }).where).not.toHaveProperty("order");
	});

	it("scopes results by userId for non-admin user", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockGetSession.mockResolvedValue({ user: { id: "user-1" } });

		await getOrderItems(makeValidParams());

		expect(mockPrisma.orderItem.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					order: { userId: "user-1", deletedAt: null },
				}),
			}),
		);
	});

	it("returns empty result on DB error", async () => {
		mockPrisma.orderItem.findMany.mockRejectedValue(new Error("DB connection failed"));

		const result = await getOrderItems(makeValidParams());

		expect(result.orderItems).toEqual([]);
		expect(result.pagination).toEqual(makeEmptyPagination());
	});

	it("uses processCursorResults to build pagination", async () => {
		const items = [makeOrderItem()];
		mockPrisma.orderItem.findMany.mockResolvedValue(items);
		const pagination = {
			nextCursor: "cursor-abc",
			prevCursor: null,
			hasNextPage: true,
			hasPreviousPage: false,
		};
		mockProcessCursorResults.mockReturnValue({ items, pagination });

		const result = await getOrderItems(makeValidParams());

		expect(result.pagination).toEqual(pagination);
	});

	it("calls cacheLife with dashboard profile", async () => {
		await getOrderItems(makeValidParams());

		expect(mockCacheLife).toHaveBeenCalledWith("dashboard");
	});

	it("calls buildOrderItemsWhereClause with validated params", async () => {
		const validParams = makeValidParams();
		mockSchema.safeParse.mockReturnValue({ success: true, data: validParams });

		await getOrderItems(validParams);

		expect(mockBuildOrderItemsWhereClause).toHaveBeenCalledWith(validParams);
	});
});
