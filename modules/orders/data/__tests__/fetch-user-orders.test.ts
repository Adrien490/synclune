import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockBuildCursorPagination,
	mockProcessCursorResults,
	mockCacheLife,
	mockCacheTag,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findMany: vi.fn() },
	},
	mockBuildCursorPagination: vi.fn(),
	mockProcessCursorResults: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/lib/pagination", () => ({
	buildCursorPagination: mockBuildCursorPagination,
	processCursorResults: mockProcessCursorResults,
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

vi.mock("@/app/generated/prisma/client", () => ({
	PaymentStatus: { PAID: "PAID" },
}));

vi.mock("../../constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		USER_ORDERS: (userId: string) => `orders-user-${userId}`,
	},
}));

vi.mock("../../constants/user-orders.constants", () => ({
	GET_USER_ORDERS_DEFAULT_PER_PAGE: 10,
	GET_USER_ORDERS_MAX_RESULTS_PER_PAGE: 50,
	GET_USER_ORDERS_SELECT: { id: true },
}));

// Must be imported after mocks
import { fetchUserOrders } from "../fetch-user-orders";

// ============================================================================
// Shared helpers
// ============================================================================

const EMPTY_RESULT = {
	orders: [],
	pagination: {
		nextCursor: null,
		prevCursor: null,
		hasNextPage: false,
		hasPreviousPage: false,
	},
};

const defaultParams = {
	sortBy: "created-descending" as const,
	perPage: 10,
	cursor: undefined,
	direction: "forward" as const,
	search: undefined,
};

const defaultPaginationConfig = { take: 11 };

const defaultProcessedResult = {
	items: [],
	pagination: {
		nextCursor: null,
		prevCursor: null,
		hasNextPage: false,
		hasPreviousPage: false,
	},
};

// ============================================================================
// Tests: fetchUserOrders
// ============================================================================

