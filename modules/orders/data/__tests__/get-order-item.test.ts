import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockGetSession, mockIsAdmin, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockPrisma: {
		orderItem: { findFirst: vi.fn() },
	},
	mockGetSession: vi.fn(),
	mockIsAdmin: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
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

vi.mock("../../constants/order-item.constants", () => ({
	GET_ORDER_ITEM_DEFAULT_SELECT: { id: true, orderId: true, productTitle: true },
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

vi.mock("../../schemas/order-item.schemas", () => ({
	getOrderItemSchema: {
		safeParse: vi.fn((data: unknown) => ({
			success: true,
			data: { id: (data as { id?: string }).id ?? "item-id-1" },
		})),
	},
}));

// Must be imported after mocks
import { getOrderItem } from "../get-order-item";
import { getOrderItemSchema } from "../../schemas/order-item.schemas";

const mockSchema = getOrderItemSchema as unknown as { safeParse: ReturnType<typeof vi.fn> };

// ============================================================================
// Factories
// ============================================================================

function makeOrderItem(overrides: Record<string, unknown> = {}) {
	return {
		id: "item-id-1",
		orderId: "order-id-1",
		productTitle: "Test Product",
		...overrides,
	};
}

function setupDefaults() {
	mockIsAdmin.mockResolvedValue(false);
	mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
	mockPrisma.orderItem.findFirst.mockResolvedValue(makeOrderItem());
	mockSchema.safeParse.mockReturnValue({ success: true, data: { id: "item-id-1" } });
}

// ============================================================================
// Tests: getOrderItem
// ============================================================================

describe("getOrderItem", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		setupDefaults();
	});

	it("returns null when validation fails", async () => {
		mockSchema.safeParse.mockReturnValue({
			success: false,
			error: { errors: [{ message: "id requis" }] },
		});

		const result = await getOrderItem({});

		expect(result).toBeNull();
		expect(mockIsAdmin).not.toHaveBeenCalled();
		expect(mockPrisma.orderItem.findFirst).not.toHaveBeenCalled();
	});

	it("returns null when not admin and not authenticated", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockGetSession.mockResolvedValue(null);

		const result = await getOrderItem({ id: "item-id-1" });

		expect(result).toBeNull();
		expect(mockPrisma.orderItem.findFirst).not.toHaveBeenCalled();
	});

	it("returns item for admin without userId filter on order", async () => {
		mockIsAdmin.mockResolvedValue(true);
		mockGetSession.mockResolvedValue(null);
		const item = makeOrderItem();
		mockPrisma.orderItem.findFirst.mockResolvedValue(item);

		const result = await getOrderItem({ id: "item-id-1" });

		expect(result).toEqual(item);
		const call = mockPrisma.orderItem.findFirst.mock.calls[0]![0];
		expect(call.where).not.toHaveProperty("order");
	});

	it("returns item for authenticated user with userId filter on order", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
		const item = makeOrderItem();
		mockPrisma.orderItem.findFirst.mockResolvedValue(item);

		const result = await getOrderItem({ id: "item-id-1" });

		expect(result).toEqual(item);
		expect(mockPrisma.orderItem.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					order: {
						userId: "user-1",
						deletedAt: null,
					},
				}),
			}),
		);
	});

	it("returns null when item is not found", async () => {
		mockPrisma.orderItem.findFirst.mockResolvedValue(null);

		const result = await getOrderItem({ id: "item-id-missing" });

		expect(result).toBeNull();
	});

	it("returns null on DB error", async () => {
		mockPrisma.orderItem.findFirst.mockRejectedValue(new Error("DB error"));

		const result = await getOrderItem({ id: "item-id-1" });

		expect(result).toBeNull();
	});

	it("uses GET_ORDER_ITEM_DEFAULT_SELECT for the DB query", async () => {
		await getOrderItem({ id: "item-id-1" });

		expect(mockPrisma.orderItem.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				select: { id: true, orderId: true, productTitle: true },
			}),
		);
	});

	it("calls cacheLife with dashboard profile", async () => {
		await getOrderItem({ id: "item-id-1" });

		expect(mockCacheLife).toHaveBeenCalledWith("dashboard");
	});

	it("admin with session does not scope by userId", async () => {
		mockIsAdmin.mockResolvedValue(true);
		mockGetSession.mockResolvedValue({ user: { id: "admin-1" } });

		await getOrderItem({ id: "item-id-1" });

		const call = mockPrisma.orderItem.findFirst.mock.calls[0]![0];
		expect(call.where).not.toHaveProperty("order");
	});
});
