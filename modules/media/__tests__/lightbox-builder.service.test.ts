import { describe, it, expect, vi } from "vitest";

vi.mock("../utils/media-utils", () => ({
	getVideoMimeType: vi.fn(() => "video/mp4"),
}));

import { buildLightboxSlides } from "../services/lightbox-builder.service";
import { nextImageUrl, LIGHTBOX_QUALITY } from "../constants/image-config.constants";
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

	it("converts an image media to an optimized slide with srcSet", () => {
		const slides = buildLightboxSlides([createImageMedia()], false);
		expect(slides).toHaveLength(1);

		const slide = slides[0] as unknown as Record<string, unknown>;
		// src should use /_next/image optimization
		expect(slide.src).toContain("/_next/image");
		expect(slide.src).toContain(encodeURIComponent("https://utfs.io/f/image1.jpg"));
		expect(slide).toHaveProperty("alt", "Test image");
	});

	it("generates srcSet with multiple sizes for image slides", () => {
		const slides = buildLightboxSlides([createImageMedia()], false);
		const slide = slides[0] as unknown as Record<string, unknown>;

		expect(slide.srcSet).toBeDefined();
		const srcSet = slide.srcSet as { src: string; width: number }[];
		expect(srcSet.length).toBeGreaterThan(0);

		// Each srcSet entry should have src and width
		for (const entry of srcSet) {
			expect(entry.src).toContain("/_next/image");
			expect(entry.width).toBeGreaterThanOrEqual(640);
			expect(entry.src).toBe(
				nextImageUrl("https://utfs.io/f/image1.jpg", entry.width, LIGHTBOX_QUALITY),
			);
		}
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
		const slides = buildLightboxSlides([createImageMedia(), createVideoMedia()], false);
		expect(slides).toHaveLength(2);
		const imageSlide = slides[0] as unknown as Record<string, unknown>;
		expect(imageSlide).toHaveProperty("src");
		expect(imageSlide.src).toContain("/_next/image");
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
			false,
		);
		expect(slides[0]).toHaveProperty("poster", "https://utfs.io/f/poster.jpg");
	});

	it("sets poster to undefined when thumbnailUrl is null", () => {
		const slides = buildLightboxSlides([createVideoMedia({ thumbnailUrl: null })], false);
		expect(slides[0]).toHaveProperty("poster", undefined);
	});

	it("always uses video/mp4 MIME type (only supported format)", () => {
		const slides = buildLightboxSlides(
			[createVideoMedia({ url: "https://utfs.io/f/video.mp4" })],
			false,
		);
		expect((slides[0] as unknown as Record<string, unknown>).sources).toEqual([
			{ src: "https://utfs.io/f/video.mp4", type: "video/mp4" },
		]);
	});

	it("does not optimize video URLs through /_next/image", () => {
		const slides = buildLightboxSlides([createVideoMedia()], false);
		const sources = (slides[0] as unknown as Record<string, unknown[]>).sources!;
		expect((sources[0] as Record<string, string>).src).toBe("https://utfs.io/f/video1.mp4");
		expect((sources[0] as Record<string, string>).src).not.toContain("/_next/image");
	});
});
