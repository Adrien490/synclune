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
			skuMedia: { findUnique: vi.fn(), update: vi.fn() },
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
	ADMIN_SKU_UPDATE_MEDIA_ALT_LIMIT: "alt-text",
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
vi.mock("../../schemas/sku-media.schemas", () => ({ updateSkuMediaAltTextSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getSkuInvalidationTags: mockGetSkuInvalidationTags,
}));

import { updateSkuMediaAltText } from "../update-sku-media-alt-text";

const buildForm = (altText = "Bracelet argent demi-lune") =>
	createMockFormData({ mediaId: VALID_CUID, altText });

function createMockMedia() {
	return {
		id: VALID_CUID,
		sku: {
			id: VALID_CUID,
			sku: "BRC-001",
			productId: "prod-1",
			product: { slug: "bracelet" },
		},
	};
}

describe("updateSkuMediaAltText", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockGetSkuInvalidationTags.mockReturnValue(["skus-list"]);
		mockValidateInput.mockReturnValue({
			data: { mediaId: VALID_CUID, altText: "Bracelet argent demi-lune" },
		});
		mockSuccess.mockImplementation((message: string) => ({
			status: ActionStatus.SUCCESS,
			message,
		}));

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.skuMedia.findUnique.mockResolvedValue(createMockMedia());
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
		const result = await updateSkuMediaAltText(undefined, buildForm());
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("returns rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await updateSkuMediaAltText(undefined, buildForm());
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns validation error when schema rejects", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" },
		});
		const result = await updateSkuMediaAltText(undefined, buildForm());
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
		await updateSkuMediaAltText(undefined, buildForm());
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("updates the altText field", async () => {
		await updateSkuMediaAltText(undefined, buildForm());
		expect(mockPrisma.skuMedia.update).toHaveBeenCalledWith({
			where: { id: VALID_CUID },
			data: { altText: "Bracelet argent demi-lune" },
		});
	});

	it("supports clearing altText to null", async () => {
		mockValidateInput.mockReturnValue({
			data: { mediaId: VALID_CUID, altText: null },
		});
		await updateSkuMediaAltText(undefined, buildForm(""));
		expect(mockPrisma.skuMedia.update).toHaveBeenCalledWith({
			where: { id: VALID_CUID },
			data: { altText: null },
		});
	});

	it("invalidates cache tags after success", async () => {
		await updateSkuMediaAltText(undefined, buildForm());
		expect(mockGetSkuInvalidationTags).toHaveBeenCalled();
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("returns success status", async () => {
		const result = await updateSkuMediaAltText(undefined, buildForm());
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await updateSkuMediaAltText(undefined, buildForm());
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
