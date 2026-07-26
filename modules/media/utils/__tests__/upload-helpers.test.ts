import { describe, it, expect } from "vitest";
import { MAX_UPLOAD_SIZE_VIDEO } from "@/modules/media/constants/upload-size-limits";
import {
	DEFAULT_MAX_SIZE_IMAGE,
	DEFAULT_MAX_SIZE_VIDEO,
	DEFAULT_MAX_FILES,
	DEFAULT_VIDEO_CONCURRENCY,
	formatFileSize,
	getMediaTypeFromFile,
	isValidMediaType,
} from "../upload-helpers";

// ============================================================================
// CONSTANTS
// ============================================================================

describe("constants", () => {
	it("DEFAULT_MAX_SIZE_IMAGE is 16MB", () => {
		expect(DEFAULT_MAX_SIZE_IMAGE).toBe(16 * 1024 * 1024);
	});

	it("DEFAULT_MAX_SIZE_VIDEO suit la SSOT des plafonds d'upload", () => {
		// Ramené de 512 Mo à 64 Mo (audit coûts P2-2) : 512 × 6 = 3 Go en un
		// upload faisait sauter le quota UploadThing gratuit d'un coup.
		expect(DEFAULT_MAX_SIZE_VIDEO).toBe(MAX_UPLOAD_SIZE_VIDEO);
	});

	it("DEFAULT_MAX_FILES is 6", () => {
		expect(DEFAULT_MAX_FILES).toBe(6);
	});

	it("DEFAULT_VIDEO_CONCURRENCY is 2", () => {
		expect(DEFAULT_VIDEO_CONCURRENCY).toBe(2);
	});
});

// ============================================================================
// formatFileSize
// ============================================================================

describe("formatFileSize", () => {
	it("formats bytes under 1KB", () => {
		expect(formatFileSize(0)).toBe("0 B");
		expect(formatFileSize(512)).toBe("512 B");
		expect(formatFileSize(1023)).toBe("1023 B");
	});

	it("formats kilobytes", () => {
		expect(formatFileSize(1024)).toBe("1.0 KB");
		expect(formatFileSize(1536)).toBe("1.5 KB");
		expect(formatFileSize(10240)).toBe("10.0 KB");
	});

	it("formats megabytes", () => {
		expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
		expect(formatFileSize(1.5 * 1024 * 1024)).toBe("1.5 MB");
		expect(formatFileSize(16 * 1024 * 1024)).toBe("16.0 MB");
		expect(formatFileSize(512 * 1024 * 1024)).toBe("512.0 MB");
	});

	it("handles boundary at exactly 1KB", () => {
		expect(formatFileSize(1024)).toBe("1.0 KB");
	});

	it("handles boundary at exactly 1MB", () => {
		expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
	});
});

// ============================================================================
// getMediaTypeFromFile
// ============================================================================

describe("getMediaTypeFromFile", () => {
	function makeFile(type: string): File {
		return new File([""], "test", { type });
	}

	it("returns VIDEO for video MIME types", () => {
		expect(getMediaTypeFromFile(makeFile("video/mp4"))).toBe("VIDEO");
		expect(getMediaTypeFromFile(makeFile("video/webm"))).toBe("VIDEO");
		expect(getMediaTypeFromFile(makeFile("video/quicktime"))).toBe("VIDEO");
	});

	it("returns IMAGE for image MIME types", () => {
		expect(getMediaTypeFromFile(makeFile("image/jpeg"))).toBe("IMAGE");
		expect(getMediaTypeFromFile(makeFile("image/png"))).toBe("IMAGE");
		expect(getMediaTypeFromFile(makeFile("image/webp"))).toBe("IMAGE");
		expect(getMediaTypeFromFile(makeFile("image/avif"))).toBe("IMAGE");
		expect(getMediaTypeFromFile(makeFile("image/gif"))).toBe("IMAGE");
	});

	it("returns IMAGE for non-media MIME types (fallback)", () => {
		expect(getMediaTypeFromFile(makeFile("application/pdf"))).toBe("IMAGE");
		expect(getMediaTypeFromFile(makeFile("text/plain"))).toBe("IMAGE");
		expect(getMediaTypeFromFile(makeFile(""))).toBe("IMAGE");
	});
});

// ============================================================================
// isValidMediaType
// ============================================================================

describe("isValidMediaType", () => {
	function makeFile(type: string): File {
		return new File([""], "test", { type });
	}

	it("accepts image MIME types", () => {
		expect(isValidMediaType(makeFile("image/jpeg"))).toBe(true);
		expect(isValidMediaType(makeFile("image/png"))).toBe(true);
		expect(isValidMediaType(makeFile("image/webp"))).toBe(true);
		expect(isValidMediaType(makeFile("image/avif"))).toBe(true);
		expect(isValidMediaType(makeFile("image/gif"))).toBe(true);
	});

	it("accepts video MIME types", () => {
		expect(isValidMediaType(makeFile("video/mp4"))).toBe(true);
		expect(isValidMediaType(makeFile("video/webm"))).toBe(true);
	});

	it("rejects non-media MIME types", () => {
		expect(isValidMediaType(makeFile("application/pdf"))).toBe(false);
		expect(isValidMediaType(makeFile("text/plain"))).toBe(false);
		expect(isValidMediaType(makeFile("application/json"))).toBe(false);
		expect(isValidMediaType(makeFile("text/html"))).toBe(false);
	});

	it("rejects empty MIME type", () => {
		expect(isValidMediaType(makeFile(""))).toBe(false);
	});
});
