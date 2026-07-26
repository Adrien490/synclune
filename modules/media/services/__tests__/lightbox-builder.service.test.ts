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
		// `srcSet` n'est émis que si les dimensions sont connues : sans elles, la
		// lightbox recevrait un `height` incohérent et casserait le fit/zoom.
		width: 2000,
		height: 2500,
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

	it("derives a real height per srcSet entry from the intrinsic ratio", () => {
		// 2000×2500 => ratio 1.25
		const slides = buildLightboxSlides([makeImage()], false);
		const slide = slides[0] as unknown as {
			width: number;
			height: number;
			srcSet: { width: number; height: number }[];
		};

		expect(slide.width).toBe(2000);
		expect(slide.height).toBe(2500);
		expect(slide.srcSet[0]).toEqual(expect.objectContaining({ width: 640, height: 800 }));
		expect(slide.srcSet.at(-1)).toEqual(expect.objectContaining({ width: 3840, height: 4800 }));
	});

	it("never emits height: 0 — a legacy media without dimensions omits srcSet entirely", () => {
		// `ImageSource.height` est REQUIS par la lightbox et sert au calcul du ratio :
		// `height: 0` (ancien comportement) décrivait un ratio impossible et cassait
		// le fit/zoom. Sans dimensions connues, on retombe sur la seule `src`.
		const slides = buildLightboxSlides([makeImage({ width: null, height: null })], false);
		const slide = slides[0]!;

		expect(slide).not.toHaveProperty("srcSet");
		expect(slide).not.toHaveProperty("height");
		expect(slide).toHaveProperty("src");
		expect(slide).toHaveProperty("alt", "Test image");
	});

	it("omits srcSet when only one dimension is known", () => {
		const slides = buildLightboxSlides([makeImage({ width: 2000, height: null })], false);
		expect(slides[0]).not.toHaveProperty("srcSet");
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
