import { describe, it, expect } from "vitest";
import {
	isAllowedMediaDomain,
	isValidImageUrl,
	getValidImageUrl,
	UPLOADTHING_DOMAINS,
	ALLOWED_MEDIA_DOMAINS,
} from "../media-validation";

describe("UPLOADTHING_DOMAINS", () => {
	it("should include utfs.io", () => {
		expect(UPLOADTHING_DOMAINS).toContain("utfs.io");
	});

	it("should include ufs.sh", () => {
		expect(UPLOADTHING_DOMAINS).toContain("ufs.sh");
	});
});

describe("isAllowedMediaDomain", () => {
	it("should allow a *.utfs.io subdomain", () => {
		expect(isAllowedMediaDomain("https://abc123.utfs.io/image.jpg")).toBe(true);
	});

	it("should allow ufs.sh exactly", () => {
		expect(isAllowedMediaDomain("https://ufs.sh/f/file.jpg")).toBe(true);
	});

	it("should allow uploadthing.com", () => {
		expect(isAllowedMediaDomain("https://uploadthing.com/f/file.jpg")).toBe(true);
	});

	it("should allow the S3 UploadThing domain", () => {
		expect(
			isAllowedMediaDomain("https://uploadthing-prod.s3.us-west-2.amazonaws.com/file.jpg"),
		).toBe(true);
	});

	it("should reject an HTTP URL even for an allowed domain", () => {
		// isAllowedMediaDomain only checks domain, not protocol
		// so http://abc.utfs.io is allowed by domain check alone
		expect(isAllowedMediaDomain("http://abc.utfs.io/image.jpg")).toBe(true);
	});

	it("should reject a completely foreign domain", () => {
		expect(isAllowedMediaDomain("https://evil.com/image.jpg")).toBe(false);
	});

	it("should reject an invalid URL", () => {
		expect(isAllowedMediaDomain("not-a-url")).toBe(false);
	});

	it("should allow synclune.fr when passed in allowedDomains", () => {
		expect(isAllowedMediaDomain("https://synclune.fr/image.jpg", ALLOWED_MEDIA_DOMAINS)).toBe(true);
	});

	it("should allow cdn.synclune.fr when passed in allowedDomains", () => {
		expect(isAllowedMediaDomain("https://cdn.synclune.fr/image.jpg", ALLOWED_MEDIA_DOMAINS)).toBe(
			true,
		);
	});

	it("should reject synclune.fr with default (UploadThing-only) domains", () => {
		expect(isAllowedMediaDomain("https://synclune.fr/image.jpg")).toBe(false);
	});
});

describe("isValidImageUrl", () => {
	it("should return true for a valid HTTPS UploadThing URL", () => {
		expect(isValidImageUrl("https://abc123.utfs.io/image.jpg")).toBe(true);
	});

	it("should return true for a valid HTTPS Synclune CDN URL", () => {
		expect(isValidImageUrl("https://cdn.synclune.fr/image.jpg")).toBe(true);
	});

	it("should return false for an HTTP URL", () => {
		expect(isValidImageUrl("http://abc123.utfs.io/image.jpg")).toBe(false);
	});

	it("should return false for undefined", () => {
		expect(isValidImageUrl(undefined)).toBe(false);
	});

	it("should return false for null", () => {
		expect(isValidImageUrl(null)).toBe(false);
	});

	it("should return false for an empty string", () => {
		expect(isValidImageUrl("")).toBe(false);
	});

	it("should return false for a valid HTTPS URL on a foreign domain", () => {
		expect(isValidImageUrl("https://evil.com/image.jpg")).toBe(false);
	});

	it("should return false for a malformed URL", () => {
		expect(isValidImageUrl("not-a-url")).toBe(false);
	});
});

describe("getValidImageUrl", () => {
	it("should return the URL when valid", () => {
		const url = "https://abc123.utfs.io/image.jpg";
		expect(getValidImageUrl(url)).toBe(url);
	});

	it("should return undefined for an invalid URL", () => {
		expect(getValidImageUrl("http://abc123.utfs.io/image.jpg")).toBeUndefined();
	});

	it("should return undefined for null", () => {
		expect(getValidImageUrl(null)).toBeUndefined();
	});

	it("should return undefined for undefined", () => {
		expect(getValidImageUrl(undefined)).toBeUndefined();
	});

	it("should return undefined for an empty string", () => {
		expect(getValidImageUrl("")).toBeUndefined();
	});
});
