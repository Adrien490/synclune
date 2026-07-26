import { describe, it, expect } from "vitest";
import { isValidCuid, isValidUploadThingUrl, MEDIA_SIZE_LIMITS } from "../validate-media-file";

// ============================================================================
// MEDIA_SIZE_LIMITS
//
// Les helpers de validation par `File` (isVideoFile / validateMediaFile /
// validatePrimaryImage / validateMediaFiles) ont été retirés : aucun appelant
// en production, la validation de taille vit dans `useMediaUpload` et dans le
// middleware UploadThing.
// ============================================================================

describe("MEDIA_SIZE_LIMITS", () => {
	it("reste aligné sur les plafonds des routes UploadThing", () => {
		expect(MEDIA_SIZE_LIMITS.CATALOG_IMAGE).toBe(16 * 1024 * 1024);
		expect(MEDIA_SIZE_LIMITS.REVIEW_IMAGE).toBe(4 * 1024 * 1024);
		expect(MEDIA_SIZE_LIMITS.VIDEO).toBe(512 * 1024 * 1024);
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
