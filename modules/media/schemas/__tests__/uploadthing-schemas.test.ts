import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

// Mock isValidUploadThingUrl before importing the schemas that depend on it.
// Returns true for URLs on utfs.io (canonical UploadThing domain), false otherwise.
const { mockIsValidUploadThingUrl } = vi.hoisted(() => ({
	mockIsValidUploadThingUrl: vi.fn((url: string) => url.includes("utfs.io")),
}));

vi.mock("@/modules/media/utils/validate-media-file", () => ({
	isValidUploadThingUrl: mockIsValidUploadThingUrl,
	// Re-export other named exports that may be imported transitively
	isVideoFile: vi.fn(),
	validateMediaFile: vi.fn(),
	validatePrimaryImage: vi.fn(),
	validateMediaFiles: vi.fn(),
	isValidCuid: vi.fn(),
}));

// ============================================================================
// Imports under test (after mocks)
// ============================================================================

import { deleteUploadThingFileSchema, deleteUploadThingFilesSchema } from "../uploadthing.schemas";

// ============================================================================
// Helpers
// ============================================================================

const VALID_URL = "https://utfs.io/f/abc123";
const NON_UPLOADTHING_URL = "https://example.com/image.jpg";
const INVALID_URL = "not-a-url";

function makeUrls(count: number): string[] {
	return Array.from({ length: count }, (_, i) => `https://utfs.io/f/file-${i}`);
}

// ============================================================================
// deleteUploadThingFileSchema
// ============================================================================

describe("deleteUploadThingFileSchema", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Default: treat utfs.io as valid
		mockIsValidUploadThingUrl.mockImplementation((url: string) => url.includes("utfs.io"));
	});

	it("accepts a valid UploadThing URL", () => {
		const result = deleteUploadThingFileSchema.safeParse({ fileUrl: VALID_URL });
		expect(result.success).toBe(true);
	});

	it("rejects an invalid URL (not a URL at all)", () => {
		const result = deleteUploadThingFileSchema.safeParse({ fileUrl: INVALID_URL });
		expect(result.success).toBe(false);
	});

	it("rejects a well-formed URL from a non-UploadThing domain", () => {
		mockIsValidUploadThingUrl.mockReturnValue(false);
		const result = deleteUploadThingFileSchema.safeParse({ fileUrl: NON_UPLOADTHING_URL });
		expect(result.success).toBe(false);
	});

	it("rejects missing fileUrl field", () => {
		const result = deleteUploadThingFileSchema.safeParse({});
		expect(result.success).toBe(false);
	});

	it("calls isValidUploadThingUrl with the provided URL", () => {
		deleteUploadThingFileSchema.safeParse({ fileUrl: VALID_URL });
		expect(mockIsValidUploadThingUrl).toHaveBeenCalledWith(VALID_URL);
	});
});

// ============================================================================
// deleteUploadThingFilesSchema
// ============================================================================

describe("deleteUploadThingFilesSchema", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsValidUploadThingUrl.mockImplementation((url: string) => url.includes("utfs.io"));
	});

	it("accepts an array of valid UploadThing URLs", () => {
		const result = deleteUploadThingFilesSchema.safeParse({
			fileUrls: [VALID_URL, "https://utfs.io/f/def456"],
		});
		expect(result.success).toBe(true);
	});

	it("accepts an array with a single valid URL", () => {
		const result = deleteUploadThingFilesSchema.safeParse({ fileUrls: [VALID_URL] });
		expect(result.success).toBe(true);
	});

	it("rejects an empty array (min 1)", () => {
		const result = deleteUploadThingFilesSchema.safeParse({ fileUrls: [] });
		expect(result.success).toBe(false);
	});

	it("rejects an array with more than 100 URLs (max 100)", () => {
		const result = deleteUploadThingFilesSchema.safeParse({ fileUrls: makeUrls(101) });
		expect(result.success).toBe(false);
	});

	it("accepts an array of exactly 100 URLs", () => {
		const result = deleteUploadThingFilesSchema.safeParse({ fileUrls: makeUrls(100) });
		expect(result.success).toBe(true);
	});

	it("rejects an array containing a non-UploadThing URL", () => {
		mockIsValidUploadThingUrl.mockImplementation((url: string) => url.includes("utfs.io"));
		const result = deleteUploadThingFilesSchema.safeParse({
			fileUrls: [VALID_URL, NON_UPLOADTHING_URL],
		});
		// NON_UPLOADTHING_URL passes z.string().url() but fails the refine
		// mockIsValidUploadThingUrl returns false for non-utfs.io URLs
		expect(result.success).toBe(false);
	});

	it("rejects missing fileUrls field", () => {
		const result = deleteUploadThingFilesSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});