describe("fetchUserOrders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.order.findMany.mockResolvedValue([]);
		mockBuildCursorPagination.mockReturnValue(defaultPaginationConfig);
		mockProcessCursorResults.mockReturnValue(defaultProcessedResult);
	});

	it("calls cacheLife with userOrders profile", async () => {
		await fetchUserOrders("user-1", defaultParams);

		expect(mockCacheLife).toHaveBeenCalledWith("userOrders");
	});

	it("calls cacheTag with USER_ORDERS tag for the given userId", async () => {
		await fetchUserOrders("user-1", defaultParams);

		expect(mockCacheTag).toHaveBeenCalledWith("orders-user-user-1");
	});

	it("uses a different cache tag per userId", async () => {
		await fetchUserOrders("user-99", defaultParams);

		expect(mockCacheTag).toHaveBeenCalledWith("orders-user-user-99");
	});

	it("filters by PAID payment status only", async () => {
		await fetchUserOrders("user-1", defaultParams);

		expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ paymentStatus: "PAID" }),
			}),
		);
	});

	it("includes notDeleted filter (deletedAt: null) in where clause", async () => {
		await fetchUserOrders("user-1", defaultParams);

		expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ deletedAt: null }),
			}),
		);
	});

	it("filters by userId in the where clause", async () => {
		await fetchUserOrders("user-abc", defaultParams);

		expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ userId: "user-abc" }),
			}),
		);
	});

	it("does not add search filter when search is undefined", async () => {
		await fetchUserOrders("user-1", { ...defaultParams, search: undefined });

		const call = mockPrisma.order.findMany.mock.calls[0]![0];
		expect(call.where).not.toHaveProperty("orderNumber");
	});

	it("adds case-insensitive orderNumber search filter when search is provided", async () => {
		await fetchUserOrders("user-1", { ...defaultParams, search: "ORD-001" });

		expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					orderNumber: { contains: "ORD-001", mode: "insensitive" },
				}),
			}),
		);
	});

	it("uses GET_USER_ORDERS_SELECT for the DB query", async () => {
		await fetchUserOrders("user-1", defaultParams);

		expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: { id: true },
			}),
		);
	});

	it("orders by createdAt desc when sortBy is created-descending", async () => {
		await fetchUserOrders("user-1", { ...defaultParams, sortBy: "created-descending" });

		expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: [{ createdAt: "desc" }, { id: "asc" }],
			}),
		);
	});

	it("orders by createdAt asc when sortBy is created-ascending", async () => {
		await fetchUserOrders("user-1", { ...defaultParams, sortBy: "created-ascending" });

		expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: [{ createdAt: "asc" }, { id: "asc" }],
			}),
		);
	});

	it("orders by total desc when sortBy is total-descending", async () => {
		await fetchUserOrders("user-1", { ...defaultParams, sortBy: "total-descending" });

		expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: [{ total: "desc" }, { id: "asc" }],
			}),
		);
	});

	it("orders by total asc when sortBy is total-ascending", async () => {
		await fetchUserOrders("user-1", { ...defaultParams, sortBy: "total-ascending" });

		expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: [{ total: "asc" }, { id: "asc" }],
			}),
		);
	});

	it("calls buildCursorPagination with correct take from perPage", async () => {
		await fetchUserOrders("user-1", { ...defaultParams, perPage: 5 });

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
	});

	it("spreads cursor pagination config into findMany call", async () => {
		mockBuildCursorPagination.mockReturnValue({
			take: 11,
			skip: 1,
			cursor: { id: "order-10" },
		});

		await fetchUserOrders("user-1", { ...defaultParams, cursor: "order-10" });

		expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				take: 11,
				skip: 1,
				cursor: { id: "order-10" },
			}),
		);
	});

	it("calls processCursorResults with query results and take", async () => {
		const orders = [{ id: "order-1" }, { id: "order-2" }];
		mockPrisma.order.findMany.mockResolvedValue(orders);

		await fetchUserOrders("user-1", { ...defaultParams, perPage: 5 });

		expect(mockProcessCursorResults).toHaveBeenCalledWith(
			orders,
			5,
			defaultParams.direction,
			defaultParams.cursor,
		);
	});

	it("returns orders and pagination from processCursorResults", async () => {
		const items = [{ id: "order-1" }];
		mockProcessCursorResults.mockReturnValue({
			items,
			pagination: {
				nextCursor: "order-1",
				prevCursor: null,
				hasNextPage: true,
				hasPreviousPage: false,
			},
		});

		const result = await fetchUserOrders("user-1", defaultParams);

		expect(result).toEqual({
			orders: items,
			pagination: {
				nextCursor: "order-1",
				prevCursor: null,
				hasNextPage: true,
				hasPreviousPage: false,
			},
		});
	});

	it("returns empty result on DB error", async () => {
		mockPrisma.order.findMany.mockRejectedValue(new Error("DB connection failed"));

		const result = await fetchUserOrders("user-1", defaultParams);

		expect(result).toEqual(EMPTY_RESULT);
	});

	it("returns empty result when buildCursorPagination throws", async () => {
		mockBuildCursorPagination.mockImplementation(() => {
			throw new Error("take must be positive");
		});

		const result = await fetchUserOrders("user-1", { ...defaultParams, perPage: -1 });

		expect(result).toEqual(EMPTY_RESULT);
	});

	it("caps perPage at GET_USER_ORDERS_MAX_RESULTS_PER_PAGE (50)", async () => {
		await fetchUserOrders("user-1", { ...defaultParams, perPage: 200 });

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(expect.objectContaining({ take: 50 }));
	});

	it("uses default perPage when perPage is 0 (falsy fallback)", async () => {
		// perPage: 0 is falsy, so `0 || GET_USER_ORDERS_DEFAULT_PER_PAGE` evaluates to 10
		await fetchUserOrders("user-1", { ...defaultParams, perPage: 0 });

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }));
	});
});
