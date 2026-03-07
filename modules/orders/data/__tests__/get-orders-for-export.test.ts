import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockRequireAdmin } = vi.hoisted(() => ({
	mockPrisma: {
		order: { findMany: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
}));

// Must be imported after mocks
import { getOrdersForExport } from "../get-orders-for-export";

// ============================================================================
// Factories
// ============================================================================

function makeExportOrder(overrides: Record<string, unknown> = {}) {
	return {
		orderNumber: "ORD-001",
		invoiceNumber: "INV-001",
		createdAt: new Date("2024-01-01T00:00:00Z"),
		paidAt: new Date("2024-01-01T01:00:00Z"),
		customerName: "Alice Dupont",
		customerEmail: "alice@example.com",
		subtotal: 5000,
		discountAmount: 0,
		shippingCost: 500,
		total: 5500,
		paymentMethod: "card",
		paymentStatus: "PAID",
		status: "DELIVERED",
		...overrides,
	};
}

// ============================================================================
// Tests: getOrdersForExport
// ============================================================================

describe("getOrdersForExport", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRequireAdmin.mockResolvedValue({ admin: true });
		mockPrisma.order.findMany.mockResolvedValue([makeExportOrder()]);
	});

	it("returns empty array when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: "FORBIDDEN", message: "Non autorise" },
		});

		const result = await getOrdersForExport({});

		expect(result).toEqual([]);
		expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
	});

	it("returns orders with correct select fields", async () => {
		await getOrdersForExport({});

		expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: {
					orderNumber: true,
					invoiceNumber: true,
					createdAt: true,
					paidAt: true,
					customerName: true,
					customerEmail: true,
					subtotal: true,
					discountAmount: true,
					shippingCost: true,
					total: true,
					paymentMethod: true,
					paymentStatus: true,
					status: true,
				},
			}),
		);
	});

	it("passes where clause to findMany", async () => {
		const where = { status: "DELIVERED" as const, deletedAt: null };

		await getOrdersForExport(where);

		expect(mockPrisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where }));
	});

	it("orders results by paidAt ascending", async () => {
		await getOrdersForExport({});

		expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: { paidAt: "asc" },
			}),
		);
	});

	it("returns the orders array from findMany", async () => {
		const orders = [makeExportOrder(), makeExportOrder({ orderNumber: "ORD-002" })];
		mockPrisma.order.findMany.mockResolvedValue(orders);

		const result = await getOrdersForExport({});

		expect(result).toEqual(orders);
	});

	it("returns empty array when no orders match the where clause", async () => {
		mockPrisma.order.findMany.mockResolvedValue([]);

		const result = await getOrdersForExport({ status: "CANCELLED" });

		expect(result).toEqual([]);
	});

	it("passes complex where clauses through unchanged", async () => {
		const where = {
			paidAt: { gte: new Date("2024-01-01"), lte: new Date("2024-12-31") },
			paymentStatus: "PAID" as const,
		};

		await getOrdersForExport(where);

		expect(mockPrisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where }));
	});
});
