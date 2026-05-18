import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID, VALID_CUID_2 } from "@/test/factories";

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
	mockParseFormIds,
} = vi.hoisted(() => ({
	mockPrisma: {
		color: { findMany: vi.fn(), updateMany: vi.fn() },
		productSku: { findMany: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockGetColorInvalidationTags: vi.fn(),
	mockParseFormIds: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
	requireAdminWithUser: mockRequireAdmin,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_COLOR_LIMITS: { BULK_OPERATIONS: "bulk" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/shared/lib/actions", () => ({
	parseFormIds: mockParseFormIds,
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("../../constants/cache", () => ({
	getColorInvalidationTags: mockGetColorInvalidationTags,
}));
vi.mock("../../schemas/color.schemas", () => ({ bulkToggleColorsStatusSchema: {} }));

import { bulkToggleColorsStatus } from "../bulk-toggle-colors-status";

// ============================================================================
// TESTS
// ============================================================================

const COLOR_ID_1 = VALID_CUID;
const COLOR_ID_2 = VALID_CUID_2;

describe("bulkToggleColorsStatus", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@test.com" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockParseFormIds.mockReturnValue({ ids: [COLOR_ID_1, COLOR_ID_2] });
		mockValidateInput.mockReturnValue({
			data: { colorIds: [COLOR_ID_1, COLOR_ID_2], targetIsActive: false },
		});
		mockPrisma.color.findMany.mockResolvedValue([
			{ id: COLOR_ID_1, slug: "or", name: "Or", isActive: true },
			{ id: COLOR_ID_2, slug: "argent", name: "Argent", isActive: true },
		]);
		mockPrisma.color.updateMany.mockResolvedValue({ count: 2 });
		mockPrisma.productSku.findMany.mockResolvedValue([
			{ product: { slug: "bague-or" } },
			{ product: { slug: "collier-argent" } },
		]);
		mockGetColorInvalidationTags.mockImplementation(
			(opts?: { slug?: string; affectedProductSlugs?: readonly string[] }) => {
				const tags = ["colors-list", "admin-badges"];
				if (opts?.slug) tags.push(`color-${opts.slug}`);
				if (opts?.affectedProductSlugs?.length) {
					tags.push("products-list");
					for (const s of opts.affectedProductSlugs) tags.push(`product-${s}`);
				}
				return tags;
			},
		);

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
		mockHandleActionError.mockImplementation((_e: unknown, f: string) => ({
			status: ActionStatus.ERROR,
			message: f,
		}));
	});

	const validForm = () =>
		createMockFormData({
			colorIds: JSON.stringify([COLOR_ID_1, COLOR_ID_2]),
			targetIsActive: "false",
		});

	it("returns auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.FORBIDDEN, message: "Admin requis" },
		});
		const result = await bulkToggleColorsStatus(undefined, validForm());
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("returns rate-limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limited" },
		});
		const result = await bulkToggleColorsStatus(undefined, validForm());
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns error when parseFormIds fails", async () => {
		mockParseFormIds.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "ids invalides" },
		});
		const result = await bulkToggleColorsStatus(undefined, validForm());
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("returns validation error from schema", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalide" },
		});
		const result = await bulkToggleColorsStatus(undefined, validForm());
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("returns error when no colors found", async () => {
		mockPrisma.color.findMany.mockResolvedValue([]);
		await bulkToggleColorsStatus(undefined, validForm());
		expect(mockError).toHaveBeenCalledWith("Aucune couleur valide trouvée");
	});

	it("returns error when all colors already in target state", async () => {
		mockPrisma.color.findMany.mockResolvedValue([
			{ id: COLOR_ID_1, slug: "or", name: "Or", isActive: false },
			{ id: COLOR_ID_2, slug: "argent", name: "Argent", isActive: false },
		]);
		await bulkToggleColorsStatus(undefined, validForm());
		expect(mockError).toHaveBeenCalledWith("Toutes les couleurs sélectionnées sont déjà inactives");
	});

	it("updates only eligible colors (skip those already in target state)", async () => {
		mockPrisma.color.findMany.mockResolvedValue([
			{ id: COLOR_ID_1, slug: "or", name: "Or", isActive: true },
			{ id: COLOR_ID_2, slug: "argent", name: "Argent", isActive: false },
		]);
		await bulkToggleColorsStatus(undefined, validForm());
		expect(mockPrisma.color.updateMany).toHaveBeenCalledWith({
			where: { id: { in: [COLOR_ID_1] } },
			data: { isActive: false },
		});
	});

	it("cascades invalidation to affected product PDPs in a single batched query", async () => {
		await bulkToggleColorsStatus(undefined, validForm());
		// Batched query : pas N+1, une seule findMany avec `in: eligibleIds`.
		expect(mockPrisma.productSku.findMany).toHaveBeenCalledTimes(1);
		expect(mockPrisma.productSku.findMany).toHaveBeenCalledWith({
			where: {
				deletedAt: null,
				colors: { some: { colorId: { in: [COLOR_ID_1, COLOR_ID_2] } } },
			},
			select: { product: { select: { slug: true } } },
			distinct: ["productId"],
		});
		const calls = mockUpdateTag.mock.calls.map((c: unknown[]) => c[0]);
		expect(calls).toContain("product-bague-or");
		expect(calls).toContain("product-collier-argent");
		expect(calls).toContain("color-or");
		expect(calls).toContain("color-argent");
	});

	it("returns success with count + targetIsActive in data", async () => {
		const result = await bulkToggleColorsStatus(undefined, validForm());
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toMatchObject({ count: 2, targetIsActive: false });
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.color.updateMany.mockRejectedValue(new Error("DB crash"));
		const result = await bulkToggleColorsStatus(undefined, validForm());
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockHandleActionError).toHaveBeenCalled();
	});
});
