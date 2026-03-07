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
	mockError,
	mockHandleActionError,
	mockUpdateTag,
	mockGetColorInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		color: { findMany: vi.fn(), updateMany: vi.fn() },
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
	ADMIN_COLOR_LIMITS: { BULK_OPERATIONS: "bulk" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	safeFormGetJSON: (formData: FormData, key: string) => {
		const v = formData.get(key);
		if (typeof v !== "string") return null;
		try {
			return JSON.parse(v);
		} catch {
			return null;
		}
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: vi.fn() }));
vi.mock("../../constants/cache", () => ({
	COLORS_CACHE_TAGS: { DETAIL: (slug: string) => `color-${slug}` },
	getColorInvalidationTags: mockGetColorInvalidationTags,
}));
vi.mock("../../schemas/color.schemas", () => ({ bulkToggleColorStatusSchema: {} }));

import { bulkToggleColorStatus } from "../bulk-toggle-color-status";

// ============================================================================
// TESTS
// ============================================================================

const COLOR_IDS = ["col-1", "col-2"];

describe("bulkToggleColorStatus", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@test.com" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { ids: COLOR_IDS, isActive: true } });
		mockPrisma.color.findMany.mockResolvedValue([{ slug: "or" }, { slug: "argent" }]);
		mockPrisma.color.updateMany.mockResolvedValue({ count: 2 });
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
		const result = await bulkToggleColorStatus(
			undefined,
			createMockFormData({ ids: JSON.stringify(COLOR_IDS), isActive: "true" }),
		);
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
	});

	it("returns validation error on invalid JSON format", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Aucune couleur selectionnee" },
		});
		const result = await bulkToggleColorStatus(
			undefined,
			createMockFormData({ ids: "not-json", isActive: "true" }),
		);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("updates all colors to active status", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: COLOR_IDS, isActive: true } });
		await bulkToggleColorStatus(
			undefined,
			createMockFormData({ ids: JSON.stringify(COLOR_IDS), isActive: "true" }),
		);

		expect(mockPrisma.color.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: { in: COLOR_IDS } },
				data: { isActive: true },
			}),
		);
	});

	it("updates all colors to inactive status", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: COLOR_IDS, isActive: false } });
		await bulkToggleColorStatus(
			undefined,
			createMockFormData({ ids: JSON.stringify(COLOR_IDS), isActive: "false" }),
		);

		expect(mockPrisma.color.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({ data: { isActive: false } }),
		);
	});

	it("invalidates list and detail cache tags after update", async () => {
		await bulkToggleColorStatus(
			undefined,
			createMockFormData({ ids: JSON.stringify(COLOR_IDS), isActive: "true" }),
		);
		expect(mockUpdateTag).toHaveBeenCalledWith("colors-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("color-or");
		expect(mockUpdateTag).toHaveBeenCalledWith("color-argent");
	});

	it("returns success with count", async () => {
		const result = await bulkToggleColorStatus(
			undefined,
			createMockFormData({ ids: JSON.stringify(COLOR_IDS), isActive: "true" }),
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.color.updateMany.mockRejectedValue(new Error("DB crash"));
		const result = await bulkToggleColorStatus(
			undefined,
			createMockFormData({ ids: JSON.stringify(COLOR_IDS), isActive: "true" }),
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
