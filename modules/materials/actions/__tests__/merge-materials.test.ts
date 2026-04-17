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
	mockNotFound,
	mockGetMaterialInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		material: {
			findUnique: vi.fn(),
			delete: vi.fn(),
		},
		productSku: {
			findMany: vi.fn(),
			updateMany: vi.fn(),
		},
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockNotFound: vi.fn(),
	mockGetMaterialInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdminWithUser: mockRequireAdmin }));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: vi.fn() }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_MATERIAL_LIMITS: { MERGE: "material-merge" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	notFound: mockNotFound,
	BusinessError: class BusinessError extends Error {
		constructor(message: string) {
			super(message);
			this.name = "BusinessError";
		}
	},
}));
vi.mock("../../schemas/materials.schemas", () => ({ mergeMaterialsSchema: {} }));
vi.mock("../../constants/cache", () => ({
	MATERIALS_CACHE_TAGS: {
		LIST: "materials-list",
		DETAIL: (slug: string) => `material-${slug}`,
	},
	getMaterialInvalidationTags: mockGetMaterialInvalidationTags,
}));

import { mergeMaterials } from "../merge-materials";

// ============================================================================
// HELPERS
// ============================================================================

function makeMaterial(overrides: Record<string, unknown> = {}) {
	return {
		id: "material-source",
		name: "Argent 925",
		slug: "argent-925",
		...overrides,
	};
}

const validFormData = createMockFormData({
	sourceId: "material-source",
	targetId: "material-target",
});

// ============================================================================
// TESTS
// ============================================================================

describe("mergeMaterials", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({
			data: { sourceId: "material-source", targetId: "material-target" },
		});
		mockGetMaterialInvalidationTags.mockReturnValue(["materials-list", "admin-badges"]);

		mockPrisma.material.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
			if (where.id === "material-source")
				return Promise.resolve(makeMaterial({ id: "material-source", slug: "argent-925" }));
			if (where.id === "material-target")
				return Promise.resolve(
					makeMaterial({ id: "material-target", name: "Argent sterling", slug: "argent-sterling" }),
				);
			return Promise.resolve(null);
		});
		mockPrisma.productSku.findMany.mockResolvedValue([]);
		mockPrisma.productSku.updateMany.mockResolvedValue({ count: 3 });
		mockPrisma.material.delete.mockResolvedValue({ id: "material-source" });
		mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
			fn(mockPrisma),
		);

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockNotFound.mockImplementation((label: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: `${label} non trouvé`,
		}));
		mockHandleActionError.mockImplementation((e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: e instanceof Error && e.name === "BusinessError" ? e.message : fallback,
		}));
	});

	it("returns auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});
		const result = await mergeMaterials(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("returns rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit" },
		});
		const result = await mergeMaterials(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalide" },
		});
		const result = await mergeMaterials(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("returns not found when source material is missing", async () => {
		mockPrisma.material.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
			if (where.id === "material-source") return Promise.resolve(null);
			return Promise.resolve(makeMaterial({ id: "material-target" }));
		});
		const result = await mergeMaterials(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockNotFound).toHaveBeenCalledWith("Matériau source");
	});

	it("returns not found when target material is missing", async () => {
		mockPrisma.material.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
			if (where.id === "material-source")
				return Promise.resolve(makeMaterial({ id: "material-source" }));
			return Promise.resolve(null);
		});
		const result = await mergeMaterials(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockNotFound).toHaveBeenCalledWith("Matériau cible");
	});

	it("rejects merge when SKU collisions would violate unique index", async () => {
		mockPrisma.productSku.findMany.mockImplementation(
			({ where }: { where: { materialId: string } }) => {
				if (where.materialId === "material-source") {
					return Promise.resolve([
						{
							productId: "p1",
							colorId: "c1",
							size: "M",
							product: { title: "Bague Aurore" },
						},
					]);
				}
				return Promise.resolve([{ productId: "p1", colorId: "c1", size: "M" }]);
			},
		);
		const result = await mergeMaterials(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("conflit");
		expect(result.message).toContain("Bague Aurore");
		expect(mockPrisma.productSku.updateMany).not.toHaveBeenCalled();
		expect(mockPrisma.material.delete).not.toHaveBeenCalled();
	});

	it("reassigns SKUs and deletes source material on success", async () => {
		const result = await mergeMaterials(undefined, validFormData);
		expect(mockPrisma.productSku.updateMany).toHaveBeenCalledWith({
			where: { materialId: "material-source" },
			data: { materialId: "material-target" },
		});
		expect(mockPrisma.material.delete).toHaveBeenCalledWith({ where: { id: "material-source" } });
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("invalidates cache tags for list + both material details", async () => {
		await mergeMaterials(undefined, validFormData);
		const calls = mockUpdateTag.mock.calls.map((c: unknown[]) => c[0]);
		expect(calls).toContain("materials-list");
		expect(calls).toContain("material-argent-925");
		expect(calls).toContain("material-argent-sterling");
	});

	it("returns count in success data", async () => {
		const result = await mergeMaterials(undefined, validFormData);
		expect(result.data).toMatchObject({ reassignedCount: 3, targetId: "material-target" });
	});

	it("handles merge with no SKU reassigned (orphan source)", async () => {
		mockPrisma.productSku.updateMany.mockResolvedValue({ count: 0 });
		const result = await mergeMaterials(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("supprimé");
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.material.delete.mockRejectedValue(new Error("DB crash"));
		const result = await mergeMaterials(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
