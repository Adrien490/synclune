import { describe, it, expect } from "vitest";
import {
	isVideoFile,
	validateMediaFile,
	validatePrimaryImage,
	validateMediaFiles,
	isValidCuid,
	isValidUploadThingUrl,
	MEDIA_SIZE_LIMITS,
} from "../validate-media-file";

// ============================================================================
// Helpers
// ============================================================================

function makeFile(name: string, type: string, sizeBytes: number): File {
	const blob = new Blob([new Uint8Array(sizeBytes)], { type });
	return new File([blob], name, { type });
}

const IMAGE_LIMIT = MEDIA_SIZE_LIMITS.CATALOG_IMAGE; // 16 MB
const VIDEO_LIMIT = MEDIA_SIZE_LIMITS.VIDEO; // 512 MB

// ============================================================================
// isVideoFile
// ============================================================================

describe("isVideoFile", () => {
	it("returns true for video/mp4", () => {
		expect(isVideoFile(new File([""], "clip.mp4", { type: "video/mp4" }))).toBe(true);
	});

	it("returns true for video/webm", () => {
		expect(isVideoFile(new File([""], "clip.webm", { type: "video/webm" }))).toBe(true);
	});

	it("returns true for video/quicktime", () => {
		expect(isVideoFile(new File([""], "clip.mov", { type: "video/quicktime" }))).toBe(true);
	});

	it("returns true for video/ogg", () => {
		expect(isVideoFile(new File([""], "clip.ogv", { type: "video/ogg" }))).toBe(true);
	});

	it("returns false for image/jpeg", () => {
		expect(isVideoFile(new File([""], "photo.jpg", { type: "image/jpeg" }))).toBe(false);
	});

	it("returns false for image/png", () => {
		expect(isVideoFile(new File([""], "photo.png", { type: "image/png" }))).toBe(false);
	});

	it("returns false for image/webp", () => {
		expect(isVideoFile(new File([""], "photo.webp", { type: "image/webp" }))).toBe(false);
	});

	it("returns false for image/gif", () => {
		expect(isVideoFile(new File([""], "anim.gif", { type: "image/gif" }))).toBe(false);
	});

	it("returns false for image/avif", () => {
		expect(isVideoFile(new File([""], "photo.avif", { type: "image/avif" }))).toBe(false);
	});

	it("returns false for empty MIME type", () => {
		expect(isVideoFile(new File([""], "unknown", { type: "" }))).toBe(false);
	});

	it("returns false for application/octet-stream", () => {
		expect(isVideoFile(new File([""], "data.bin", { type: "application/octet-stream" }))).toBe(
			false,
		);
	});

	it("returns false for audio/mpeg", () => {
		expect(isVideoFile(new File([""], "track.mp3", { type: "audio/mpeg" }))).toBe(false);
	});
});

// ============================================================================
// validateMediaFile
// ============================================================================

describe("validateMediaFile", () => {
	describe("valid images", () => {
		it("accepts a small JPEG image", () => {
			const result = validateMediaFile(makeFile("photo.jpg", "image/jpeg", 1024));
			expect(result.valid).toBe(true);
			expect(result.mediaType).toBe("IMAGE");
			expect(result.fileSize).toBe(1024);
			expect(result.sizeLimit).toBe(IMAGE_LIMIT);
			expect(result.error).toBeUndefined();
		});

		it("accepts an image exactly at the size limit", () => {
			const result = validateMediaFile(makeFile("photo.png", "image/png", IMAGE_LIMIT));
			expect(result.valid).toBe(true);
		});

		it("accepts a WebP image well under the limit", () => {
			const result = validateMediaFile(makeFile("photo.webp", "image/webp", 4 * 1024 * 1024));
			expect(result.valid).toBe(true);
		});
	});

	describe("oversized images", () => {
		it("rejects an image one byte over the limit", () => {
			const result = validateMediaFile(makeFile("big.jpg", "image/jpeg", IMAGE_LIMIT + 1));
			expect(result.valid).toBe(false);
			expect(result.mediaType).toBe("IMAGE");
			expect(result.error).toContain("16MB");
		});

		it("includes actual file size in MB in the error", () => {
			const result = validateMediaFile(makeFile("huge.png", "image/png", 20 * 1024 * 1024));
			expect(result.error).toContain("20.00MB");
		});
	});

	describe("valid videos", () => {
		it("accepts a small MP4 video", () => {
			const result = validateMediaFile(makeFile("clip.mp4", "video/mp4", 1024 * 1024));
			expect(result.valid).toBe(true);
			expect(result.mediaType).toBe("VIDEO");
			expect(result.sizeLimit).toBe(VIDEO_LIMIT);
		});

		it("accepts a video exactly at the size limit", () => {
			const result = validateMediaFile(makeFile("clip.webm", "video/webm", VIDEO_LIMIT));
			expect(result.valid).toBe(true);
		});

		it("applies video limit (not image limit) for video files", () => {
			const result = validateMediaFile(makeFile("clip.mp4", "video/mp4", 100 * 1024 * 1024));
			expect(result.valid).toBe(true);
			expect(result.sizeLimit).toBe(VIDEO_LIMIT);
		});
	});

	describe("oversized videos", () => {
		it("rejects a video one byte over the limit", () => {
			const result = validateMediaFile(makeFile("huge.mp4", "video/mp4", VIDEO_LIMIT + 1));
			expect(result.valid).toBe(false);
			expect(result.error).toContain("512MB");
		});
	});
});

