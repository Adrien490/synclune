import { describe, it, expect, vi } from "vitest";
import { parsePrimaryImageFromForm, parseGalleryMediaFromForm } from "../parse-media-from-form";

// ============================================================================
// Helpers
// ============================================================================

function makeFormData(entries: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [key, value] of Object.entries(entries)) {
		fd.set(key, value);
	}
	return fd;
}

// ============================================================================
// parsePrimaryImageFromForm
// ============================================================================

describe("parsePrimaryImageFromForm", () => {
	it("returns undefined when field is missing", () => {
		const fd = new FormData();
		expect(parsePrimaryImageFromForm(fd)).toBeUndefined();
	});

	it("returns undefined for empty string", () => {
		const fd = makeFormData({ primaryImage: "" });
		expect(parsePrimaryImageFromForm(fd)).toBeUndefined();
	});

	it("returns undefined for whitespace-only string", () => {
		const fd = makeFormData({ primaryImage: "   " });
		expect(parsePrimaryImageFromForm(fd)).toBeUndefined();
	});

	it("returns parsed object when valid JSON with url", () => {
		const data = { url: "https://utfs.io/f/abc.jpg", mediaType: "IMAGE" };
		const fd = makeFormData({ primaryImage: JSON.stringify(data) });
		const result = parsePrimaryImageFromForm(fd);

		expect(result).toBeDefined();
		expect(result!.url).toBe("https://utfs.io/f/abc.jpg");
	});

	it("returns undefined for JSON without url property", () => {
		const fd = makeFormData({ primaryImage: JSON.stringify({ name: "test" }) });
		vi.spyOn(console, "warn").mockImplementation(() => {});
		expect(parsePrimaryImageFromForm(fd)).toBeUndefined();
	});

	it("returns undefined for JSON with non-string url", () => {
		const fd = makeFormData({ primaryImage: JSON.stringify({ url: 123 }) });
		vi.spyOn(console, "warn").mockImplementation(() => {});
		expect(parsePrimaryImageFromForm(fd)).toBeUndefined();
	});

	it("returns undefined for invalid JSON", () => {
		const fd = makeFormData({ primaryImage: "not-json{" });
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(parsePrimaryImageFromForm(fd)).toBeUndefined();
	});

	it("uses custom fieldName", () => {
		const data = { url: "https://utfs.io/f/custom.jpg" };
		const fd = makeFormData({ customField: JSON.stringify(data) });
		const result = parsePrimaryImageFromForm(fd, "customField");

		expect(result!.url).toBe("https://utfs.io/f/custom.jpg");
	});
});

// ============================================================================
// parseGalleryMediaFromForm
// ============================================================================

describe("parseGalleryMediaFromForm", () => {
	it("returns empty array when field is missing", () => {
		const fd = new FormData();
		expect(parseGalleryMediaFromForm(fd)).toEqual([]);
	});

	it("returns empty array for empty string", () => {
		const fd = makeFormData({ galleryMedia: "" });
		expect(parseGalleryMediaFromForm(fd)).toEqual([]);
	});

	it("returns empty array for invalid JSON", () => {
		const fd = makeFormData({ galleryMedia: "not-json" });
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(parseGalleryMediaFromForm(fd)).toEqual([]);
	});

	it("returns empty array when JSON is not an array", () => {
		const fd = makeFormData({ galleryMedia: JSON.stringify({ url: "test" }) });
		vi.spyOn(console, "warn").mockImplementation(() => {});
		expect(parseGalleryMediaFromForm(fd)).toEqual([]);
	});

	it("returns valid items from array", () => {
		const data = [
			{ url: "https://utfs.io/f/a.jpg", mediaType: "IMAGE" },
			{ url: "https://utfs.io/f/b.png", mediaType: "IMAGE" },
		];
		const fd = makeFormData({ galleryMedia: JSON.stringify(data) });
		const result = parseGalleryMediaFromForm(fd);

		expect(result).toHaveLength(2);
		expect(result[0]!.url).toBe("https://utfs.io/f/a.jpg");
	});

	it("filters out items without url", () => {
		const data = [{ url: "https://utfs.io/f/valid.jpg" }, { name: "no-url" }, null, undefined];
		const fd = makeFormData({ galleryMedia: JSON.stringify(data) });
		const result = parseGalleryMediaFromForm(fd);

		expect(result).toHaveLength(1);
		expect(result[0]!.url).toBe("https://utfs.io/f/valid.jpg");
	});

	it("filters out items with non-string url", () => {
		const data = [{ url: "https://utfs.io/f/valid.jpg" }, { url: 123 }];
		const fd = makeFormData({ galleryMedia: JSON.stringify(data) });
		const result = parseGalleryMediaFromForm(fd);

		expect(result).toHaveLength(1);
	});

	it("uses custom fieldName", () => {
		const data = [{ url: "https://utfs.io/f/a.jpg" }];
		const fd = makeFormData({ myGallery: JSON.stringify(data) });
		const result = parseGalleryMediaFromForm(fd, "myGallery");

		expect(result).toHaveLength(1);
	});
});
