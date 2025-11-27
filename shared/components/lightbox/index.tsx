"use client";

import dynamic from "next/dynamic";
import type { Slide } from "yet-another-react-lightbox";

/**
 * Dynamically imported ProductLightbox
 * Reduces initial bundle size by loading lightbox code only when needed
 */
const ProductLightbox = dynamic(() => import("./product-lightbox"), {
	ssr: false,
	loading: () => null,
});

export { ProductLightbox };
export type { Slide };
