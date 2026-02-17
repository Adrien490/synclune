import { describe, it, expect } from "vitest";
import { extractFileKeyFromUrl, extractFileKeysFromUrls } from "../utils/extract-file-key";

describe("extractFileKeyFromUrl", () => {
	it("should extract key from standard utfs.io format", () => {
		const result = extractFileKeyFromUrl("https://utfs.io/f/abc123.png");
		expect(result).toBe("abc123.png");
	});

	it("should extract key from S3 format", () => {
		const result = extractFileKeyFromUrl(
			"https://uploadthing-prod.s3.us-west-2.amazonaws.com/filekey123"
		);
		expect(result).toBe("filekey123");
	});

	it("should extract key from subdomain ufs.sh format", () => {
		const result = extractFileKeyFromUrl("https://x1ain1wpub.ufs.sh/f/filekey456");
		expect(result).toBe("filekey456");
	});

	it("should return null for an invalid URL", () => {
		const result = extractFileKeyFromUrl("not-a-valid-url");
		expect(result).toBeNull();
	});

	it("should return null for an empty string", () => {
		const result = extractFileKeyFromUrl("");
		expect(result).toBeNull();
	});

	it("should return null for a URL with no path beyond the domain", () => {
		const result = extractFileKeyFromUrl("https://utfs.io");
		expect(result).toBeNull();
	});

	it("should return null for a URL with a trailing slash (empty last segment)", () => {
		const result = extractFileKeyFromUrl("https://utfs.io/f/");
		expect(result).toBeNull();
	});

	it("should extract key from a URL with query parameters", () => {
		const result = extractFileKeyFromUrl(
			"https://utfs.io/f/abc123.png?token=xyz&expires=9999"
		);
		expect(result).toBe("abc123.png");
	});

	it("should extract key from a URL with a hash fragment", () => {
		const result = extractFileKeyFromUrl("https://utfs.io/f/abc123.png#section");
		expect(result).toBe("abc123.png");
	});
});

describe("extractFileKeysFromUrls", () => {
	it("should extract all keys when all URLs are valid", () => {
		const urls = [
			"https://utfs.io/f/key-one.png",
			"https://utfs.io/f/key-two.jpg",
			"https://uploadthing-prod.s3.us-west-2.amazonaws.com/key-three",
		];

		const result = extractFileKeysFromUrls(urls);

		expect(result.keys).toEqual(["key-one.png", "key-two.jpg", "key-three"]);
		expect(result.failedUrls).toEqual([]);
	});

	it("should put all URLs in failedUrls when all are invalid", () => {
		const urls = ["not-a-url", "", "also-not-a-url"];

		const result = extractFileKeysFromUrls(urls);

		expect(result.keys).toEqual([]);
		expect(result.failedUrls).toEqual(["not-a-url", "", "also-not-a-url"]);
	});

	it("should split correctly between valid and invalid URLs", () => {
		const urls = [
			"https://utfs.io/f/valid-key.png",
			"not-a-url",
			"https://utfs.io/f/another-key.jpg",
			"",
		];

		const result = extractFileKeysFromUrls(urls);

		expect(result.keys).toEqual(["valid-key.png", "another-key.jpg"]);
		expect(result.failedUrls).toEqual(["not-a-url", ""]);
	});

	it("should return empty keys and failedUrls for an empty array", () => {
		const result = extractFileKeysFromUrls([]);

		expect(result.keys).toEqual([]);
		expect(result.failedUrls).toEqual([]);
	});

	it("should handle a single valid URL", () => {
		const result = extractFileKeysFromUrls(["https://utfs.io/f/solo-key.png"]);

		expect(result.keys).toEqual(["solo-key.png"]);
		expect(result.failedUrls).toEqual([]);
	});

	it("should handle a single invalid URL", () => {
		const result = extractFileKeysFromUrls(["bad-url"]);

		expect(result.keys).toEqual([]);
		expect(result.failedUrls).toEqual(["bad-url"]);
	});
});
