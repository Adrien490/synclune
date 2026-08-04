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

import { notDeleted } from "../prisma";

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
