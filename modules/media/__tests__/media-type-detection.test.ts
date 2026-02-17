import { describe, it, expect } from "vitest";
import {
	isVideoUrl,
	isImageUrl,
	detectMediaType,
	getFileExtension,
} from "../utils/media-type-detection";

// ============================================================================
// isVideoUrl
// ============================================================================

describe("isVideoUrl", () => {
	it("returns true for .mp4 URL", () => {
		expect(isVideoUrl("https://example.com/video.mp4")).toBe(true);
	});

	it("returns true for .webm URL", () => {
		expect(isVideoUrl("https://example.com/video.webm")).toBe(true);
	});

	it("returns true for .mov URL", () => {
		expect(isVideoUrl("https://example.com/video.mov")).toBe(true);
	});

	it("returns true for .avi URL", () => {
		expect(isVideoUrl("https://example.com/video.avi")).toBe(true);
	});

	it("returns true for uppercase extension (.MP4)", () => {
		expect(isVideoUrl("https://example.com/video.MP4")).toBe(true);
	});

	it("returns true for mixed-case extension (.Mov)", () => {
		expect(isVideoUrl("https://example.com/video.Mov")).toBe(true);
	});

	it("returns false for an image URL", () => {
		expect(isVideoUrl("https://example.com/photo.jpg")).toBe(false);
	});

	it("returns false for a URL with no extension", () => {
		expect(isVideoUrl("https://example.com/file")).toBe(false);
	});

	it("returns false for an empty string", () => {
		expect(isVideoUrl("")).toBe(false);
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

	it("returns true for .gif URL", () => {
		expect(isImageUrl("https://example.com/photo.gif")).toBe(true);
	});

	it("returns true for .webp URL", () => {
		expect(isImageUrl("https://example.com/photo.webp")).toBe(true);
	});

	it("returns true for .avif URL", () => {
		expect(isImageUrl("https://example.com/photo.avif")).toBe(true);
	});

	it("returns true for uppercase extension (.PNG)", () => {
		expect(isImageUrl("https://example.com/photo.PNG")).toBe(true);
	});

	it("returns false for a video URL", () => {
		expect(isImageUrl("https://example.com/video.mp4")).toBe(false);
	});

	it("returns false for a URL with no extension", () => {
		expect(isImageUrl("https://example.com/file")).toBe(false);
	});

	it("returns false for an empty string", () => {
		expect(isImageUrl("")).toBe(false);
	});
});

// ============================================================================
// detectMediaType
// ============================================================================

describe("detectMediaType", () => {
	it("returns VIDEO for a .mp4 URL", () => {
		expect(detectMediaType("https://example.com/video.mp4")).toBe("VIDEO");
	});

	it("returns VIDEO for a .webm URL", () => {
		expect(detectMediaType("https://example.com/video.webm")).toBe("VIDEO");
	});

	it("returns IMAGE for a .jpg URL", () => {
		expect(detectMediaType("https://example.com/photo.jpg")).toBe("IMAGE");
	});

	it("returns IMAGE for a .png URL", () => {
		expect(detectMediaType("https://example.com/photo.png")).toBe("IMAGE");
	});

	it("returns IMAGE (default) for an unknown extension", () => {
		expect(detectMediaType("https://example.com/file.xyz")).toBe("IMAGE");
	});

	it("returns IMAGE (default) for a URL with no extension", () => {
		expect(detectMediaType("https://example.com/file")).toBe("IMAGE");
	});

	it("returns IMAGE (default) for an empty string", () => {
		expect(detectMediaType("")).toBe("IMAGE");
	});
});

// ============================================================================
// getFileExtension
// ============================================================================

describe("getFileExtension", () => {
	it("returns .jpg for a JPEG URL", () => {
		expect(getFileExtension("https://example.com/photo.jpg")).toBe(".jpg");
	});

	it("returns .mp4 for a video URL", () => {
		expect(getFileExtension("https://example.com/video.mp4")).toBe(".mp4");
	});

	it("returns .webp for a WebP URL", () => {
		expect(getFileExtension("https://example.com/photo.webp")).toBe(".webp");
	});

	it("strips query params and returns the correct extension", () => {
		expect(getFileExtension("https://example.com/photo.jpg?token=abc")).toBe(".jpg");
	});

	it("lowercases the returned extension", () => {
		expect(getFileExtension("https://example.com/photo.JPG")).toBe(".jpg");
	});

	it("lowercases a mixed-case extension", () => {
		expect(getFileExtension("https://example.com/video.Mp4")).toBe(".mp4");
	});

	it("returns null for a URL with no extension", () => {
		expect(getFileExtension("https://example.com/file")).toBeNull();
	});

	it("returns null for a CDN URL without extension (UploadThing pattern)", () => {
		expect(getFileExtension("https://utfs.io/f/cuid123abcdef")).toBeNull();
	});

	it("returns null for an empty string", () => {
		expect(getFileExtension("")).toBeNull();
	});

	it("handles a URL where the path ends before a hash fragment", () => {
		expect(getFileExtension("https://example.com/photo.png#section")).toBe(null);
	});
});
