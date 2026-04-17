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
	mockError,
	mockSanitizeText,
	mockGetDiscountInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		discount: {
			createMany: vi.fn(),
			findMany: vi.fn(),
		},
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockSanitizeText: vi.fn(),
	mockGetDiscountInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
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
}));

vi.mock("@/shared/lib/sanitize", () => ({
	sanitizeText: mockSanitizeText,
}));

vi.mock("@/shared/lib/audit-log", () => ({
	logAudit: vi.fn(),
}));

vi.mock("../../../schemas/discount.schemas", () => ({
	bulkGenerateDiscountsSchema: {},
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_DISCOUNT_LIMITS: { BULK_GENERATE: "discount-bulk-generate" },
}));

vi.mock("../../../constants/discount.constants", () => ({
	DISCOUNT_ERROR_MESSAGES: {
		BULK_GENERATE_NO_CODES: "Aucun code n'a pu être généré (collisions persistantes)",
		BULK_GENERATE_FAILED: "Erreur lors de la génération des codes promo",
	},
}));

vi.mock("../../../constants/cache", () => ({
	getDiscountInvalidationTags: mockGetDiscountInvalidationTags,
	DISCOUNT_CACHE_TAGS: {
		LIST: "discounts-list",
		DETAIL: (k: string) => `discount-${k}`,
		USAGE: (k: string) => `discount-usage-${k}`,
	},
}));

import { bulkGenerateDiscounts } from "../bulk-generate-discounts";

function createFormData(data: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(data)) fd.set(k, v);
	return fd;
}

const validFormData = createFormData({
	prefix: "WELCOME-",
	suffixLength: "6",
	count: "10",
	type: "PERCENTAGE",
	value: "15",
});

const validatedData = {
	prefix: "WELCOME-",
	suffixLength: 6,
	count: 10,
	type: "PERCENTAGE",
	value: 15,
	minOrderAmount: null,
	maxUsageCount: null,
	maxUsagePerUser: 1,
	startsAt: null,
	endsAt: null,
};

describe("bulkGenerateDiscounts", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", email: "a@b.com" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: validatedData });
		mockSanitizeText.mockImplementation((s: string) => s);
		mockGetDiscountInvalidationTags.mockReturnValue(["discounts-list", "admin-badges"]);

		mockSuccess.mockImplementation((message: string, data?: Record<string, unknown>) => ({
			status: ActionStatus.SUCCESS,
			message,
			data,
		}));
		mockError.mockImplementation((message: string) => ({
			status: ActionStatus.ERROR,
			message,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("returns auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" };
		mockRequireAdmin.mockResolvedValue({ error: authError });

		const result = await bulkGenerateDiscounts(undefined, validFormData);

		expect(result).toEqual(authError);
		expect(mockPrisma.discount.createMany).not.toHaveBeenCalled();
	});

	it("returns rate limit error when rate limited", async () => {
		const rl = { status: ActionStatus.ERROR, message: "Trop de requêtes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rl });

		const result = await bulkGenerateDiscounts(undefined, validFormData);

		expect(result).toEqual(rl);
	});

	it("returns validation error for invalid data", async () => {
		const ve = { status: ActionStatus.VALIDATION_ERROR, message: "Invalide" };
		mockValidateInput.mockReturnValue({ error: ve });

		const result = await bulkGenerateDiscounts(undefined, validFormData);

		expect(result).toEqual(ve);
	});

	it("inserts the requested count of unique codes when no collision", async () => {
		mockPrisma.discount.createMany.mockResolvedValue({ count: 10 });

		const result = await bulkGenerateDiscounts(undefined, validFormData);

		expect(mockPrisma.discount.createMany).toHaveBeenCalledTimes(1);
		const call = mockPrisma.discount.createMany.mock.calls[0]![0] as {
			data: Array<{ code: string; type: string; value: number; isActive: boolean }>;
			skipDuplicates: boolean;
		};
		expect(call.skipDuplicates).toBe(true);
		expect(call.data).toHaveLength(10);
		// All codes share prefix and have suffix length 6
		for (const d of call.data) {
			expect(d.code.startsWith("WELCOME-")).toBe(true);
			expect(d.code.length).toBe("WELCOME-".length + 6);
			expect(d.type).toBe("PERCENTAGE");
			expect(d.value).toBe(15);
			expect(d.isActive).toBe(true);
		}
		const data = result.data as { count: number; codes: string[] };
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toBe("10 codes promo générés avec succès");
		expect(data.count).toBe(10);
		expect(data.codes.length).toBe(10);
	});

	it("retries on collision and reports partial success", async () => {
		// 1st batch: only 7 of 10 inserted (3 collisions)
		// 2nd batch (3 codes): 2 of 3 inserted
		// 3rd batch (1 code): 1 inserted
		mockPrisma.discount.createMany
			.mockResolvedValueOnce({ count: 7 })
			.mockResolvedValueOnce({ count: 2 })
			.mockResolvedValueOnce({ count: 1 });
		mockPrisma.discount.findMany.mockResolvedValue([
			{ code: "WELCOME-A1B2C3" },
			{ code: "WELCOME-D4E5F6" },
		]);

		const result = await bulkGenerateDiscounts(undefined, validFormData);

		expect(mockPrisma.discount.createMany).toHaveBeenCalledTimes(3);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect((result.data as { count: number }).count).toBe(10);
	});

	it("reports partial failure when collisions exhaust retries", async () => {
		mockPrisma.discount.createMany.mockResolvedValue({ count: 0 });

		const result = await bulkGenerateDiscounts(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe("Aucun code n'a pu être généré (collisions persistantes)");
	});

	it("reports partial success message when fewer codes than requested", async () => {
		mockPrisma.discount.createMany
			.mockResolvedValueOnce({ count: 5 })
			.mockResolvedValueOnce({ count: 0 })
			.mockResolvedValueOnce({ count: 0 });
		mockPrisma.discount.findMany.mockResolvedValue([{ code: "WELCOME-AAAAAA" }]);

		const result = await bulkGenerateDiscounts(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toBe("5/10 codes générés (5 collisions ignorées)");
	});

	it("invalidates list cache tag", async () => {
		mockPrisma.discount.createMany.mockResolvedValue({ count: 10 });

		await bulkGenerateDiscounts(undefined, validFormData);

		expect(mockUpdateTag).toHaveBeenCalledWith("discounts-list");
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.discount.createMany.mockRejectedValue(new Error("DB down"));

		const result = await bulkGenerateDiscounts(undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Erreur lors de la génération des codes promo",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
