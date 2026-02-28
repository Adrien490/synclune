import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockGetSession, mockIsAdmin, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockPrisma: {
		order: { findFirst: vi.fn() },
	},
	mockGetSession: vi.fn(),
	mockIsAdmin: vi.fn(),
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

vi.mock("@/modules/auth/utils/guards", () => ({
	isAdmin: mockIsAdmin,
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

vi.mock("../../constants/order.constants", () => ({
	GET_ORDER_SELECT: { id: true, orderNumber: true },
}));

vi.mock("../../constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		USER_ORDERS: (userId: string) => `orders-user-${userId}`,
	},
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_ORDERS_LIST: "admin-orders-list",
	},
}));

vi.mock("../../schemas/order.schemas", () => ({
	getOrderSchema: {
		safeParse: vi.fn((data: unknown) => ({
			success: true,
			data: { orderNumber: (data as { orderNumber?: string }).orderNumber ?? "ORD-001" },
		})),
	},
}));

// Must be imported after mocks
import { getOrder, fetchOrder } from "../get-order";
import { getOrderSchema } from "../../schemas/order.schemas";

const mockGetOrderSchema = getOrderSchema as unknown as { safeParse: ReturnType<typeof vi.fn> };

// ============================================================================
// Factories
// ============================================================================

function makeOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: "order-1",
		orderNumber: "ORD-001",
		...overrides,
	};
}

function setupDefaults() {
	mockIsAdmin.mockResolvedValue(false);
	mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
	mockPrisma.order.findFirst.mockResolvedValue(makeOrder());
	mockGetOrderSchema.safeParse.mockReturnValue({
		success: true,
		data: { orderNumber: "ORD-001" },
	});
}

// ============================================================================
// Tests: getOrder
// ============================================================================

describe("getOrder", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns null for invalid params when validation fails", async () => {
		mockGetOrderSchema.safeParse.mockReturnValue({
			success: false,
			error: { errors: [{ message: "orderNumber requis" }] },
		});

		const result = await getOrder({});

		expect(result).toBeNull();
		expect(mockIsAdmin).not.toHaveBeenCalled();
	});

	it("returns null for unauthenticated non-admin user", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockGetSession.mockResolvedValue(null);

		const result = await getOrder({ orderNumber: "ORD-001" });

		expect(result).toBeNull();
		expect(mockPrisma.order.findFirst).not.toHaveBeenCalled();
	});

	it("returns order for admin without session", async () => {
		mockIsAdmin.mockResolvedValue(true);
		mockGetSession.mockResolvedValue(null);
		mockPrisma.order.findFirst.mockResolvedValue(makeOrder());

		const result = await getOrder({ orderNumber: "ORD-001" });

		expect(result).toEqual(makeOrder());
	});

	it("returns order for authenticated user", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
		mockPrisma.order.findFirst.mockResolvedValue(makeOrder());

		const result = await getOrder({ orderNumber: "ORD-001" });

		expect(result).toEqual(makeOrder());
	});

	it("passes admin flag and userId to fetchOrder", async () => {
		mockIsAdmin.mockResolvedValue(true);
		mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
		mockPrisma.order.findFirst.mockResolvedValue(makeOrder());

		const result = await getOrder({ orderNumber: "ORD-001" });

		expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ orderNumber: "ORD-001" }),
			}),
		);
		expect(result).toEqual(makeOrder());
	});

	it("returns null when order does not exist", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
		mockPrisma.order.findFirst.mockResolvedValue(null);

		const result = await getOrder({ orderNumber: "ORD-MISSING" });

		expect(result).toBeNull();
	});
});

// ============================================================================
// Tests: fetchOrder
// ============================================================================

describe("fetchOrder", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.order.findFirst.mockResolvedValue(makeOrder());
	});

	it("uses ADMIN_ORDERS_LIST cache tag for admin", async () => {
		await fetchOrder({ orderNumber: "ORD-001" }, { admin: true, userId: "user-1" });

		expect(mockCacheTag).toHaveBeenCalledWith("admin-orders-list");
	});

	it("uses USER_ORDERS cache tag for non-admin user", async () => {
		await fetchOrder({ orderNumber: "ORD-001" }, { admin: false, userId: "user-1" });

		expect(mockCacheTag).toHaveBeenCalledWith("orders-user-user-1");
	});

	it("does not call cacheTag when not admin and no userId", async () => {
		await fetchOrder({ orderNumber: "ORD-001" }, { admin: false, userId: undefined });

		expect(mockCacheTag).not.toHaveBeenCalled();
	});

	it("filters by userId for non-admin user", async () => {
		await fetchOrder({ orderNumber: "ORD-001" }, { admin: false, userId: "user-1" });

		expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ userId: "user-1" }),
			}),
		);
	});

	it("does not filter by userId for admin", async () => {
		await fetchOrder({ orderNumber: "ORD-001" }, { admin: true, userId: "user-1" });

		const call = mockPrisma.order.findFirst.mock.calls[0]![0];
		expect(call.where).not.toHaveProperty("userId");
	});

	it("includes notDeleted filter (deletedAt: null) in where clause", async () => {
		await fetchOrder({ orderNumber: "ORD-001" }, { admin: true, userId: "user-1" });

		expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ deletedAt: null }),
			}),
		);
	});

	it("includes orderNumber in where clause", async () => {
		await fetchOrder({ orderNumber: "ORD-999" }, { admin: true, userId: "user-1" });

		expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ orderNumber: "ORD-999" }),
			}),
		);
	});

	it("returns null on DB error", async () => {
		mockPrisma.order.findFirst.mockRejectedValue(new Error("DB connection failed"));

		const result = await fetchOrder({ orderNumber: "ORD-001" }, { admin: true, userId: "user-1" });

		expect(result).toBeNull();
	});

	it("calls cacheLife with dashboard profile", async () => {
		await fetchOrder({ orderNumber: "ORD-001" }, { admin: true, userId: "user-1" });

		expect(mockCacheLife).toHaveBeenCalledWith("dashboard");
	});

	it("uses GET_ORDER_SELECT for the DB query", async () => {
		await fetchOrder({ orderNumber: "ORD-001" }, { admin: false, userId: "user-1" });

		expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				select: { id: true, orderNumber: true },
			}),
		);
	});

	it("returns the order when found", async () => {
		const order = makeOrder({ orderNumber: "ORD-001" });
		mockPrisma.order.findFirst.mockResolvedValue(order);

		const result = await fetchOrder({ orderNumber: "ORD-001" }, { admin: false, userId: "user-1" });

		expect(result).toEqual(order);
	});

	it("returns null when order not found", async () => {
		mockPrisma.order.findFirst.mockResolvedValue(null);

		const result = await fetchOrder(
			{ orderNumber: "ORD-MISSING" },
			{ admin: false, userId: "user-1" },
		);

		expect(result).toBeNull();
	});
});