// ============================================================================
// validatePrimaryImage
// ============================================================================

describe("validatePrimaryImage", () => {
	it("rejects a video file with descriptive error", () => {
		const result = validatePrimaryImage(new File([""], "clip.mp4", { type: "video/mp4" }));
		expect(result.valid).toBe(false);
		expect(result.mediaType).toBe("VIDEO");
		expect(result.error).toContain("vidéos ne peuvent pas être utilisées");
		expect(result.error).toContain("JPG, PNG, WebP, GIF ou AVIF");
	});

	it("includes video file size in the result when rejecting", () => {
		const result = validatePrimaryImage(makeFile("clip.mp4", "video/mp4", 50 * 1024 * 1024));
		expect(result.fileSize).toBe(50 * 1024 * 1024);
	});

	it("rejects a webm video", () => {
		const result = validatePrimaryImage(new File([""], "clip.webm", { type: "video/webm" }));
		expect(result.valid).toBe(false);
		expect(result.mediaType).toBe("VIDEO");
	});

	it("accepts a valid JPEG image", () => {
		const result = validatePrimaryImage(makeFile("photo.jpg", "image/jpeg", 2 * 1024 * 1024));
		expect(result.valid).toBe(true);
		expect(result.mediaType).toBe("IMAGE");
	});

	it("accepts a valid PNG image", () => {
		const result = validatePrimaryImage(makeFile("photo.png", "image/png", 1024));
		expect(result.valid).toBe(true);
	});

	it("rejects an oversized image (delegates to validateMediaFile)", () => {
		const result = validatePrimaryImage(makeFile("huge.jpg", "image/jpeg", IMAGE_LIMIT + 1));
		expect(result.valid).toBe(false);
		expect(result.error).toContain("16MB");
	});

	it("accepts an image exactly at the size limit", () => {
		const result = validatePrimaryImage(makeFile("exact.jpg", "image/jpeg", IMAGE_LIMIT));
		expect(result.valid).toBe(true);
	});
});

// ============================================================================
// validateMediaFiles
// ============================================================================

