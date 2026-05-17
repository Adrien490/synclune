"use client";

import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { useMounted } from "@/shared/hooks/use-mounted";
import { useIsTouchDevice } from "@/shared/hooks/use-touch-device";
import { cn } from "@/shared/utils/cn";
import { useReducedMotion } from "motion/react";
import { DEFAULT_COLORS, MAX_PARTICLES } from "./constants";
import { useParticleParallax } from "./hooks/use-particle-parallax";
import { useScrollFade } from "./hooks/use-scroll-fade";
import { ParticleSet } from "./particle-set";
import type { ParticleBackgroundProps } from "./types";
import { generateParticles } from "./utils";

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
	const reducedMotion = useReducedMotion();
	const isTouchDevice = useIsTouchDevice();
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const highContrast = useMediaQuery("(prefers-contrast: more)");

	// Desktop-only interactive mode: no hover on touch devices
	const interactiveDesktop = interactive && !isTouchDevice;

	const { containerRef, isInView, mouseX, mouseY, cursorX, cursorY } = useParticleParallax({
		pauseWhenHidden: true,
		interactive: interactiveDesktop,
	});

	const { scrollYProgress, scrollOpacity } = useScrollFade(containerRef);

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
