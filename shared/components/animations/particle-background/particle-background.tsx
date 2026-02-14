"use client";

import { useIsTouchDevice } from "@/shared/hooks/use-touch-device";
import { cn } from "@/shared/utils/cn";
import { useInView, useMotionValue, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_COLORS } from "./constants";
import { ParticleSet } from "./particle-set";
import type { ParticleBackgroundProps } from "./types";
import { generateParticles } from "./utils";

/** Max parallax offset in pixels for the closest particles */
const PARALLAX_STRENGTH = 20;

/** Duration in ms for the parallax lerp-to-zero reset */
const LERP_RESET_DURATION = 600;

/** Upper bound for particle count to prevent excessive DOM nodes (desktop + mobile = count * 1.5) */
const MAX_PARTICLES = 30;

/**
 * Systeme de particules decoratives avec effet de profondeur
 *
 * Utilise CSS media queries pour la detection mobile (pas de flash d'hydratation).
 * Desktop: count particules, Mobile: count/2 particules.
 * CSS containment pour isoler les repaints.
 *
 * `count` is clamped to 30 max (both trees combined = count * 1.5 DOM nodes).
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

	// Pause when tab is hidden (save GPU/battery)
	const [tabVisible, setTabVisible] = useState(true);
	useEffect(() => {
		function onVisibilityChange() {
			setTabVisible(document.visibilityState === "visible");
		}
		document.addEventListener("visibilitychange", onVisibilityChange);
		return () => document.removeEventListener("visibilitychange", onVisibilityChange);
	}, []);

	// Detect high contrast mode: reduce opacity 50%, increase blur 50%
	const [highContrast, setHighContrast] = useState(false);
	useEffect(() => {
		const mql = window.matchMedia("(prefers-contrast: more)");
		setHighContrast(mql.matches);
		function onChange(e: MediaQueryListEvent) {
			setHighContrast(e.matches);
		}
		mql.addEventListener("change", onChange);
		return () => mql.removeEventListener("change", onChange);
	}, []);

	// Detect forced-colors mode: hide particles entirely (colors are overridden)
	const [forcedColors, setForcedColors] = useState(false);
	useEffect(() => {
		const mql = window.matchMedia("(forced-colors: active)");
		setForcedColors(mql.matches);
		function onChange(e: MediaQueryListEvent) {
			setForcedColors(e.matches);
		}
		mql.addEventListener("change", onChange);
		return () => mql.removeEventListener("change", onChange);
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

		// Cache the bounding rect to avoid forced layout on every mousemove
		let cachedRect = el.getBoundingClientRect();

		function updateRect() {
			cachedRect = el!.getBoundingClientRect();
		}

		function cancelLerp() {
			if (lerpRafId !== null) {
				cancelAnimationFrame(lerpRafId);
				lerpRafId = null;
			}
		}

		const onMouseMove = (e: MouseEvent) => {
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
		window.addEventListener("resize", updateRect, { passive: true });
		window.addEventListener("scroll", updateRect, { passive: true });
		return () => {
			cancelLerp();
			el.removeEventListener("mousemove", onMouseMove);
			el.removeEventListener("mouseleave", onMouseLeave);
			window.removeEventListener("resize", updateRect);
			window.removeEventListener("scroll", updateRect);
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
	const desktopParticles = generateParticles(safeCount, size, opacity, colors, blur, depthParallax, shapes, desktopDuration);
	const mobileParticles = generateParticles(Math.ceil(safeCount / 2), size, opacity, colors, mobileBlur, depthParallax, shapes, mobileDuration);

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
			className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}
			style={{ contain: "layout paint" }}
		>
			<div className="hidden md:contents">
				<ParticleSet particles={desktopParticles} mouseX={mouseX} mouseY={mouseY} {...sharedProps} />
			</div>
			<div className="contents md:hidden">
				<ParticleSet particles={mobileParticles} {...sharedProps} />
			</div>
		</div>
	);
}
