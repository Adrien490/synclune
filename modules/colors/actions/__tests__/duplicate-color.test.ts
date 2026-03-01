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
	mockNotFound,
	mockGenerateSlug,
	mockGenerateUniqueReadableName,
	mockGetColorInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		color: {
			findUnique: vi.fn(),
			findFirst: vi.fn(),
			create: vi.fn(),
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
	mockGenerateSlug: vi.fn(),
	mockGenerateUniqueReadableName: vi.fn(),
	mockGetColorInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdmin: mockRequireAdmin }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_COLOR_LIMITS: { DUPLICATE: "color-duplicate" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
	notFound: mockNotFound,
}));
vi.mock("@/shared/utils/generate-slug", () => ({ generateSlug: mockGenerateSlug }));
vi.mock("@/shared/services/unique-name-generator.service", () => ({
	generateUniqueReadableName: mockGenerateUniqueReadableName,
}));
vi.mock("../../schemas/color.schemas", () => ({ duplicateColorSchema: {} }));
vi.mock("../../constants/cache", () => ({
	getColorInvalidationTags: mockGetColorInvalidationTags,
}));

import { duplicateColor } from "../duplicate-color";

// ============================================================================
// HELPERS
// ============================================================================

function makeColor(overrides: Record<string, unknown> = {}) {
	return {
		id: "color-1",
		name: "Or Rose",
		slug: "or-rose",
		hex: "#B76E79",
		isActive: true,
		...overrides,
	};
}

const validFormData = createMockFormData({ colorId: "color-1" });

// ============================================================================
// TESTS
// ============================================================================

describe("duplicateColor", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ success: true });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { colorId: "color-1" } });
		mockGenerateUniqueReadableName.mockResolvedValue({ success: true, name: "Or Rose (copie)" });
		mockGenerateSlug.mockResolvedValue("or-rose-copie");
		mockGetColorInvalidationTags.mockReturnValue(["colors"]);
		mockPrisma.color.findUnique.mockResolvedValue(makeColor());
		mockPrisma.color.findFirst.mockResolvedValue(null);
		mockPrisma.color.create.mockResolvedValue({
			id: "color-2",
			name: "Or Rose (copie)",
			slug: "or-rose-copie",
		});

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
		mockNotFound.mockImplementation((label: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: `${label} non trouvé`,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});
		const result = await duplicateColor(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit" },
		});
		const result = await duplicateColor(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalide" },
		});
		const result = await duplicateColor(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return not found when original color does not exist", async () => {
		mockPrisma.color.findUnique.mockResolvedValue(null);
		const result = await duplicateColor(undefined, validFormData);
		expect(mockNotFound).toHaveBeenCalledWith("Couleur");
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should return error when unique name generation fails", async () => {
		mockGenerateUniqueReadableName.mockResolvedValue({
			success: false,
			error: "Trop de copies existantes",
		});
		const result = await duplicateColor(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Trop de copies existantes");
	});

	it("should create duplicate with inactive status and new name/slug", async () => {
		const result = await duplicateColor(undefined, validFormData);
		expect(mockGenerateSlug).toHaveBeenCalled();
		expect(mockPrisma.color.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				name: "Or Rose (copie)",
				slug: "or-rose-copie",
				hex: "#B76E79",
				isActive: false,
			}),
		});
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should pass original name to unique name generator", async () => {
		await duplicateColor(undefined, validFormData);
		expect(mockGenerateUniqueReadableName).toHaveBeenCalledWith("Or Rose", expect.any(Function));
	});

	it("should invalidate cache after duplication", async () => {
		await duplicateColor(undefined, validFormData);
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.color.create.mockRejectedValue(new Error("DB crash"));
		const result = await duplicateColor(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