describe("validateMediaFiles", () => {
	describe("basic batch validation", () => {
		it("returns all valid files when all pass", () => {
			const files = [
				makeFile("a.jpg", "image/jpeg", 1024),
				makeFile("b.png", "image/png", 2048),
				makeFile("c.webp", "image/webp", 512),
			];
			const { validFiles, errors, skipped } = validateMediaFiles(files);
			expect(validFiles).toHaveLength(3);
			expect(errors).toHaveLength(0);
			expect(skipped).toBe(0);
		});

		it("collects errors for oversized files", () => {
			const valid = makeFile("ok.jpg", "image/jpeg", 1024);
			const oversized = makeFile("big.jpg", "image/jpeg", IMAGE_LIMIT + 1);
			const { validFiles, errors } = validateMediaFiles([valid, oversized]);
			expect(validFiles).toHaveLength(1);
			expect(errors).toHaveLength(1);
			expect(errors[0]).toContain("big.jpg");
		});

		it("prefixes errors with the file name", () => {
			const { errors } = validateMediaFiles([makeFile("photo.jpg", "image/jpeg", IMAGE_LIMIT + 1)]);
			expect(errors[0]).toMatch(/^photo\.jpg:/);
		});

		it("handles an empty file list", () => {
			const { validFiles, errors, skipped } = validateMediaFiles([]);
			expect(validFiles).toHaveLength(0);
			expect(errors).toHaveLength(0);
			expect(skipped).toBe(0);
		});

		it("accepts mixed image and video files", () => {
			const { validFiles, errors } = validateMediaFiles([
				makeFile("photo.jpg", "image/jpeg", 1024),
				makeFile("clip.mp4", "video/mp4", 1024 * 1024),
			]);
			expect(validFiles).toHaveLength(2);
			expect(errors).toHaveLength(0);
		});
	});

	describe("maxFiles option", () => {
		it("processes up to maxFiles files", () => {
			const files = Array.from({ length: 5 }, (_, i) => makeFile(`f${i}.jpg`, "image/jpeg", 1024));
			const { validFiles, skipped } = validateMediaFiles(files, { maxFiles: 3 });
			expect(validFiles).toHaveLength(3);
			expect(skipped).toBe(2);
		});

		it("sets skipped count correctly", () => {
			const files = Array.from({ length: 10 }, (_, i) => makeFile(`f${i}.jpg`, "image/jpeg", 1024));
			const { skipped } = validateMediaFiles(files, { maxFiles: 4 });
			expect(skipped).toBe(6);
		});

		it("does not skip when count is within maxFiles", () => {
			const files = [makeFile("a.jpg", "image/jpeg", 1024), makeFile("b.jpg", "image/jpeg", 1024)];
			const { skipped } = validateMediaFiles(files, { maxFiles: 5 });
			expect(skipped).toBe(0);
		});

		it("keeps files in order", () => {
			const files = [
				makeFile("first.jpg", "image/jpeg", 1024),
				makeFile("second.jpg", "image/jpeg", 1024),
				makeFile("third.jpg", "image/jpeg", 1024),
			];
			const { validFiles } = validateMediaFiles(files, { maxFiles: 2 });
			expect(validFiles[0]).toBe(files[0]);
			expect(validFiles[1]).toBe(files[1]);
		});
	});

	describe("rejectVideos option", () => {
		it("rejects video files when true", () => {
			const image = makeFile("photo.jpg", "image/jpeg", 1024);
			const video = makeFile("clip.mp4", "video/mp4", 1024);
			const { validFiles, errors } = validateMediaFiles([image, video], { rejectVideos: true });
			expect(validFiles).toHaveLength(1);
			expect(errors[0]).toContain("clip.mp4");
		});

		it("includes video rejection reason", () => {
			const { errors } = validateMediaFiles([makeFile("clip.webm", "video/webm", 1024)], {
				rejectVideos: true,
			});
			expect(errors[0]).toContain("vidéos ne peuvent pas être utilisées");
		});

		it("accepts all images when rejectVideos is true", () => {
			const { validFiles, errors } = validateMediaFiles(
				[makeFile("a.jpg", "image/jpeg", 1024), makeFile("b.png", "image/png", 2048)],
				{ rejectVideos: true },
			);
			expect(validFiles).toHaveLength(2);
			expect(errors).toHaveLength(0);
		});

		it("also rejects oversized images", () => {
			const { validFiles, errors } = validateMediaFiles(
				[makeFile("big.jpg", "image/jpeg", IMAGE_LIMIT + 1)],
				{ rejectVideos: true },
			);
			expect(validFiles).toHaveLength(0);
			expect(errors).toHaveLength(1);
		});
	});

	describe("combined options", () => {
		it("applies both maxFiles and rejectVideos", () => {
			const files = [
				makeFile("a.jpg", "image/jpeg", 1024),
				makeFile("b.mp4", "video/mp4", 1024),
				makeFile("c.jpg", "image/jpeg", 1024),
				makeFile("d.jpg", "image/jpeg", 1024),
				makeFile("e.jpg", "image/jpeg", 1024),
			];
			const { validFiles, errors, skipped } = validateMediaFiles(files, {
				maxFiles: 3,
				rejectVideos: true,
			});
			expect(validFiles).toHaveLength(2);
			expect(errors).toHaveLength(1);
			expect(errors[0]).toContain("b.mp4");
			expect(skipped).toBe(2);
		});
	});
});

// ============================================================================
// isValidCuid
// ============================================================================

describe("isValidCuid", () => {
	it("returns true for valid CUID", () => {
		expect(isValidCuid("cjld2cjxh0000qzrmn831i7rn")).toBe(true);
	});

	it("accepts CUID with digits only after c", () => {
		expect(isValidCuid("c012345678901234567890123")).toBe(true);
	});

	it("accepts CUID with mixed lowercase and digits", () => {
		expect(isValidCuid("cabcdefghij0123456789abcd")).toBe(true);
	});

	it("returns false for string not starting with c", () => {
		expect(isValidCuid("xlabcdefghijklmnopqrstuvw")).toBe(false);
	});

	it("returns false for uppercase C prefix", () => {
		expect(isValidCuid("Cjld2cjxh0000qzrmn831i7rn")).toBe(false);
	});

	it("returns false for string too short", () => {
		expect(isValidCuid("clabc")).toBe(false);
	});

	it("returns false for string too long", () => {
		expect(isValidCuid("clabcdefghijklmnopqrstuvwx")).toBe(false);
	});

	it("returns false for empty string", () => {
		expect(isValidCuid("")).toBe(false);
	});

	it("returns false for uppercase letters in body", () => {
		expect(isValidCuid("cLABCDEFGHIJKLMNOPQRSTUVW")).toBe(false);
	});

	it("returns false for special characters", () => {
		expect(isValidCuid("cjld2cjxh0000qzrmn831i7!")).toBe(false);
	});

	it("returns false for hyphen", () => {
		expect(isValidCuid("cjld2-cjxh0000qzrmn831i7rn")).toBe(false);
	});

	it("returns false for spaces", () => {
		expect(isValidCuid("cjld2cjxh0000qzrmn831i rn")).toBe(false);
	});
});

