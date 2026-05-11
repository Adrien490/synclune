"use client";

import { useInView, type MotionValue, useMotionValue } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useIsTouchDevice } from "@/shared/hooks/use-touch-device";
import { LERP_RESET_DURATION, PARALLAX_STRENGTH } from "../constants";

export interface ParticleParallaxOptions {
	/** Pause the animation when the tab is hidden (default: true) */
	pauseWhenHidden: boolean;
	/** Enable cursor tracking + repulsion MotionValues (desktop only) */
	interactive: boolean;
}

export interface ParticleParallaxOutput {
	containerRef: React.RefObject<HTMLDivElement | null>;
	isInView: boolean;
	/** Mouse parallax X offset in pixels (desktop only; always undefined on touch) */
	mouseX: MotionValue<number> | undefined;
	mouseY: MotionValue<number> | undefined;
	/** Normalized cursor X position (0-1) for repulsion. Only set when `interactive=true` on desktop. */
	cursorX: MotionValue<number> | undefined;
	cursorY: MotionValue<number> | undefined;
}

/**
 * Encapsulates the particle parallax + visibility + cursor tracking pipeline.
 *
 * - Mouse parallax MotionValues are created on desktop only (touch devices skip everything).
 * - Cursor MotionValues are created only when `interactive=true` (repulsion feature).
 * - Listeners refresh the cached `getBoundingClientRect` lazily on scroll/resize (no layout read until next mousemove).
 * - On `mouseleave`, parallax + cursor lerp back to rest in {@link LERP_RESET_DURATION}ms.
 * - Visibility combines viewport `useInView` margin -100px with `document.visibilityState`.
 */
export function useParticleParallax(options: ParticleParallaxOptions): ParticleParallaxOutput {
	const { pauseWhenHidden, interactive } = options;
	const containerRef = useRef<HTMLDivElement>(null);
	const viewportInView = useInView(containerRef, { margin: "-100px" });
	const isTouchDevice = useIsTouchDevice();
	const [tabVisible, setTabVisible] = useState(true);

	useEffect(() => {
		if (!pauseWhenHidden) return;
		function onVisibilityChange() {
			setTabVisible(document.visibilityState === "visible");
		}
		document.addEventListener("visibilitychange", onVisibilityChange);
		return () => document.removeEventListener("visibilitychange", onVisibilityChange);
	}, [pauseWhenHidden]);

	const isInView = viewportInView && (pauseWhenHidden ? tabVisible : true);

	const mouseX = useMotionValue(0);
	const mouseY = useMotionValue(0);
	const cursorX = useMotionValue(0.5);
	const cursorY = useMotionValue(0.5);

	useEffect(() => {
		if (isTouchDevice) return;
		const el = containerRef.current;
		if (!el) return;

		let lerpRafId: number | null = null;

		// Cache the bounding rect — marked stale on scroll/resize, refreshed lazily on next mousemove
		let cachedRect = el.getBoundingClientRect();
		let rectStale = false;

		const ro = new ResizeObserver(() => {
			rectStale = true;
		});
		ro.observe(el);

		function markRectStale() {
			rectStale = true;
		}

		function cancelLerp() {
			if (lerpRafId !== null) {
				cancelAnimationFrame(lerpRafId);
				lerpRafId = null;
			}
		}

		const onMouseMove = (e: MouseEvent) => {
			if (rectStale) {
				cachedRect = el.getBoundingClientRect();
				rectStale = false;
			}
			cancelLerp();
			const normX = (e.clientX - cachedRect.left) / cachedRect.width;
			const normY = (e.clientY - cachedRect.top) / cachedRect.height;
			mouseX.set((normX - 0.5) * 2 * PARALLAX_STRENGTH);
			mouseY.set((normY - 0.5) * 2 * PARALLAX_STRENGTH);
			if (interactive) {
				cursorX.set(normX);
				cursorY.set(normY);
			}
		};

		function onMouseLeave() {
			cancelLerp();
			const startX = mouseX.get();
			const startY = mouseY.get();
			const startCursorX = cursorX.get();
			const startCursorY = cursorY.get();
			const start = performance.now();

			function step(now: number) {
				const t = Math.min((now - start) / LERP_RESET_DURATION, 1);
				const ease = 1 - (1 - t) * (1 - t); // easeOutQuad
				mouseX.set(startX * (1 - ease));
				mouseY.set(startY * (1 - ease));
				if (interactive) {
					cursorX.set(startCursorX + (0.5 - startCursorX) * ease);
					cursorY.set(startCursorY + (0.5 - startCursorY) * ease);
				}
				if (t < 1) {
					lerpRafId = requestAnimationFrame(step);
				} else {
					lerpRafId = null;
				}
			}
			lerpRafId = requestAnimationFrame(step);
		}

		el.addEventListener("mousemove", onMouseMove, { passive: true });
		el.addEventListener("mouseleave", onMouseLeave, { passive: true });
		window.addEventListener("scroll", markRectStale, { passive: true });
		return () => {
			cancelLerp();
			ro.disconnect();
			el.removeEventListener("mousemove", onMouseMove);
			el.removeEventListener("mouseleave", onMouseLeave);
			window.removeEventListener("scroll", markRectStale);
		};
	}, [mouseX, mouseY, cursorX, cursorY, isTouchDevice, interactive]);

	if (isTouchDevice) {
		return {
			containerRef,
			isInView,
			mouseX: undefined,
			mouseY: undefined,
			cursorX: undefined,
			cursorY: undefined,
		};
	}

	return {
		containerRef,
		isInView,
		mouseX,
		mouseY,
		cursorX: interactive ? cursorX : undefined,
		cursorY: interactive ? cursorY : undefined,
	};
}
