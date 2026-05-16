import { describe, it, expect, vi } from "vitest";
import { BusinessError } from "@/shared/lib/actions";
import { parseMediaFromForm, parseMediaFromFormStrict } from "../parse-media-from-form";

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
// parseMediaFromForm (non-strict)
// ============================================================================

describe("parseMediaFromForm", () => {
	it("returns empty array when field is missing", () => {
		const fd = new FormData();
		expect(parseMediaFromForm(fd)).toEqual([]);
	});

	it("returns empty array for empty string", () => {
		const fd = makeFormData({ media: "" });
		expect(parseMediaFromForm(fd)).toEqual([]);
	});

	it("returns empty array for whitespace-only string", () => {
		const fd = makeFormData({ media: "   " });
		expect(parseMediaFromForm(fd)).toEqual([]);
	});

	it("returns empty array for invalid JSON", () => {
		const fd = makeFormData({ media: "not-json" });
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(parseMediaFromForm(fd)).toEqual([]);
	});

	it("returns empty array when JSON is not an array", () => {
		const fd = makeFormData({ media: JSON.stringify({ url: "test" }) });
		vi.spyOn(console, "warn").mockImplementation(() => {});
		expect(parseMediaFromForm(fd)).toEqual([]);
	});

	it("returns valid items from array", () => {
		const data = [
			{ url: "https://utfs.io/f/a.jpg", mediaType: "IMAGE" },
			{ url: "https://utfs.io/f/b.png", mediaType: "IMAGE" },
		];
		const fd = makeFormData({ media: JSON.stringify(data) });
		const result = parseMediaFromForm(fd);

		expect(result).toHaveLength(2);
		expect(result[0]!.url).toBe("https://utfs.io/f/a.jpg");
	});

	it("preserves order (1er = principal)", () => {
		const data = [
			{ url: "https://utfs.io/f/principal.jpg", mediaType: "IMAGE" },
			{ url: "https://utfs.io/f/secondaire.jpg", mediaType: "IMAGE" },
			{ url: "https://utfs.io/f/video.mp4", mediaType: "VIDEO" },
		];
		const fd = makeFormData({ media: JSON.stringify(data) });
		const result = parseMediaFromForm(fd);
		expect(result).toHaveLength(3);
		expect(result[0]!.url).toContain("principal");
		expect(result[1]!.url).toContain("secondaire");
		expect(result[2]!.url).toContain("video");
	});

	it("filters out items without url", () => {
		const data = [{ url: "https://utfs.io/f/valid.jpg" }, { name: "no-url" }, null, undefined];
		const fd = makeFormData({ media: JSON.stringify(data) });
		const result = parseMediaFromForm(fd);

		expect(result).toHaveLength(1);
		expect(result[0]!.url).toBe("https://utfs.io/f/valid.jpg");
	});

	it("filters out items with non-string url", () => {
		const data = [{ url: "https://utfs.io/f/valid.jpg" }, { url: 123 }];
		const fd = makeFormData({ media: JSON.stringify(data) });
		const result = parseMediaFromForm(fd);

		expect(result).toHaveLength(1);
	});

	it("uses custom fieldName", () => {
		const data = [{ url: "https://utfs.io/f/a.jpg" }];
		const fd = makeFormData({ myMedia: JSON.stringify(data) });
		const result = parseMediaFromForm(fd, "myMedia");

		expect(result).toHaveLength(1);
	});
});

// ============================================================================
// parseMediaFromFormStrict
// ============================================================================

describe("parseMediaFromFormStrict", () => {
	it("returns empty array when field is missing", () => {
		const fd = new FormData();
		expect(parseMediaFromFormStrict(fd)).toEqual([]);
	});

	it("returns empty array for empty string", () => {
		const fd = makeFormData({ media: "" });
		expect(parseMediaFromFormStrict(fd)).toEqual([]);
	});

	it("throws BusinessError on invalid JSON", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const fd = makeFormData({ media: "not-json{" });
		expect(() => parseMediaFromFormStrict(fd)).toThrow(BusinessError);
	});

	it("throws BusinessError when JSON is not an array", () => {
		const fd = makeFormData({ media: JSON.stringify({ url: "test" }) });
		expect(() => parseMediaFromFormStrict(fd)).toThrow(BusinessError);
	});

	it("returns valid items from array", () => {
		const data = [{ url: "https://utfs.io/f/a.jpg", mediaType: "IMAGE" }];
		const fd = makeFormData({ media: JSON.stringify(data) });
		const result = parseMediaFromFormStrict(fd);
		expect(result).toHaveLength(1);
		expect(result[0]!.url).toBe("https://utfs.io/f/a.jpg");
	});

	it("filters out items without url silently (kept lenient on item-level)", () => {
		const data = [{ url: "https://utfs.io/f/valid.jpg" }, { name: "no-url" }];
		const fd = makeFormData({ media: JSON.stringify(data) });
		const result = parseMediaFromFormStrict(fd);
		expect(result).toHaveLength(1);
	});

	it("uses custom fieldName", () => {
		const data = [{ url: "https://utfs.io/f/a.jpg" }];
		const fd = makeFormData({ customField: JSON.stringify(data) });
		const result = parseMediaFromFormStrict(fd, "customField");
		expect(result).toHaveLength(1);
	});
});
