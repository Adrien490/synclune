import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockValidateInput,
	mockSuccess,
	mockError,
	mockHandleActionError,
	mockUpdateTag,
	mockSanitizeText,
	mockGenerateSlug,
	mockGetColorInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		color: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockSanitizeText: vi.fn(),
	mockGenerateSlug: vi.fn(),
	mockGetColorInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdminWithUser: mockRequireAdmin }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({ ADMIN_COLOR_LIMITS: { UPDATE: "update" } }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
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
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: vi.fn() }));
vi.mock("@/shared/lib/sanitize", () => ({ sanitizeText: mockSanitizeText }));
vi.mock("@/shared/utils/generate-slug", () => ({ generateSlug: mockGenerateSlug }));
vi.mock("../../constants/cache", () => ({
	getColorInvalidationTags: mockGetColorInvalidationTags,
}));
vi.mock("../../schemas/color.schemas", () => ({ updateColorSchema: {} }));

import { updateColor } from "../update-color";

// ============================================================================
// TESTS
// ============================================================================

const COLOR_ID = VALID_CUID;

describe("updateColor", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@test.com" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSanitizeText.mockImplementation((text: string) => text);
		mockValidateInput.mockReturnValue({ data: { id: COLOR_ID, name: "Or Rose", hex: "#B76E79" } });
		mockPrisma.color.findUnique.mockResolvedValue({ id: COLOR_ID, name: "Or", slug: "or" });
		mockPrisma.color.findFirst.mockResolvedValue(null);
		mockPrisma.color.update.mockResolvedValue({});
		mockGenerateSlug.mockResolvedValue("or-rose");
		mockGetColorInvalidationTags.mockReturnValue(["colors-list"]);

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
		mockHandleActionError.mockImplementation((_e: unknown, f: string) => ({
			status: ActionStatus.ERROR,
			message: f,
		}));
	});

	it("returns auth error when user is not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.FORBIDDEN, message: "Admin requis" },
		});
		const result = await updateColor(
			undefined,
			createMockFormData({ id: COLOR_ID, name: "Or Rose", hex: "#B76E79" }),
		);
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
	});

	it("returns error when color does not exist", async () => {
		mockPrisma.color.findUnique.mockResolvedValue(null);
		const _result = await updateColor(
			undefined,
			createMockFormData({ id: COLOR_ID, name: "Or Rose", hex: "#B76E79" }),
		);
		expect(mockError).toHaveBeenCalledWith("Cette couleur n'existe pas");
	});

	it("returns error when name already exists", async () => {
		mockPrisma.color.findFirst.mockResolvedValue({ id: "other-id", name: "Or Rose" });
		const _result2 = await updateColor(
			undefined,
			createMockFormData({ id: COLOR_ID, name: "Or Rose", hex: "#B76E79" }),
		);
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining("existe deja"));
	});

	it("does not check name uniqueness when name unchanged", async () => {
		mockValidateInput.mockReturnValue({ data: { id: COLOR_ID, name: "Or", hex: "#FFD700" } });
		await updateColor(undefined, createMockFormData({ id: COLOR_ID, name: "Or", hex: "#FFD700" }));
		expect(mockPrisma.color.findFirst).not.toHaveBeenCalled();
	});

	it("generates new slug when name changes", async () => {
		await updateColor(
			undefined,
			createMockFormData({ id: COLOR_ID, name: "Or Rose", hex: "#B76E79" }),
		);
		expect(mockGenerateSlug).toHaveBeenCalledWith(mockPrisma, "color", "Or Rose");
		expect(mockPrisma.color.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ slug: "or-rose" }),
			}),
		);
	});

	it("keeps existing slug when name unchanged", async () => {
		mockValidateInput.mockReturnValue({ data: { id: COLOR_ID, name: "Or", hex: "#FFD700" } });
		await updateColor(undefined, createMockFormData({ id: COLOR_ID, name: "Or", hex: "#FFD700" }));
		expect(mockGenerateSlug).not.toHaveBeenCalled();
		expect(mockPrisma.color.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ slug: "or" }),
			}),
		);
	});

	it("invalidates cache for old and new slug when slug changes", async () => {
		mockGetColorInvalidationTags
			.mockReturnValueOnce(["colors-list", "color-or"])
			.mockReturnValueOnce(["colors-list", "color-or-rose"]);

		await updateColor(
			undefined,
			createMockFormData({ id: COLOR_ID, name: "Or Rose", hex: "#B76E79" }),
		);

		expect(mockGetColorInvalidationTags).toHaveBeenCalledTimes(2);
	});

	it("returns success on update", async () => {
		const result = await updateColor(
			undefined,
			createMockFormData({ id: COLOR_ID, name: "Or Rose", hex: "#B76E79" }),
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.color.update.mockRejectedValue(new Error("DB crash"));
		const result = await updateColor(
			undefined,
			createMockFormData({ id: COLOR_ID, name: "Or Rose", hex: "#B76E79" }),
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
