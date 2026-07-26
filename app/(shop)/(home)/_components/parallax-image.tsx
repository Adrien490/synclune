"use client";

import Image from "next/image";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { useRef, useSyncExternalStore } from "react";
import { cn } from "@/shared/utils/cn";
import { cssSupports } from "@/shared/utils/css-supports";
import { useIsTouchDevice, useMediaQuery } from "@/shared/hooks";
import { useMounted } from "@/shared/hooks/use-mounted";

const INTENSITY_DEFAULT = 5;
const INTENSITY_MAX = 15;

const noopSubscribe = () => () => {};
const getViewTimelineSupport = () => cssSupports("animation-timeline", "view()");
const getServerViewTimelineSupport = () => false;

/**
 * Detect support for `animation-timeline: view()` (Chrome/Edge 115+, Safari 26+).
 * Lets us swap motion-react `useScroll` for native CSS scroll-driven animation
 * (compositor thread) on capable browsers, with seamless fallback elsewhere.
 *
 * Uses `useSyncExternalStore` to avoid an effect+setState cascade and to keep
 * SSR/CSR snapshots in sync (server snapshot returns false, client snapshot
 * reads `CSS.supports` once, no re-render storms).
 */
function useSupportsViewTimeline(): boolean {
	return useSyncExternalStore(noopSubscribe, getViewTimelineSupport, getServerViewTimelineSupport);
}

/**
 * Clamp `intensity` to a safe range and surface dev-only warnings for
 * out-of-band values (negative, NaN, Infinity, above the cap).
 *
 * Returns 0 for any non-finite or negative input (caller falls back to the
 * static branch — no CPU cost for an invalid animation).
 */
function clampIntensity(raw: number): number {
	const isProd = process.env.NODE_ENV === "production";

	if (!Number.isFinite(raw)) {
		if (!isProd) {
			console.warn(`[ParallaxImage] intensity=${raw} is not finite — disabling parallax.`);
		}
		return 0;
	}
	if (raw < 0) {
		if (!isProd) {
			console.warn(`[ParallaxImage] intensity=${raw} is negative — disabling parallax.`);
		}
		return 0;
	}
	if (raw > INTENSITY_MAX) {
		if (!isProd) {
			console.warn(
				`[ParallaxImage] intensity=${raw} capped at ${INTENSITY_MAX} to prevent visual overflow.`,
			);
		}
		return INTENSITY_MAX;
	}
	return raw;
}

interface ParallaxImageProps {
	src: string;
	alt: string;
	blurDataURL?: string;
	className?: string;
	/** CSS classes on the outer container */
	containerClassName?: string;
	/** Parallax effect strength as a percentage (default: 5, max: 15, min: 0) */
	intensity?: number;
	/** Sizes attribute for responsive images */
	sizes?: string;
	/** Compression quality (default: 75) */
	quality?: number;
	/** Preload for above-fold images */
	preload?: boolean;
	/** Purely decorative image (aria-hidden, empty alt) */
	decorative?: boolean;
	/** Disable parallax on touch devices (default: true for better mobile UX) */
	disableOnTouch?: boolean;
}

interface ParallaxContainerProps {
	containerRef: RefObject<HTMLDivElement | null>;
	containerClassName?: string;
	children: ReactNode;
}

/**
 * Shared outer wrapper for all three render branches (static, CSS-native, JS).
 * Owns the container ref, the relative positioning context and the
 * overflow clipping that prevents oversized inner divs from leaking out.
 */
function ParallaxContainer({ containerRef, containerClassName, children }: ParallaxContainerProps) {
	return (
		<div
			ref={containerRef}
			className={cn("relative h-full w-full overflow-hidden", containerClassName)}
		>
			{children}
		</div>
	);
}

