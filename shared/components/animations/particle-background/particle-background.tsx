"use client";

import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { mediaAtLeast } from "@/shared/constants/breakpoints";
import { useMounted } from "@/shared/hooks/use-mounted";
import { cn } from "@/shared/utils/cn";
import { useReducedMotion } from "motion/react";
import { DEFAULT_COLORS, DEFAULT_DURATION, MAX_PARTICLES, MOBILE_DURATION } from "./constants";
import { useDeviceBudget } from "./hooks/use-device-budget";
import { useParticleVisibility } from "./hooks/use-particle-visibility";
import { ParticleSet } from "./particle-set";
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
	mobileCountRatio = 0.5,
	adaptive = true,
	gradient = false,
	seed = 0,
}: ParticleBackgroundProps) {
	const reducedMotion = useReducedMotion();
	const isDesktop = useMediaQuery(mediaAtLeast("md"));
	const highContrast = useMediaQuery("(prefers-contrast: more)");

	const { containerRef, isInView } = useParticleVisibility();

	// Adaptive device budget (0.3–1): trims count + blur on low-end / Save-Data devices.
	const deviceBudget = useDeviceBudget(adaptive);

	const resolvedCount = Math.min(count, MAX_PARTICLES);
	const safeCount = Math.max(1, Math.round(resolvedCount * deviceBudget));

	// Blur is the dominant paint cost — scale it down (but never below 50%) on constrained devices.
	const blurScale = deviceBudget < 1 ? Math.max(deviceBudget, 0.5) : 1;

	// Normalize shape to array
	const shapes = Array.isArray(shape) ? shape : [shape];

	// Speed multiplier: higher speed = lower duration (clamp to avoid Infinity)
	const safeSpeed = Math.max(speed, 0.01);
	const desktopDuration = DEFAULT_DURATION / safeSpeed;
	const mobileDuration = MOBILE_DURATION / safeSpeed;

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
				seed,
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
				seed,
			);

	return (
		<div
			ref={containerRef}
			aria-hidden="true"
			data-testid="particle-background"
			className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
			style={{ contain: "layout paint style" }}
		>
			<ParticleSet
				particles={particles}
				isInView={isInView}
				reducedMotion={reducedMotion}
				animationStyle={animationStyle}
				highContrast={highContrast}
				gradient={gradient}
			/>
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
 * **Formes** : circle, diamond, heart, pearl, drop
 * **Animations** : float, drift, breathe
 *
 * Les particules sont purement ambiantes : elles ne suivent jamais le curseur (ni parallax
 * souris, ni repulsion) et ne reagissent pas au scroll.
 *
 * @remarks
 * Comportement par environnement :
 * - `adaptive` (defaut true) : reduit count + blur sur appareils contraints (deviceMemory/coeurs faibles, Save-Data).
 * - `gradient` : remplissage radial degrade (volume) des formes CSS/clipPath.
 * - `seed` : differencie les layouts de deux instances aux props identiques (pages plein ecran).
 * - `prefers-reduced-motion: reduce` : bascule sur un rendu statique (StaticParticle).
 * - `forced-colors: active` : rend `null` apres hydratation (pas de particules en mode Windows High Contrast).
 * - `prefers-contrast: more` : opacity x0.5 + blur x1.5 pour ameliorer la lisibilite du contenu.
 * - Hors viewport : les particules sont demontees (remontee avec entrance staggeree au retour).
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
 * // Fond pleine page (hors flux, derriere un contenu en `relative z-10`)
 * <ParticleBackground className="fixed inset-0 z-0" seed={1} />
 *
 * @example
 * // Garder plus de particules sur mobile (defaut = 50% du desktop)
 * <ParticleBackground count={5} mobileCountRatio={0.8} />
 */
export function ParticleBackground(props: ParticleBackgroundProps) {
	const forcedColors = useMediaQuery("(forced-colors: active)");
	const mounted = useMounted();

	// Gate on mounted to avoid hydration mismatch: server always renders
	// <ParticleBackgroundInner>, client checks accessibility after mount.
	if (mounted && forcedColors) {
		return null;
	}

	return <ParticleBackgroundInner {...props} />;
}