// ============================================================================
// isValidUploadThingUrl
// ============================================================================

describe("isValidUploadThingUrl", () => {
	describe("valid HTTPS URLs on exact domains", () => {
		it("accepts utfs.io", () => {
			expect(isValidUploadThingUrl("https://utfs.io/f/abc123")).toBe(true);
		});

		it("accepts uploadthing.com", () => {
			expect(isValidUploadThingUrl("https://uploadthing.com/f/abc123")).toBe(true);
		});

		it("accepts ufs.sh", () => {
			expect(isValidUploadThingUrl("https://ufs.sh/f/abc123")).toBe(true);
		});

		it("accepts utfs.io root URL", () => {
			expect(isValidUploadThingUrl("https://utfs.io/")).toBe(true);
		});

		it("accepts S3 bucket URL", () => {
			expect(
				isValidUploadThingUrl("https://uploadthing-prod.s3.us-west-2.amazonaws.com/abc123.jpg"),
			).toBe(true);
		});
	});

	describe("valid HTTPS URLs on allowed subdomains", () => {
		it("accepts dynamic CDN subdomain of ufs.sh", () => {
			expect(isValidUploadThingUrl("https://x1ain1wpub.ufs.sh/f/file-key")).toBe(true);
		});

		it("accepts cdn.uploadthing.com", () => {
			expect(isValidUploadThingUrl("https://cdn.uploadthing.com/f/file-key")).toBe(true);
		});

		it("accepts any subdomain of .ufs.sh", () => {
			expect(isValidUploadThingUrl("https://myapp.ufs.sh/files/image.jpg")).toBe(true);
		});

		it("accepts any subdomain of .uploadthing.com", () => {
			expect(isValidUploadThingUrl("https://assets.uploadthing.com/files/photo.png")).toBe(true);
		});
	});

	describe("rejects HTTP (non-HTTPS)", () => {
		it("rejects http://utfs.io", () => {
			expect(isValidUploadThingUrl("http://utfs.io/f/abc123")).toBe(false);
		});

		it("rejects http://uploadthing.com", () => {
			expect(isValidUploadThingUrl("http://uploadthing.com/f/abc123")).toBe(false);
		});

		it("rejects http:// on allowed subdomain", () => {
			expect(isValidUploadThingUrl("http://x1ain1wpub.ufs.sh/f/file")).toBe(false);
		});
	});

	describe("rejects disallowed domains", () => {
		it("rejects arbitrary domain", () => {
			expect(isValidUploadThingUrl("https://evil.com/steal")).toBe(false);
		});

		it("rejects suffix attack (notutfs.io)", () => {
			expect(isValidUploadThingUrl("https://notutfs.io/f/abc")).toBe(false);
		});

		it("rejects utfs.io used as subdomain (utfs.io.evil.com)", () => {
			expect(isValidUploadThingUrl("https://utfs.io.evil.com/f/abc")).toBe(false);
		});

		it("rejects ufs.sh used as path component", () => {
			expect(isValidUploadThingUrl("https://evil.com/ufs.sh/f/abc")).toBe(false);
		});

		it("rejects localhost", () => {
			expect(isValidUploadThingUrl("https://localhost/f/abc")).toBe(false);
		});

		it("rejects IP address", () => {
			expect(isValidUploadThingUrl("https://192.168.1.1/f/abc")).toBe(false);
		});

		it("rejects domain ending with valid suffix but not subdomain", () => {
			expect(isValidUploadThingUrl("https://fake-utfs.io.evil.com/f/abc")).toBe(false);
		});
	});

	describe("rejects dangerous protocols", () => {
		it("rejects javascript: protocol", () => {
			expect(isValidUploadThingUrl("javascript:alert(1)")).toBe(false);
		});

		it("rejects file: protocol", () => {
			expect(isValidUploadThingUrl("file:///etc/passwd")).toBe(false);
		});

		it("rejects data: protocol", () => {
			expect(isValidUploadThingUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
		});
	});

	describe("rejects invalid URLs", () => {
		it("rejects empty string", () => {
			expect(isValidUploadThingUrl("")).toBe(false);
		});

		it("rejects no protocol", () => {
			expect(isValidUploadThingUrl("utfs.io/f/abc")).toBe(false);
		});

		it("rejects plain string", () => {
			expect(isValidUploadThingUrl("not a url")).toBe(false);
		});

		it("rejects undefined coerced to string", () => {
			expect(isValidUploadThingUrl("undefined")).toBe(false);
		});
	});
});
