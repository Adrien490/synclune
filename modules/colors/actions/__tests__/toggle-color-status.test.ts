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
	mockGetColorInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		color: { findUnique: vi.fn(), update: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockGetColorInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdminWithUser: mockRequireAdmin }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_COLOR_LIMITS: { TOGGLE_STATUS: "toggle" },
}));
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
vi.mock("../../constants/cache", () => ({
	getColorInvalidationTags: mockGetColorInvalidationTags,
}));
vi.mock("../../schemas/color.schemas", () => ({ toggleColorStatusSchema: {} }));

import { toggleColorStatus } from "../toggle-color-status";

// ============================================================================
// TESTS
// ============================================================================

const COLOR_ID = VALID_CUID;

describe("toggleColorStatus", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@test.com" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { id: COLOR_ID, isActive: false } });
		mockPrisma.color.findUnique.mockResolvedValue({ id: COLOR_ID, name: "Or", slug: "or" });
		mockPrisma.color.update.mockResolvedValue({});
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
		const result = await toggleColorStatus(
			undefined,
			createMockFormData({ id: COLOR_ID, isActive: "false" }),
		);
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
	});

	it("returns error when color does not exist", async () => {
		mockPrisma.color.findUnique.mockResolvedValue(null);
		const _result = await toggleColorStatus(
			undefined,
			createMockFormData({ id: COLOR_ID, isActive: "false" }),
		);
		expect(mockError).toHaveBeenCalledWith("Cette couleur n'existe pas");
	});

	it("updates color status to inactive", async () => {
		mockValidateInput.mockReturnValue({ data: { id: COLOR_ID, isActive: false } });
		await toggleColorStatus(undefined, createMockFormData({ id: COLOR_ID, isActive: "false" }));
		expect(mockPrisma.color.update).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: COLOR_ID }, data: { isActive: false } }),
		);
	});

	it("updates color status to active", async () => {
		mockValidateInput.mockReturnValue({ data: { id: COLOR_ID, isActive: true } });
		await toggleColorStatus(undefined, createMockFormData({ id: COLOR_ID, isActive: "true" }));
		expect(mockPrisma.color.update).toHaveBeenCalledWith(
			expect.objectContaining({ data: { isActive: true } }),
		);
	});

	it("invalidates cache after toggle", async () => {
		await toggleColorStatus(undefined, createMockFormData({ id: COLOR_ID, isActive: "false" }));
		expect(mockGetColorInvalidationTags).toHaveBeenCalledWith("or");
		expect(mockUpdateTag).toHaveBeenCalledWith("colors-list");
	});

	it("returns appropriate success message for activate/deactivate", async () => {
		mockValidateInput.mockReturnValue({ data: { id: COLOR_ID, isActive: true } });
		const activeResult = await toggleColorStatus(
			undefined,
			createMockFormData({ id: COLOR_ID, isActive: "true" }),
		);
		expect(activeResult.message).toContain("activée");

		mockValidateInput.mockReturnValue({ data: { id: COLOR_ID, isActive: false } });
		const inactiveResult = await toggleColorStatus(
			undefined,
			createMockFormData({ id: COLOR_ID, isActive: "false" }),
		);
		expect(inactiveResult.message).toContain("désactivée");
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.color.update.mockRejectedValue(new Error("DB crash"));
		const result = await toggleColorStatus(
			undefined,
			createMockFormData({ id: COLOR_ID, isActive: "false" }),
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
