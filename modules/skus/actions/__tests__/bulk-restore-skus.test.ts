import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID, VALID_CUID_2 } from "@/test/factories";

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockHandleActionError,
	mockValidateInput,
	mockCollectBulkInvalidationTags,
	mockInvalidateTags,
	MockBusinessError,
} = vi.hoisted(() => {
	class MockBusinessError extends Error {
		constructor(message: string) {
			super(message);
			this.name = "BusinessError";
		}
	}
	return {
		mockPrisma: {
			productSku: { findMany: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
			$transaction: vi.fn(),
		},
		mockRequireAdmin: vi.fn(),
		mockEnforceRateLimit: vi.fn(),
		mockHandleActionError: vi.fn(),
		mockValidateInput: vi.fn(),
		mockCollectBulkInvalidationTags: vi.fn(),
		mockInvalidateTags: vi.fn(),
		MockBusinessError,
	};
});

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdminWithUser: mockRequireAdmin }));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: vi.fn() }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_SKU_BULK_OPERATIONS_LIMIT: "bulk-ops",
}));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	BusinessError: MockBusinessError,
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
}));
vi.mock("../../schemas/sku-media.schemas", () => ({ bulkRestoreSkusSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	collectBulkInvalidationTags: mockCollectBulkInvalidationTags,
	invalidateTags: mockInvalidateTags,
}));
vi.mock("../../constants/sku.constants", () => ({
	BULK_SKU_LIMITS: { DEFAULT: 100, STOCK_ADJUSTMENT: 50, PRICE_UPDATE: 25 },
}));

import { bulkRestoreSkus } from "../bulk-restore-skus";

const buildForm = (ids: string[] = [VALID_CUID, VALID_CUID_2]) =>
	createMockFormData({ ids: JSON.stringify(ids) });

function createDeletedSku(id: string, overrides: Record<string, unknown> = {}) {
	return {
		id,
		sku: `SKU-${id}`,
		productId: "prod-1",
		colorId: "col-1",
		materialId: "mat-1",
		size: "M",
		deletedAt: new Date("2026-04-01"),
		product: { slug: "bracelet", deletedAt: null },
		...overrides,
	};
}

describe("bulkRestoreSkus", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { ids: [VALID_CUID, VALID_CUID_2] } });
		mockCollectBulkInvalidationTags.mockReturnValue(new Set(["skus-list"]));

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.productSku.findMany.mockResolvedValue([
			createDeletedSku(VALID_CUID),
			createDeletedSku(VALID_CUID_2, { colorId: "col-2" }),
		]);
		mockPrisma.productSku.findFirst.mockResolvedValue(null);
		mockPrisma.productSku.updateMany.mockResolvedValue({ count: 2 });

		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("returns auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await bulkRestoreSkus(undefined, buildForm());
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("returns rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await bulkRestoreSkus(undefined, buildForm());
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns error for empty list", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: [] } });
		const result = await bulkRestoreSkus(undefined, buildForm([]));
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns error when exceeding max batch size", async () => {
		const many = Array.from({ length: 101 }, (_, i) => `id-${i}`);
		mockValidateInput.mockReturnValue({ data: { ids: many } });
		const result = await bulkRestoreSkus(undefined, buildForm(many));
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("rejects when some IDs are not found", async () => {
		mockPrisma.productSku.findMany.mockResolvedValue([createDeletedSku(VALID_CUID)]);
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		await bulkRestoreSkus(undefined, buildForm());
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("rejects when a selected SKU is not soft-deleted", async () => {
		mockPrisma.productSku.findMany.mockResolvedValue([
			createDeletedSku(VALID_CUID, { deletedAt: null }),
			createDeletedSku(VALID_CUID_2),
		]);
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		await bulkRestoreSkus(undefined, buildForm());
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("rejects when a parent product is soft-deleted", async () => {
		mockPrisma.productSku.findMany.mockResolvedValue([
			createDeletedSku(VALID_CUID, {
				product: { slug: "bracelet", deletedAt: new Date() },
			}),
			createDeletedSku(VALID_CUID_2),
		]);
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		await bulkRestoreSkus(undefined, buildForm());
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("rejects when a combo variant conflict is detected", async () => {
		mockPrisma.productSku.findFirst.mockResolvedValue({ sku: "BRC-CONFLICT" });
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		await bulkRestoreSkus(undefined, buildForm());
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("updates deletedAt to null for all SKUs", async () => {
		await bulkRestoreSkus(undefined, buildForm());
		expect(mockPrisma.productSku.updateMany).toHaveBeenCalledWith({
			where: { id: { in: [VALID_CUID, VALID_CUID_2] } },
			data: { deletedAt: null },
		});
	});

	it("invalidates cache tags after success", async () => {
		await bulkRestoreSkus(undefined, buildForm());
		expect(mockCollectBulkInvalidationTags).toHaveBeenCalled();
		expect(mockInvalidateTags).toHaveBeenCalled();
	});

	it("returns success status", async () => {
		const result = await bulkRestoreSkus(undefined, buildForm());
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await bulkRestoreSkus(undefined, buildForm());
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
