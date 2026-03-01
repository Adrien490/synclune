import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockValidateInput,
	mockSuccess,
	mockNotFound,
	mockError,
	mockHandleActionError,
	mockUpdateTag,
	mockGetDiscountInvalidationTags,
	mockSanitizeText,
} = vi.hoisted(() => ({
	mockPrisma: {
		discount: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockNotFound: vi.fn(),
	mockError: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockGetDiscountInvalidationTags: vi.fn(),
	mockSanitizeText: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdmin,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_DISCOUNT_LIMITS: { DUPLICATE: "duplicate" },
}));
vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
}));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	success: mockSuccess,
	notFound: mockNotFound,
	error: mockError,
	handleActionError: mockHandleActionError,
}));
vi.mock("@/shared/lib/audit-log", () => ({
	logAudit: vi.fn(),
}));
vi.mock("@/shared/lib/sanitize", () => ({
	sanitizeText: mockSanitizeText,
}));
vi.mock("../../../constants/cache", () => ({
	getDiscountInvalidationTags: mockGetDiscountInvalidationTags,
}));

import { duplicateDiscount } from "../duplicate-discount";

// ============================================================================
// HELPERS
// ============================================================================

const DISCOUNT_ID = "disc_cm1234567890abcde";

function makeDiscount(overrides: Record<string, unknown> = {}) {
	return {
		code: "PROMO20",
		type: "PERCENTAGE",
		value: 20,
		minOrderAmount: null,
		maxUsageCount: 100,
		maxUsagePerUser: 1,
		startsAt: new Date("2026-01-01"),
		endsAt: new Date("2026-12-31"),
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("duplicateDiscount", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@test.com" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { discountId: DISCOUNT_ID } });
		mockPrisma.discount.findUnique.mockResolvedValue(makeDiscount());
		mockPrisma.discount.findMany.mockResolvedValue([]);
		mockPrisma.discount.create.mockResolvedValue({
			id: "disc_new",
			code: "PROMO20-COPY",
		});
		mockSanitizeText.mockImplementation((text: string) => text);
		mockGetDiscountInvalidationTags.mockReturnValue(["discounts-list"]);

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockNotFound.mockImplementation((entity: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: `${entity} introuvable`,
		}));
		mockError.mockImplementation((msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("returns auth error when user is not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.FORBIDDEN, message: "Admin requis" },
		});

		const result = await duplicateDiscount(
			undefined,
			createMockFormData({ discountId: DISCOUNT_ID }),
		);

		expect(result.status).toBe(ActionStatus.FORBIDDEN);
	});

	it("returns rate limit error when exceeded", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Limite" },
		});

		const result = await duplicateDiscount(
			undefined,
			createMockFormData({ discountId: DISCOUNT_ID }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns validation error when input is invalid", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "ID invalide" },
		});

		const result = await duplicateDiscount(undefined, createMockFormData({ discountId: "" }));

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("returns error when original discount not found", async () => {
		mockPrisma.discount.findUnique.mockResolvedValue(null);

		const result = await duplicateDiscount(
			undefined,
			createMockFormData({ discountId: DISCOUNT_ID }),
		);

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockNotFound).toHaveBeenCalledWith("Code promo");
	});

	it("creates PROMO-COPY when no copies exist", async () => {
		mockPrisma.discount.findMany.mockResolvedValue([]);

		await duplicateDiscount(undefined, createMockFormData({ discountId: DISCOUNT_ID }));

		expect(mockSanitizeText).toHaveBeenCalledWith("PROMO20-COPY");
		expect(mockPrisma.discount.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					code: "PROMO20-COPY",
				}),
			}),
		);
	});

	it("creates PROMO-COPY-2 when PROMO-COPY already exists", async () => {
		mockPrisma.discount.findMany.mockResolvedValue([{ code: "PROMO20-COPY" }]);

		await duplicateDiscount(undefined, createMockFormData({ discountId: DISCOUNT_ID }));

		expect(mockSanitizeText).toHaveBeenCalledWith("PROMO20-COPY-2");
	});

	it("creates PROMO-COPY-3 when COPY and COPY-2 exist", async () => {
		mockPrisma.discount.findMany.mockResolvedValue([
			{ code: "PROMO20-COPY" },
			{ code: "PROMO20-COPY-2" },
		]);

		await duplicateDiscount(undefined, createMockFormData({ discountId: DISCOUNT_ID }));

		expect(mockSanitizeText).toHaveBeenCalledWith("PROMO20-COPY-3");
	});

	it("creates copy with isActive=false and usageCount=0", async () => {
		await duplicateDiscount(undefined, createMockFormData({ discountId: DISCOUNT_ID }));

		expect(mockPrisma.discount.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					isActive: false,
					usageCount: 0,
				}),
			}),
		);
	});

	it("preserves original discount settings in copy", async () => {
		const original = makeDiscount({
			type: "FIXED_AMOUNT",
			value: 1000,
			minOrderAmount: 5000,
			maxUsageCount: 50,
			maxUsagePerUser: 2,
		});
		mockPrisma.discount.findUnique.mockResolvedValue(original);

		await duplicateDiscount(undefined, createMockFormData({ discountId: DISCOUNT_ID }));

		expect(mockPrisma.discount.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					type: "FIXED_AMOUNT",
					value: 1000,
					minOrderAmount: 5000,
					maxUsageCount: 50,
					maxUsagePerUser: 2,
				}),
			}),
		);
	});

	it("returns success with new code ID and value", async () => {
		const result = await duplicateDiscount(
			undefined,
			createMockFormData({ discountId: DISCOUNT_ID }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith(
			expect.stringContaining("PROMO20-COPY"),
			expect.objectContaining({ id: "disc_new", code: "PROMO20-COPY" }),
		);
	});

	it("invalidates cache after creation", async () => {
		await duplicateDiscount(undefined, createMockFormData({ discountId: DISCOUNT_ID }));

		expect(mockGetDiscountInvalidationTags).toHaveBeenCalled();
		expect(mockUpdateTag).toHaveBeenCalledWith("discounts-list");
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.discount.create.mockRejectedValue(new Error("DB crash"));

		const result = await duplicateDiscount(
			undefined,
			createMockFormData({ discountId: DISCOUNT_ID }),
		);

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
