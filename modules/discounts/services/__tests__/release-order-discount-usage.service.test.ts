import { describe, it, expect, vi, beforeEach } from "vitest";
import { releaseOrderDiscountUsageTx } from "../release-order-discount-usage.service";

const mockTx = {
	discountUsage: {
		findMany: vi.fn(),
		deleteMany: vi.fn(),
	},
	discount: {
		updateMany: vi.fn(),
	},
};

describe("releaseOrderDiscountUsageTx", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns [] and skips writes when no DiscountUsage attached to order", async () => {
		mockTx.discountUsage.findMany.mockResolvedValue([]);

		const result = await releaseOrderDiscountUsageTx(mockTx as any, "order-empty");

		expect(result).toEqual([]);
		expect(mockTx.discount.updateMany).not.toHaveBeenCalled();
		expect(mockTx.discountUsage.deleteMany).not.toHaveBeenCalled();
	});

	it("decrements usageCount with usageCount > 0 guard and deletes DiscountUsage rows", async () => {
		mockTx.discountUsage.findMany.mockResolvedValue([
			{ id: "use_1", discountId: "disc_a" },
			{ id: "use_2", discountId: "disc_b" },
		]);
		mockTx.discount.updateMany.mockResolvedValue({ count: 1 });
		mockTx.discountUsage.deleteMany.mockResolvedValue({ count: 2 });

		const result = await releaseOrderDiscountUsageTx(mockTx as any, "order-1");

		expect(result).toEqual(["disc_a", "disc_b"]);
		expect(mockTx.discount.updateMany).toHaveBeenCalledTimes(2);
		expect(mockTx.discount.updateMany).toHaveBeenNthCalledWith(1, {
			where: { id: "disc_a", usageCount: { gt: 0 } },
			data: { usageCount: { decrement: 1 } },
		});
		expect(mockTx.discount.updateMany).toHaveBeenNthCalledWith(2, {
			where: { id: "disc_b", usageCount: { gt: 0 } },
			data: { usageCount: { decrement: 1 } },
		});
		expect(mockTx.discountUsage.deleteMany).toHaveBeenCalledWith({ where: { orderId: "order-1" } });
	});

	it("returns the same discountId multiple times if order has duplicate usages (audit trail)", async () => {
		// Defensive: in practice, a single order should have one DiscountUsage per discountId,
		// but the helper must not coalesce silently — it must reflect what's in DB.
		mockTx.discountUsage.findMany.mockResolvedValue([
			{ id: "use_1", discountId: "disc_a" },
			{ id: "use_2", discountId: "disc_a" },
		]);

		const result = await releaseOrderDiscountUsageTx(mockTx as any, "order-dup");

		expect(result).toEqual(["disc_a", "disc_a"]);
		expect(mockTx.discount.updateMany).toHaveBeenCalledTimes(2);
	});
});
