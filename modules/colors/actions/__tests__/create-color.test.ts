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
	mockGenerateSlug,
	mockSanitizeText,
	mockGetColorInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		color: { findFirst: vi.fn(), create: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockGenerateSlug: vi.fn(),
	mockSanitizeText: vi.fn(),
	mockGetColorInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdmin: mockRequireAdmin }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_COLOR_LIMITS: { CREATE: "color-create" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("@/shared/utils/generate-slug", () => ({ generateSlug: mockGenerateSlug }));
vi.mock("@/shared/lib/sanitize", () => ({ sanitizeText: mockSanitizeText }));
vi.mock("../../schemas/color.schemas", () => ({ createColorSchema: {} }));
vi.mock("../../constants/cache", () => ({
	getColorInvalidationTags: mockGetColorInvalidationTags,
}));

import { createColor } from "../create-color";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({ name: "Or Rose", hex: "#B76E79" });

// ============================================================================
// TESTS
// ============================================================================

describe("createColor", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ success: true });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { name: "Or Rose", hex: "#B76E79" } });
		mockSanitizeText.mockImplementation((t: string) => t);
		mockGenerateSlug.mockResolvedValue("or-rose");
		mockGetColorInvalidationTags.mockReturnValue(["colors-list"]);
		mockPrisma.color.findFirst.mockResolvedValue(null);
		mockPrisma.color.create.mockResolvedValue({ id: "color-1" });

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await createColor(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await createColor(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" },
		});
		const result = await createColor(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return error when name already exists", async () => {
		mockPrisma.color.findFirst.mockResolvedValue({ id: "existing" });
		const result = await createColor(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("existe");
	});

	it("should generate slug and create color", async () => {
		const result = await createColor(undefined, validFormData);
		expect(mockGenerateSlug).toHaveBeenCalled();
		expect(mockPrisma.color.create).toHaveBeenCalledWith({
			data: expect.objectContaining({ name: "Or Rose", hex: "#B76E79", slug: "or-rose" }),
		});
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should invalidate cache after creation", async () => {
		await createColor(undefined, validFormData);
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.color.create.mockRejectedValue(new Error("DB crash"));
		const result = await createColor(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
