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
	mockGetMaterialInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		material: {
			findUnique: vi.fn(),
			delete: vi.fn(),
		},
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockGetMaterialInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdminWithUser: mockRequireAdmin }));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: vi.fn() }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_MATERIAL_LIMITS: { DELETE: "mat-delete" },
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
}));
vi.mock("../../schemas/materials.schemas", () => ({ deleteMaterialSchema: {} }));
vi.mock("../../constants/cache", () => ({
	getMaterialInvalidationTags: mockGetMaterialInvalidationTags,
}));

import { deleteMaterial } from "../delete-material";

// ============================================================================
// HELPERS
// ============================================================================

function makeMaterial(overrides: Record<string, unknown> = {}) {
	return {
		id: "mat-1",
		name: "Argent 925",
		slug: "argent-925",
		description: null,
		_count: { skus: 0 },
		...overrides,
	};
}

const validFormData = createMockFormData({ id: "mat-1" });

// ============================================================================
// TESTS
// ============================================================================

describe("deleteMaterial", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { id: "mat-1" } });
		mockGetMaterialInvalidationTags.mockReturnValue(["materials-list", "material-argent-925"]);
		mockPrisma.material.findUnique.mockResolvedValue(makeMaterial());
		mockPrisma.material.delete.mockResolvedValue({ id: "mat-1" });

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
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});
		const result = await deleteMaterial(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit" },
		});
		const result = await deleteMaterial(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalide" },
		});
		const result = await deleteMaterial(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return error when material does not exist", async () => {
		mockPrisma.material.findUnique.mockResolvedValue(null);
		const result = await deleteMaterial(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("existe pas");
	});

	it("should return error when material is used by skus (singular)", async () => {
		mockPrisma.material.findUnique.mockResolvedValue(makeMaterial({ _count: { skus: 1 } }));
		const result = await deleteMaterial(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("1 variante");
	});

	it("should return error when material is used by multiple skus (plural)", async () => {
		mockPrisma.material.findUnique.mockResolvedValue(makeMaterial({ _count: { skus: 6 } }));
		const result = await deleteMaterial(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("6 variantes");
	});

	it("should delete the material and return success", async () => {
		const result = await deleteMaterial(undefined, validFormData);
		expect(mockPrisma.material.delete).toHaveBeenCalledWith({ where: { id: "mat-1" } });
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should pass slug to getMaterialInvalidationTags for targeted cache invalidation", async () => {
		await deleteMaterial(undefined, validFormData);
		expect(mockGetMaterialInvalidationTags).toHaveBeenCalledWith("argent-925");
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.material.delete.mockRejectedValue(new Error("DB crash"));
		const result = await deleteMaterial(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
