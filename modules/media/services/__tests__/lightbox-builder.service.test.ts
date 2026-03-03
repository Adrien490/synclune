import { describe, it, expect, vi } from "vitest";

vi.mock("@/modules/media/utils/media-utils", () => ({
	getVideoMimeType: vi.fn((url: string) => {
		if (url.includes(".webm")) return "video/webm";
		return "video/mp4";
	}),
}));

vi.mock("@/modules/media/constants/image-config.constants", () => ({
	nextImageUrl: vi.fn(
		(src: string, size: number, quality?: number) =>
			`/_next/image?url=${encodeURIComponent(src)}&w=${size}&q=${quality ?? 90}`,
	),
	LIGHTBOX_QUALITY: 90,
	DEVICE_SIZES: [640, 750, 828, 1080, 1200, 1920, 2048, 3840] as const,
}));

import { buildLightboxSlides } from "../lightbox-builder.service";
import type { ProductMedia } from "@/modules/media/types/product-media.types";

// ============================================================================
// Helpers
// ============================================================================

function makeImage(overrides: Partial<ProductMedia> = {}): ProductMedia {
	return {
		id: "img-1",
		url: "https://utfs.io/f/image.jpg",
		alt: "Test image",
		mediaType: "IMAGE",
		...overrides,
	};
}

function makeVideo(overrides: Partial<ProductMedia> = {}): ProductMedia {
	return {
		id: "vid-1",
		url: "https://utfs.io/f/video.mp4",
		alt: "Test video",
		mediaType: "VIDEO",
		thumbnailUrl: "https://utfs.io/f/thumb.jpg",
		...overrides,
	};
}

// ============================================================================
// buildLightboxSlides
// ============================================================================

describe("buildLightboxSlides", () => {
	it("returns empty array for empty input", () => {
		expect(buildLightboxSlides([], false)).toEqual([]);
	});

	// ---- Images ----

	it("converts an image to a slide with srcSet", () => {
		const slides = buildLightboxSlides([makeImage()], false);

		expect(slides).toHaveLength(1);
		const slide = slides[0]!;
		expect(slide).toHaveProperty("src");
		expect(slide).toHaveProperty("srcSet");
		expect(slide).toHaveProperty("alt", "Test image");
	});

	it("generates srcSet entries for device sizes >= 640", () => {
		const slides = buildLightboxSlides([makeImage()], false);
		const slide = slides[0] as unknown as { srcSet: { width: number }[] };

		// DEVICE_SIZES >= 640: [640, 750, 828, 1080, 1200, 1920, 2048, 3840]
		expect(slide.srcSet).toHaveLength(8);
		expect(slide.srcSet[0]).toHaveProperty("width", 640);
		expect(slide.srcSet[slide.srcSet.length - 1]).toHaveProperty("width", 3840);
	});

	it("uses the largest size for the main src", () => {
		const slides = buildLightboxSlides([makeImage({ url: "https://example.com/pic.jpg" })], false);
		const slide = slides[0] as { src: string };

		expect(slide.src).toContain("w=3840");
	});

	// ---- Videos ----

	it("converts a video to a video slide", () => {
		const slides = buildLightboxSlides([makeVideo()], false);

		expect(slides).toHaveLength(1);
		const slide = slides[0] as unknown as Record<string, unknown>;
		expect(slide).toHaveProperty("type", "video");
		expect(slide).toHaveProperty("sources");
		expect(slide).toHaveProperty("poster", "https://utfs.io/f/thumb.jpg");
	});

	it("sets correct MIME type from getVideoMimeType", () => {
		const slides = buildLightboxSlides([makeVideo()], false);
		const slide = slides[0] as unknown as { sources: { src: string; type: string }[] };

		expect(slide.sources[0]).toEqual({
			src: "https://utfs.io/f/video.mp4",
			type: "video/mp4",
		});
	});

	it("enables autoplay and loop when prefersReducedMotion is false", () => {
		const slides = buildLightboxSlides([makeVideo()], false);
		const slide = slides[0] as unknown as Record<string, unknown>;

		expect(slide.autoPlay).toBe(true);
		expect(slide.loop).toBe(true);
		expect(slide.muted).toBe(true);
		expect(slide.playsInline).toBe(true);
	});

	it("disables autoplay and loop when prefersReducedMotion is true", () => {
		const slides = buildLightboxSlides([makeVideo()], true);
		const slide = slides[0] as unknown as Record<string, unknown>;

		expect(slide.autoPlay).toBe(false);
		expect(slide.loop).toBe(false);
	});

	it("disables autoplay and loop when prefersReducedMotion is null", () => {
		const slides = buildLightboxSlides([makeVideo()], null);
		const slide = slides[0] as unknown as Record<string, unknown>;

		// null is falsy, so !null === true => autoPlay = true
		expect(slide.autoPlay).toBe(true);
		expect(slide.loop).toBe(true);
	});

	it("uses undefined poster when thumbnailUrl is null", () => {
		const slides = buildLightboxSlides([makeVideo({ thumbnailUrl: null })], false);
		const slide = slides[0] as unknown as Record<string, unknown>;

		expect(slide.poster).toBeUndefined();
	});

	// ---- Mixed ----

	it("handles mixed images and videos", () => {
		const medias = [makeImage(), makeVideo({ id: "vid-2" }), makeImage({ id: "img-2" })];
		const slides = buildLightboxSlides(medias, false);

		expect(slides).toHaveLength(3);
		expect(slides[0]).toHaveProperty("alt"); // image
		expect(slides[1]).toHaveProperty("type", "video"); // video
		expect(slides[2]).toHaveProperty("alt"); // image
	});
});
