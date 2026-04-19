import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrismaUpdate, mockPrismaQueryRaw } = vi.hoisted(() => ({
	mockPrismaUpdate: vi.fn().mockResolvedValue({}),
	mockPrismaQueryRaw: vi.fn().mockResolvedValue([{ extname: "pg_trgm" }]),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/app/generated/prisma/client", () => {
	function MockPrismaClient(this: Record<string, unknown>) {
		this.order = { update: mockPrismaUpdate };
		this.user = { update: mockPrismaUpdate };
		this.refund = { update: mockPrismaUpdate };
		this.orderNote = { update: mockPrismaUpdate };
		this.newsletterSubscriber = { update: mockPrismaUpdate };
		this.productReview = { update: mockPrismaUpdate };
		this.reviewResponse = { update: mockPrismaUpdate };
		this.product = { update: mockPrismaUpdate };
		this.productSku = { update: mockPrismaUpdate };
		this.discount = { update: mockPrismaUpdate };
		this.$queryRaw = mockPrismaQueryRaw;
	}
	return {
		PrismaClient: MockPrismaClient,
		AccountStatus: {
			ACTIVE: "ACTIVE",
			INACTIVE: "INACTIVE",
		},
	};
});

vi.mock("@prisma/adapter-neon", () => {
	function MockPrismaNeon() {
		return {};
	}
	return { PrismaNeon: MockPrismaNeon };
});

vi.mock("@prisma/sqlcommenter-trace-context", () => ({
	traceContext: vi.fn().mockReturnValue({}),
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
}));

// Ensure DATABASE_URL is present so the module-level guard does not throw
process.env.DATABASE_URL = "postgresql://localhost:5432/test";

import { notDeleted, softDelete } from "../prisma";

// ============================================================================
// Tests: notDeleted
// ============================================================================

describe("notDeleted", () => {
	it("equals { deletedAt: null }", () => {
		expect(notDeleted).toEqual({ deletedAt: null });
	});

	it("has deletedAt set to null", () => {
		expect(notDeleted.deletedAt).toBeNull();
	});

	it("is a const object with only the deletedAt key", () => {
		expect(Object.keys(notDeleted)).toEqual(["deletedAt"]);
	});
});

// ============================================================================
// Tests: softDelete helpers
// ============================================================================

describe("softDelete", () => {
	beforeEach(() => {
		mockPrismaUpdate.mockClear();
		mockPrismaUpdate.mockResolvedValue({});
	});

	describe("softDelete.order", () => {
		it("calls prisma.order.update with the correct id", async () => {
			await softDelete.order("order-1");

			expect(mockPrismaUpdate).toHaveBeenCalledWith({
				where: { id: "order-1" },
				data: expect.objectContaining({ deletedAt: expect.any(Date) }),
			});
		});

		it("sets deletedAt to a recent Date", async () => {
			const before = new Date();
			await softDelete.order("order-1");
			const after = new Date();

			const call = mockPrismaUpdate.mock.calls[0]![0];
			expect(call.data.deletedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(call.data.deletedAt.getTime()).toBeLessThanOrEqual(after.getTime());
		});
	});

	describe("softDelete.user", () => {
		it("calls prisma.user.update with the correct id", async () => {
			await softDelete.user("user-1");

			expect(mockPrismaUpdate).toHaveBeenCalledWith({
				where: { id: "user-1" },
				data: expect.objectContaining({ deletedAt: expect.any(Date) }),
			});
		});

		it("sets accountStatus to INACTIVE", async () => {
			await softDelete.user("user-1");

			const call = mockPrismaUpdate.mock.calls[0]![0];
			expect(call.data.accountStatus).toBe("INACTIVE");
		});

		it("sets both deletedAt and accountStatus in a single update", async () => {
			await softDelete.user("user-1");

			expect(mockPrismaUpdate).toHaveBeenCalledOnce();
			const call = mockPrismaUpdate.mock.calls[0]![0];
			expect(call.data).toMatchObject({
				deletedAt: expect.any(Date),
				accountStatus: "INACTIVE",
			});
		});
	});

	describe("softDelete.refund", () => {
		it("calls prisma.refund.update with the correct id and deletedAt", async () => {
			await softDelete.refund("refund-1");

			expect(mockPrismaUpdate).toHaveBeenCalledWith({
				where: { id: "refund-1" },
				data: expect.objectContaining({ deletedAt: expect.any(Date) }),
			});
		});

		it("does not set accountStatus", async () => {
			await softDelete.refund("refund-1");

			const call = mockPrismaUpdate.mock.calls[0]![0];
			expect(call.data.accountStatus).toBeUndefined();
		});
	});

	describe("softDelete.orderNote", () => {
		it("calls prisma.orderNote.update with the correct id and deletedAt", async () => {
			await softDelete.orderNote("note-1");

			expect(mockPrismaUpdate).toHaveBeenCalledWith({
				where: { id: "note-1" },
				data: expect.objectContaining({ deletedAt: expect.any(Date) }),
			});
		});
	});

	describe("softDelete.newsletterSubscriber", () => {
		it("calls prisma.newsletterSubscriber.update with the correct id and deletedAt", async () => {
			await softDelete.newsletterSubscriber("sub-1");

			expect(mockPrismaUpdate).toHaveBeenCalledWith({
				where: { id: "sub-1" },
				data: expect.objectContaining({ deletedAt: expect.any(Date) }),
			});
		});
	});

	describe("softDelete.productReview", () => {
		it("calls prisma.productReview.update with the correct id and deletedAt", async () => {
			await softDelete.productReview("review-1");

			expect(mockPrismaUpdate).toHaveBeenCalledWith({
				where: { id: "review-1" },
				data: expect.objectContaining({ deletedAt: expect.any(Date) }),
			});
		});
	});

	describe("softDelete.reviewResponse", () => {
		it("calls prisma.reviewResponse.update with the correct id and deletedAt", async () => {
			await softDelete.reviewResponse("response-1");

			expect(mockPrismaUpdate).toHaveBeenCalledWith({
				where: { id: "response-1" },
				data: expect.objectContaining({ deletedAt: expect.any(Date) }),
			});
		});
	});

	describe("softDelete.product", () => {
		it("calls prisma.product.update with the correct id and deletedAt", async () => {
			await softDelete.product("product-1");

			expect(mockPrismaUpdate).toHaveBeenCalledWith({
				where: { id: "product-1" },
				data: expect.objectContaining({ deletedAt: expect.any(Date) }),
			});
		});
	});

	describe("softDelete.productSku", () => {
		it("calls prisma.productSku.update with the correct id and deletedAt", async () => {
			await softDelete.productSku("sku-1");

			expect(mockPrismaUpdate).toHaveBeenCalledWith({
				where: { id: "sku-1" },
				data: expect.objectContaining({ deletedAt: expect.any(Date) }),
			});
		});
	});

	describe("softDelete.discount", () => {
		it("calls prisma.discount.update with the correct id and deletedAt", async () => {
			await softDelete.discount("discount-1");

			expect(mockPrismaUpdate).toHaveBeenCalledWith({
				where: { id: "discount-1" },
				data: expect.objectContaining({ deletedAt: expect.any(Date) }),
			});
		});
	});

	describe("shared behaviour across all helpers", () => {
		const helpers: Array<[keyof typeof softDelete, string]> = [
			["order", "order-id"],
			["refund", "refund-id"],
			["orderNote", "note-id"],
			["newsletterSubscriber", "sub-id"],
			["productReview", "review-id"],
			["reviewResponse", "response-id"],
			["product", "product-id"],
			["productSku", "sku-id"],
			["discount", "discount-id"],
		];

		it.each(helpers)("softDelete.%s passes the id as where.id", async (method, id) => {
			await softDelete[method](id);

			const call = mockPrismaUpdate.mock.calls[0]![0];
			expect(call.where).toEqual({ id });
		});

		it.each(helpers)("softDelete.%s sets deletedAt to a Date instance", async (method, id) => {
			await softDelete[method](id);

			const call = mockPrismaUpdate.mock.calls[0]![0];
			expect(call.data.deletedAt).toBeInstanceOf(Date);
		});

		it.each(helpers)("softDelete.%s issues exactly one update call", async (method, id) => {
			await softDelete[method](id);

			expect(mockPrismaUpdate).toHaveBeenCalledOnce();
		});
	});
});
