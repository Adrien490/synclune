"use client";

import { useIsTouchDevice } from "@/shared/hooks/use-touch-device";
import { cn } from "@/shared/utils/cn";
import { useInView, useMotionValue, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DEFAULT_COLORS } from "./constants";
import { ParticleSet } from "./particle-set";
import type { ParticleBackgroundProps } from "./types";
import { generateParticles } from "./utils";

/** Max parallax offset in pixels for the closest particles */
const PARALLAX_STRENGTH = 20;

/** Duration in ms for the parallax lerp-to-zero reset */
const LERP_RESET_DURATION = 600;

/** Upper bound for particle count to prevent excessive DOM nodes (desktop + mobile ≈ count * 3 spans) */
const MAX_PARTICLES = 30;

/**
 * Systeme de particules decoratives avec effet de profondeur
 *
 * Utilise CSS media queries pour la detection mobile (pas de flash d'hydratation).
 * Desktop: count particules, Mobile: count/2 particules.
 * CSS containment pour isoler les repaints.
 *
 * `count` is clamped to 30 max (both trees: count*2 desktop + ceil(count/2)*2 mobile ≈ count*3 spans).
 *
 * **Formes** : circle, diamond, heart, crescent, pearl, drop, sparkle-4
 * **Animations** : float, drift, rise, orbit, breathe, sparkle
 *
 * @example
 * // Defaut (couleurs primary/secondary/pastel)
 * <ParticleBackground />
 *
 * @example
 * // Multi-formes : mix diamants et cercles
 * <ParticleBackground
 *   shape={["diamond", "circle"]}
 *   colors={["var(--secondary)", "oklch(0.9 0.1 80)"]}
 *   blur={[4, 15]}
 * />
 *
 * @example
 * // Animation plus lente (speed < 1)
 * <ParticleBackground speed={0.5} />
 */
export function ParticleBackground({
	count = 6,
	size = [8, 64],
	opacity = [0.1, 0.4],
	colors = DEFAULT_COLORS,
	blur = [12, 32],
	shape = "circle",
	className,
	animationStyle = "float",
	depthParallax = true,
	speed = 1,
	disableOnTouch = false,
	scrollFade = false,
}: ParticleBackgroundProps) {
	const safeCount = Math.min(count, MAX_PARTICLES);
	const containerRef = useRef<HTMLDivElement>(null);
	const reducedMotion = useReducedMotion();
	const viewportInView = useInView(containerRef, { margin: "-100px" });
	const isTouchDevice = useIsTouchDevice();

	const [tabVisible, setTabVisible] = useState(true);

	// useSyncExternalStore: server snapshot = false, avoids hydration mismatch
	const highContrast = useSyncExternalStore(
		(cb) => {
			const mql = window.matchMedia("(prefers-contrast: more)");
			mql.addEventListener("change", cb);
			return () => mql.removeEventListener("change", cb);
		},
		() => window.matchMedia("(prefers-contrast: more)").matches,
		() => false,
	);
	const forcedColors = useSyncExternalStore(
		(cb) => {
			const mql = window.matchMedia("(forced-colors: active)");
			mql.addEventListener("change", cb);
			return () => mql.removeEventListener("change", cb);
		},
		() => window.matchMedia("(forced-colors: active)").matches,
		() => false,
	);

	useEffect(() => {
		function onVisibilityChange() {
			setTabVisible(document.visibilityState === "visible");
		}
		document.addEventListener("visibilitychange", onVisibilityChange);
		return () => document.removeEventListener("visibilitychange", onVisibilityChange);
	}, []);

	const isInView = viewportInView && tabVisible;

	// Scroll-linked opacity: fade particles in/out as container scrolls through viewport
	const { scrollYProgress } = useScroll({
		target: containerRef,
		offset: ["start end", "end start"],
	});
	const scrollOpacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0]);

	// Mouse parallax: track cursor relative to container (desktop only)
	const mouseX = useMotionValue(0);
	const mouseY = useMotionValue(0);

	useEffect(() => {
		if (disableOnTouch && isTouchDevice) return;
		const el = containerRef.current;
		if (!el) return;

		let lerpRafId: number | null = null;

		// Cache the bounding rect — marked stale on scroll/resize, refreshed lazily on next mousemove
		let cachedRect = el.getBoundingClientRect();
		let rectStale = false;

		// ResizeObserver replaces window.resize — catches container resizes including parent layout changes
		const ro = new ResizeObserver(() => {
			rectStale = true;
		});
		ro.observe(el);

		// Scroll invalidates the cached rect (viewport offset changed) — no layout read, just a flag
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
			// Refresh rect lazily: only recalculate when stale AND mouse is actively moving
			if (rectStale) {
				cachedRect = el.getBoundingClientRect();
				rectStale = false;
			}
			cancelLerp();
			mouseX.set(((e.clientX - cachedRect.left) / cachedRect.width - 0.5) * 2 * PARALLAX_STRENGTH);
			mouseY.set(((e.clientY - cachedRect.top) / cachedRect.height - 0.5) * 2 * PARALLAX_STRENGTH);
		};

		// Progressively lerp parallax back to 0 when mouse leaves the container
		function onMouseLeave() {
			cancelLerp();
			const startX = mouseX.get();
			const startY = mouseY.get();
			const start = performance.now();

			function step(now: number) {
				const t = Math.min((now - start) / LERP_RESET_DURATION, 1);
				const ease = 1 - (1 - t) * (1 - t); // easeOutQuad
				mouseX.set(startX * (1 - ease));
				mouseY.set(startY * (1 - ease));
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
	}, [mouseX, mouseY, disableOnTouch, isTouchDevice]);

	if ((disableOnTouch && isTouchDevice) || forcedColors) {
		return null;
	}

	// Normalise shape en tableau
	const shapes = Array.isArray(shape) ? shape : [shape];

	// Blur reduit de 30% sur mobile
	const mobileBlur: [number, number] = Array.isArray(blur)
		? [blur[0] * 0.7, blur[1] * 0.7]
		: [blur * 0.7, blur * 0.7];

	// Speed multiplier: higher speed = lower duration (clamp to avoid Infinity)
	const safeSpeed = Math.max(speed, 0.01);
	const desktopDuration = 20 / safeSpeed;
	const mobileDuration = 12 / safeSpeed;

	// Desktop: duree 20s, Mobile: duree 12s (economie batterie)
	const desktopParticles = generateParticles(
		safeCount,
		size,
		opacity,
		colors,
		blur,
		depthParallax,
		shapes,
		desktopDuration,
	);
	const mobileParticles = generateParticles(
		Math.ceil(safeCount / 2),
		size,
		opacity,
		colors,
		mobileBlur,
		depthParallax,
		shapes,
		mobileDuration,
	);

	const sharedProps = {
		isInView,
		reducedMotion,
		animationStyle,
		highContrast,
		...(scrollFade ? { scrollOpacity } : {}),
	};

	return (
		<div
			ref={containerRef}
			aria-hidden="true"
			data-testid="particle-background"
			className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
			style={{ contain: "layout paint" }}
		>
			<div className="hidden md:contents">
				<ParticleSet
					particles={desktopParticles}
					mouseX={mouseX}
					mouseY={mouseY}
					{...sharedProps}
				/>
			</div>
			<div className="contents md:hidden">
				<ParticleSet particles={mobileParticles} {...sharedProps} />
			</div>
		</div>
	);
}
