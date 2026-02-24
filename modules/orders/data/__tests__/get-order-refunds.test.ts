import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockRequireAdmin,
	mockCacheLife,
	mockCacheTag,
} = vi.hoisted(() => ({
	mockPrisma: {
		refund: { findMany: vi.fn() },
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
		REFUNDS: (orderId: string) => `order-refunds-${orderId}`,
	},
}));

// Must be imported after mocks
import { getOrderRefunds } from "../get-order-refunds";

// ============================================================================
// Factories
// ============================================================================

function makeRefund(overrides: Record<string, unknown> = {}) {
	return {
		id: "refund-1",
		amount: 5000,
		status: "APPROVED",
		reason: "Item damaged",
		createdAt: new Date("2024-01-01T00:00:00Z"),
		...overrides,
	};
}

function setupAdminSuccess() {
	mockRequireAdmin.mockResolvedValue({ admin: true });
	mockPrisma.refund.findMany.mockResolvedValue([makeRefund()]);
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
// Tests: getOrderRefunds
// ============================================================================

describe("getOrderRefunds", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupAdminSuccess();
	});

	it("returns error object when requireAdmin fails", async () => {
		setupAdminFailure();

		const result = await getOrderRefunds("order-1");

		expect(result).toHaveProperty("error");
		expect(mockPrisma.refund.findMany).not.toHaveBeenCalled();
	});

	it("returns the error message from requireAdmin on auth failure", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: {
				status: "FORBIDDEN",
				message: "Accès non autorisé. Droits administrateur requis.",
			},
		});

		const result = await getOrderRefunds("order-1");

		expect(result).toEqual({
			error: "Accès non autorisé. Droits administrateur requis.",
		});
	});

	it("returns refunds array for admin", async () => {
		const refunds = [makeRefund(), makeRefund({ id: "refund-2", amount: 2500 })];
		mockPrisma.refund.findMany.mockResolvedValue(refunds);

		const result = await getOrderRefunds("order-1");

		expect(result).toEqual({ refunds });
	});

	it("returns empty refunds array when no refunds exist", async () => {
		mockPrisma.refund.findMany.mockResolvedValue([]);

		const result = await getOrderRefunds("order-1");

		expect(result).toEqual({ refunds: [] });
	});

	it("returns generic error message on unexpected exception", async () => {
		mockRequireAdmin.mockRejectedValue(new Error("Unexpected failure"));

		const result = await getOrderRefunds("order-1");

		expect(result).toEqual({ error: "Une erreur est survenue" });
	});

	it("returns generic error when DB throws", async () => {
		mockPrisma.refund.findMany.mockRejectedValue(new Error("DB error"));

		const result = await getOrderRefunds("order-1");

		expect(result).toEqual({ error: "Une erreur est survenue" });
	});

	it("calls cacheLife with dashboard profile", async () => {
		await getOrderRefunds("order-1");

		expect(mockCacheLife).toHaveBeenCalledWith("dashboard");
	});

	it("calls cacheTag with REFUNDS tag for the given orderId", async () => {
		await getOrderRefunds("order-abc");

		expect(mockCacheTag).toHaveBeenCalledWith("order-refunds-order-abc");
	});

	it("uses a different cache tag per orderId", async () => {
		await getOrderRefunds("order-xyz");

		expect(mockCacheTag).toHaveBeenCalledWith("order-refunds-order-xyz");
	});

	it("filters by orderId in the where clause", async () => {
		await getOrderRefunds("order-123");

		expect(mockPrisma.refund.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ orderId: "order-123" }),
			})
		);
	});

	it("includes notDeleted filter (deletedAt: null) in where clause", async () => {
		await getOrderRefunds("order-1");

		expect(mockPrisma.refund.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ deletedAt: null }),
			})
		);
	});

	it("orders results by createdAt descending", async () => {
		await getOrderRefunds("order-1");

		expect(mockPrisma.refund.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: { createdAt: "desc" },
			})
		);
	});

	it("selects the expected refund fields", async () => {
		await getOrderRefunds("order-1");

		expect(mockPrisma.refund.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: {
					id: true,
					amount: true,
					status: true,
					reason: true,
					createdAt: true,
				},
			})
		);
	});
});
