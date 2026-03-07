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
		color: { findMany: vi.fn(), deleteMany: vi.fn() },
		$transaction: vi.fn(),
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
	BusinessError: class BusinessError extends Error {
		constructor(message: string) {
			super(message);
			this.name = "BusinessError";
		}
	},
}));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: vi.fn() }));
vi.mock("../../constants/cache", () => ({
	COLORS_CACHE_TAGS: { DETAIL: (slug: string) => `color-${slug}` },
	getColorInvalidationTags: mockGetColorInvalidationTags,
}));
vi.mock("../../schemas/color.schemas", () => ({ bulkDeleteColorsSchema: {} }));

import { bulkDeleteColors } from "../bulk-delete-colors";

// ============================================================================
// TESTS
// ============================================================================

const COLOR_IDS = ["col-1", "col-2"];

describe("bulkDeleteColors", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@test.com" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { ids: COLOR_IDS } });
		mockPrisma.color.findMany.mockResolvedValue([
			{ id: "col-1", name: "Or", slug: "or", _count: { skus: 0 } },
			{ id: "col-2", name: "Argent", slug: "argent", _count: { skus: 0 } },
		]);
		mockPrisma.color.deleteMany.mockResolvedValue({ count: 2 });
		mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
			fn(mockPrisma),
		);
		mockGetColorInvalidationTags.mockReturnValue(["colors-list"]);

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
		mockHandleActionError.mockImplementation((e: unknown, f: string) => ({
			status: ActionStatus.ERROR,
			message: e instanceof Error && e.name === "BusinessError" ? e.message : f,
		}));
	});

	it("returns auth error when user is not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.FORBIDDEN, message: "Admin requis" },
		});
		const result = await bulkDeleteColors(
			undefined,
			createMockFormData({ ids: JSON.stringify(COLOR_IDS) }),
		);
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
	});

	it("returns error when colors are used by SKUs", async () => {
		mockPrisma.color.findMany.mockResolvedValue([
			{ id: "col-1", name: "Or", slug: "or", _count: { skus: 3 } },
		]);

		const result = await bulkDeleteColors(
			undefined,
			createMockFormData({ ids: JSON.stringify(COLOR_IDS) }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("utilisee");
		expect(mockPrisma.color.deleteMany).not.toHaveBeenCalled();
	});

	it("deletes unused colors", async () => {
		await bulkDeleteColors(undefined, createMockFormData({ ids: JSON.stringify(COLOR_IDS) }));

		expect(mockPrisma.color.deleteMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: { in: COLOR_IDS } } }),
		);
	});

	it("returns validation error on invalid JSON format", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Aucune couleur sélectionnée" },
		});
		const result = await bulkDeleteColors(undefined, createMockFormData({ ids: "not-json" }));
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("invalidates cache after deletion", async () => {
		await bulkDeleteColors(undefined, createMockFormData({ ids: JSON.stringify(COLOR_IDS) }));
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("returns success with count", async () => {
		const result = await bulkDeleteColors(
			undefined,
			createMockFormData({ ids: JSON.stringify(COLOR_IDS) }),
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.color.deleteMany.mockRejectedValue(new Error("DB crash"));
		const result = await bulkDeleteColors(
			undefined,
			createMockFormData({ ids: JSON.stringify(COLOR_IDS) }),
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
