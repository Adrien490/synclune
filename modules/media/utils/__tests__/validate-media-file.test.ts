import { describe, it, expect } from "vitest";
import { isValidCuid, isValidUploadThingUrl } from "../validate-media-file";

// ============================================================================
// isValidCuid
// ============================================================================

describe("isValidCuid", () => {
	it("returns true for valid CUID", () => {
		expect(isValidCuid("clabcdefghijklmnopqrstuvw")).toBe(true);
	});

	it("returns false for string not starting with c", () => {
		expect(isValidCuid("xlabcdefghijklmnopqrstuvw")).toBe(false);
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

	it("returns false for uppercase letters", () => {
		expect(isValidCuid("cLABCDEFGHIJKLMNOPQRSTUVW")).toBe(false);
	});
});

// ============================================================================
// isValidUploadThingUrl
// ============================================================================

describe("isValidUploadThingUrl", () => {
	// Valid URLs
	it("accepts utfs.io HTTPS URL", () => {
		expect(isValidUploadThingUrl("https://utfs.io/f/abc123.jpg")).toBe(true);
	});

	it("accepts uploadthing.com HTTPS URL", () => {
		expect(isValidUploadThingUrl("https://uploadthing.com/f/abc123.jpg")).toBe(true);
	});

	it("accepts ufs.sh HTTPS URL", () => {
		expect(isValidUploadThingUrl("https://ufs.sh/f/abc123.jpg")).toBe(true);
	});

	it("accepts S3 bucket URL", () => {
		expect(
			isValidUploadThingUrl("https://uploadthing-prod.s3.us-west-2.amazonaws.com/abc123.jpg"),
		).toBe(true);
	});

	it("accepts subdomain of ufs.sh", () => {
		expect(isValidUploadThingUrl("https://x1ain1wpub.ufs.sh/f/abc123.jpg")).toBe(true);
	});

	it("accepts subdomain of uploadthing.com", () => {
		expect(isValidUploadThingUrl("https://cdn.uploadthing.com/f/abc123.jpg")).toBe(true);
	});

	// Invalid URLs
	it("rejects HTTP (non-HTTPS) URL", () => {
		expect(isValidUploadThingUrl("http://utfs.io/f/abc123.jpg")).toBe(false);
	});

	it("rejects non-UploadThing domain", () => {
		expect(isValidUploadThingUrl("https://example.com/f/abc123.jpg")).toBe(false);
	});

	it("rejects invalid URL format", () => {
		expect(isValidUploadThingUrl("not-a-url")).toBe(false);
	});

	it("rejects empty string", () => {
		expect(isValidUploadThingUrl("")).toBe(false);
	});

	it("rejects domain that contains but isn't an UploadThing domain", () => {
		expect(isValidUploadThingUrl("https://fake-utfs.io.evil.com/f/abc123.jpg")).toBe(false);
	});
});
