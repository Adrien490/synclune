"use client";

import "./scroll-driven.css";

import { FloatingImage } from "./floating-image";
import { IMAGE_POSITIONS } from "./image-positions";
import type { HeroFloatingImagesProps } from "./types";

/**
 * Hero floating images container.
 *
 * The images render entirely via CSS (entrance, idle float, scroll parallax,
 * scroll-fade) — see `floating-image.tsx` + `scroll-driven.css`. No motion-react,
 * no client JS: the floating images are off the hero critical path.
 *
 * Note: there is intentionally no cursor-follow / pointer-reactive depth — the
 * images stay put as the mouse moves (only the per-image hover spotlight tracks
 * the cursor while hovering a single image).
 */
export default function HeroFloatingImagesInner({ images }: HeroFloatingImagesProps) {
	return (
		<div
			aria-hidden="true"
			className="hero-floating-images-scroll-fade pointer-events-none absolute inset-0 z-0 hidden md:block"
			style={{ contain: "layout paint" }}
		>
			{images.map((image, index) => {
				const pos = IMAGE_POSITIONS[index];
				if (!pos) return null;

				return <FloatingImage key={image.slug} image={image} position={pos} />;
			})}
		</div>
	);
}
