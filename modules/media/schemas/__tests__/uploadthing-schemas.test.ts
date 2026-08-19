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

import { deleteUploadThingFileSchema } from "../uploadthing.schemas";

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
