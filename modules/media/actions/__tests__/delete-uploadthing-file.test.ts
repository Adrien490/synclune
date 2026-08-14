import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockDeleteFromUrls,
	mockExtractFileKeyFromUrl,
} = vi.hoisted(() => ({
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockDeleteFromUrls: vi.fn(),
	mockExtractFileKeyFromUrl: vi.fn(),
}));

vi.mock("@/modules/admin-auth/lib/require-admin", () => ({
	requireAdmin: mockRequireAdmin,
	requireAdminWithUser: mockRequireAdmin,
}));

vi.mock("@/modules/admin-auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

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

// L'action délègue au service partagé, qui porte la garde anti-suppression des
// archives fiscales et le comptage correct des clés déjà absentes (audit média M7/M8).
vi.mock("@/modules/media/services/delete-uploadthing-files.service", () => ({
	deleteUploadThingFilesFromUrls: mockDeleteFromUrls,
}));

vi.mock("@/modules/media/utils/extract-file-key", () => ({
	extractFileKeyFromUrl: mockExtractFileKeyFromUrl,
}));

vi.mock("@/modules/media/schemas/uploadthing.schemas", () => ({
	deleteUploadThingFileSchema: {},
}));

vi.mock("@/modules/media/constants/upload-limits", () => ({
	MEDIA_LIMITS: { DELETE: "media-delete" },
}));

import { deleteUploadThingFile } from "../delete-uploadthing-file";

// ============================================================================
// HELPERS
// ============================================================================

function createFormData(data: Record<string, string>): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(data)) {
		formData.set(key, value);
	}
	return formData;
}

const VALID_URL = "https://utfs.io/f/abc123.jpg";
const VALID_FILE_KEY = "abc123.jpg";
const validFormData = createFormData({ fileUrl: VALID_URL });

// ============================================================================
// TESTS
// ============================================================================

describe("deleteUploadThingFile", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		// Default: admin authenticated
		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1" } });

		// Default: rate limit passes
		mockEnforceRateLimit.mockResolvedValue({ success: true });

		// Default: validation passes
		mockValidateInput.mockReturnValue({ data: { fileUrl: VALID_URL } });

		// Default: key extraction succeeds
		mockExtractFileKeyFromUrl.mockReturnValue(VALID_FILE_KEY);

		// Default: deletion succeeds
		mockDeleteFromUrls.mockResolvedValue({ deleted: 1, failed: 0 });

		// Default: response helpers return shaped ActionState
		mockSuccess.mockImplementation((message: string, data?: Record<string, unknown>) => ({
			status: ActionStatus.SUCCESS,
			message,
			data,
		}));
		mockError.mockImplementation((message: string) => ({
			status: ActionStatus.ERROR,
			message,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	// ──────────────────────────────────────────────────────────────
	// Auth
	// ──────────────────────────────────────────────────────────────

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" };
		mockRequireAdmin.mockResolvedValue({ error: authError });

		const result = await deleteUploadThingFile(undefined, validFormData);

		expect(result).toEqual(authError);
		expect(mockDeleteFromUrls).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Rate limiting
	// ──────────────────────────────────────────────────────────────

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await deleteUploadThingFile(undefined, validFormData);

		expect(result).toEqual(rateLimitError);
		expect(mockDeleteFromUrls).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Validation
	// ──────────────────────────────────────────────────────────────

	it("should return validation error for invalid fileUrl", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "URL invalide" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await deleteUploadThingFile(undefined, validFormData);

		expect(result).toEqual(validationError);
		expect(mockDeleteFromUrls).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Delegation au service partagé
	// ──────────────────────────────────────────────────────────────

	it("should delegate the deletion to the shared service with the validated URL", async () => {
		await deleteUploadThingFile(undefined, validFormData);

		expect(mockDeleteFromUrls).toHaveBeenCalledWith([VALID_URL]);
	});

	it("should return an error when the service reports a failure", async () => {
		mockDeleteFromUrls.mockResolvedValue({ deleted: 0, failed: 1 });

		const result = await deleteUploadThingFile(undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith("La suppression du fichier a échoué côté UploadThing");
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	// Audit média M8 : une clé déjà absente n'est PAS un échec — le fichier n'est
	// plus là, l'objectif est atteint. L'ancien calcul local la comptait en échec.
	it("should succeed when the file was already absent (deleted=0, failed=0)", async () => {
		mockDeleteFromUrls.mockResolvedValue({ deleted: 0, failed: 0 });

		const result = await deleteUploadThingFile(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	// ──────────────────────────────────────────────────────────────
	// Success
	// ──────────────────────────────────────────────────────────────

	it("should return success with deleted file key on successful deletion", async () => {
		const result = await deleteUploadThingFile(undefined, validFormData);

		expect(mockSuccess).toHaveBeenCalledWith("Fichier supprime", {
			deletedFile: VALID_FILE_KEY,
		});
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	// ──────────────────────────────────────────────────────────────
	// Error handling
	// ──────────────────────────────────────────────────────────────

	it("should call handleActionError on unexpected exception", async () => {
		mockDeleteFromUrls.mockRejectedValue(new Error("Network failure"));

		const result = await deleteUploadThingFile(undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Impossible de supprimer le fichier",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
