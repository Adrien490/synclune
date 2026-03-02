import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockIsAdmin, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockPrisma: {
		order: { findFirst: vi.fn() },
	},
	mockIsAdmin: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
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
	cacheOrdersDashboard: vi.fn((tag?: string) => {
		mockCacheLife("dashboard");
		if (tag) mockCacheTag(tag);
	}),
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_ORDERS_LIST: "admin-orders-list",
	},
}));

vi.mock("../../schemas/order.schemas", () => ({
	getOrderByIdSchema: {
		safeParse: vi.fn((data: unknown) => ({
			success: true,
			data: { id: (data as { id?: string }).id ?? "order-id-1" },
		})),
	},
}));

// Must be imported after mocks
import { getOrderById } from "../get-order-by-id";
import { getOrderByIdSchema } from "../../schemas/order.schemas";

const mockSchema = getOrderByIdSchema as unknown as { safeParse: ReturnType<typeof vi.fn> };

// ============================================================================
// Factories
// ============================================================================

function makeOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: "order-id-1",
		orderNumber: "ORD-001",
		...overrides,
	};
}

function setupDefaults() {
	mockIsAdmin.mockResolvedValue(true);
	mockPrisma.order.findFirst.mockResolvedValue(makeOrder());
	mockSchema.safeParse.mockReturnValue({ success: true, data: { id: "order-id-1" } });
}

// ============================================================================
// Tests: getOrderById
// ============================================================================

describe("getOrderById", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		setupDefaults();
	});

	it("returns null when validation fails", async () => {
		mockSchema.safeParse.mockReturnValue({
			success: false,
			error: { errors: [{ message: "Invalid id" }] },
		});

		const result = await getOrderById({});

		expect(result).toBeNull();
		expect(mockIsAdmin).not.toHaveBeenCalled();
		expect(mockPrisma.order.findFirst).not.toHaveBeenCalled();
	});

	it("returns null when not admin", async () => {
		mockIsAdmin.mockResolvedValue(false);

		const result = await getOrderById({ id: "order-id-1" });

		expect(result).toBeNull();
		expect(mockPrisma.order.findFirst).not.toHaveBeenCalled();
	});

	it("returns order when found", async () => {
		const order = makeOrder();
		mockPrisma.order.findFirst.mockResolvedValue(order);

		const result = await getOrderById({ id: "order-id-1" });

		expect(result).toEqual(order);
	});

	it("returns null when order is not found", async () => {
		mockPrisma.order.findFirst.mockResolvedValue(null);

		const result = await getOrderById({ id: "order-id-missing" });

		expect(result).toBeNull();
	});

	it("returns null on DB error", async () => {
		mockPrisma.order.findFirst.mockRejectedValue(new Error("DB connection failed"));

		const result = await getOrderById({ id: "order-id-1" });

		expect(result).toBeNull();
	});

	it("queries with id and notDeleted filter", async () => {
		await getOrderById({ id: "order-id-1" });

		expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					id: "order-id-1",
					deletedAt: null,
				}),
			}),
		);
	});

	it("uses GET_ORDER_SELECT for the DB query", async () => {
		await getOrderById({ id: "order-id-1" });

		expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				select: { id: true, orderNumber: true },
			}),
		);
	});

	it("calls cacheLife with dashboard profile", async () => {
		await getOrderById({ id: "order-id-1" });

		expect(mockCacheLife).toHaveBeenCalledWith("dashboard");
	});

	it("calls cacheTag with admin-orders-list tag", async () => {
		await getOrderById({ id: "order-id-1" });

		expect(mockCacheTag).toHaveBeenCalledWith("admin-orders-list");
	});
});
