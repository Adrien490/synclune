"use client";

import dynamic from "next/dynamic";
import type { HeroFloatingImagesProps } from "./types";

const HeroFloatingImagesInner = dynamic(() => import("./hero-floating-images-inner"), {
	ssr: false,
});

export function HeroFloatingImages({ images }: HeroFloatingImagesProps) {
	if (images.length === 0) return null;
	return <HeroFloatingImagesInner images={images} />;
}
