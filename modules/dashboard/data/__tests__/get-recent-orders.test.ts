import { describe, it, expect, vi, beforeEach } from "vitest"

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrismaOrderFindMany,
	mockCacheDashboard,
	mockTransformRecentOrders,
} = vi.hoisted(() => ({
	mockPrismaOrderFindMany: vi.fn(),
	mockCacheDashboard: vi.fn(),
	mockTransformRecentOrders: vi.fn(),
}))

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		order: {
			findMany: mockPrismaOrderFindMany,
		},
	},
	notDeleted: { deletedAt: null },
}))

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
	updateTag: vi.fn(),
}))

vi.mock("@/modules/dashboard/constants/cache", () => ({
	cacheDashboard: mockCacheDashboard,
	DASHBOARD_CACHE_TAGS: {
		KPIS: "dashboard-kpis",
		REVENUE_CHART: "dashboard-revenue-chart",
		RECENT_ORDERS: "dashboard-recent-orders",
	},
}))

vi.mock("@/app/generated/prisma/client", () => ({
	PaymentStatus: {
		PENDING: "PENDING",
		PAID: "PAID",
		FAILED: "FAILED",
		EXPIRED: "EXPIRED",
		REFUNDED: "REFUNDED",
	},
}))

// Must use the absolute alias path so Vitest resolves it to the same module
// that get-recent-orders.ts imports via its relative "../services/..." path.
vi.mock("@/modules/dashboard/services/recent-orders-transformer.service", () => ({
	transformRecentOrders: mockTransformRecentOrders,
}))

vi.mock("../constants/dashboard.constants", () => ({
	GET_DASHBOARD_RECENT_ORDERS_SELECT: {
		id: true,
		orderNumber: true,
		createdAt: true,
		status: true,
		paymentStatus: true,
		total: true,
		user: { select: { name: true, email: true } },
	},
	DASHBOARD_RECENT_ORDERS_LIMIT: 5,
}))

import { fetchDashboardRecentOrders } from "../get-recent-orders"

// ============================================================================
// HELPERS
// ============================================================================

function makeRawOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: "order-1",
		orderNumber: "SYN-2026-0001",
		createdAt: new Date("2026-02-10T10:00:00Z"),
		status: "PROCESSING",
		paymentStatus: "PAID",
		total: 5000,
		user: { name: "Alice Dupont", email: "alice@example.com" },
		...overrides,
	}
}

function makeTransformedOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: "order-1",
		orderNumber: "SYN-2026-0001",
		createdAt: new Date("2026-02-10T10:00:00Z"),
		status: "PROCESSING",
		paymentStatus: "PAID",
		total: 5000,
		customerName: "Alice Dupont",
		customerEmail: "alice@example.com",
		...overrides,
	}
}

// ============================================================================
// TESTS
// ============================================================================

describe("fetchDashboardRecentOrders", () => {
	beforeEach(() => {
		vi.resetAllMocks()

		mockPrismaOrderFindMany.mockResolvedValue([makeRawOrder()])
		mockTransformRecentOrders.mockReturnValue([makeTransformedOrder()])
	})

	// -------------------------------------------------------------------------
	// Return shape
	// -------------------------------------------------------------------------

	it("should return an object with an orders property", async () => {
		const result = await fetchDashboardRecentOrders()

		expect(result).toHaveProperty("orders")
		expect(Array.isArray(result.orders)).toBe(true)
	})

	it("should return transformed orders from the transformer service", async () => {
		const rawOrders = [makeRawOrder({ id: "order-1" }), makeRawOrder({ id: "order-2" })]
		const transformedOrders = [
			makeTransformedOrder({ id: "order-1" }),
			makeTransformedOrder({ id: "order-2" }),
		]

		mockPrismaOrderFindMany.mockResolvedValue(rawOrders)
		mockTransformRecentOrders.mockReturnValue(transformedOrders)

		const result = await fetchDashboardRecentOrders()

		expect(result.orders).toEqual(transformedOrders)
	})

	it("should return empty orders array when no orders exist", async () => {
		mockPrismaOrderFindMany.mockResolvedValue([])
		mockTransformRecentOrders.mockReturnValue([])

		const result = await fetchDashboardRecentOrders()

		expect(result.orders).toEqual([])
	})

	// -------------------------------------------------------------------------
	// Prisma query filters
	// -------------------------------------------------------------------------

	it("should filter by PaymentStatus.PAID", async () => {
		await fetchDashboardRecentOrders()

		expect(mockPrismaOrderFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					paymentStatus: "PAID",
				}),
			})
		)
	})

	it("should apply notDeleted filter (deletedAt: null)", async () => {
		await fetchDashboardRecentOrders()

		expect(mockPrismaOrderFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					deletedAt: null,
				}),
			})
		)
	})

	it("should limit results to DASHBOARD_RECENT_ORDERS_LIMIT (5)", async () => {
		await fetchDashboardRecentOrders()

		expect(mockPrismaOrderFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				take: 5,
			})
		)
	})

	it("should order results by paidAt descending", async () => {
		await fetchDashboardRecentOrders()

		expect(mockPrismaOrderFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: { paidAt: "desc" },
			})
		)
	})

	it("should use GET_DASHBOARD_RECENT_ORDERS_SELECT to project only needed fields", async () => {
		await fetchDashboardRecentOrders()

		expect(mockPrismaOrderFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: expect.objectContaining({
					id: true,
					orderNumber: true,
					total: true,
					user: expect.objectContaining({
						select: { name: true, email: true },
					}),
				}),
			})
		)
	})

	// -------------------------------------------------------------------------
	// Transformer integration
	// -------------------------------------------------------------------------

	it("should pass the raw DB result to transformRecentOrders", async () => {
		const rawOrders = [makeRawOrder({ id: "order-42" })]
		mockPrismaOrderFindMany.mockResolvedValue(rawOrders)
		mockTransformRecentOrders.mockReturnValue([makeTransformedOrder({ id: "order-42" })])

		await fetchDashboardRecentOrders()

		expect(mockTransformRecentOrders).toHaveBeenCalledWith(rawOrders)
	})

	it("should call transformRecentOrders exactly once", async () => {
		await fetchDashboardRecentOrders()

		expect(mockTransformRecentOrders).toHaveBeenCalledTimes(1)
	})

	it("should pass empty array to transformer when DB returns no rows", async () => {
		mockPrismaOrderFindMany.mockResolvedValue([])
		mockTransformRecentOrders.mockReturnValue([])

		await fetchDashboardRecentOrders()

		expect(mockTransformRecentOrders).toHaveBeenCalledWith([])
	})

	// -------------------------------------------------------------------------
	// Cache
	// -------------------------------------------------------------------------

	it("should call cacheDashboard with the RECENT_ORDERS tag", async () => {
		await fetchDashboardRecentOrders()

		expect(mockCacheDashboard).toHaveBeenCalledWith("dashboard-recent-orders")
	})
})
