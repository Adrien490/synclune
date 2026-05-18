import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockBuildSearchConditions,
	mockBuildExactSearchConditions,
	mockBuildProductWhereClause,
} = vi.hoisted(() => ({
	mockPrisma: {
		product: { findMany: vi.fn(), count: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockHandleActionError: vi.fn((_e: unknown, fallback: string) => ({
		status: "ERROR",
		message: fallback,
	})),
	mockSuccess: vi.fn((message: string, data?: unknown) => ({
		status: "SUCCESS",
		message,
		data,
	})),
	mockError: vi.fn((message: string) => ({ status: "ERROR", message })),
	mockBuildSearchConditions: vi.fn(),
	mockBuildExactSearchConditions: vi.fn(),
	mockBuildProductWhereClause: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
	requireAdminWithUser: mockRequireAdmin,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_PRODUCT_REFRESH_LIMIT: "admin-product-refresh",
}));
vi.mock("@/shared/lib/actions", () => ({
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("../../services/product-query-builder", () => ({
	buildSearchConditions: mockBuildSearchConditions,
	buildExactSearchConditions: mockBuildExactSearchConditions,
	buildProductWhereClause: mockBuildProductWhereClause,
}));
vi.mock("../../constants/product.constants", () => ({
	BULK_PRODUCT_ACTION_LIMIT: 100,
}));

import { getFilteredProductIds } from "../get-filtered-product-ids";

const DEFAULT_PARAMS = { search: undefined, sortBy: "created-descending" as const, filters: {} };

describe("getFilteredProductIds", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ admin: true });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockBuildProductWhereClause.mockReturnValue({ deletedAt: null });
		mockPrisma.product.findMany.mockResolvedValue([]);
		mockPrisma.product.count.mockResolvedValue(0);
	});

	it("rejects when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: "FORBIDDEN", message: "Accès refusé" },
		});
		const r = await getFilteredProductIds(DEFAULT_PARAMS);
		expect(r).toEqual({ status: "FORBIDDEN", message: "Accès refusé" });
	});

	it("rejects when rate-limited", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: "RATE_LIMITED", message: "Trop de requêtes" },
		});
		const r = await getFilteredProductIds(DEFAULT_PARAMS);
		expect(r.status).toBe("RATE_LIMITED");
	});

	it("returns ERROR when no product matches", async () => {
		mockPrisma.product.findMany.mockResolvedValue([]);
		mockPrisma.product.count.mockResolvedValue(0);
		const r = await getFilteredProductIds(DEFAULT_PARAMS);
		expect(r.status).toBe("ERROR");
		expect(r.message).toMatch(/aucun produit/i);
	});

	it("returns SUCCESS with ids + totalCount + cappedAt", async () => {
		mockPrisma.product.findMany.mockResolvedValue([
			{ id: "pid_a" },
			{ id: "pid_b" },
			{ id: "pid_c" },
		]);
		mockPrisma.product.count.mockResolvedValue(42);

		const r = await getFilteredProductIds(DEFAULT_PARAMS);

		expect(r.status).toBe("SUCCESS");
		expect(r.data).toEqual({
			ids: ["pid_a", "pid_b", "pid_c"],
			totalCount: 42,
			cappedAt: 100,
		});
	});

	it("loads only { id: true } with take 100 — minimal select", async () => {
		mockPrisma.product.findMany.mockResolvedValue([{ id: "pid_a" }]);
		mockPrisma.product.count.mockResolvedValue(1);

		await getFilteredProductIds(DEFAULT_PARAMS);

		expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
			where: { deletedAt: null },
			select: { id: true },
			take: 100,
		});
		expect(mockPrisma.product.count).toHaveBeenCalledWith({ where: { deletedAt: null } });
	});

	it("uses exact search when term < 3 chars", async () => {
		mockBuildExactSearchConditions.mockReturnValue({ fuzzyIds: null, exactConditions: [] });
		mockPrisma.product.findMany.mockResolvedValue([{ id: "pid_a" }]);
		mockPrisma.product.count.mockResolvedValue(1);

		await getFilteredProductIds({ ...DEFAULT_PARAMS, search: "ab" });

		expect(mockBuildExactSearchConditions).toHaveBeenCalledWith("ab");
		expect(mockBuildSearchConditions).not.toHaveBeenCalled();
	});

	it("uses fuzzy search when term >= 3 chars", async () => {
		mockBuildSearchConditions.mockResolvedValue({ fuzzyIds: null, exactConditions: [] });
		mockPrisma.product.findMany.mockResolvedValue([{ id: "pid_a" }]);
		mockPrisma.product.count.mockResolvedValue(1);

		await getFilteredProductIds({ ...DEFAULT_PARAMS, search: "ring" });

		expect(mockBuildSearchConditions).toHaveBeenCalledWith("ring");
		expect(mockBuildExactSearchConditions).not.toHaveBeenCalled();
	});

	it("catches unexpected errors via handleActionError", async () => {
		mockPrisma.product.findMany.mockRejectedValue(new Error("DB connection failed"));
		const r = await getFilteredProductIds(DEFAULT_PARAMS);
		expect(r.status).toBe("ERROR");
		expect(r.message).toMatch(/impossible de charger/i);
		expect(mockHandleActionError).toHaveBeenCalled();
	});
});
