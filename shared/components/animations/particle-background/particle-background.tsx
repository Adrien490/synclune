"use client";

import { useIsTouchDevice } from "@/shared/hooks/use-touch-device";
import { cn } from "@/shared/utils/cn";
import { useInView, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_COLORS } from "./constants";
import { ParticleSet } from "./particle-set";
import type { ParticleBackgroundProps } from "./types";
import { generateParticles } from "./utils";

/** Max parallax offset in pixels for the closest particles */
const PARALLAX_STRENGTH = 20;

/** Duration in ms for the parallax lerp-to-zero reset */
const LERP_RESET_DURATION = 600;

/**
 * Systeme de particules decoratives avec effet de profondeur
 *
 * Utilise CSS media queries pour la detection mobile (pas de flash d'hydratation).
 * Desktop: count particules, Mobile: count/2 particules.
 * CSS containment pour isoler les repaints.
 *
 * **Formes** : circle, diamond, heart, crescent, pearl, drop, sparkle-4
 * **Animations** : float, drift, rise, orbit, breathe
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
}: ParticleBackgroundProps) {
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

	const isInView = viewportInView && tabVisible;

	// Mouse parallax: track cursor relative to container (desktop only)
	const mouseX = useMotionValue(0);
	const mouseY = useMotionValue(0);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		let lerpRafId: number | null = null;

		// Cache the bounding rect to avoid forced layout on every mousemove
		let cachedRect = el.getBoundingClientRect();

		function updateRect() {
			cachedRect = el.getBoundingClientRect();
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
		return () => {
			cancelLerp();
			el.removeEventListener("mousemove", onMouseMove);
			el.removeEventListener("mouseleave", onMouseLeave);
			window.removeEventListener("resize", updateRect);
		};
	}, [mouseX, mouseY]);

	if (disableOnTouch && isTouchDevice) {
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
	const desktopParticles = generateParticles(count, size, opacity, colors, blur, depthParallax, shapes, desktopDuration);
	const mobileParticles = generateParticles(Math.ceil(count / 2), size, opacity, colors, mobileBlur, depthParallax, shapes, mobileDuration);

	const sharedProps = { isInView, reducedMotion, animationStyle };

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
