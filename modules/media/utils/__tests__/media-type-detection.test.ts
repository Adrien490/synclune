import { describe, it, expect } from "vitest";
import { isVideoUrl, isImageUrl, detectMediaType, getFileExtension } from "../media-type-detection";

// ============================================================================
// isVideoUrl
// ============================================================================

describe("isVideoUrl", () => {
	it("returns true for .mp4 URL", () => {
		expect(isVideoUrl("https://example.com/video.mp4")).toBe(true);
	});

	it("returns false for .webm URL (not in VIDEO_EXTENSIONS)", () => {
		// Only .mp4 is supported for universal cross-browser compatibility
		expect(isVideoUrl("https://example.com/video.webm")).toBe(false);
	});

	it("returns false for .mov URL (not in VIDEO_EXTENSIONS)", () => {
		expect(isVideoUrl("https://example.com/video.mov")).toBe(false);
	});

	it("returns false for .jpg URL", () => {
		expect(isVideoUrl("https://example.com/photo.jpg")).toBe(false);
	});

	it("returns false for .png URL", () => {
		expect(isVideoUrl("https://example.com/photo.png")).toBe(false);
	});

	it("is case insensitive — .MP4 returns true", () => {
		expect(isVideoUrl("https://example.com/video.MP4")).toBe(true);
	});

	it("is case insensitive — mixed case .Mp4 returns true", () => {
		expect(isVideoUrl("https://example.com/video.Mp4")).toBe(true);
	});
});

// ============================================================================
// isImageUrl
// ============================================================================

describe("isImageUrl", () => {
	it("returns true for .jpg URL", () => {
		expect(isImageUrl("https://example.com/photo.jpg")).toBe(true);
	});

	it("returns true for .jpeg URL", () => {
		expect(isImageUrl("https://example.com/photo.jpeg")).toBe(true);
	});

	it("returns true for .png URL", () => {
		expect(isImageUrl("https://example.com/photo.png")).toBe(true);
	});

	it("returns true for .webp URL", () => {
		expect(isImageUrl("https://example.com/photo.webp")).toBe(true);
	});

	it("returns true for .gif URL", () => {
		expect(isImageUrl("https://example.com/animation.gif")).toBe(true);
	});

	it("returns true for .avif URL", () => {
		expect(isImageUrl("https://example.com/photo.avif")).toBe(true);
	});

	it("returns false for .mp4 URL", () => {
		expect(isImageUrl("https://example.com/video.mp4")).toBe(false);
	});

	it("is case insensitive — .JPG returns true", () => {
		expect(isImageUrl("https://example.com/photo.JPG")).toBe(true);
	});

	it("is case insensitive — .PNG returns true", () => {
		expect(isImageUrl("https://example.com/photo.PNG")).toBe(true);
	});

	it("is case insensitive — .WEBP returns true", () => {
		expect(isImageUrl("https://example.com/photo.WEBP")).toBe(true);
	});
});

// ============================================================================
// detectMediaType
// ============================================================================

describe("detectMediaType", () => {
	it("returns VIDEO for .mp4 URL", () => {
		expect(detectMediaType("https://example.com/video.mp4")).toBe("VIDEO");
	});

	it("returns IMAGE for .jpg URL", () => {
		expect(detectMediaType("https://example.com/photo.jpg")).toBe("IMAGE");
	});

	it("returns IMAGE for .png URL", () => {
		expect(detectMediaType("https://example.com/photo.png")).toBe("IMAGE");
	});

	it("returns IMAGE for .webp URL", () => {
		expect(detectMediaType("https://example.com/photo.webp")).toBe("IMAGE");
	});

	it("defaults to IMAGE for unknown extension", () => {
		// Non-video extensions fall back to IMAGE
		expect(detectMediaType("https://example.com/file.pdf")).toBe("IMAGE");
	});

	it("defaults to IMAGE for extensionless CDN URL", () => {
		expect(detectMediaType("https://utfs.io/f/clabcdef123456789")).toBe("IMAGE");
	});
});

// ============================================================================
// getFileExtension
// ============================================================================

describe("getFileExtension", () => {
	it("extracts .jpg from a simple filename", () => {
		expect(getFileExtension("https://example.com/file.jpg")).toBe(".jpg");
	});

	it("extracts .mp4 from a video URL", () => {
		expect(getFileExtension("https://example.com/video.mp4")).toBe(".mp4");
	});

	it("extracts .png from a URL with a path", () => {
		expect(getFileExtension("https://example.com/assets/images/photo.png")).toBe(".png");
	});

	it("handles query params — file.jpg?w=100 returns .jpg", () => {
		expect(getFileExtension("https://example.com/file.jpg?w=100")).toBe(".jpg");
	});

	it("handles query params with multiple params", () => {
		expect(getFileExtension("https://example.com/photo.webp?width=800&quality=90")).toBe(".webp");
	});

	it("returns null for extensionless CDN URL", () => {
		expect(getFileExtension("https://utfs.io/f/clabcdef123456789012345")).toBeNull();
	});

	it("returns null for URL with no path segment extension", () => {
		expect(getFileExtension("https://example.com/noextension")).toBeNull();
	});

	it("lowercases the extension — .JPG returns .jpg", () => {
		expect(getFileExtension("https://example.com/photo.JPG")).toBe(".jpg");
	});

	it("lowercases mixed case — .WebP returns .webp", () => {
		expect(getFileExtension("https://example.com/photo.WebP")).toBe(".webp");
	});
});
