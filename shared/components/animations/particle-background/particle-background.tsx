"use client";

import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { useMounted } from "@/shared/hooks/use-mounted";
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

/** Upper bound for particle count to prevent excessive DOM nodes */
const MAX_PARTICLES = 30;

function ParticleBackgroundInner({
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
	scrollFade = false,
	scrollParallax = false,
	interactive = false,
	repulsion,
	mobileCountRatio = 0.5,
}: ParticleBackgroundProps) {
	const safeCount = Math.min(count, MAX_PARTICLES);
	const containerRef = useRef<HTMLDivElement>(null);
	const reducedMotion = useReducedMotion();
	const viewportInView = useInView(containerRef, { margin: "-100px" });
	const isTouchDevice = useIsTouchDevice();
	const isDesktop = useMediaQuery("(min-width: 768px)");

	const [tabVisible, setTabVisible] = useState(true);

	const highContrast = useMediaQuery("(prefers-contrast: more)");

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

	// Normalized cursor position (0-1) for repulsion calculations
	const cursorX = useMotionValue(0.5);
	const cursorY = useMotionValue(0.5);

	// Skip mouse listeners entirely on touch devices (no mouse events fire)
	useEffect(() => {
		if (isTouchDevice) return;
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
			const normX = (e.clientX - cachedRect.left) / cachedRect.width;
			const normY = (e.clientY - cachedRect.top) / cachedRect.height;
			mouseX.set((normX - 0.5) * 2 * PARALLAX_STRENGTH);
			mouseY.set((normY - 0.5) * 2 * PARALLAX_STRENGTH);
			cursorX.set(normX);
			cursorY.set(normY);
		};

		// Progressively lerp parallax back to 0 when mouse leaves the container
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
				// Lerp cursor back to center (0.5) for smooth repulsion release
				cursorX.set(startCursorX + (0.5 - startCursorX) * ease);
				cursorY.set(startCursorY + (0.5 - startCursorY) * ease);
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
	}, [mouseX, mouseY, cursorX, cursorY, isTouchDevice]);

	// Normalize shape to array
	const shapes = Array.isArray(shape) ? shape : [shape];

	// Speed multiplier: higher speed = lower duration (clamp to avoid Infinity)
	const safeSpeed = Math.max(speed, 0.01);
	const desktopDuration = 20 / safeSpeed;
	const mobileDuration = 12 / safeSpeed;

	// Reduce blur by 30% on mobile
	const mobileBlur: [number, number] = Array.isArray(blur)
		? [blur[0] * 0.7, blur[1] * 0.7]
		: [blur * 0.7, blur * 0.7];

	// Clamp mobileCountRatio to [0.25, 1] to avoid near-empty or inflated mobile renders
	const safeMobileRatio = Math.min(Math.max(mobileCountRatio, 0.25), 1);

	// Generate particles only for the active breakpoint (not both)
	const particles = isDesktop
		? generateParticles(
				safeCount,
				size,
				opacity,
				colors,
				blur,
				depthParallax,
				shapes,
				desktopDuration,
			)
		: generateParticles(
				Math.max(1, Math.ceil(safeCount * safeMobileRatio)),
				size,
				opacity,
				colors,
				mobileBlur,
				depthParallax,
				shapes,
				mobileDuration,
			);

	// Desktop-only interactive mode: no hover on touch devices
	const interactiveDesktop = interactive && !isTouchDevice;

	const sharedProps = {
		isInView,
		reducedMotion,
		animationStyle,
		highContrast,
		...(scrollFade ? { scrollOpacity } : {}),
		...(scrollParallax ? { scrollYProgress, scrollParallax: true } : {}),
		...(interactiveDesktop
			? {
					interactive: true,
					cursorX,
					cursorY,
					...(repulsion?.radius !== undefined ? { repulsionRadius: repulsion.radius } : {}),
					...(repulsion?.strength !== undefined ? { repulsionStrength: repulsion.strength } : {}),
				}
			: {}),
	};

	return (
		<div
			ref={containerRef}
			aria-hidden="true"
			data-testid="particle-background"
			className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
			style={{ contain: "layout paint style" }}
		>
			{/* Single ParticleSet — JS media query replaces CSS dual rendering */}
			<ParticleSet
				particles={particles}
				{...(isDesktop ? { mouseX, mouseY } : {})}
				{...sharedProps}
			/>
		</div>
	);
}

/**
 * Systeme de particules decoratives avec effet de profondeur
 *
 * Utilise JS media queries pour la detection mobile (ssr: false, pas de flash d'hydratation).
 * Desktop: count particules, Mobile: ceil(count * mobileCountRatio) particules (defaut 0.5).
 * CSS containment pour isoler les repaints.
 *
 * `count` is clamped to 30 max.
 *
 * **Formes** : circle, diamond, heart, crescent, pearl, drop, sparkle-4, star, hexagon
 * **Animations** : float, drift, rise, orbit, breathe, sparkle, cascade
 *
 * @remarks
 * Comportement par environnement :
 * - `interactive` : repulsion active uniquement sur desktop (no-op sur touch devices).
 * - `disableOnTouch` : rend `null` sur touch devices apres hydratation.
 * - `prefers-reduced-motion: reduce` : bascule sur un rendu statique (StaticParticle).
 * - `forced-colors: active` : rend `null` apres hydratation (pas de particules en mode Windows High Contrast).
 * - `prefers-contrast: more` : opacity x0.5 + blur x1.5 pour ameliorer la lisibilite du contenu.
 * - Tab hidden (`document.visibilityState !== "visible"`) : animations mises en pause.
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
 *
 * @example
 * // Interactive avec rayon et force de repulsion custom
 * <ParticleBackground
 *   interactive
 *   repulsion={{ radius: 0.25, strength: 50 }}
 * />
 *
 * @example
 * // Garder plus de particules sur mobile (defaut = 50% du desktop)
 * <ParticleBackground count={5} mobileCountRatio={0.8} />
 */
export function ParticleBackground({ disableOnTouch = false, ...props }: ParticleBackgroundProps) {
	const isTouchDevice = useIsTouchDevice();
	const forcedColors = useMediaQuery("(forced-colors: active)");
	const mounted = useMounted();

	// Gate on mounted to avoid hydration mismatch: server always renders
	// <ParticleBackgroundInner>, client checks accessibility after mount.
	if (mounted && ((disableOnTouch && isTouchDevice) || forcedColors)) {
		return null;
	}

	return <ParticleBackgroundInner {...props} />;
}
