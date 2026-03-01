import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockGetSession, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockPrisma: {
		order: { findFirst: vi.fn() },
	},
	mockGetSession: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
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
		LAST_ORDER: (userId: string) => `last-order-user-${userId}`,
	},
}));

vi.mock("../../constants/last-order.constants", () => ({
	GET_LAST_ORDER_DEFAULT_SELECT: { id: true, orderNumber: true },
}));

// Must be imported after mocks
import { getLastOrder, fetchLastOrder } from "../get-last-order";

// ============================================================================
// Factories
// ============================================================================

function makeOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: "order-1",
		orderNumber: "ORD-001",
		total: 9999,
		...overrides,
	};
}

function setupDefaults() {
	mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
	mockPrisma.order.findFirst.mockResolvedValue(makeOrder());
}

// ============================================================================
// Tests: getLastOrder
// ============================================================================

describe("getLastOrder", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns null when there is no session", async () => {
		mockGetSession.mockResolvedValue(null);

		const result = await getLastOrder();

		expect(result).toBeNull();
		expect(mockPrisma.order.findFirst).not.toHaveBeenCalled();
	});

	it("returns null when session has no user id", async () => {
		mockGetSession.mockResolvedValue({ user: {} });

		const result = await getLastOrder();

		expect(result).toBeNull();
		expect(mockPrisma.order.findFirst).not.toHaveBeenCalled();
	});

	it("returns null when session user id is undefined", async () => {
		mockGetSession.mockResolvedValue({ user: { id: undefined } });

		const result = await getLastOrder();

		expect(result).toBeNull();
		expect(mockPrisma.order.findFirst).not.toHaveBeenCalled();
	});

	it("calls fetchLastOrder with userId from session", async () => {
		const order = makeOrder();
		mockPrisma.order.findFirst.mockResolvedValue(order);

		const result = await getLastOrder();

		expect(mockPrisma.order.findFirst).toHaveBeenCalledOnce();
		expect(result).toEqual(order);
	});

	it("passes the correct userId to the DB query", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user-42" } });

		await getLastOrder();

		expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ userId: "user-42" }),
			}),
		);
	});
});

// ============================================================================
// Tests: fetchLastOrder
// ============================================================================

describe("fetchLastOrder", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.order.findFirst.mockResolvedValue(makeOrder());
	});

	it("calls cacheLife with userOrders profile", async () => {
		await fetchLastOrder("user-1");

		expect(mockCacheLife).toHaveBeenCalledWith("userOrders");
	});

	it("calls cacheTag with LAST_ORDER tag for the given userId", async () => {
		await fetchLastOrder("user-1");

		expect(mockCacheTag).toHaveBeenCalledWith("last-order-user-user-1");
	});

	it("uses a different cache tag per userId", async () => {
		await fetchLastOrder("user-99");

		expect(mockCacheTag).toHaveBeenCalledWith("last-order-user-user-99");
	});

	it("filters by userId in the where clause", async () => {
		await fetchLastOrder("user-1");

		expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ userId: "user-1" }),
			}),
		);
	});

	it("filters by PAID payment status", async () => {
		await fetchLastOrder("user-1");

		expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ paymentStatus: "PAID" }),
			}),
		);
	});

	it("includes notDeleted filter (deletedAt: null) in where clause", async () => {
		await fetchLastOrder("user-1");

		expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ deletedAt: null }),
			}),
		);
	});

	it("orders results by createdAt descending", async () => {
		await fetchLastOrder("user-1");

		expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: { createdAt: "desc" },
			}),
		);
	});

	it("uses GET_LAST_ORDER_DEFAULT_SELECT for the query", async () => {
		await fetchLastOrder("user-1");

		expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				select: { id: true, orderNumber: true },
			}),
		);
	});

	it("returns null when DB throws an error", async () => {
		mockPrisma.order.findFirst.mockRejectedValue(new Error("DB connection failed"));

		const result = await fetchLastOrder("user-1");

		expect(result).toBeNull();
	});

	it("returns null when no order is found", async () => {
		mockPrisma.order.findFirst.mockResolvedValue(null);

		const result = await fetchLastOrder("user-1");

		expect(result).toBeNull();
	});

	it("returns the order when found", async () => {
		const order = makeOrder({ orderNumber: "ORD-007" });
		mockPrisma.order.findFirst.mockResolvedValue(order);

		const result = await fetchLastOrder("user-1");

		expect(result).toEqual(order);
	});
});
