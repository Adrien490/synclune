import { describe, it, expect } from "vitest";
import { extractFileKeyFromUrl, extractFileKeysFromUrls } from "../extract-file-key";

// ============================================================================
// extractFileKeyFromUrl
// ============================================================================

describe("extractFileKeyFromUrl", () => {
	it("extracts key from utfs.io URL", () => {
		expect(extractFileKeyFromUrl("https://utfs.io/f/abc123.jpg")).toBe("abc123.jpg");
	});

	it("extracts key from ufs.sh subdomain URL", () => {
		expect(extractFileKeyFromUrl("https://x1ain1wpub.ufs.sh/f/mykey.png")).toBe("mykey.png");
	});

	it("extracts key from S3 bucket URL", () => {
		expect(
			extractFileKeyFromUrl("https://uploadthing-prod.s3.us-west-2.amazonaws.com/myfile.webp"),
		).toBe("myfile.webp");
	});

	it("extracts key with no extension (CUID-like)", () => {
		expect(extractFileKeyFromUrl("https://utfs.io/f/clabcdef123456789012345")).toBe(
			"clabcdef123456789012345",
		);
	});

	it("returns null for invalid URL", () => {
		expect(extractFileKeyFromUrl("not-a-url")).toBeNull();
	});

	it("returns null for URL with empty path", () => {
		expect(extractFileKeyFromUrl("https://utfs.io/")).toBeNull();
	});

	it("returns null for key with special characters", () => {
		expect(extractFileKeyFromUrl("https://utfs.io/f/file%20name.jpg")).toBeNull();
	});

	it("returns null for empty string", () => {
		expect(extractFileKeyFromUrl("")).toBeNull();
	});

	it("extracts key with dots and hyphens", () => {
		expect(extractFileKeyFromUrl("https://utfs.io/f/my-file.name.jpg")).toBe("my-file.name.jpg");
	});
});

// ============================================================================
// extractFileKeysFromUrls
// ============================================================================

describe("extractFileKeysFromUrls", () => {
	it("returns empty arrays for empty input", () => {
		expect(extractFileKeysFromUrls([])).toEqual({ keys: [], failedUrls: [] });
	});

	it("extracts keys from valid URLs", () => {
		const result = extractFileKeysFromUrls([
			"https://utfs.io/f/abc.jpg",
			"https://utfs.io/f/def.png",
		]);
		expect(result.keys).toEqual(["abc.jpg", "def.png"]);
		expect(result.failedUrls).toEqual([]);
	});

	it("separates valid and failed URLs", () => {
		const result = extractFileKeysFromUrls([
			"https://utfs.io/f/valid.jpg",
			"not-a-url",
			"https://utfs.io/f/also-valid.png",
		]);
		expect(result.keys).toEqual(["valid.jpg", "also-valid.png"]);
		expect(result.failedUrls).toEqual(["not-a-url"]);
	});

	it("returns all as failed for invalid URLs", () => {
		const result = extractFileKeysFromUrls(["bad1", "bad2"]);
		expect(result.keys).toEqual([]);
		expect(result.failedUrls).toEqual(["bad1", "bad2"]);
	});
});
