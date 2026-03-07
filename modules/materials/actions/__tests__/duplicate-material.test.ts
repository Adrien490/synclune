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
	mockGetMaterialInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		material: {
			findUnique: vi.fn(),
			findMany: vi.fn(),
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
	mockGetMaterialInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdminWithUser: mockRequireAdmin }));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: vi.fn() }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_MATERIAL_LIMITS: { DUPLICATE: "mat-duplicate" },
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
	notFound: mockNotFound,
}));
vi.mock("@/shared/utils/generate-slug", () => ({ generateSlug: mockGenerateSlug }));
vi.mock("../../schemas/materials.schemas", () => ({ duplicateMaterialSchema: {} }));
vi.mock("../../constants/cache", () => ({
	getMaterialInvalidationTags: mockGetMaterialInvalidationTags,
}));

import { duplicateMaterial } from "../duplicate-material";

// ============================================================================
// HELPERS
// ============================================================================

function makeMaterial(overrides: Record<string, unknown> = {}) {
	return {
		id: "mat-1",
		name: "Argent 925",
		slug: "argent-925",
		description: "Argent pur",
		isActive: true,
		...overrides,
	};
}

const validFormData = createMockFormData({ materialId: "mat-1" });

// ============================================================================
// TESTS
// ============================================================================

describe("duplicateMaterial", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { materialId: "mat-1" } });
		mockGenerateSlug.mockResolvedValue("argent-925-copie");
		mockGetMaterialInvalidationTags.mockReturnValue(["materials-list"]);
		mockPrisma.material.findUnique.mockResolvedValue(makeMaterial());
		mockPrisma.material.findMany.mockResolvedValue([]);
		mockPrisma.material.create.mockResolvedValue({
			id: "mat-2",
			name: "Argent 925 (copie)",
			slug: "argent-925-copie",
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
		const result = await duplicateMaterial(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit" },
		});
		const result = await duplicateMaterial(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalide" },
		});
		const result = await duplicateMaterial(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return not found when original material does not exist", async () => {
		mockPrisma.material.findUnique.mockResolvedValue(null);
		const result = await duplicateMaterial(undefined, validFormData);
		expect(mockNotFound).toHaveBeenCalledWith("Materiau");
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should generate name with (copie) suffix when name is available", async () => {
		const result = await duplicateMaterial(undefined, validFormData);
		expect(mockPrisma.material.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				name: "Argent 925 (copie)",
				isActive: false,
			}),
		});
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should increment suffix when (copie) name already exists", async () => {
		// findMany returns existing copies — "(copie)" is taken
		mockPrisma.material.findMany.mockResolvedValue([{ name: "Argent 925 (copie)" }]);

		await duplicateMaterial(undefined, validFormData);

		expect(mockPrisma.material.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				name: "Argent 925 (copie 2)",
				isActive: false,
			}),
		});
	});

	it("should create duplicate with description copied from original", async () => {
		await duplicateMaterial(undefined, validFormData);
		expect(mockPrisma.material.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				description: "Argent pur",
			}),
		});
	});

	it("should invalidate cache after duplication", async () => {
		await duplicateMaterial(undefined, validFormData);
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("should return success with duplicate id and name", async () => {
		const result = await duplicateMaterial(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith(
			expect.stringContaining("Argent 925 (copie)"),
			expect.objectContaining({ id: "mat-2" }),
		);
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.material.create.mockRejectedValue(new Error("DB crash"));
		const result = await duplicateMaterial(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
