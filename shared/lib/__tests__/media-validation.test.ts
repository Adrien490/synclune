import { describe, it, expect } from "vitest";
import {
	isAllowedMediaDomain,
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

	// Audit média M11 : l'assertion contredisait le nom du test et documentait la
	// faille — un `http://utfs.io/...` passait la validation et pouvait être
	// persisté comme URL média (contenu mixte, asymétrie avec
	// `isValidUploadThingUrl` qui exige HTTPS).
	it("should reject an HTTP URL even for an allowed domain", () => {
		expect(isAllowedMediaDomain("http://abc.utfs.io/image.jpg")).toBe(false);
	});

	it("should accept the HTTPS counterpart of the same host", () => {
		expect(isAllowedMediaDomain("https://abc.utfs.io/image.jpg")).toBe(true);
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
