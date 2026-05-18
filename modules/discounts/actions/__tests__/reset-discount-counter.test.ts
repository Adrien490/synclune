import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
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
	mockNotFound: vi.fn(),
	mockGetDiscountInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
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
	notFound: mockNotFound,
}));

vi.mock("../../schemas/discount.schemas", () => ({
	resetDiscountCounterSchema: {},
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_DISCOUNT_LIMITS: { RESET_COUNTER: "discount-reset" },
}));

vi.mock("../../constants/discount.constants", () => ({
	DISCOUNT_ERROR_MESSAGES: {
		RESET_COUNTER_FAILED: "Erreur lors de la réinitialisation du compteur",
	},
}));

vi.mock("../../constants/cache", () => ({
	getDiscountInvalidationTags: mockGetDiscountInvalidationTags,
}));

import { resetDiscountCounter } from "../reset-discount-counter";

function createFormData(data: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(data)) fd.set(k, v);
	return fd;
}

const validFormData = createFormData({ id: "disc-123" });

describe("resetDiscountCounter", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", email: "a@b.com" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { id: "disc-123" } });
		mockGetDiscountInvalidationTags.mockReturnValue(["discounts-list", "discount-disc-123"]);

		mockSuccess.mockImplementation((message: string) => ({
			status: ActionStatus.SUCCESS,
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

		const result = await resetDiscountCounter(undefined, validFormData);

		expect(result).toEqual(authError);
		expect(mockPrisma.discount.update).not.toHaveBeenCalled();
	});

	it("returns rate limit error when rate limited", async () => {
		const rl = { status: ActionStatus.ERROR, message: "Trop de requêtes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rl });

		const result = await resetDiscountCounter(undefined, validFormData);

		expect(result).toEqual(rl);
	});

	it("returns notFound when discount missing", async () => {
		mockPrisma.discount.findUnique.mockResolvedValue(null);

		const result = await resetDiscountCounter(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockPrisma.discount.update).not.toHaveBeenCalled();
	});

	it("returns success without writing when counter already 0", async () => {
		mockPrisma.discount.findUnique.mockResolvedValue({
			id: "disc-123",
			code: "PROMO20",
			usageCount: 0,
		});

		const result = await resetDiscountCounter(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("déjà à zéro");
		expect(mockPrisma.discount.update).not.toHaveBeenCalled();
	});

	it("resets usageCount to 0 and invalidates cache", async () => {
		mockPrisma.discount.findUnique.mockResolvedValue({
			id: "disc-123",
			code: "PROMO20",
			usageCount: 42,
		});
		mockPrisma.discount.update.mockResolvedValue({});

		const result = await resetDiscountCounter(undefined, validFormData);

		expect(mockPrisma.discount.update).toHaveBeenCalledWith({
			where: { id: "disc-123" },
			data: { usageCount: 0 },
		});
		expect(mockGetDiscountInvalidationTags).toHaveBeenCalledWith("disc-123");
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("42");
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.discount.findUnique.mockRejectedValue(new Error("DB down"));

		const result = await resetDiscountCounter(undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
