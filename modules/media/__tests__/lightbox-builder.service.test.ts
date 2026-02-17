import { describe, it, expect, vi } from "vitest";

vi.mock("../utils/media-utils", () => ({
	getVideoMimeType: vi.fn((url: string) => {
		if (url.endsWith(".webm")) return "video/webm";
		return "video/mp4";
	}),
}));

import { buildLightboxSlides } from "../services/lightbox-builder.service";
import type { ProductMedia } from "../types/product-media.types";

function createImageMedia(overrides: Partial<ProductMedia> = {}): ProductMedia {
	return {
		id: "img-1",
		url: "https://utfs.io/f/image1.jpg",
		alt: "Test image",
		mediaType: "IMAGE",
		...overrides,
	};
}

function createVideoMedia(overrides: Partial<ProductMedia> = {}): ProductMedia {
	return {
		id: "vid-1",
		url: "https://utfs.io/f/video1.mp4",
		alt: "Test video",
		mediaType: "VIDEO",
		thumbnailUrl: "https://utfs.io/f/thumb1.jpg",
		...overrides,
	};
}

describe("buildLightboxSlides", () => {
	it("returns an empty array for empty medias", () => {
		const slides = buildLightboxSlides([], false);
		expect(slides).toEqual([]);
	});

	it("converts an image media to a simple slide", () => {
		const slides = buildLightboxSlides([createImageMedia()], false);
		expect(slides).toHaveLength(1);
		expect(slides[0]).toEqual({
			src: "https://utfs.io/f/image1.jpg",
			alt: "Test image",
		});
	});

	it("converts a video media to a video slide", () => {
		const slides = buildLightboxSlides([createVideoMedia()], false);
		expect(slides).toHaveLength(1);
		expect(slides[0]).toEqual({
			type: "video",
			sources: [{ src: "https://utfs.io/f/video1.mp4", type: "video/mp4" }],
			poster: "https://utfs.io/f/thumb1.jpg",
			autoPlay: true,
			muted: true,
			loop: true,
			playsInline: true,
		});
	});

	it("handles mixed image and video medias", () => {
		const slides = buildLightboxSlides(
			[createImageMedia(), createVideoMedia()],
			false
		);
		expect(slides).toHaveLength(2);
		expect(slides[0]).toHaveProperty("src");
		expect(slides[1]).toHaveProperty("type", "video");
	});

	it("disables autoPlay and loop when prefersReducedMotion is true", () => {
		const slides = buildLightboxSlides([createVideoMedia()], true);
		expect(slides[0]).toMatchObject({
			autoPlay: false,
			loop: false,
		});
	});

	it("enables autoPlay and loop when prefersReducedMotion is false", () => {
		const slides = buildLightboxSlides([createVideoMedia()], false);
		expect(slides[0]).toMatchObject({
			autoPlay: true,
			loop: true,
		});
	});

	it("enables autoPlay and loop when prefersReducedMotion is null", () => {
		const slides = buildLightboxSlides([createVideoMedia()], null);
		expect(slides[0]).toMatchObject({
			autoPlay: true,
			loop: true,
		});
	});

	it("uses thumbnailUrl as poster when available", () => {
		const slides = buildLightboxSlides(
			[createVideoMedia({ thumbnailUrl: "https://utfs.io/f/poster.jpg" })],
			false
		);
		expect(slides[0]).toHaveProperty("poster", "https://utfs.io/f/poster.jpg");
	});

	it("sets poster to undefined when thumbnailUrl is null", () => {
		const slides = buildLightboxSlides(
			[createVideoMedia({ thumbnailUrl: null })],
			false
		);
		expect(slides[0]).toHaveProperty("poster", undefined);
	});

	it("detects webm MIME type for .webm videos", () => {
		const slides = buildLightboxSlides(
			[createVideoMedia({ url: "https://utfs.io/f/video.webm" })],
			false
		);
		expect((slides[0] as Record<string, unknown>).sources).toEqual([
			{ src: "https://utfs.io/f/video.webm", type: "video/webm" },
		]);
	});
});
