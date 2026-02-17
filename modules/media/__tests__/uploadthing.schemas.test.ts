import { describe, it, expect } from "vitest";
import {
	deleteUploadThingFileSchema,
	deleteUploadThingFilesSchema,
} from "../schemas/uploadthing.schemas";

// ============================================================================
// deleteUploadThingFileSchema
// ============================================================================

describe("deleteUploadThingFileSchema", () => {
	describe("valid UploadThing URLs", () => {
		it("accepts a URL on utfs.io", () => {
			const result = deleteUploadThingFileSchema.safeParse({
				fileUrl: "https://utfs.io/f/abc123.jpg",
			});
			expect(result.success).toBe(true);
		});

		it("accepts a URL on uploadthing.com", () => {
			const result = deleteUploadThingFileSchema.safeParse({
				fileUrl: "https://uploadthing.com/f/abc123.jpg",
			});
			expect(result.success).toBe(true);
		});

		it("accepts a URL on ufs.sh", () => {
			const result = deleteUploadThingFileSchema.safeParse({
				fileUrl: "https://ufs.sh/f/abc123.jpg",
			});
			expect(result.success).toBe(true);
		});

		it("accepts a dynamic CDN subdomain on ufs.sh", () => {
			const result = deleteUploadThingFileSchema.safeParse({
				fileUrl: "https://x1ain1wpub.ufs.sh/f/abc123.jpg",
			});
			expect(result.success).toBe(true);
		});

		it("accepts a subdomain on uploadthing.com", () => {
			const result = deleteUploadThingFileSchema.safeParse({
				fileUrl: "https://cdn.uploadthing.com/f/abc123.jpg",
			});
			expect(result.success).toBe(true);
		});
	});

	describe("invalid URLs", () => {
		it("rejects an empty string", () => {
			const result = deleteUploadThingFileSchema.safeParse({ fileUrl: "" });
			expect(result.success).toBe(false);
		});

		it("rejects a plain string (not a URL)", () => {
			const result = deleteUploadThingFileSchema.safeParse({
				fileUrl: "not-a-url",
			});
			expect(result.success).toBe(false);
		});

		it("rejects a non-UploadThing domain", () => {
			const result = deleteUploadThingFileSchema.safeParse({
				fileUrl: "https://example.com/file.jpg",
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.message).toContain("UploadThing");
			}
		});

		it("rejects an HTTP URL (non-HTTPS)", () => {
			const result = deleteUploadThingFileSchema.safeParse({
				fileUrl: "http://utfs.io/f/abc123.jpg",
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.message).toContain("UploadThing");
			}
		});

		it("rejects an attacker domain that ends with a valid suffix but is not a subdomain", () => {
			const result = deleteUploadThingFileSchema.safeParse({
				fileUrl: "https://evil-ufs.sh/f/abc123.jpg",
			});
			expect(result.success).toBe(false);
		});
	});
});

// ============================================================================
// deleteUploadThingFilesSchema
// ============================================================================

describe("deleteUploadThingFilesSchema", () => {
	const validUrl = "https://utfs.io/f/abc123.jpg";
	const anotherValidUrl = "https://x1ain1wpub.ufs.sh/f/def456.mp4";

	describe("valid arrays", () => {
		it("accepts a single-element array", () => {
			const result = deleteUploadThingFilesSchema.safeParse({
				fileUrls: [validUrl],
			});
			expect(result.success).toBe(true);
		});

		it("accepts multiple valid URLs", () => {
			const result = deleteUploadThingFilesSchema.safeParse({
				fileUrls: [validUrl, anotherValidUrl],
			});
			expect(result.success).toBe(true);
		});
	});

	describe("invalid arrays", () => {
		it("rejects an empty array (min 1 constraint)", () => {
			const result = deleteUploadThingFilesSchema.safeParse({ fileUrls: [] });
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.message).toContain("Au moins une URL");
			}
		});

		it("rejects an array containing a non-UploadThing URL", () => {
			const result = deleteUploadThingFilesSchema.safeParse({
				fileUrls: ["https://example.com/file.jpg"],
			});
			expect(result.success).toBe(false);
		});

		it("rejects a mixed array where one URL is invalid", () => {
			const result = deleteUploadThingFilesSchema.safeParse({
				fileUrls: [validUrl, "https://example.com/file.jpg"],
			});
			expect(result.success).toBe(false);
		});

		it("rejects an array containing an HTTP URL", () => {
			const result = deleteUploadThingFilesSchema.safeParse({
				fileUrls: ["http://utfs.io/f/abc123.jpg"],
			});
			expect(result.success).toBe(false);
		});
	});
});
