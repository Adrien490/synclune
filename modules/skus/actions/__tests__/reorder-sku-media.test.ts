import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID, VALID_CUID_2 } from "@/test/factories";

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
			productSku: { findUnique: vi.fn() },
			skuMedia: { update: vi.fn() },
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
	ADMIN_SKU_REORDER_MEDIA_LIMIT: "reorder-media",
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
vi.mock("../../schemas/sku-media.schemas", () => ({ reorderSkuMediaSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getSkuInvalidationTags: mockGetSkuInvalidationTags,
}));

import { reorderSkuMedia } from "../reorder-sku-media";

const buildForm = (mediaIds: string[] = [VALID_CUID, VALID_CUID_2]) =>
	createMockFormData({ skuId: VALID_CUID, mediaIds: JSON.stringify(mediaIds) });

describe("reorderSkuMedia", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockGetSkuInvalidationTags.mockReturnValue(["skus-list"]);
		mockValidateInput.mockReturnValue({
			data: { skuId: VALID_CUID, mediaIds: [VALID_CUID, VALID_CUID_2] },
		});
		mockSuccess.mockImplementation((message: string, data: unknown) => ({
			status: ActionStatus.SUCCESS,
			message,
			data,
		}));

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.productSku.findUnique.mockResolvedValue({
			id: VALID_CUID,
			sku: "BRC-001",
			productId: "prod-1",
			product: { slug: "bracelet" },
			images: [{ id: VALID_CUID }, { id: VALID_CUID_2 }],
		});
		mockPrisma.skuMedia.update.mockResolvedValue({});

		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("returns auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await reorderSkuMedia(undefined, buildForm());
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("returns rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await reorderSkuMedia(undefined, buildForm());
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns JSON invalide when mediaIds is malformed", async () => {
		const form = createMockFormData({ skuId: VALID_CUID, mediaIds: "{invalid" });
		const result = await reorderSkuMedia(undefined, form);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("returns validation error when schema rejects", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" },
		});
		const result = await reorderSkuMedia(undefined, buildForm());
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("throws BusinessError when SKU does not exist", async () => {
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
				fn({
					...mockPrisma,
					productSku: { findUnique: vi.fn().mockResolvedValue(null) },
				}),
		);
		await reorderSkuMedia(undefined, buildForm());
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("rejects when mediaIds count does not match SKU media count", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue({
			id: VALID_CUID,
			sku: "BRC-001",
			productId: "prod-1",
			product: { slug: "bracelet" },
			images: [{ id: VALID_CUID }],
		});
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		await reorderSkuMedia(undefined, buildForm());
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("rejects when a mediaId does not belong to the SKU", async () => {
		mockValidateInput.mockReturnValue({
			data: { skuId: VALID_CUID, mediaIds: ["foreign-id", VALID_CUID_2] },
		});
		await reorderSkuMedia(undefined, buildForm(["foreign-id", VALID_CUID_2]));
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("updates position for each media in order", async () => {
		await reorderSkuMedia(undefined, buildForm());
		expect(mockPrisma.skuMedia.update).toHaveBeenCalledWith({
			where: { id: VALID_CUID },
			data: { position: 0 },
		});
		expect(mockPrisma.skuMedia.update).toHaveBeenCalledWith({
			where: { id: VALID_CUID_2 },
			data: { position: 1 },
		});
	});

	it("wraps operations in a transaction", async () => {
		await reorderSkuMedia(undefined, buildForm());
		expect(mockPrisma.$transaction).toHaveBeenCalled();
	});

	it("invalidates cache tags after success", async () => {
		await reorderSkuMedia(undefined, buildForm());
		expect(mockGetSkuInvalidationTags).toHaveBeenCalled();
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("returns success with skuId + mediaCount", async () => {
		const result = await reorderSkuMedia(undefined, buildForm());
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ skuId: VALID_CUID, mediaCount: 2 }),
		);
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await reorderSkuMedia(undefined, buildForm());
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
