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
	mockUpdateTag,
	mockValidateInput,
	mockHandleActionError,
	mockGetMaterialInvalidationTags,
	mockSanitizeText,
	mockGenerateSlug,
} = vi.hoisted(() => ({
	mockPrisma: {
		material: {
			findUnique: vi.fn(),
			findFirst: vi.fn(),
			update: vi.fn(),
		},
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockGetMaterialInvalidationTags: vi.fn(),
	mockSanitizeText: vi.fn((text: string) => text),
	mockGenerateSlug: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdmin,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_MATERIAL_LIMITS: { UPDATE: "admin-material-update" },
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: (message: string) => ({ status: ActionStatus.SUCCESS, message }),
	error: (message: string) => ({ status: ActionStatus.ERROR, message }),
}));

vi.mock("@/shared/lib/audit-log", () => ({
	logAudit: vi.fn(),
	logAuditTx: vi.fn(),
}));

vi.mock("@/shared/lib/sanitize", () => ({
	sanitizeText: mockSanitizeText,
}));

vi.mock("@/shared/utils/generate-slug", () => ({
	generateSlug: mockGenerateSlug,
}));

vi.mock("../../constants/cache", () => ({
	getMaterialInvalidationTags: mockGetMaterialInvalidationTags,
}));

vi.mock("../../schemas/materials.schemas", () => ({
	updateMaterialSchema: {},
}));

import { updateMaterial } from "../update-material";

// ============================================================================
// HELPERS
// ============================================================================

function makeFormData(overrides: Record<string, string | null> = {}) {
	return createMockFormData({
		id: VALID_CUID,
		name: "Argent 925",
		slug: "argent-925",
		description: "Argent de haute qualite",
		isActive: "true",
		...overrides,
	});
}

function createMockMaterial(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_CUID,
		name: "Argent 925",
		slug: "argent-925",
		description: "Argent de haute qualite",
		isActive: true,
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("updateMaterial", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSanitizeText.mockImplementation((text: string) => text);
		mockGetMaterialInvalidationTags.mockReturnValue(["materials-list", "material-argent-925"]);
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
		mockValidateInput.mockImplementation((_schema: unknown, data: unknown) => ({
			data: data as {
				id: string;
				name: string;
				slug: unknown;
				description: string | null;
				isActive: boolean;
			},
		}));

		mockPrisma.material.findUnique.mockResolvedValue(createMockMaterial());
		mockPrisma.material.findFirst.mockResolvedValue(null);
		mockPrisma.material.update.mockResolvedValue({});
		mockGenerateSlug.mockResolvedValue("new-slug");
	});

	// --------------------------------------------------------------------------
	// Auth
	// --------------------------------------------------------------------------

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" };
		mockRequireAdmin.mockResolvedValue({ error: authError });

		const result = await updateMaterial(undefined, makeFormData());

		expect(result).toEqual(authError);
		expect(mockPrisma.material.findUnique).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Rate limit
	// --------------------------------------------------------------------------

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await updateMaterial(undefined, makeFormData());

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.material.findUnique).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Validation
	// --------------------------------------------------------------------------

	it("should return validation error when validateInput fails", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "Données invalides" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await updateMaterial(undefined, makeFormData());

		expect(result).toEqual(validationError);
		expect(mockPrisma.material.findUnique).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Not found
	// --------------------------------------------------------------------------

	it("should return error when material does not exist", async () => {
		mockValidateInput.mockReturnValue({
			data: {
				id: VALID_CUID,
				name: "Argent 925",
				slug: "argent-925",
				description: null,
				isActive: true,
			},
		});
		mockPrisma.material.findUnique.mockResolvedValue(null);

		const result = await updateMaterial(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("n'existe pas");
		expect(mockPrisma.material.update).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Duplicate name check
	// --------------------------------------------------------------------------

	it("should return error when new name already exists for another material", async () => {
		mockValidateInput.mockReturnValue({
			data: { id: VALID_CUID, name: "Or 14k", slug: "or-14k", description: null, isActive: true },
		});
		mockPrisma.material.findUnique.mockResolvedValue(createMockMaterial({ name: "Argent 925" }));
		mockPrisma.material.findFirst.mockResolvedValue({ id: "other-id", name: "Or 14k" });

		const result = await updateMaterial(undefined, makeFormData({ name: "Or 14k" }));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("existe deja");
		expect(mockPrisma.material.update).not.toHaveBeenCalled();
	});

	it("should not check for duplicate name when name has not changed", async () => {
		mockValidateInput.mockReturnValue({
			data: {
				id: VALID_CUID,
				name: "Argent 925",
				slug: "argent-925",
				description: null,
				isActive: true,
			},
		});
		mockPrisma.material.findUnique.mockResolvedValue(createMockMaterial({ name: "Argent 925" }));

		await updateMaterial(undefined, makeFormData());

		expect(mockPrisma.material.findFirst).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Slug regeneration
	// --------------------------------------------------------------------------

	it("should generate a new slug when name has changed", async () => {
		mockValidateInput.mockReturnValue({
			data: { id: VALID_CUID, name: "Or 14k", slug: "or-14k", description: null, isActive: true },
		});
		mockPrisma.material.findUnique.mockResolvedValue(
			createMockMaterial({ name: "Argent 925", slug: "argent-925" }),
		);
		mockPrisma.material.findFirst.mockResolvedValue(null);
		mockGenerateSlug.mockResolvedValue("or-14k");

		await updateMaterial(undefined, makeFormData({ name: "Or 14k" }));

		expect(mockGenerateSlug).toHaveBeenCalledWith(mockPrisma, "material", "Or 14k");
	});

	it("should keep existing slug when name has not changed", async () => {
		mockValidateInput.mockReturnValue({
			data: {
				id: VALID_CUID,
				name: "Argent 925",
				slug: "argent-925",
				description: null,
				isActive: true,
			},
		});
		mockPrisma.material.findUnique.mockResolvedValue(
			createMockMaterial({ name: "Argent 925", slug: "argent-925" }),
		);

		await updateMaterial(undefined, makeFormData());

		expect(mockGenerateSlug).not.toHaveBeenCalled();
		expect(mockPrisma.material.update).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ slug: "argent-925" }) }),
		);
	});

	// --------------------------------------------------------------------------
	// Update
	// --------------------------------------------------------------------------

	it("should update material with sanitized name and description", async () => {
		mockSanitizeText.mockReturnValue("Argent 925 pur");
		mockValidateInput.mockReturnValue({
			data: {
				id: VALID_CUID,
				name: "Argent 925 pur",
				slug: "argent-925",
				description: "Description",
				isActive: false,
			},
		});
		mockPrisma.material.findUnique.mockResolvedValue(createMockMaterial({ name: "Argent 925" }));
		mockPrisma.material.findFirst.mockResolvedValue(null);
		mockGenerateSlug.mockResolvedValue("argent-925-pur");

		const result = await updateMaterial(undefined, makeFormData({ name: "Argent 925 pur" }));

		expect(mockPrisma.material.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: VALID_CUID },
				data: expect.objectContaining({ name: "Argent 925 pur", slug: "argent-925-pur" }),
			}),
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	// --------------------------------------------------------------------------
	// Cache invalidation - both old and new slug
	// --------------------------------------------------------------------------

	it("should invalidate both old and new slug when slug has changed", async () => {
		mockValidateInput.mockReturnValue({
			data: { id: VALID_CUID, name: "Or 14k", slug: "or-14k", description: null, isActive: true },
		});
		mockPrisma.material.findUnique.mockResolvedValue(
			createMockMaterial({ name: "Argent 925", slug: "argent-925" }),
		);
		mockPrisma.material.findFirst.mockResolvedValue(null);
		mockGenerateSlug.mockResolvedValue("or-14k-nouveau");

		await updateMaterial(undefined, makeFormData({ name: "Or 14k" }));

		expect(mockGetMaterialInvalidationTags).toHaveBeenCalledWith("argent-925");
		expect(mockGetMaterialInvalidationTags).toHaveBeenCalledWith("or-14k-nouveau");
	});

	it("should only invalidate old slug when name has not changed", async () => {
		mockValidateInput.mockReturnValue({
			data: {
				id: VALID_CUID,
				name: "Argent 925",
				slug: "argent-925",
				description: null,
				isActive: true,
			},
		});
		mockPrisma.material.findUnique.mockResolvedValue(
			createMockMaterial({ name: "Argent 925", slug: "argent-925" }),
		);

		await updateMaterial(undefined, makeFormData());

		expect(mockGetMaterialInvalidationTags).toHaveBeenCalledWith("argent-925");
		expect(mockGetMaterialInvalidationTags).toHaveBeenCalledTimes(1);
	});

	// --------------------------------------------------------------------------
	// Error handling
	// --------------------------------------------------------------------------

	it("should call handleActionError on unexpected exception", async () => {
		mockValidateInput.mockReturnValue({
			data: {
				id: VALID_CUID,
				name: "Argent 925",
				slug: "argent-925",
				description: null,
				isActive: true,
			},
		});
		mockPrisma.material.findUnique.mockRejectedValue(new Error("DB crash"));

		const result = await updateMaterial(undefined, makeFormData());

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
