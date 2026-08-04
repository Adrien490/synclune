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

	// Les cinq autres helpers (`order`, `user`, `orderNote`, `product`,
	// `productSku`) sont partis le 2026-08-05 : aucun appelant. Chaque module pose
	// son `deletedAt` dans sa propre transaction, avec les écritures qui vont avec
	// (purge des liaisons, audit, promotion d'un défaut) — le helper mono-ligne ne
	// faisait que suggérer un raccourci qui les aurait sautées.
	describe("softDelete.discount", () => {
		it("calls prisma.discount.update with the correct id and deletedAt", async () => {
			await softDelete.discount("discount-1");

			expect(mockPrismaUpdate).toHaveBeenCalledWith({
				where: { id: "discount-1" },
				data: expect.objectContaining({ deletedAt: expect.any(Date) }),
			});
		});

		it("sets deletedAt to a recent Date", async () => {
			const before = new Date();
			await softDelete.discount("discount-1");
			const after = new Date();

			const call = mockPrismaUpdate.mock.calls[0]![0];
			expect(call.data.deletedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(call.data.deletedAt.getTime()).toBeLessThanOrEqual(after.getTime());
		});

		it("issues exactly one update call", async () => {
			await softDelete.discount("discount-1");

			expect(mockPrismaUpdate).toHaveBeenCalledOnce();
		});
	});
});
