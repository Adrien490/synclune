"use client";

import { m, useScroll, useTransform, useReducedMotion } from "motion/react";
import Image from "next/image";
import type { CSSProperties, RefObject } from "react";
import { useRef, useSyncExternalStore } from "react";
import { cn } from "@/shared/utils/cn";
import { cssSupports } from "@/shared/utils/css-supports";
import { useIsTouchDevice } from "@/shared/hooks";
import { useMounted } from "@/shared/hooks/use-mounted";

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

interface ParallaxImageProps {
	src: string;
	alt: string;
	blurDataURL?: string;
	className?: string;
	/** CSS classes on the outer container */
	containerClassName?: string;
	/** Parallax effect strength as a percentage (default: 5, max: 15) */
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

interface ParallaxInnerProps {
	containerRef: RefObject<HTMLDivElement | null>;
	safeIntensity: number;
	imageElement: React.ReactNode;
}

/**
 * Inner component handling the parallax animation.
 * Isolates scroll hooks to avoid unnecessary listeners when disabled.
 */
function ParallaxInner({ containerRef, safeIntensity, imageElement }: ParallaxInnerProps) {
	const { scrollYProgress } = useScroll({
		target: containerRef,
		offset: ["start end", "end start"],
	});

	// Parallax effect: Y translation based on scroll progress
	const y = useTransform(scrollYProgress, [0, 1], [`-${safeIntensity}%`, `${safeIntensity}%`]);

	return (
		<m.div
			role="presentation"
			className="absolute inset-x-0 w-full"
			style={{
				// Oversized container to prevent clipping during parallax
				height: `${100 + safeIntensity * 2}%`,
				// Vertically centered to prevent clipping at extremes
				top: `-${safeIntensity}%`,
				y,
			}}
		>
			{imageElement}
		</m.div>
	);
}

/**
 * Image with a subtle parallax scroll effect.
 *
 * Respects prefers-reduced-motion (motion opt-in) and ensures hydration safety.
 * Uses useTransform which is lazy — near-zero CPU cost when off-screen.
 *
 * @param src - Image URL
 * @param alt - Alt text for accessibility
 * @param blurDataURL - Base64 blur placeholder
 * @param className - CSS classes for the image
 * @param containerClassName - CSS classes for the outer container
 * @param intensity - Effect strength (default: 5%, max: 15%)
 * @param sizes - Responsive sizes attribute
 * @param quality - Compression quality (default: 75)
 * @param preload - Preload for above-fold images
 * @param decorative - Purely decorative image (aria-hidden)
 * @param disableOnTouch - Disable parallax on touch devices (default: true)
 *
 * @example
 * ```tsx
 * <ParallaxImage
 *   src={IMAGES.ATELIER}
 *   alt="Atelier de creation Synclune"
 *   blurDataURL={IMAGES.ATELIER_BLUR}
 *   intensity={8}
 *   sizes="(max-width: 768px) 100vw, 50vw"
 * />
 * ```
 */
export function ParallaxImage({
	src,
	alt,
	blurDataURL,
	className,
	containerClassName,
	intensity = 5,
	sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 45vw",
	quality = 75,
	preload = false,
	decorative = false,
	disableOnTouch = true,
}: ParallaxImageProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const shouldReduceMotion = useReducedMotion();
	const isTouchDevice = useIsTouchDevice();
	const supportsViewTimeline = useSupportsViewTimeline();

	// Hydration safety: avoids useReducedMotion server/client mismatches
	const isMounted = useMounted();

	// Cap intensity to prevent overflow (max 15%)
	const safeIntensity = Math.min(intensity, 15);

	// Shared image element (avoids code duplication between branches)
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

	// Motion opt-in: only allow animation when mounted AND reduced-motion is explicitly false.
	// This prevents a flash of animation for users with prefers-reduced-motion: reduce
	// whose preference hasn't resolved yet on the first client render.
	const motionIsAllowed = isMounted && shouldReduceMotion === false;
	const shouldDisableParallax = !motionIsAllowed || (disableOnTouch && isTouchDevice);

	if (shouldDisableParallax) {
		return (
			<div
				ref={containerRef}
				className={cn("relative h-full w-full overflow-hidden", containerClassName)}
			>
				{imageElement}
			</div>
		);
	}

	// Native CSS scroll-driven path: zero JS work on the main thread, animation runs on compositor.
	// `animation-timeline: view()` is automatically scoped to the element entering/leaving the viewport.
	if (supportsViewTimeline) {
		const cssVars = {
			"--parallax-from": `-${safeIntensity}%`,
			"--parallax-to": `${safeIntensity}%`,
		} as CSSProperties;
		return (
			<div
				ref={containerRef}
				className={cn("relative h-full w-full overflow-hidden", containerClassName)}
			>
				<div
					role="presentation"
					className="parallax-image-scroll absolute inset-x-0 w-full"
					style={{
						height: `${100 + safeIntensity * 2}%`,
						top: `-${safeIntensity}%`,
						...cssVars,
					}}
				>
					{imageElement}
				</div>
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className={cn("relative h-full w-full overflow-hidden", containerClassName)}
		>
			<ParallaxInner
				containerRef={containerRef}
				safeIntensity={safeIntensity}
				imageElement={imageElement}
			/>
		</div>
	);
}
