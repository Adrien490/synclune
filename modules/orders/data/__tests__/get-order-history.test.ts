import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockRequireAdmin, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockPrisma: {
		orderHistory: { findMany: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
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

vi.mock("../../constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		HISTORY: (orderId: string) => `order-history-${orderId}`,
	},
}));

// Must be imported after mocks
import { getOrderHistory } from "../get-order-history";

// ============================================================================
// Factories
// ============================================================================

function makeHistoryEntry(overrides: Record<string, unknown> = {}) {
	return {
		id: "history-1",
		orderId: "order-id-1",
		action: "STATUS_CHANGED",
		createdAt: new Date("2024-01-15T10:00:00Z"),
		...overrides,
	};
}

// A valid cuid2 string for tests
const VALID_ORDER_ID = "clzk2x8p40000abcd1234efgh";

function setupAdminSuccess() {
	mockRequireAdmin.mockResolvedValue({ admin: true });
	mockPrisma.orderHistory.findMany.mockResolvedValue([makeHistoryEntry()]);
}

function setupAdminFailure() {
	mockRequireAdmin.mockResolvedValue({
		error: {
			status: "FORBIDDEN",
			message: "Accès non autorisé. Droits administrateur requis.",
		},
	});
}

// ============================================================================
// Tests: getOrderHistory
// ============================================================================

describe("getOrderHistory", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		setupAdminSuccess();
	});

	it("returns empty array when not admin", async () => {
		setupAdminFailure();

		const result = await getOrderHistory(VALID_ORDER_ID);

		expect(result).toEqual([]);
		expect(mockPrisma.orderHistory.findMany).not.toHaveBeenCalled();
	});

	it("returns empty array for invalid orderId", async () => {
		const result = await getOrderHistory("not-a-valid-cuid2");

		expect(result).toEqual([]);
		expect(mockPrisma.orderHistory.findMany).not.toHaveBeenCalled();
	});

	it("returns history entries for valid admin request", async () => {
		const entries = [
			makeHistoryEntry(),
			makeHistoryEntry({ id: "history-2", action: "PAYMENT_UPDATED" }),
		];
		mockPrisma.orderHistory.findMany.mockResolvedValue(entries);

		const result = await getOrderHistory(VALID_ORDER_ID);

		expect(result).toEqual(entries);
	});

	it("orders results by createdAt descending", async () => {
		await getOrderHistory(VALID_ORDER_ID);

		expect(mockPrisma.orderHistory.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: { createdAt: "desc" },
			}),
		);
	});

	it("limits results to 100 entries", async () => {
		await getOrderHistory(VALID_ORDER_ID);

		expect(mockPrisma.orderHistory.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				take: 100,
			}),
		);
	});

	it("filters by orderId in where clause and excludes soft-deleted orders", async () => {
		await getOrderHistory(VALID_ORDER_ID);

		expect(mockPrisma.orderHistory.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					orderId: VALID_ORDER_ID,
					order: { deletedAt: null },
				},
			}),
		);
	});

	it("calls cacheLife with dashboard profile", async () => {
		await getOrderHistory(VALID_ORDER_ID);

		expect(mockCacheLife).toHaveBeenCalledWith("dashboard");
	});

	it("calls cacheTag with HISTORY tag for the given orderId", async () => {
		await getOrderHistory(VALID_ORDER_ID);

		expect(mockCacheTag).toHaveBeenCalledWith(`order-history-${VALID_ORDER_ID}`);
	});

	it("returns empty array when no history entries exist", async () => {
		mockPrisma.orderHistory.findMany.mockResolvedValue([]);

		const result = await getOrderHistory(VALID_ORDER_ID);

		expect(result).toEqual([]);
	});
});
