"use client";

import { useMotionValue, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import { FloatingImage } from "./floating-image";
import { IMAGE_POSITIONS } from "./image-positions";
import type { HeroFloatingImagesProps } from "./types";

export default function HeroFloatingImagesInner({ images }: HeroFloatingImagesProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const shouldReduceMotion = useReducedMotion();

	const { scrollYProgress } = useScroll({
		target: containerRef,
		offset: ["start start", "end start"],
	});

	const parallaxOpacity = useTransform(scrollYProgress, [0, 0.4, 1], [1, 1, 0.2]);

	// Pointer-reactive parallax: normalized -1..1 across the hero container
	const pointerX = useMotionValue(0);
	const pointerY = useMotionValue(0);

	useEffect(() => {
		if (shouldReduceMotion) return;
		// Desktop only — container is `hidden md:block`, save CPU on narrow viewports
		const mq = window.matchMedia("(min-width: 768px)");
		if (!mq.matches) return;

		let rafId = 0;
		let clientX = 0;
		let clientY = 0;

		function flush() {
			rafId = 0;
			const rect = containerRef.current?.getBoundingClientRect();
			if (!rect) return;
			if (
				clientY < rect.top ||
				clientY > rect.bottom ||
				clientX < rect.left ||
				clientX > rect.right
			) {
				pointerX.set(0);
				pointerY.set(0);
				return;
			}
			pointerX.set(((clientX - rect.left) / rect.width) * 2 - 1);
			pointerY.set(((clientY - rect.top) / rect.height) * 2 - 1);
		}

		function onPointerMove(event: PointerEvent) {
			clientX = event.clientX;
			clientY = event.clientY;
			if (rafId) return;
			rafId = window.requestAnimationFrame(flush);
		}

		function onMqChange() {
			if (!mq.matches) {
				pointerX.set(0);
				pointerY.set(0);
			}
		}

		window.addEventListener("pointermove", onPointerMove, { passive: true });
		mq.addEventListener("change", onMqChange);
		return () => {
			window.removeEventListener("pointermove", onPointerMove);
			mq.removeEventListener("change", onMqChange);
			if (rafId) window.cancelAnimationFrame(rafId);
		};
	}, [shouldReduceMotion, pointerX, pointerY]);

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
						pointerX={pointerX}
						pointerY={pointerY}
						shouldReduceMotion={shouldReduceMotion}
						isPriority={index === 0}
					/>
				);
			})}
		</div>
	);
}
