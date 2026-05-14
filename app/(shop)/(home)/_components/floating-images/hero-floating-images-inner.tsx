"use client";

import { useMotionValue, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { cssSupports } from "@/shared/utils/css-supports";
import { FloatingImage } from "./floating-image";
import { IMAGE_POSITIONS } from "./image-positions";
import type { HeroFloatingImagesProps } from "./types";

const noopSubscribe = () => () => {};
const getScrollTimelineSupport = () => cssSupports("animation-timeline", "scroll()");
const getServerScrollTimelineSupport = () => false;

export default function HeroFloatingImagesInner({ images }: HeroFloatingImagesProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const shouldReduceMotion = useReducedMotion();

	// Detect native CSS scroll-driven animations support (Chrome/Edge 115+, Safari 26+).
	// When supported, opacity is animated via CSS keyframe (compositor thread)
	// instead of motion-react useTransform (main thread).
	const supportsScrollTimeline = useSyncExternalStore(
		noopSubscribe,
		getScrollTimelineSupport,
		getServerScrollTimelineSupport,
	);

	const { scrollYProgress } = useScroll({
		target: containerRef,
		offset: ["start start", "end start"],
	});

	const parallaxOpacityMotion = useTransform(scrollYProgress, [0, 0.4, 1], [1, 1, 0.2]);
	// When CSS scroll-timeline is available, defer opacity to the container's CSS animation.
	const parallaxOpacity = supportsScrollTimeline ? null : parallaxOpacityMotion;

	// Pointer-reactive parallax: normalized -1..1 across the hero container
	const pointerX = useMotionValue(0);
	const pointerY = useMotionValue(0);

	useEffect(() => {
		if (shouldReduceMotion) return;
		// Desktop only — container is `hidden md:block`, save CPU on narrow viewports
		const mq = window.matchMedia("(min-width: 768px)");
		if (!mq.matches) return;

		const container = containerRef.current;
		if (!container) return;

		let rafId = 0;
		let clientX = 0;
		let clientY = 0;
		let listenerAttached = false;

		function flush() {
			rafId = 0;
			const rect = container?.getBoundingClientRect();
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

		function attachListener() {
			if (listenerAttached) return;
			window.addEventListener("pointermove", onPointerMove, { passive: true });
			listenerAttached = true;
		}

		function detachListener() {
			if (!listenerAttached) return;
			window.removeEventListener("pointermove", onPointerMove);
			listenerAttached = false;
			pointerX.set(0);
			pointerY.set(0);
		}

		// Gate the pointermove listener on viewport intersection: once the hero has
		// scrolled off-screen, calculating bounding rects for every cursor move is wasted CPU.
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) attachListener();
				else detachListener();
			},
			{ rootMargin: "0px" },
		);
		observer.observe(container);

		function onMqChange() {
			if (!mq.matches) detachListener();
		}

		mq.addEventListener("change", onMqChange);
		return () => {
			observer.disconnect();
			detachListener();
			mq.removeEventListener("change", onMqChange);
			if (rafId) window.cancelAnimationFrame(rafId);
		};
	}, [shouldReduceMotion, pointerX, pointerY]);

	return (
		<div
			ref={containerRef}
			aria-hidden="true"
			className="hero-floating-images-scroll-fade pointer-events-none absolute inset-0 z-0 hidden md:block"
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
