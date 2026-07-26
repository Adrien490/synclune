import { describe, it, expect } from "vitest";
import { isVideo, isImage, getVideoMimeType, resolveMediaThumbSrc } from "../media-utils";

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

// ============================================================================
// resolveMediaThumbSrc
// ============================================================================

describe("resolveMediaThumbSrc", () => {
	it("returns the url for an IMAGE", () => {
		expect(resolveMediaThumbSrc({ url: "https://cdn/photo.jpg", mediaType: "IMAGE" })).toBe(
			"https://cdn/photo.jpg",
		);
	});

	it("ignores thumbnailUrl on an IMAGE (poster is a video-only field)", () => {
		expect(
			resolveMediaThumbSrc({
				url: "https://cdn/photo.jpg",
				thumbnailUrl: "https://cdn/poster.jpg",
				mediaType: "IMAGE",
			}),
		).toBe("https://cdn/photo.jpg");
	});

	it("returns the poster for a VIDEO that has one", () => {
		expect(
			resolveMediaThumbSrc({
				url: "https://cdn/clip.mp4",
				thumbnailUrl: "https://cdn/poster.jpg",
				mediaType: "VIDEO",
			}),
		).toBe("https://cdn/poster.jpg");
	});

	it("returns null for a VIDEO without poster — never the .mp4 URL", () => {
		// Une URL .mp4 dans <Image src> = vignette cassée + transformation facturée
		expect(resolveMediaThumbSrc({ url: "https://cdn/clip.mp4", mediaType: "VIDEO" })).toBeNull();
	});

	it("treats a null poster like an absent one", () => {
		expect(
			resolveMediaThumbSrc({
				url: "https://cdn/clip.mp4",
				thumbnailUrl: null,
				mediaType: "VIDEO",
			}),
		).toBeNull();
	});
});