/**
 * Image with a subtle parallax scroll effect.
 *
 * Two rendering branches selected at runtime:
 *  1. **Static** — when motion is gated off (SSR, `prefers-reduced-motion`, touch,
 *     `safeIntensity === 0`, or no `animation-timeline: view()` support). Zero JS,
 *     zero animation.
 *  2. **CSS native** — when `animation-timeline: view()` is supported
 *     (Chrome/Edge 115+, Safari 26+). The keyframe runs on the compositor thread
 *     via the `.parallax-image-scroll` class (defined per-call-site by the consuming
 *     stylesheet, e.g. `atelier-section.css`). Zero motion-react.
 *
 * @a11y
 *  - Respects `prefers-reduced-motion: reduce` (strict motion opt-in).
 *  - `decorative` removes the image from the accessibility tree (`alt=""` + `aria-hidden`).
 *  - Dev-only warning when `decorative=false` and `alt=""` (WCAG 1.1.1 fail).
 *
 * @performance
 *  - `preload={false}` by default → lazy-loaded (use `preload` only for above-fold).
 *  - `quality=75` aligns with the Synclune LCP profile.
 *  - CSS-native branch uses `will-change: translate` (compositor layer).
 *
 * @example
 * ```tsx
 * <ParallaxImage
 *   src={IMAGES.ATELIER}
 *   alt="Atelier de création Synclune"
 *   blurDataURL={IMAGES.ATELIER_BLUR}
 *   intensity={7}
 *   sizes="(max-width: 1024px) 100vw, 56rem"
 * />
 * ```
 *
 * @example Purely decorative usage
 * ```tsx
 * <ParallaxImage src={...} alt="" decorative intensity={5} />
 * ```
 */
/**
 * @public Surface DORMANTE assumée : aucun call-site en production aujourd'hui.
 * Conservée volontairement (suite de tests complète + e2e scroll-driven) comme
 * brique réutilisable pour les sections éditoriales. Ne pas supprimer sur le seul
 * constat « aucun consommateur » — cf. convention `@public` du dépôt.
 */
export function ParallaxImage({
	src,
	alt,
	blurDataURL,
	className,
	containerClassName,
	intensity = INTENSITY_DEFAULT,
	sizes = "100vw",
	quality = 75,
	preload = false,
	decorative = false,
	disableOnTouch = true,
}: ParallaxImageProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
	const isTouchDevice = useIsTouchDevice();
	const supportsViewTimeline = useSupportsViewTimeline();
	const isMounted = useMounted();

	// Motion opt-in: animations only run once hydration is complete AND
	// `prefers-reduced-motion` is not set.
	const motionIsAllowed = isMounted && !prefersReducedMotion;
	const safeIntensity = clampIntensity(intensity);

	if (process.env.NODE_ENV !== "production" && !decorative && alt === "") {
		console.warn(
			'[ParallaxImage] alt="" without decorative=true fails WCAG 1.1.1 — pass decorative={true} for purely visual images.',
		);
	}

	const imageElement = (
		<Image
			src={src}
			alt={decorative ? "" : alt}
			aria-hidden={decorative ? true : undefined}
			fill
			className={className}
			preload={preload}
			quality={quality}
			sizes={sizes}
			placeholder={blurDataURL ? "blur" : "empty"}
			blurDataURL={blurDataURL}
		/>
	);

	// Fast-path: any condition that makes the animation pointless renders static.
	// `safeIntensity === 0` covers explicit caller intent + invalid input fallthrough.
	const shouldDisableParallax =
		!motionIsAllowed || (disableOnTouch && isTouchDevice) || safeIntensity === 0;

	// Static branch — motion gated off, or no `animation-timeline: view()`
	// support (Safari <= 18): the parallax keyframe would otherwise leave the
	// oversized inner div mis-positioned, so render the image plainly.
	if (shouldDisableParallax || !supportsViewTimeline) {
		return (
			<ParallaxContainer containerRef={containerRef} containerClassName={containerClassName}>
				{imageElement}
			</ParallaxContainer>
		);
	}

	// CSS-native branch — compositor-thread `animation-timeline: view()`.
	const cssVars = {
		"--parallax-from": `-${safeIntensity}%`,
		"--parallax-to": `${safeIntensity}%`,
	} as CSSProperties;
	return (
		<ParallaxContainer containerRef={containerRef} containerClassName={containerClassName}>
			<div
				data-parallax="active"
				className="parallax-image-scroll absolute inset-x-0 w-full"
				style={{
					height: `${100 + safeIntensity * 2}%`,
					top: `-${safeIntensity}%`,
					...cssVars,
				}}
			>
				{imageElement}
			</div>
		</ParallaxContainer>
	);
}
