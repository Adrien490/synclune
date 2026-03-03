import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mocks
// ============================================================================

const { mockPrisma, mockUpdateTag, mockGenerateInvoiceNumber } = vi.hoisted(() => ({
	mockPrisma: {
		order: {
			update: vi.fn(),
		},
	},
	mockUpdateTag: vi.fn(),
	mockGenerateInvoiceNumber: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("../invoice-number.service", () => ({
	generateInvoiceNumber: mockGenerateInvoiceNumber,
}));

vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: vi.fn((_userId?: string, _orderId?: string) => [
		"orders-list",
		"order-detail",
	]),
}));

import { persistInvoiceNumber } from "../persist-invoice-number.service";

// ============================================================================
// Setup
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
});

// ============================================================================
// persistInvoiceNumber
// ============================================================================

describe("persistInvoiceNumber", () => {
	it("generates and persists invoice number successfully", async () => {
		mockGenerateInvoiceNumber.mockResolvedValue("F-2026-001");
		mockPrisma.order.update.mockResolvedValue({
			invoiceNumber: "F-2026-001",
			invoiceGeneratedAt: new Date("2026-03-03T10:00:00Z"),
		});

		const result = await persistInvoiceNumber("order-1", "user-1");

		expect(result).toEqual({
			invoiceNumber: "F-2026-001",
			invoiceGeneratedAt: new Date("2026-03-03T10:00:00Z"),
		});
		expect(mockPrisma.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: expect.objectContaining({
				invoiceNumber: "F-2026-001",
				invoiceStatus: "GENERATED",
			}),
			select: { invoiceNumber: true, invoiceGeneratedAt: true },
		});
	});

	it("invalidates cache tags after success", async () => {
		mockGenerateInvoiceNumber.mockResolvedValue("F-2026-002");
		mockPrisma.order.update.mockResolvedValue({
			invoiceNumber: "F-2026-002",
			invoiceGeneratedAt: new Date(),
		});

		await persistInvoiceNumber("order-1", "user-1");

		// Should invalidate all returned tags
		expect(mockUpdateTag).toHaveBeenCalledWith("orders-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("order-detail");
	});

	it("returns null when generateInvoiceNumber fails", async () => {
		mockGenerateInvoiceNumber.mockRejectedValue(new Error("unique constraint"));

		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const result = await persistInvoiceNumber("order-1", "user-1");

		expect(result).toBeNull();
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("Failed to persist invoice number"),
			expect.any(Error),
		);
	});

	it("returns null when prisma update fails", async () => {
		mockGenerateInvoiceNumber.mockResolvedValue("F-2026-003");
		mockPrisma.order.update.mockRejectedValue(new Error("DB error"));

		vi.spyOn(console, "error").mockImplementation(() => {});
		const result = await persistInvoiceNumber("order-1", "user-1");

		expect(result).toBeNull();
	});

	it("handles null userId for guest orders", async () => {
		mockGenerateInvoiceNumber.mockResolvedValue("F-2026-004");
		mockPrisma.order.update.mockResolvedValue({
			invoiceNumber: "F-2026-004",
			invoiceGeneratedAt: new Date(),
		});

		const result = await persistInvoiceNumber("order-1", null);

		expect(result).toBeDefined();
		expect(result!.invoiceNumber).toBe("F-2026-004");
	});
});
