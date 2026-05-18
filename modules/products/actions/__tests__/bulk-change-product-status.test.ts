import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockParseFormIds,
	mockGetProductInvalidationTags,
	mockGetCollectionInvalidationTags,
	mockCanTransition,
	mockValidatePublication,
} = vi.hoisted(() => ({
	mockPrisma: {
		product: { findMany: vi.fn(), updateMany: vi.fn() },
		productSku: { updateMany: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn((e: unknown, fallback: string) => ({
		status: "ERROR",
		message: fallback,
	})),
	mockSuccess: vi.fn((message: string, data?: unknown) => ({
		status: "SUCCESS",
		message,
		data,
	})),
	mockError: vi.fn((message: string) => ({ status: "ERROR", message })),
	mockParseFormIds: vi.fn(),
	mockGetProductInvalidationTags: vi.fn(() => ["products-list"]),
	mockGetCollectionInvalidationTags: vi.fn(() => ["collections-list"]),
	mockCanTransition: vi.fn(() => true),
	mockValidatePublication: vi.fn<() => { isValid: boolean; errorMessage: string | null }>(() => ({
		isValid: true,
		errorMessage: null,
	})),
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
	ADMIN_PRODUCT_BULK_STATUS_LIMIT: "admin-product-bulk-status",
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	parseFormIds: mockParseFormIds,
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("../../schemas/product.schemas", () => ({ bulkChangeProductStatusSchema: {} }));
vi.mock("../../services/product-status-validation.service", () => ({
	canTransitionProductStatus: mockCanTransition,
}));
vi.mock("../../services/product-validation.service", () => ({
	validateProductForPublication: mockValidatePublication,
}));
vi.mock("../../utils/cache.utils", () => ({
	getProductInvalidationTags: mockGetProductInvalidationTags,
}));
vi.mock("@/modules/collections/utils/cache.utils", () => ({
	getCollectionInvalidationTags: mockGetCollectionInvalidationTags,
}));

import { bulkChangeProductStatus } from "../bulk-change-product-status";

const PID_A = "pid_a1";
const PID_B = "pid_b2";
const PRODUCT_IDS = [PID_A, PID_B];

function makeFd(targetStatus = "PUBLIC") {
	const fd = new FormData();
	fd.set("productIds", JSON.stringify(PRODUCT_IDS));
	fd.set("targetStatus", targetStatus);
	return fd;
}

function makeProduct(overrides: Partial<{ id: string; slug: string; status: string }> = {}) {
	return {
		id: overrides.id ?? PID_A,
		title: "T",
		slug: overrides.slug ?? "a",
		status: overrides.status ?? "DRAFT",
		collections: [],
		skus: [{ id: "sku-1", isActive: true, inventory: 5, images: [{ id: "img-1" }] }],
	};
}

describe("bulkChangeProductStatus", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockParseFormIds.mockReturnValue({ ids: PRODUCT_IDS });
		mockValidateInput.mockReturnValue({
			data: { productIds: PRODUCT_IDS, targetStatus: "PUBLIC" },
		});
		mockHandleActionError.mockImplementation((_, fb: string) => ({
			status: "ERROR",
			message: fb,
		}));
		mockCanTransition.mockReturnValue(true);
		mockValidatePublication.mockReturnValue({ isValid: true, errorMessage: null });
		mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => unknown) => {
			if (typeof cb === "function") await cb(mockPrisma);
		});
	});

	it("rejects when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({ error: { status: "UNAUTHORIZED", message: "Forbidden" } });
		const r = await bulkChangeProductStatus(undefined, makeFd());
		expect(r).toEqual({ status: "UNAUTHORIZED", message: "Forbidden" });
	});

	it("returns error when no product matches", async () => {
		mockPrisma.product.findMany.mockResolvedValue([]);
		const r = await bulkChangeProductStatus(undefined, makeFd());
		expect(r.status).toBe("ERROR");
	});

	it("returns error when no transition is valid (all already at target)", async () => {
		mockPrisma.product.findMany.mockResolvedValue([
			makeProduct({ status: "PUBLIC" }),
			makeProduct({ id: PID_B, slug: "b", status: "PUBLIC" }),
		]);
		mockCanTransition.mockReturnValue(false);
		const r = await bulkChangeProductStatus(undefined, makeFd());
		expect(r.status).toBe("ERROR");
		expect(r.message).toMatch(/déjà/);
	});

	it("skips invalid-for-publication products when target is PUBLIC", async () => {
		mockPrisma.product.findMany.mockResolvedValue([
			makeProduct(),
			makeProduct({ id: PID_B, slug: "b" }),
		]);
		// first valid, second invalid
		mockValidatePublication
			.mockReturnValueOnce({ isValid: true, errorMessage: null })
			.mockReturnValueOnce({ isValid: false, errorMessage: "Pas de stock" });

		const r = await bulkChangeProductStatus(undefined, makeFd());

		expect(mockPrisma.product.updateMany).toHaveBeenCalledWith({
			where: { id: { in: [PID_A] } },
			data: { status: "PUBLIC" },
		});
		expect(r.status).toBe("SUCCESS");
		expect(r.message).toMatch(/1 bijou exposé/);
		expect(r.message).toMatch(/1 produit en attente/);
	});

	it("deactivates SKUs when target is ARCHIVED", async () => {
		mockValidateInput.mockReturnValue({
			data: { productIds: PRODUCT_IDS, targetStatus: "ARCHIVED" },
		});
		mockPrisma.product.findMany.mockResolvedValue([
			makeProduct({ status: "PUBLIC" }),
			makeProduct({ id: PID_B, slug: "b", status: "PUBLIC" }),
		]);

		await bulkChangeProductStatus(undefined, makeFd("ARCHIVED"));

		expect(mockPrisma.productSku.updateMany).toHaveBeenCalledWith({
			where: { productId: { in: PRODUCT_IDS } },
			data: { isActive: false },
		});
	});

	it("does NOT deactivate SKUs when target is DRAFT", async () => {
		mockValidateInput.mockReturnValue({
			data: { productIds: PRODUCT_IDS, targetStatus: "DRAFT" },
		});
		mockPrisma.product.findMany.mockResolvedValue([
			makeProduct({ status: "PUBLIC" }),
			makeProduct({ id: PID_B, slug: "b", status: "PUBLIC" }),
		]);

		await bulkChangeProductStatus(undefined, makeFd("DRAFT"));

		expect(mockPrisma.productSku.updateMany).not.toHaveBeenCalled();
	});

	it("returns error when all products fail publication validation", async () => {
		mockPrisma.product.findMany.mockResolvedValue([makeProduct()]);
		mockValidateInput.mockReturnValue({
			data: { productIds: [PID_A], targetStatus: "PUBLIC" },
		});
		mockParseFormIds.mockReturnValue({ ids: [PID_A] });
		mockValidatePublication.mockReturnValue({
			isValid: false,
			errorMessage: "Pas de SKU actif",
		});

		const r = await bulkChangeProductStatus(undefined, makeFd());
		expect(r.status).toBe("ERROR");
		expect(r.message).toMatch(/aucun produit n'est prêt/i);
	});
});
