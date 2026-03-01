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
	mockDeleteFiles,
	mockExtractFileKeyFromUrl,
} = vi.hoisted(() => ({
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockDeleteFiles: vi.fn(),
	mockExtractFileKeyFromUrl: vi.fn(),
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
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

// Mock UTApi as a constructable class — arrow functions cannot be used with `new`
vi.mock("uploadthing/server", () => {
	function MockUTApi(this: { deleteFiles: typeof mockDeleteFiles }) {
		this.deleteFiles = mockDeleteFiles;
	}
	return { UTApi: MockUTApi };
});

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

		// Default: UploadThing deletion succeeds
		mockDeleteFiles.mockResolvedValue({ success: true, deletedCount: 1 });

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
		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Rate limiting
	// ──────────────────────────────────────────────────────────────

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await deleteUploadThingFile(undefined, validFormData);

		expect(result).toEqual(rateLimitError);
		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Validation
	// ──────────────────────────────────────────────────────────────

	it("should return validation error for invalid fileUrl", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "URL invalide" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await deleteUploadThingFile(undefined, validFormData);

		expect(result).toEqual(validationError);
		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Key extraction
	// ──────────────────────────────────────────────────────────────

	it("should return error when file key cannot be extracted from URL", async () => {
		mockExtractFileKeyFromUrl.mockReturnValue(null);

		const result = await deleteUploadThingFile(undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith("Impossible d'extraire la cle du fichier depuis l'URL");
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});

	it("should call extractFileKeyFromUrl with the validated URL", async () => {
		await deleteUploadThingFile(undefined, validFormData);

		expect(mockExtractFileKeyFromUrl).toHaveBeenCalledWith(VALID_URL);
	});

	// ──────────────────────────────────────────────────────────────
	// UploadThing deletion
	// ──────────────────────────────────────────────────────────────

	it("should call UTApi.deleteFiles with the extracted file key", async () => {
		await deleteUploadThingFile(undefined, validFormData);

		expect(mockDeleteFiles).toHaveBeenCalledWith(VALID_FILE_KEY);
	});

	it("should return error when UTApi reports success=false", async () => {
		mockDeleteFiles.mockResolvedValue({ success: false, deletedCount: 0 });

		const result = await deleteUploadThingFile(undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith("La suppression du fichier a echoue cote UploadThing");
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return error when UTApi reports deletedCount=0 despite success=true", async () => {
		mockDeleteFiles.mockResolvedValue({ success: true, deletedCount: 0 });

		const result = await deleteUploadThingFile(undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith("La suppression du fichier a echoue cote UploadThing");
		expect(result.status).toBe(ActionStatus.ERROR);
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
		mockDeleteFiles.mockRejectedValue(new Error("Network failure"));

		const result = await deleteUploadThingFile(undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Impossible de supprimer le fichier",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
