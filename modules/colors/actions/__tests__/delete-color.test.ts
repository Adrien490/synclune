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
	mockUpdateTag,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockGetColorInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		color: {
			findUnique: vi.fn(),
			delete: vi.fn(),
		},
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockGetColorInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdminWithUser: mockRequireAdmin }));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: vi.fn() }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_COLOR_LIMITS: { DELETE: "color-delete" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
	BusinessError: class BusinessError extends Error {
		constructor(message: string) {
			super(message);
			this.name = "BusinessError";
		}
	},
}));
vi.mock("../../schemas/color.schemas", () => ({ deleteColorSchema: {} }));
vi.mock("../../constants/cache", () => ({
	getColorInvalidationTags: mockGetColorInvalidationTags,
}));

import { deleteColor } from "../delete-color";

// ============================================================================
// HELPERS
// ============================================================================

function makeColor(overrides: Record<string, unknown> = {}) {
	return {
		id: "color-1",
		name: "Or Rose",
		slug: "or-rose",
		hex: "#B76E79",
		_count: { skus: 0 },
		...overrides,
	};
}

const validFormData = createMockFormData({ id: "color-1" });

// ============================================================================
// TESTS
// ============================================================================

describe("deleteColor", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { id: "color-1" } });
		mockGetColorInvalidationTags.mockReturnValue(["colors-list", "color-or-rose"]);
		mockPrisma.color.findUnique.mockResolvedValue(makeColor());
		mockPrisma.color.delete.mockResolvedValue({ id: "color-1" });
		mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
			fn(mockPrisma),
		);

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
		mockHandleActionError.mockImplementation((e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: e instanceof Error && e.name === "BusinessError" ? e.message : fallback,
		}));
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});
		const result = await deleteColor(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit" },
		});
		const result = await deleteColor(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalide" },
		});
		const result = await deleteColor(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return error when color does not exist", async () => {
		mockPrisma.color.findUnique.mockResolvedValue(null);
		const result = await deleteColor(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("existe pas");
	});

	it("should return error when color is used by skus (singular)", async () => {
		mockPrisma.color.findUnique.mockResolvedValue(makeColor({ _count: { skus: 1 } }));
		const result = await deleteColor(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("1 variante");
	});

	it("should return error when color is used by multiple skus (plural)", async () => {
		mockPrisma.color.findUnique.mockResolvedValue(makeColor({ _count: { skus: 4 } }));
		const result = await deleteColor(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("4 variantes");
	});

	it("should delete the color and return success", async () => {
		const result = await deleteColor(undefined, validFormData);
		expect(mockPrisma.color.delete).toHaveBeenCalledWith({ where: { id: "color-1" } });
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should pass slug to getColorInvalidationTags for targeted cache invalidation", async () => {
		await deleteColor(undefined, validFormData);
		expect(mockGetColorInvalidationTags).toHaveBeenCalledWith("or-rose");
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.color.delete.mockRejectedValue(new Error("DB crash"));
		const result = await deleteColor(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
