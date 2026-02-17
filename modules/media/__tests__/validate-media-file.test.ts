import { describe, it, expect } from "vitest";
import {
	isVideoFile,
	validateMediaFile,
	validatePrimaryImage,
	validateMediaFiles,
	isValidCuid,
	isValidUploadThingUrl,
	MEDIA_SIZE_LIMITS,
} from "../utils/validate-media-file";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile(name: string, type: string, sizeBytes: number): File {
	// File.size is read-only, so we pass a Blob of the correct byte length
	const blob = new Blob([new Uint8Array(sizeBytes)], { type });
	return new File([blob], name, { type });
}

const IMAGE_LIMIT = MEDIA_SIZE_LIMITS.IMAGE; // 16 MB
const VIDEO_LIMIT = MEDIA_SIZE_LIMITS.VIDEO; // 512 MB

// ---------------------------------------------------------------------------
// isVideoFile
// ---------------------------------------------------------------------------

describe("isVideoFile", () => {
	it("should return true for video/mp4", () => {
		const file = new File(["content"], "clip.mp4", { type: "video/mp4" });
		expect(isVideoFile(file)).toBe(true);
	});

	it("should return true for video/webm", () => {
		const file = new File(["content"], "clip.webm", { type: "video/webm" });
		expect(isVideoFile(file)).toBe(true);
	});

	it("should return true for video/quicktime", () => {
		const file = new File(["content"], "clip.mov", { type: "video/quicktime" });
		expect(isVideoFile(file)).toBe(true);
	});

	it("should return true for video/ogg", () => {
		const file = new File(["content"], "clip.ogv", { type: "video/ogg" });
		expect(isVideoFile(file)).toBe(true);
	});

	it("should return false for image/jpeg", () => {
		const file = new File(["content"], "photo.jpg", { type: "image/jpeg" });
		expect(isVideoFile(file)).toBe(false);
	});

	it("should return false for image/png", () => {
		const file = new File(["content"], "photo.png", { type: "image/png" });
		expect(isVideoFile(file)).toBe(false);
	});

	it("should return false for image/webp", () => {
		const file = new File(["content"], "photo.webp", { type: "image/webp" });
		expect(isVideoFile(file)).toBe(false);
	});

	it("should return false for image/gif", () => {
		const file = new File(["content"], "anim.gif", { type: "image/gif" });
		expect(isVideoFile(file)).toBe(false);
	});

	it("should return false for image/avif", () => {
		const file = new File(["content"], "photo.avif", { type: "image/avif" });
		expect(isVideoFile(file)).toBe(false);
	});

	it("should return false for an empty MIME type", () => {
		const file = new File(["content"], "unknown", { type: "" });
		expect(isVideoFile(file)).toBe(false);
	});

	it("should return false for application/octet-stream", () => {
		const file = new File(["content"], "data.bin", { type: "application/octet-stream" });
		expect(isVideoFile(file)).toBe(false);
	});

	it("should return false for audio/mpeg (audio is not video)", () => {
		const file = new File(["content"], "track.mp3", { type: "audio/mpeg" });
		expect(isVideoFile(file)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// validateMediaFile
// ---------------------------------------------------------------------------

describe("validateMediaFile", () => {
	describe("valid images", () => {
		it("should accept a small JPEG image", () => {
			const file = makeFile("photo.jpg", "image/jpeg", 1024);
			const result = validateMediaFile(file);

			expect(result.valid).toBe(true);
			expect(result.mediaType).toBe("IMAGE");
			expect(result.fileSize).toBe(1024);
			expect(result.sizeLimit).toBe(IMAGE_LIMIT);
			expect(result.error).toBeUndefined();
		});

		it("should accept an image exactly at the size limit (boundary)", () => {
			const file = makeFile("photo.png", "image/png", IMAGE_LIMIT);
			const result = validateMediaFile(file);

			expect(result.valid).toBe(true);
			expect(result.mediaType).toBe("IMAGE");
		});

		it("should accept a WebP image well under the limit", () => {
			const file = makeFile("photo.webp", "image/webp", 4 * 1024 * 1024); // 4 MB
			const result = validateMediaFile(file);

			expect(result.valid).toBe(true);
			expect(result.mediaType).toBe("IMAGE");
		});
	});

	describe("oversized images", () => {
		it("should reject an image one byte over the limit", () => {
			const file = makeFile("big.jpg", "image/jpeg", IMAGE_LIMIT + 1);
			const result = validateMediaFile(file);

			expect(result.valid).toBe(false);
			expect(result.mediaType).toBe("IMAGE");
			expect(result.fileSize).toBe(IMAGE_LIMIT + 1);
			expect(result.sizeLimit).toBe(IMAGE_LIMIT);
			expect(result.error).toContain("16MB");
		});

		it("should include actual file size in MB in the error message", () => {
			// 20 MB file
			const size = 20 * 1024 * 1024;
			const file = makeFile("huge.png", "image/png", size);
			const result = validateMediaFile(file);

			expect(result.valid).toBe(false);
			expect(result.error).toContain("20.00MB");
		});

		it("should include the limit in MB in the error message", () => {
			const file = makeFile("huge.png", "image/png", IMAGE_LIMIT + 1);
			const result = validateMediaFile(file);

			expect(result.error).toContain("16MB");
		});
	});

	describe("valid videos", () => {
		it("should accept a small MP4 video", () => {
			const file = makeFile("clip.mp4", "video/mp4", 1024 * 1024); // 1 MB
			const result = validateMediaFile(file);

			expect(result.valid).toBe(true);
			expect(result.mediaType).toBe("VIDEO");
			expect(result.sizeLimit).toBe(VIDEO_LIMIT);
			expect(result.error).toBeUndefined();
		});

		it("should accept a video exactly at the size limit (boundary)", () => {
			const file = makeFile("clip.webm", "video/webm", VIDEO_LIMIT);
			const result = validateMediaFile(file);

			expect(result.valid).toBe(true);
			expect(result.mediaType).toBe("VIDEO");
		});

		it("should apply the video size limit (not the image limit) for video files", () => {
			// A file that exceeds IMAGE_LIMIT but not VIDEO_LIMIT
			const size = 100 * 1024 * 1024; // 100 MB
			const file = makeFile("clip.mp4", "video/mp4", size);
			const result = validateMediaFile(file);

			expect(result.valid).toBe(true);
			expect(result.mediaType).toBe("VIDEO");
			expect(result.sizeLimit).toBe(VIDEO_LIMIT);
		});
	});

	describe("oversized videos", () => {
		it("should reject a video one byte over the limit", () => {
			const file = makeFile("huge.mp4", "video/mp4", VIDEO_LIMIT + 1);
			const result = validateMediaFile(file);

			expect(result.valid).toBe(false);
			expect(result.mediaType).toBe("VIDEO");
			expect(result.sizeLimit).toBe(VIDEO_LIMIT);
			expect(result.error).toContain("512MB");
		});
	});
});

// ---------------------------------------------------------------------------
// validatePrimaryImage
// ---------------------------------------------------------------------------

describe("validatePrimaryImage", () => {
	it("should reject a video file", () => {
		const file = new File(["content"], "clip.mp4", { type: "video/mp4" });
		const result = validatePrimaryImage(file);

		expect(result.valid).toBe(false);
		expect(result.mediaType).toBe("VIDEO");
		expect(result.error).toContain("vidéos ne peuvent pas être utilisées");
		expect(result.error).toContain("JPG, PNG, WebP, GIF ou AVIF");
	});

	it("should include video file size in the result when rejecting", () => {
		const file = makeFile("clip.mp4", "video/mp4", 50 * 1024 * 1024);
		const result = validatePrimaryImage(file);

		expect(result.fileSize).toBe(50 * 1024 * 1024);
		expect(result.sizeLimit).toBe(VIDEO_LIMIT);
	});

	it("should reject a webm video", () => {
		const file = new File(["content"], "clip.webm", { type: "video/webm" });
		const result = validatePrimaryImage(file);

		expect(result.valid).toBe(false);
		expect(result.mediaType).toBe("VIDEO");
	});

	it("should accept a valid JPEG image", () => {
		const file = makeFile("photo.jpg", "image/jpeg", 2 * 1024 * 1024);
		const result = validatePrimaryImage(file);

		expect(result.valid).toBe(true);
		expect(result.mediaType).toBe("IMAGE");
		expect(result.error).toBeUndefined();
	});

	it("should accept a valid PNG image", () => {
		const file = makeFile("photo.png", "image/png", 1024);
		const result = validatePrimaryImage(file);

		expect(result.valid).toBe(true);
		expect(result.mediaType).toBe("IMAGE");
	});

	it("should reject an oversized image (delegates to validateMediaFile)", () => {
		const file = makeFile("huge.jpg", "image/jpeg", IMAGE_LIMIT + 1);
		const result = validatePrimaryImage(file);

		expect(result.valid).toBe(false);
		expect(result.mediaType).toBe("IMAGE");
		expect(result.error).toContain("16MB");
	});

	it("should accept an image exactly at the size limit", () => {
		const file = makeFile("exact.jpg", "image/jpeg", IMAGE_LIMIT);
		const result = validatePrimaryImage(file);

		expect(result.valid).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// validateMediaFiles
// ---------------------------------------------------------------------------

describe("validateMediaFiles", () => {
	describe("basic batch validation", () => {
		it("should return all valid files when all pass validation", () => {
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

		it("should collect errors for oversized files and exclude them from validFiles", () => {
			const valid = makeFile("ok.jpg", "image/jpeg", 1024);
			const oversized = makeFile("big.jpg", "image/jpeg", IMAGE_LIMIT + 1);
			const { validFiles, errors, skipped } = validateMediaFiles([valid, oversized]);

			expect(validFiles).toHaveLength(1);
			expect(validFiles[0]).toBe(valid);
			expect(errors).toHaveLength(1);
			expect(errors[0]).toContain("big.jpg");
			expect(skipped).toBe(0);
		});

		it("should prefix errors with the file name", () => {
			const oversized = makeFile("photo.jpg", "image/jpeg", IMAGE_LIMIT + 1);
			const { errors } = validateMediaFiles([oversized]);

			expect(errors[0]).toMatch(/^photo\.jpg:/);
		});

		it("should handle an empty file list", () => {
			const { validFiles, errors, skipped } = validateMediaFiles([]);

			expect(validFiles).toHaveLength(0);
			expect(errors).toHaveLength(0);
			expect(skipped).toBe(0);
		});

		it("should accept mixed image and video files without rejectVideos", () => {
			const image = makeFile("photo.jpg", "image/jpeg", 1024);
			const video = makeFile("clip.mp4", "video/mp4", 1024 * 1024);
			const { validFiles, errors } = validateMediaFiles([image, video]);

			expect(validFiles).toHaveLength(2);
			expect(errors).toHaveLength(0);
		});
	});

	describe("maxFiles option", () => {
		it("should only process up to maxFiles files", () => {
			const files = [
				makeFile("a.jpg", "image/jpeg", 1024),
				makeFile("b.jpg", "image/jpeg", 1024),
				makeFile("c.jpg", "image/jpeg", 1024),
				makeFile("d.jpg", "image/jpeg", 1024),
				makeFile("e.jpg", "image/jpeg", 1024),
			];
			const { validFiles, skipped } = validateMediaFiles(files, { maxFiles: 3 });

			expect(validFiles).toHaveLength(3);
			expect(skipped).toBe(2);
		});

		it("should set skipped to the number of files beyond maxFiles", () => {
			const files = Array.from({ length: 10 }, (_, i) =>
				makeFile(`file${i}.jpg`, "image/jpeg", 1024)
			);
			const { skipped } = validateMediaFiles(files, { maxFiles: 4 });

			expect(skipped).toBe(6);
		});

		it("should not skip any files when count is within maxFiles", () => {
			const files = [makeFile("a.jpg", "image/jpeg", 1024), makeFile("b.jpg", "image/jpeg", 1024)];
			const { skipped } = validateMediaFiles(files, { maxFiles: 5 });

			expect(skipped).toBe(0);
		});

		it("should not skip any files when count equals maxFiles", () => {
			const files = [makeFile("a.jpg", "image/jpeg", 1024), makeFile("b.jpg", "image/jpeg", 1024)];
			const { skipped } = validateMediaFiles(files, { maxFiles: 2 });

			expect(skipped).toBe(0);
		});

		it("should process files in order and keep only the first maxFiles", () => {
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
		it("should reject video files when rejectVideos is true", () => {
			const image = makeFile("photo.jpg", "image/jpeg", 1024);
			const video = makeFile("clip.mp4", "video/mp4", 1024 * 1024);
			const { validFiles, errors } = validateMediaFiles([image, video], { rejectVideos: true });

			expect(validFiles).toHaveLength(1);
			expect(validFiles[0]).toBe(image);
			expect(errors).toHaveLength(1);
			expect(errors[0]).toContain("clip.mp4");
		});

		it("should include the video rejection reason in the error message", () => {
			const video = makeFile("clip.webm", "video/webm", 1024);
			const { errors } = validateMediaFiles([video], { rejectVideos: true });

			expect(errors[0]).toContain("vidéos ne peuvent pas être utilisées");
		});

		it("should accept all images when rejectVideos is true", () => {
			const files = [
				makeFile("a.jpg", "image/jpeg", 1024),
				makeFile("b.png", "image/png", 2048),
			];
			const { validFiles, errors } = validateMediaFiles(files, { rejectVideos: true });

			expect(validFiles).toHaveLength(2);
			expect(errors).toHaveLength(0);
		});

		it("should also reject oversized images when rejectVideos is true", () => {
			const oversized = makeFile("big.jpg", "image/jpeg", IMAGE_LIMIT + 1);
			const { validFiles, errors } = validateMediaFiles([oversized], { rejectVideos: true });

			expect(validFiles).toHaveLength(0);
			expect(errors).toHaveLength(1);
		});
	});

	describe("combined options", () => {
		it("should apply both maxFiles and rejectVideos together", () => {
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

			// Only first 3 files are processed (a, b, c); b is rejected as video
			expect(validFiles).toHaveLength(2);
			expect(errors).toHaveLength(1);
			expect(errors[0]).toContain("b.mp4");
			expect(skipped).toBe(2);
		});
	});
});

// ---------------------------------------------------------------------------
// isValidCuid
// ---------------------------------------------------------------------------

describe("isValidCuid", () => {
	describe("valid CUIDs", () => {
		it("should accept a well-formed CUID (25 chars, starts with c, lowercase alphanumeric)", () => {
			expect(isValidCuid("cjld2cjxh0000qzrmn831i7rn")).toBe(true);
		});

		it("should accept another valid CUID", () => {
			// 1 'c' + 24 alphanumeric chars = 25 total
			expect(isValidCuid("c000000000000000000000001")).toBe(true);
		});

		it("should accept a CUID with digits only after c", () => {
			expect(isValidCuid("c012345678901234567890123")).toBe(true);
		});

		it("should accept a CUID with mixed lowercase letters and digits", () => {
			expect(isValidCuid("cabcdefghij0123456789abcd")).toBe(true);
		});
	});

	describe("invalid CUIDs", () => {
		it("should reject an empty string", () => {
			expect(isValidCuid("")).toBe(false);
		});

		it("should reject a string that starts with a letter other than c", () => {
			expect(isValidCuid("ajld2cjxh0000qzrmn831i7rn")).toBe(false);
		});

		it("should reject an uppercase C prefix", () => {
			expect(isValidCuid("Cjld2cjxh0000qzrmn831i7rn")).toBe(false);
		});

		it("should reject a CUID that is too short (24 chars)", () => {
			// Only 23 chars after 'c' → total 24
			expect(isValidCuid("cjld2cjxh0000qzrmn831i7")).toBe(false);
		});

		it("should reject a CUID that is too long (26 chars)", () => {
			// 25 chars after 'c' → total 26
			expect(isValidCuid("cjld2cjxh0000qzrmn831i7rnx")).toBe(false);
		});

		it("should reject uppercase letters in the body", () => {
			expect(isValidCuid("cJLD2CJXH0000QZRMN831I7RN")).toBe(false);
		});

		it("should reject special characters", () => {
			expect(isValidCuid("cjld2cjxh0000qzrmn831i7!")).toBe(false);
		});

		it("should reject a CUID with a hyphen", () => {
			expect(isValidCuid("cjld2-cjxh0000qzrmn831i7rn")).toBe(false);
		});

		it("should reject a CUID with spaces", () => {
			expect(isValidCuid("cjld2cjxh0000qzrmn831i rn")).toBe(false);
		});

		it("should reject a completely random string", () => {
			expect(isValidCuid("not-a-cuid-at-all")).toBe(false);
		});
	});
});

// ---------------------------------------------------------------------------
// isValidUploadThingUrl
// ---------------------------------------------------------------------------

describe("isValidUploadThingUrl", () => {
	describe("valid HTTPS URLs on exact domains", () => {
		it("should accept https://utfs.io with a path", () => {
			expect(isValidUploadThingUrl("https://utfs.io/f/abc123")).toBe(true);
		});

		it("should accept https://uploadthing.com with a path", () => {
			expect(isValidUploadThingUrl("https://uploadthing.com/f/abc123")).toBe(true);
		});

		it("should accept https://ufs.sh with a path", () => {
			expect(isValidUploadThingUrl("https://ufs.sh/f/abc123")).toBe(true);
		});

		it("should accept https://utfs.io root URL", () => {
			expect(isValidUploadThingUrl("https://utfs.io/")).toBe(true);
		});
	});

	describe("valid HTTPS URLs on allowed subdomains", () => {
		it("should accept a dynamic CDN subdomain of ufs.sh", () => {
			expect(isValidUploadThingUrl("https://x1ain1wpub.ufs.sh/f/file-key")).toBe(true);
		});

		it("should accept cdn.uploadthing.com", () => {
			expect(isValidUploadThingUrl("https://cdn.uploadthing.com/f/file-key")).toBe(true);
		});

		it("should accept any subdomain of .ufs.sh", () => {
			expect(isValidUploadThingUrl("https://myapp.ufs.sh/files/image.jpg")).toBe(true);
		});

		it("should accept any subdomain of .uploadthing.com", () => {
			expect(isValidUploadThingUrl("https://assets.uploadthing.com/files/photo.png")).toBe(true);
		});
	});

	describe("rejects HTTP (non-HTTPS) URLs", () => {
		it("should reject http://utfs.io", () => {
			expect(isValidUploadThingUrl("http://utfs.io/f/abc123")).toBe(false);
		});

		it("should reject http://uploadthing.com", () => {
			expect(isValidUploadThingUrl("http://uploadthing.com/f/abc123")).toBe(false);
		});

		it("should reject http://ufs.sh", () => {
			expect(isValidUploadThingUrl("http://ufs.sh/f/abc123")).toBe(false);
		});

		it("should reject http:// on an allowed subdomain", () => {
			expect(isValidUploadThingUrl("http://x1ain1wpub.ufs.sh/f/file")).toBe(false);
		});
	});

	describe("rejects disallowed domains", () => {
		it("should reject an arbitrary domain", () => {
			expect(isValidUploadThingUrl("https://evil.com/steal")).toBe(false);
		});

		it("should reject a domain that ends with utfs.io but is not utfs.io (suffix attack)", () => {
			expect(isValidUploadThingUrl("https://notutfs.io/f/abc")).toBe(false);
		});

		it("should reject a domain that uses utfs.io as a subdomain (utfs.io.evil.com)", () => {
			expect(isValidUploadThingUrl("https://utfs.io.evil.com/f/abc")).toBe(false);
		});

		it("should reject a domain that uses ufs.sh as a path component, not a hostname", () => {
			expect(isValidUploadThingUrl("https://evil.com/ufs.sh/f/abc")).toBe(false);
		});

		it("should reject localhost", () => {
			expect(isValidUploadThingUrl("https://localhost/f/abc")).toBe(false);
		});

		it("should reject an IP address", () => {
			expect(isValidUploadThingUrl("https://192.168.1.1/f/abc")).toBe(false);
		});
	});

	describe("rejects dangerous protocols", () => {
		it("should reject javascript: protocol", () => {
			expect(isValidUploadThingUrl("javascript:alert(1)")).toBe(false);
		});

		it("should reject file: protocol", () => {
			expect(isValidUploadThingUrl("file:///etc/passwd")).toBe(false);
		});

		it("should reject data: protocol", () => {
			expect(isValidUploadThingUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
		});
	});

	describe("rejects invalid or malformed URLs", () => {
		it("should reject an empty string", () => {
			expect(isValidUploadThingUrl("")).toBe(false);
		});

		it("should reject a plain string with no protocol", () => {
			expect(isValidUploadThingUrl("utfs.io/f/abc")).toBe(false);
		});

		it("should reject a string that is not a URL at all", () => {
			expect(isValidUploadThingUrl("not a url")).toBe(false);
		});

		it("should reject undefined coerced to string", () => {
			expect(isValidUploadThingUrl("undefined")).toBe(false);
		});
	});
});
