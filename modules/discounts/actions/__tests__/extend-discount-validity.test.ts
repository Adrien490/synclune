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
	notDeleted: { deletedAt: null },
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
	notFound: mockNotFound,
}));

vi.mock("@/shared/lib/audit-log", () => ({
	logAudit: vi.fn(),
}));

vi.mock("../../schemas/discount.schemas", () => ({
	extendDiscountValiditySchema: {},
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_DISCOUNT_LIMITS: { EXTEND_VALIDITY: "discount-extend" },
}));

vi.mock("../../constants/discount.constants", () => ({
	DISCOUNT_ERROR_MESSAGES: {
		EXTEND_NO_END_DATE: "Ce code promo n'a pas de date de fin à prolonger",
		EXTEND_FAILED: "Erreur lors de la prolongation du code promo",
	},
}));

vi.mock("../../constants/cache", () => ({
	getDiscountInvalidationTags: mockGetDiscountInvalidationTags,
}));

import { extendDiscountValidity } from "../extend-discount-validity";

function createFormData(data: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(data)) fd.set(k, v);
	return fd;
}

const validFormData = createFormData({ id: "disc-123", days: "7" });

describe("extendDiscountValidity", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-04-17T10:00:00Z"));

		vi.resetAllMocks();
		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", email: "a@b.com" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { id: "disc-123", days: 7 } });
		mockGetDiscountInvalidationTags.mockReturnValue(["discounts-list", "discount-disc-123"]);

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

		const result = await extendDiscountValidity(undefined, validFormData);

		expect(result).toEqual(authError);
		expect(mockPrisma.discount.update).not.toHaveBeenCalled();
	});

	it("returns rate limit error when rate limited", async () => {
		const rl = { status: ActionStatus.ERROR, message: "Trop de requêtes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rl });

		const result = await extendDiscountValidity(undefined, validFormData);

		expect(result).toEqual(rl);
	});

	it("returns notFound when discount missing", async () => {
		mockPrisma.discount.findUnique.mockResolvedValue(null);

		const result = await extendDiscountValidity(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockPrisma.discount.update).not.toHaveBeenCalled();
	});

	it("returns error when discount has no endsAt", async () => {
		mockPrisma.discount.findUnique.mockResolvedValue({
			id: "disc-123",
			code: "PROMO20",
			endsAt: null,
		});

		const result = await extendDiscountValidity(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe("Ce code promo n'a pas de date de fin à prolonger");
		expect(mockPrisma.discount.update).not.toHaveBeenCalled();
	});

	it("extends from endsAt when promo still active", async () => {
		const futureEndsAt = new Date("2026-05-01T00:00:00Z");
		mockPrisma.discount.findUnique.mockResolvedValue({
			id: "disc-123",
			code: "PROMO20",
			endsAt: futureEndsAt,
		});
		mockPrisma.discount.update.mockResolvedValue({});

		await extendDiscountValidity(undefined, validFormData);

		const expected = new Date(futureEndsAt.getTime() + 7 * 24 * 60 * 60 * 1000);
		expect(mockPrisma.discount.update).toHaveBeenCalledWith({
			where: { id: "disc-123" },
			data: { endsAt: expected },
		});
	});

	it("extends from now when promo already expired", async () => {
		const expiredEndsAt = new Date("2026-04-01T00:00:00Z");
		mockPrisma.discount.findUnique.mockResolvedValue({
			id: "disc-123",
			code: "PROMO20",
			endsAt: expiredEndsAt,
		});
		mockPrisma.discount.update.mockResolvedValue({});

		await extendDiscountValidity(undefined, validFormData);

		const now = new Date("2026-04-17T10:00:00Z");
		const expected = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
		expect(mockPrisma.discount.update).toHaveBeenCalledWith({
			where: { id: "disc-123" },
			data: { endsAt: expected },
		});
	});

	it("invalidates cache by id", async () => {
		mockPrisma.discount.findUnique.mockResolvedValue({
			id: "disc-123",
			code: "PROMO20",
			endsAt: new Date("2026-05-01"),
		});
		mockPrisma.discount.update.mockResolvedValue({});

		await extendDiscountValidity(undefined, validFormData);

		expect(mockGetDiscountInvalidationTags).toHaveBeenCalledWith("disc-123");
		expect(mockUpdateTag).toHaveBeenCalledWith("discounts-list");
	});

	it("returns success message with days", async () => {
		mockPrisma.discount.findUnique.mockResolvedValue({
			id: "disc-123",
			code: "PROMO20",
			endsAt: new Date("2026-05-01"),
		});
		mockPrisma.discount.update.mockResolvedValue({});

		const result = await extendDiscountValidity(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toBe('Code "PROMO20" prolongé de 7 jour(s)');
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.discount.findUnique.mockRejectedValue(new Error("DB down"));

		const result = await extendDiscountValidity(undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
