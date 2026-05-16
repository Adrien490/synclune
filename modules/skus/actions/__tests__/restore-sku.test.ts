import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID } from "@/test/factories";

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockHandleActionError,
	mockValidateInput,
	mockGetSkuInvalidationTags,
	mockSuccess,
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
			productSku: {
				findUnique: vi.fn(),
				findFirst: vi.fn(),
				findMany: vi.fn(),
				update: vi.fn(),
			},
			$transaction: vi.fn(),
		},
		mockRequireAdmin: vi.fn(),
		mockEnforceRateLimit: vi.fn(),
		mockUpdateTag: vi.fn(),
		mockHandleActionError: vi.fn(),
		mockValidateInput: vi.fn(),
		mockGetSkuInvalidationTags: vi.fn(),
		mockSuccess: vi.fn(),
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
	ADMIN_SKU_RESTORE_LIMIT: "restore",
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	BusinessError: MockBusinessError,
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
}));
vi.mock("../../schemas/sku-media.schemas", () => ({ restoreSkuSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getSkuInvalidationTags: mockGetSkuInvalidationTags,
}));

import { restoreSku } from "../restore-sku";

const buildForm = () => createMockFormData({ skuId: VALID_CUID });

function createDeletedSku(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_CUID,
		sku: "BRC-001",
		productId: "prod-1",
		colors: [{ colorId: "col-1" }],
		size: "M",
		deletedAt: new Date("2026-04-01"),
		product: { slug: "bracelet", deletedAt: null },
		...overrides,
	};
}

describe("restoreSku", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockGetSkuInvalidationTags.mockReturnValue(["skus-list"]);
		mockValidateInput.mockReturnValue({ data: { skuId: VALID_CUID } });
		mockSuccess.mockImplementation((message: string, data: unknown) => ({
			status: ActionStatus.SUCCESS,
			message,
			data,
		}));

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.productSku.findUnique.mockResolvedValue(createDeletedSku());
		mockPrisma.productSku.findFirst.mockResolvedValue(null);
		// Variant uniqueness check (M2M migration) — empty = no active conflict
		mockPrisma.productSku.findMany.mockResolvedValue([]);
		mockPrisma.productSku.update.mockResolvedValue({
			id: VALID_CUID,
			sku: "BRC-001",
			productId: "prod-1",
			product: { slug: "bracelet" },
		});

		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("returns auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await restoreSku(undefined, buildForm());
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("returns rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await restoreSku(undefined, buildForm());
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("rejects when SKU does not exist", async () => {
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
				fn({
					...mockPrisma,
					productSku: {
						...mockPrisma.productSku,
						findUnique: vi.fn().mockResolvedValue(null),
					},
				}),
		);
		await restoreSku(undefined, buildForm());
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("rejects when SKU is not soft-deleted", async () => {
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
				fn({
					...mockPrisma,
					productSku: {
						...mockPrisma.productSku,
						findUnique: vi.fn().mockResolvedValue(createDeletedSku({ deletedAt: null })),
					},
				}),
		);
		await restoreSku(undefined, buildForm());
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("rejects when parent product is also soft-deleted", async () => {
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
				fn({
					...mockPrisma,
					productSku: {
						...mockPrisma.productSku,
						findUnique: vi.fn().mockResolvedValue(
							createDeletedSku({
								product: { slug: "bracelet", deletedAt: new Date() },
							}),
						),
					},
				}),
		);
		await restoreSku(undefined, buildForm());
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("rejects when an active SKU occupies the same combo variant", async () => {
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
				fn({
					...mockPrisma,
					productSku: {
						...mockPrisma.productSku,
						findMany: vi
							.fn()
							.mockResolvedValue([{ sku: "BRC-002", colors: [{ colorId: "col-1" }] }]),
					},
				}),
		);
		await restoreSku(undefined, buildForm());
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("updates deletedAt to null on success", async () => {
		await restoreSku(undefined, buildForm());
		expect(mockPrisma.productSku.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: VALID_CUID },
				data: { deletedAt: null },
			}),
		);
	});

	it("wraps operation in a transaction", async () => {
		await restoreSku(undefined, buildForm());
		expect(mockPrisma.$transaction).toHaveBeenCalled();
	});

	it("invalidates cache tags after success", async () => {
		await restoreSku(undefined, buildForm());
		expect(mockGetSkuInvalidationTags).toHaveBeenCalled();
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("returns success status", async () => {
		const result = await restoreSku(undefined, buildForm());
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await restoreSku(undefined, buildForm());
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
