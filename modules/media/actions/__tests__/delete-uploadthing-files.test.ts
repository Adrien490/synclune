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
	mockExtractFileKeysFromUrls,
} = vi.hoisted(() => ({
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockDeleteFiles: vi.fn(),
	mockExtractFileKeysFromUrls: vi.fn(),
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
	extractFileKeysFromUrls: mockExtractFileKeysFromUrls,
}));

vi.mock("@/modules/media/schemas/uploadthing.schemas", () => ({
	deleteUploadThingFilesSchema: {},
}));

vi.mock("@/modules/media/constants/upload-limits", () => ({
	MEDIA_LIMITS: { DELETE: "media-delete" },
}));

import { deleteUploadThingFiles } from "../delete-uploadthing-files";

// ============================================================================
// HELPERS
// ============================================================================

const VALID_URLS = ["https://utfs.io/f/key-one.jpg", "https://utfs.io/f/key-two.png"];
const VALID_KEYS = ["key-one.jpg", "key-two.png"];

function createFormData(data: Record<string, string>): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(data)) {
		formData.set(key, value);
	}
	return formData;
}

const validFormData = createFormData({ fileUrls: JSON.stringify(VALID_URLS) });

// ============================================================================
// TESTS
// ============================================================================

describe("deleteUploadThingFiles", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		// Default: admin authenticated
		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1" } });

		// Default: rate limit passes
		mockEnforceRateLimit.mockResolvedValue({ success: true });

		// Default: validation passes
		mockValidateInput.mockReturnValue({ data: { fileUrls: VALID_URLS } });

		// Default: key extraction succeeds for all URLs
		mockExtractFileKeysFromUrls.mockReturnValue({ keys: VALID_KEYS, failedUrls: [] });

		// Default: UploadThing deletion succeeds
		mockDeleteFiles.mockResolvedValue({ success: true, deletedCount: 2 });

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

		const result = await deleteUploadThingFiles(undefined, validFormData);

		expect(result).toEqual(authError);
		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Rate limiting
	// ──────────────────────────────────────────────────────────────

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await deleteUploadThingFiles(undefined, validFormData);

		expect(result).toEqual(rateLimitError);
		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Presence / format checks
	// ──────────────────────────────────────────────────────────────

	it("should return error when fileUrls field is missing from FormData", async () => {
		const emptyFormData = new FormData();

		const result = await deleteUploadThingFiles(undefined, emptyFormData);

		expect(mockError).toHaveBeenCalledWith("Les URLs de fichiers sont requises");
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});

	it("should return error when fileUrls is not valid JSON", async () => {
		const badFormData = createFormData({ fileUrls: "not-json{{{" });

		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

		const result = await deleteUploadThingFiles(undefined, badFormData);

		expect(mockError).toHaveBeenCalledWith("Format JSON invalide pour les URLs de fichiers");
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockDeleteFiles).not.toHaveBeenCalled();

		consoleSpy.mockRestore();
	});

	// ──────────────────────────────────────────────────────────────
	// Validation
	// ──────────────────────────────────────────────────────────────

	it("should return validation error when Zod schema rejects the parsed data", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "URLs invalides" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await deleteUploadThingFiles(undefined, validFormData);

		expect(result).toEqual(validationError);
		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Key extraction
	// ──────────────────────────────────────────────────────────────

	it("should return error when all key extractions fail", async () => {
		mockExtractFileKeysFromUrls.mockReturnValue({
			keys: [],
			failedUrls: VALID_URLS,
		});

		const result = await deleteUploadThingFiles(undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith(
			"Impossible d'extraire les cles des fichiers depuis les URLs",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});

	it("should log a warning when some URLs fail key extraction but continue with valid keys", async () => {
		mockExtractFileKeysFromUrls.mockReturnValue({
			keys: ["key-one.jpg"],
			failedUrls: ["https://utfs.io/f/"],
		});
		mockDeleteFiles.mockResolvedValue({ success: true, deletedCount: 1 });

		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

		await deleteUploadThingFiles(undefined, validFormData);

		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining("1 URL(s)"),
			expect.arrayContaining(["https://utfs.io/f/"]),
		);
		expect(mockDeleteFiles).toHaveBeenCalled();

		warnSpy.mockRestore();
	});

	// ──────────────────────────────────────────────────────────────
	// UploadThing deletion
	// ──────────────────────────────────────────────────────────────

	it("should call UTApi.deleteFiles with all extracted keys", async () => {
		await deleteUploadThingFiles(undefined, validFormData);

		expect(mockDeleteFiles).toHaveBeenCalledWith(VALID_KEYS);
	});

	it("should return error when UTApi reports success=false", async () => {
		mockDeleteFiles.mockResolvedValue({ success: false, deletedCount: 0 });

		const result = await deleteUploadThingFiles(undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith("La suppression des fichiers a echoue cote UploadThing");
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	// ──────────────────────────────────────────────────────────────
	// Success — full deletion
	// ──────────────────────────────────────────────────────────────

	it("should return success with deletedCount when all files are deleted", async () => {
		const result = await deleteUploadThingFiles(undefined, validFormData);

		expect(mockSuccess).toHaveBeenCalledWith("2 fichier(s) supprime(s)", {
			deletedCount: 2,
		});
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	// ──────────────────────────────────────────────────────────────
	// Success — partial deletion
	// ──────────────────────────────────────────────────────────────

	it("should return success with partial counts when some files could not be processed", async () => {
		// One URL failed extraction, one key was deleted successfully
		mockExtractFileKeysFromUrls.mockReturnValue({
			keys: ["key-one.jpg"],
			failedUrls: ["https://utfs.io/f/bad"],
		});
		mockDeleteFiles.mockResolvedValue({ success: true, deletedCount: 1 });

		vi.spyOn(console, "warn").mockImplementation(() => undefined);

		const result = await deleteUploadThingFiles(undefined, validFormData);

		// totalFailed = failedUrls(1) + utFailures(0) = 1
		expect(mockSuccess).toHaveBeenCalledWith(
			"1 fichier(s) supprime(s). 1 fichier(s) n'ont pas pu etre traite(s).",
			{ deletedCount: 1, failedCount: 1 },
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should account for UTApi partial deletions in the failure count", async () => {
		// Two keys extracted, but UTApi only deletes one
		mockExtractFileKeysFromUrls.mockReturnValue({
			keys: ["key-one.jpg", "key-two.png"],
			failedUrls: [],
		});
		mockDeleteFiles.mockResolvedValue({ success: true, deletedCount: 1 });

		const result = await deleteUploadThingFiles(undefined, validFormData);

		// totalFailed = failedUrls(0) + utFailures(2-1=1) = 1
		expect(mockSuccess).toHaveBeenCalledWith(
			"1 fichier(s) supprime(s). 1 fichier(s) n'ont pas pu etre traite(s).",
			{ deletedCount: 1, failedCount: 1 },
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	// ──────────────────────────────────────────────────────────────
	// Error handling
	// ──────────────────────────────────────────────────────────────

	it("should call handleActionError on unexpected exception", async () => {
		mockDeleteFiles.mockRejectedValue(new Error("Network failure"));

		const result = await deleteUploadThingFiles(undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Une erreur est survenue lors de la suppression des fichiers",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
