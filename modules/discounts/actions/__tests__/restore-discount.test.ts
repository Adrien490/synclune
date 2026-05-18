import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockNotFound,
	mockGetDiscountInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		discount: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockNotFound: vi.fn(),
	mockGetDiscountInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
	requireAdminWithUser: mockRequireAdmin,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
	notFound: mockNotFound,
}));

vi.mock("../../schemas/discount.schemas", () => ({
	restoreDiscountSchema: {},
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_DISCOUNT_LIMITS: { RESTORE: "discount-restore" },
}));

vi.mock("../../constants/discount.constants", () => ({
	DISCOUNT_ERROR_MESSAGES: {
		NOT_DELETED: "Ce code promo n'est pas supprimé",
		RESTORE_FAILED: "Erreur lors de la restauration du code promo",
	},
}));

vi.mock("../../constants/cache", () => ({
	getDiscountInvalidationTags: mockGetDiscountInvalidationTags,
}));

import { restoreDiscount } from "../restore-discount";

// ============================================================================
// HELPERS
// ============================================================================

function createFormData(data: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(data)) fd.set(k, v);
	return fd;
}

const validFormData = createFormData({ id: "disc-123" });
const deletedDiscount = {
	id: "disc-123",
	code: "PROMO20",
	deletedAt: new Date("2026-01-01"),
};
const liveDiscount = { id: "disc-123", code: "PROMO20", deletedAt: null };

// ============================================================================
// TESTS
// ============================================================================

describe("restoreDiscount", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", email: "a@b.com" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { id: "disc-123" } });
		mockPrisma.discount.findUnique.mockResolvedValue(deletedDiscount);
		mockPrisma.discount.update.mockResolvedValue({});
		mockGetDiscountInvalidationTags.mockReturnValue(["discounts-list", "discount-PROMO20"]);

		mockSuccess.mockImplementation((message: string) => ({
			status: ActionStatus.SUCCESS,
			message,
		}));
		mockError.mockImplementation((message: string) => ({
			status: ActionStatus.ERROR,
			message,
		}));
		mockNotFound.mockImplementation((entity: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: `${entity} introuvable`,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("returns auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" };
		mockRequireAdmin.mockResolvedValue({ error: authError });

		const result = await restoreDiscount(undefined, validFormData);

		expect(result).toEqual(authError);
		expect(mockPrisma.discount.update).not.toHaveBeenCalled();
	});

	it("returns rate limit error when rate limited", async () => {
		const rl = { status: ActionStatus.ERROR, message: "Trop de requêtes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rl });

		const result = await restoreDiscount(undefined, validFormData);

		expect(result).toEqual(rl);
		expect(mockPrisma.discount.update).not.toHaveBeenCalled();
	});

	it("returns validation error for invalid id", async () => {
		const ve = { status: ActionStatus.VALIDATION_ERROR, message: "Données invalides" };
		mockValidateInput.mockReturnValue({ error: ve });

		const result = await restoreDiscount(undefined, validFormData);

		expect(result).toEqual(ve);
	});

	it("returns notFound when discount does not exist", async () => {
		mockPrisma.discount.findUnique.mockResolvedValue(null);

		const result = await restoreDiscount(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockPrisma.discount.update).not.toHaveBeenCalled();
	});

	it("returns error when discount is not deleted", async () => {
		mockPrisma.discount.findUnique.mockResolvedValue(liveDiscount);

		const result = await restoreDiscount(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe("Ce code promo n'est pas supprimé");
		expect(mockPrisma.discount.update).not.toHaveBeenCalled();
	});

	it("clears deletedAt when restoring", async () => {
		await restoreDiscount(undefined, validFormData);

		expect(mockPrisma.discount.update).toHaveBeenCalledWith({
			where: { id: "disc-123" },
			data: { deletedAt: null },
		});
	});

	it("invalidates cache tags by id", async () => {
		mockGetDiscountInvalidationTags.mockReturnValue(["discounts-list", "discount-disc-123"]);

		await restoreDiscount(undefined, validFormData);

		expect(mockGetDiscountInvalidationTags).toHaveBeenCalledWith("disc-123");
		expect(mockUpdateTag).toHaveBeenCalledWith("discounts-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("discount-disc-123");
	});

	it("returns success with code in message", async () => {
		const result = await restoreDiscount(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toBe('Code promo "PROMO20" restauré');
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.discount.update.mockRejectedValue(new Error("DB down"));

		const result = await restoreDiscount(undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Erreur lors de la restauration du code promo",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
