/**
 * Tests DIRECTS du builder de slides lightbox — jusqu'ici uniquement mocké
 * dans `gallery.test.tsx`.
 */
import { describe, expect, it } from "vitest";

import { buildLightboxSlides } from "../lightbox-builder.service";

import type { ProductMedia } from "@/modules/media/types/product-media.types";

const image = (overrides: Partial<ProductMedia> = {}): ProductMedia => ({
	id: "img-1",
	url: "https://utfs.io/f/photo.jpg",
	alt: "Boucles Nuage - Vue 1",
	type: "IMAGE",
	...overrides,
});

const video = (overrides: Partial<ProductMedia> = {}): ProductMedia => ({
	id: "vid-1",
	url: "https://utfs.io/f/demo.mp4",
	alt: "Vidéo Boucles Nuage",
	type: "VIDEO",
	...overrides,
});

describe("buildLightboxSlides", () => {
	it("mappe une image vers un slide optimisé /_next/image avec son alt", () => {
		const [slide] = buildLightboxSlides([image()], false);
		expect(slide).toMatchObject({ alt: "Boucles Nuage - Vue 1" });
		expect((slide as { src: string }).src).toContain("/_next/image");
		expect((slide as { src: string }).src).toContain(encodeURIComponent("https://utfs.io/f/"));
	});

	it("mappe une vidéo vers un slide type video avec le bon MIME", () => {
		const [slide] = buildLightboxSlides([video()], false);
		expect(slide).toMatchObject({
			type: "video",
			autoPlay: true,
			muted: true,
			loop: true,
			playsInline: true,
		});
		expect((slide as { sources: ReadonlyArray<{ src: string; type: string }> }).sources).toEqual([
			{ src: "https://utfs.io/f/demo.mp4", type: "video/mp4" },
		]);
	});

	it("désactive autoplay et loop sous prefers-reduced-motion", () => {
		const [slide] = buildLightboxSlides([video()], true);
		expect(slide).toMatchObject({ autoPlay: false, loop: false });
	});

	it("préserve l'ordre des médias", () => {
		const slides = buildLightboxSlides([image(), video(), image({ id: "img-2" })], false);
		expect(slides).toHaveLength(3);
		expect("sources" in slides[1]!).toBe(true);
	});
});
