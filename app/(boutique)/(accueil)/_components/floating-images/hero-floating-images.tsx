"use client";

import { useInView, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { FloatingImage } from "./floating-image";
import { IMAGE_POSITIONS } from "./image-positions";
import type { HeroFloatingImagesProps } from "./types";

function HeroFloatingImagesInner({ images }: HeroFloatingImagesProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const shouldReduceMotion = useReducedMotion();
	const isInView = useInView(containerRef, { margin: "0px 0px -100px 0px" });

	const { scrollYProgress } = useScroll({
		target: containerRef,
		offset: ["start start", "end start"],
	});

	const parallaxOpacity = useTransform(scrollYProgress, [0, 0.4, 1], [1, 1, 0.2]);

	return (
		<div
			ref={containerRef}
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 z-0 hidden md:block"
			style={{ contain: "layout paint" }}
		>
			{images.map((image, index) => {
				const pos = IMAGE_POSITIONS[index];
				if (!pos) return null;

				return (
					<FloatingImage
						key={image.slug}
						image={image}
						position={pos}
						scrollProgress={scrollYProgress}
						parallaxOpacity={parallaxOpacity}
						shouldReduceMotion={shouldReduceMotion}
						isInView={isInView}
						index={index}
					/>
				);
			})}
		</div>
	);
}

export function HeroFloatingImages({ images }: HeroFloatingImagesProps) {
	if (images.length === 0) return null;
	return <HeroFloatingImagesInner images={images} />;
}
