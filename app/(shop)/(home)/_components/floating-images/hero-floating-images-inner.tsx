"use client";

import "./scroll-driven.css";

import { useEffect, useRef } from "react";
import { FloatingImage } from "./floating-image";
import { IMAGE_POSITIONS } from "./image-positions";
import type { HeroFloatingImagesProps } from "./types";

/**
 * Hero floating images container.
 *
 * The images themselves render entirely via CSS (entrance, idle float, scroll
 * parallax, scroll-fade) — see `floating-image.tsx` + `scroll-driven.css`.
 * No motion-react: the floating images are no longer on the hero critical path.
 *
 * The only client JS here is pointer-reactive depth: a desktop-only,
 * motion-safe, viewport-gated `pointermove` listener that writes the
 * normalized cursor position to `--hero-pointer-x/y` CSS custom properties.
 * Each `FloatingImage` composes its own translate from them. The listener is
 * attached after first paint via IntersectionObserver, so it never blocks LCP.
 */
export default function HeroFloatingImagesInner({ images }: HeroFloatingImagesProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		// Reduced motion: skip the pointer effect entirely (CSS already disables
		// the `.hero-image-pointer` translate — this just saves the CPU).
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		// Desktop mouse only — the pointer-reactive depth is a hover enhancement.
		// Coarse pointers (iPad/tablette tactile ≥768px) déclencheraient pointermove
		// au toucher pour rien : CPU gaspillé + incohérent avec le `can-hover` gate
		// repo. Le container visuel reste `hidden md:block` (cf. visibilityClass).
		const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
		if (!mq.matches) return;

		const container = containerRef.current;
		if (!container) return;

		let rafId = 0;
		let clientX = 0;
		let clientY = 0;
		let listenerAttached = false;
		let rect: DOMRect | null = null;

		function flush() {
			rafId = 0;
			if (!container) return;
			// Cache the container rect — re-reading it every frame forces a reflow.
			rect ??= container.getBoundingClientRect();
			if (
				clientY < rect.top ||
				clientY > rect.bottom ||
				clientX < rect.left ||
				clientX > rect.right
			) {
				container.style.setProperty("--hero-pointer-x", "0");
				container.style.setProperty("--hero-pointer-y", "0");
				return;
			}
			container.style.setProperty(
				"--hero-pointer-x",
				String(((clientX - rect.left) / rect.width) * 2 - 1),
			);
			container.style.setProperty(
				"--hero-pointer-y",
				String(((clientY - rect.top) / rect.height) * 2 - 1),
			);
		}

		function onPointerMove(event: PointerEvent) {
			clientX = event.clientX;
			clientY = event.clientY;
			if (rafId) return;
			rafId = window.requestAnimationFrame(flush);
		}

		// Invalidate the cached rect — the hero shifts on scroll/resize.
		function invalidateRect() {
			rect = null;
		}

		function attachListener() {
			if (listenerAttached) return;
			window.addEventListener("pointermove", onPointerMove, { passive: true });
			window.addEventListener("scroll", invalidateRect, { passive: true });
			window.addEventListener("resize", invalidateRect);
			listenerAttached = true;
		}

		function detachListener() {
			if (!listenerAttached) return;
			window.removeEventListener("pointermove", onPointerMove);
			window.removeEventListener("scroll", invalidateRect);
			window.removeEventListener("resize", invalidateRect);
			listenerAttached = false;
			container?.style.setProperty("--hero-pointer-x", "0");
			container?.style.setProperty("--hero-pointer-y", "0");
		}

		// Gate on viewport intersection: once the hero scrolls off-screen the
		// pointer maths is wasted CPU. Also keeps the listener off the LCP path.
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
	}, []);

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
					<FloatingImage key={image.slug} image={image} position={pos} preload={index === 0} />
				);
			})}
		</div>
	);
}
