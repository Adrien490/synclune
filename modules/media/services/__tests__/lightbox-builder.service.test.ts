import { describe, it, expect, vi } from "vitest";

vi.mock("../../utils/media-utils", () => ({
	getVideoMimeType: vi.fn((url: string) => {
		if (url.endsWith(".webm")) return "video/webm";
		return "video/mp4";
	}),
}));

import { buildLightboxSlides } from "../lightbox-builder.service";

function makeImageMedia(overrides = {}) {
	return {
		mediaType: "IMAGE" as const,
		url: "https://cdn.example.com/bracelet.jpg",
		alt: "Bracelet Lune",
		thumbnailUrl: null,
		...overrides,
	};
}

function makeVideoMedia(overrides = {}) {
	return {
		mediaType: "VIDEO" as const,
		url: "https://cdn.example.com/bracelet.mp4",
		alt: "Bracelet video",
		thumbnailUrl: "https://cdn.example.com/poster.jpg",
		...overrides,
	};
}

describe("buildLightboxSlides", () => {
	it("should convert image media to standard slide", () => {
		const slides = buildLightboxSlides([makeImageMedia()], null);

		expect(slides).toHaveLength(1);
		expect(slides[0]).toEqual({
			src: "https://cdn.example.com/bracelet.jpg",
			alt: "Bracelet Lune",
		});
	});

	it("should convert video media to video slide", () => {
		const slides = buildLightboxSlides([makeVideoMedia()], null);

		expect(slides).toHaveLength(1);
		expect(slides[0]).toEqual(
			expect.objectContaining({
				type: "video",
				sources: [{ src: "https://cdn.example.com/bracelet.mp4", type: "video/mp4" }],
				poster: "https://cdn.example.com/poster.jpg",
				muted: true,
				playsInline: true,
			}),
		);
	});

	it("should enable autoPlay and loop when prefersReducedMotion is false", () => {
		const slides = buildLightboxSlides([makeVideoMedia()], false);

		expect(slides[0]).toEqual(
			expect.objectContaining({
				autoPlay: true,
				loop: true,
			}),
		);
	});

	it("should disable autoPlay and loop when prefersReducedMotion is true", () => {
		const slides = buildLightboxSlides([makeVideoMedia()], true);

		expect(slides[0]).toEqual(
			expect.objectContaining({
				autoPlay: false,
				loop: false,
			}),
		);
	});

	it("should enable autoPlay and loop when prefersReducedMotion is null", () => {
		const slides = buildLightboxSlides([makeVideoMedia()], null);

		expect(slides[0]).toEqual(
			expect.objectContaining({
				autoPlay: true,
				loop: true,
			}),
		);
	});

	it("should handle video without thumbnail", () => {
		const slides = buildLightboxSlides([makeVideoMedia({ thumbnailUrl: null })], null);

		expect(slides[0]).toEqual(
			expect.objectContaining({
				poster: undefined,
			}),
		);
	});

	it("should handle webm video format", () => {
		const slides = buildLightboxSlides(
			[makeVideoMedia({ url: "https://cdn.example.com/video.webm" })],
			null,
		);

		expect((slides[0] as Record<string, unknown[]>).sources[0]).toEqual({
			src: "https://cdn.example.com/video.webm",
			type: "video/webm",
		});
	});

	it("should handle mix of images and videos", () => {
		const slides = buildLightboxSlides(
			[
				makeImageMedia(),
				makeVideoMedia(),
				makeImageMedia({ url: "https://cdn.example.com/img2.jpg", alt: "Alt 2" }),
			],
			null,
		);

		expect(slides).toHaveLength(3);
		expect(slides[0]).toHaveProperty("alt", "Bracelet Lune");
		expect(slides[1]).toHaveProperty("type", "video");
		expect(slides[2]).toHaveProperty("alt", "Alt 2");
	});

	it("should return empty array for empty media list", () => {
		const slides = buildLightboxSlides([], null);

		expect(slides).toEqual([]);
	});
});
