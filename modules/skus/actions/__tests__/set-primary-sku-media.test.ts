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
			skuMedia: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
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
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
	requireAdminWithUser: mockRequireAdmin,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_SKU_SET_PRIMARY_MEDIA_LIMIT: "set-primary",
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
vi.mock("../../schemas/sku-media.schemas", () => ({ setPrimarySkuMediaSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getSkuInvalidationTags: mockGetSkuInvalidationTags,
}));

import { setPrimarySkuMedia } from "../set-primary-sku-media";

const buildForm = () => createMockFormData({ skuId: VALID_CUID, mediaId: VALID_CUID_2 });

function createMockMedia(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_CUID_2,
		skuId: VALID_CUID,
		mediaType: "IMAGE",
		isPrimary: false,
		sku: {
			id: VALID_CUID,
			sku: "BRC-001",
			productId: "prod-1",
			product: { slug: "bracelet" },
		},
		...overrides,
	};
}

describe("setPrimarySkuMedia", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockGetSkuInvalidationTags.mockReturnValue(["skus-list"]);
		mockValidateInput.mockReturnValue({
			data: { skuId: VALID_CUID, mediaId: VALID_CUID_2 },
		});
		mockSuccess.mockImplementation((message: string, data: unknown) => ({
			status: ActionStatus.SUCCESS,
			message,
			data,
		}));

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.skuMedia.findUnique.mockResolvedValue(createMockMedia());
		mockPrisma.skuMedia.updateMany.mockResolvedValue({ count: 1 });
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
		const result = await setPrimarySkuMedia(undefined, buildForm());
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("returns rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await setPrimarySkuMedia(undefined, buildForm());
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns validation error when schema rejects", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" },
		});
		const result = await setPrimarySkuMedia(undefined, buildForm());
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("rejects when media does not exist", async () => {
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
				fn({
					...mockPrisma,
					skuMedia: { ...mockPrisma.skuMedia, findUnique: vi.fn().mockResolvedValue(null) },
				}),
		);
		await setPrimarySkuMedia(undefined, buildForm());
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("rejects when media belongs to a different SKU", async () => {
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
				fn({
					...mockPrisma,
					skuMedia: {
						...mockPrisma.skuMedia,
						findUnique: vi.fn().mockResolvedValue(createMockMedia({ skuId: "other" })),
					},
				}),
		);
		await setPrimarySkuMedia(undefined, buildForm());
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("rejects when media is a VIDEO", async () => {
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
				fn({
					...mockPrisma,
					skuMedia: {
						...mockPrisma.skuMedia,
						findUnique: vi.fn().mockResolvedValue(createMockMedia({ mediaType: "VIDEO" })),
					},
				}),
		);
		await setPrimarySkuMedia(undefined, buildForm());
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("unsets previous primary and sets new one", async () => {
		await setPrimarySkuMedia(undefined, buildForm());
		expect(mockPrisma.skuMedia.updateMany).toHaveBeenCalledWith({
			where: { skuId: VALID_CUID, isPrimary: true },
			data: { isPrimary: false },
		});
		expect(mockPrisma.skuMedia.update).toHaveBeenCalledWith({
			where: { id: VALID_CUID_2 },
			data: { isPrimary: true },
		});
	});

	it("no-ops when media is already primary", async () => {
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
				fn({
					...mockPrisma,
					skuMedia: {
						...mockPrisma.skuMedia,
						findUnique: vi.fn().mockResolvedValue(createMockMedia({ isPrimary: true })),
						updateMany: mockPrisma.skuMedia.updateMany,
						update: mockPrisma.skuMedia.update,
					},
				}),
		);
		await setPrimarySkuMedia(undefined, buildForm());
		expect(mockPrisma.skuMedia.updateMany).not.toHaveBeenCalled();
		expect(mockPrisma.skuMedia.update).not.toHaveBeenCalled();
	});

	it("invalidates cache tags after success", async () => {
		await setPrimarySkuMedia(undefined, buildForm());
		expect(mockGetSkuInvalidationTags).toHaveBeenCalled();
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("returns success status", async () => {
		const result = await setPrimarySkuMedia(undefined, buildForm());
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await setPrimarySkuMedia(undefined, buildForm());
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
