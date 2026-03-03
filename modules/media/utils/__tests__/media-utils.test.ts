import { describe, it, expect } from "vitest";
import { isVideo, isImage, getVideoMimeType } from "../media-utils";

// ============================================================================
// isVideo
// ============================================================================

describe("isVideo", () => {
	it("returns true for VIDEO type", () => {
		expect(isVideo("VIDEO")).toBe(true);
	});

	it("returns false for IMAGE type", () => {
		expect(isVideo("IMAGE")).toBe(false);
	});
});

// ============================================================================
// isImage
// ============================================================================

describe("isImage", () => {
	it("returns true for IMAGE type", () => {
		expect(isImage("IMAGE")).toBe(true);
	});

	it("returns false for VIDEO type", () => {
		expect(isImage("VIDEO")).toBe(false);
	});
});

// ============================================================================
// getVideoMimeType
// ============================================================================

describe("getVideoMimeType", () => {
	it("returns video/mp4 for .mp4 URL", () => {
		expect(getVideoMimeType("https://example.com/video.mp4")).toBe("video/mp4");
	});

	it("returns video/mp4 for .MP4 URL (case insensitive)", () => {
		expect(getVideoMimeType("https://example.com/video.MP4")).toBe("video/mp4");
	});

	it("returns video/mp4 for URL with query params", () => {
		expect(getVideoMimeType("https://example.com/video.mp4?quality=high")).toBe("video/mp4");
	});

	it("returns video/mp4 for URL with hash", () => {
		expect(getVideoMimeType("https://example.com/video.mp4#t=10")).toBe("video/mp4");
	});

	it("falls back to video/mp4 for unknown extension", () => {
		expect(getVideoMimeType("https://example.com/video.avi")).toBe("video/mp4");
	});

	it("falls back to video/mp4 for extensionless CDN URL", () => {
		expect(getVideoMimeType("https://utfs.io/f/clabcdef123456789012345")).toBe("video/mp4");
	});
});
