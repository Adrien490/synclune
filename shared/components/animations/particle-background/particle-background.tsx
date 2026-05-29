"use client";

import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { useMounted } from "@/shared/hooks/use-mounted";
import { useIsTouchDevice } from "@/shared/hooks/use-touch-device";
import { cn } from "@/shared/utils/cn";
import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { DEFAULT_COLORS, MAX_PARTICLES } from "./constants";
import { useDeviceBudget } from "./hooks/use-device-budget";
import { useParticleVisibility } from "./hooks/use-particle-visibility";
import { MAX_CONNECT_PARTICLES, ParticleConnections } from "./particle-connections";
import { ParticleSet, ScrollAwareParticleSet } from "./particle-set";
import type { ParticleBackgroundProps } from "./types";
import { generateParticles } from "./utils";

/** Scale a blur value (scalar or tuple) by an extra factor and the device-budget factor */
function scaleBlur(
	blur: number | [number, number],
	extra: number,
	budgetScale: number,
): number | [number, number] {
	const f = extra * budgetScale;
	return Array.isArray(blur) ? [blur[0] * f, blur[1] * f] : blur * f;
}

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
	mobileCountRatio = 0.5,
	adaptive = true,
	gradient = false,
	connect,
	density,
}: ParticleBackgroundProps) {
	const reducedMotion = useReducedMotion();
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const highContrast = useMediaQuery("(prefers-contrast: more)");

	const { containerRef, isInView } = useParticleVisibility({ pauseWhenHidden: true });

	// Density mode: measure the container area to derive the particle count.
	// ResizeObserver fires synchronously on observe → setState lives in the callback (not the effect body).
	const [containerArea, setContainerArea] = useState<number | null>(null);
	useEffect(() => {
		const el = containerRef.current;
		if (!el || density === undefined) return;
		const ro = new ResizeObserver((entries) => {
			const rect = entries[0]?.contentRect;
			if (rect) setContainerArea(rect.width * rect.height);
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, [density, containerRef]);

	// Constellation mode is desktop-only and disabled under reduced motion.
	const connectActive = Boolean(connect) && isDesktop && !reducedMotion;

	// Adaptive device budget (0.3–1): trims count + blur on low-end / Save-Data devices.
	const deviceBudget = useDeviceBudget(adaptive);

	// Resolve the requested count: density-derived when set, else the `count` prop.
	const requestedCount =
		density !== undefined && containerArea !== null
			? Math.round((containerArea / 1_000_000) * density)
			: count;
	let resolvedCount = Math.min(requestedCount, MAX_PARTICLES);
	if (connectActive) resolvedCount = Math.min(resolvedCount, MAX_CONNECT_PARTICLES);
	const safeCount = Math.max(1, Math.round(resolvedCount * deviceBudget));

	// Blur is the dominant paint cost — scale it down (but never below 50%) on constrained devices.
	const blurScale = deviceBudget < 1 ? Math.max(deviceBudget, 0.5) : 1;

	// Normalize shape to array
	const shapes = Array.isArray(shape) ? shape : [shape];

	// Speed multiplier: higher speed = lower duration (clamp to avoid Infinity)
	const safeSpeed = Math.max(speed, 0.01);
	const desktopDuration = 20 / safeSpeed;
	const mobileDuration = 12 / safeSpeed;

	// Clamp mobileCountRatio to [0.25, 1] to avoid near-empty or inflated mobile renders
	const safeMobileRatio = Math.min(Math.max(mobileCountRatio, 0.25), 1);

	// Generate particles only for the active breakpoint (not both)
	const particles = isDesktop
		? generateParticles(
				safeCount,
				size,
				opacity,
				colors,
				scaleBlur(blur, 1, blurScale),
				depthParallax,
				shapes,
				desktopDuration,
			)
		: generateParticles(
				Math.max(1, Math.ceil(safeCount * safeMobileRatio)),
				size,
				opacity,
				colors,
				scaleBlur(blur, 0.7, blurScale), // mobile: blur reduced by 30% on top of budget scale
				depthParallax,
				shapes,
				mobileDuration,
			);

	const sharedProps = {
		isInView,
		reducedMotion,
		animationStyle,
		highContrast,
		gradient,
	};

	const scrollEnabled = scrollFade || scrollParallax;

	return (
		<div
			ref={containerRef}
			aria-hidden="true"
			data-testid="particle-background"
			className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
			style={{ contain: "layout paint style" }}
		>
			{/* Constellation overlay behind the particles (desktop + motion-on only) */}
			{connectActive && isInView && (
				<ParticleConnections
					particles={particles}
					maxDistance={connect?.maxDistance ?? 25}
					color={connect?.color ?? "var(--color-particle-lavender)"}
				/>
			)}

			{/* Single set — JS media query replaces CSS dual rendering.
			    The scroll pipeline (useScroll) is only mounted when a scroll feature is requested. */}
			{scrollEnabled ? (
				<ScrollAwareParticleSet
					containerRef={containerRef}
					particles={particles}
					scrollFade={scrollFade}
					scrollParallax={scrollParallax}
					{...sharedProps}
				/>
			) : (
				<ParticleSet particles={particles} {...sharedProps} />
			)}
		</div>
	);
}

/**
 * Systeme de particules decoratives avec effet de profondeur
 *
 * Utilise JS media queries pour la detection mobile. `useMediaQuery` retourne `false` cote
 * serveur : le premier rendu utilise donc le count mobile, puis bascule sur le count desktop
 * apres mount (regeneration deterministe des particules, sans flash visible car aria-hidden).
 * Desktop: count particules, Mobile: ceil(count * mobileCountRatio) particules (defaut 0.5).
 * CSS containment pour isoler les repaints.
 *
 * `count` is clamped to 30 max.
 *
 * **Formes** : circle, diamond, heart, crescent, pearl, drop, sparkle-4, star, hexagon
 * **Animations** : float, drift, rise, orbit, breathe, sparkle, cascade, twinkle
 *
 * Les particules sont purement ambiantes : elles ne suivent jamais le curseur (ni parallax
 * souris, ni repulsion). Le seul mouvement lie au scroll est opt-in via `scrollParallax`.
 *
 * @remarks
 * Comportement par environnement :
 * - `disableOnTouch` : rend `null` sur touch devices apres hydratation.
 * - `adaptive` (defaut true) : reduit count + blur sur appareils contraints (deviceMemory/coeurs faibles, Save-Data).
 * - `gradient` : remplissage radial degrade (volume) des formes CSS/clipPath.
 * - `connect` : mode constellation (lignes entre particules proches), desktop + motion-on, count plafonne a 12.
 * - `density` : derive le count de l'aire du conteneur (particules/megapixel), prioritaire sur `count`.
 * - `prefers-reduced-motion: reduce` : bascule sur un rendu statique (StaticParticle), constellation desactivee.
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
 * // Volume (degrade radial) + mode constellation
 * <ParticleBackground gradient connect={{ maxDistance: 30 }} />
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
