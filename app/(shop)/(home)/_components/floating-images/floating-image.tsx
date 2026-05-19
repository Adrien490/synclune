"use client";

import { m, useInView, useSpring, useTransform } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { trackEvent } from "@/shared/lib/analytics/track";
import { FLOAT_VARIANTS } from "./float-variants";
import { PARALLAX_SPEED_MAX, PARALLAX_SPEED_MIN } from "./image-positions";
import type { FloatingImageProps } from "./types";

// Pointer-reactive depth: images with higher parallaxSpeed (perceived closer)
// react more to cursor. Bounded ±4px to ±8px for subtle "floating" feel.
const POINTER_DEPTH_MIN_PX = 4;
const POINTER_DEPTH_MAX_PX = 8;
const POINTER_SPRING = { stiffness: 120, damping: 20, mass: 0.4 } as const;

export function FloatingImage({
	image,
	position,
	scrollProgress,
	parallaxOpacity,
	pointerX,
	pointerY,
	shouldReduceMotion,
	isPriority,
}: FloatingImageProps) {
	const ref = useRef<HTMLDivElement>(null);
	const isInView = useInView(ref, { margin: "50px" });
	const pointerRectRef = useRef<DOMRect | null>(null);

	// Scroll-driven parallax: bidirectional for depth
	const parallaxY = useTransform(
		scrollProgress,
		[0, 1],
		[0, position.parallaxSpeed * position.parallaxDirection],
	);

	const depth =
		POINTER_DEPTH_MIN_PX +
		((position.parallaxSpeed - PARALLAX_SPEED_MIN) / (PARALLAX_SPEED_MAX - PARALLAX_SPEED_MIN)) *
			(POINTER_DEPTH_MAX_PX - POINTER_DEPTH_MIN_PX);

	const pointerXOffset = useTransform(pointerX, (v) => v * depth);
	const pointerYOffset = useTransform(pointerY, (v) => v * depth);
	const pointerXSpring = useSpring(pointerXOffset, POINTER_SPRING);
	const pointerYSpring = useSpring(pointerYOffset, POINTER_SPRING);
	const combinedY = useTransform(
		[parallaxY, pointerYSpring],
		(values: number[]) => (values[0] ?? 0) + (values[1] ?? 0),
	);

	const mode = shouldReduceMotion ? "reduced" : "full";

	// Cache rect on pointerenter — reading getBoundingClientRect() on every
	// pointermove triggers a forced reflow (Lighthouse "Avoid forced reflow").
	// The rect is invalidated on pointerleave; scroll/resize naturally
	// re-cache on the next enter.
	function handlePointerEnter(event: ReactPointerEvent<HTMLAnchorElement>) {
		if (shouldReduceMotion) return;
		pointerRectRef.current = event.currentTarget.getBoundingClientRect();
	}

	function handlePointerLeave() {
		pointerRectRef.current = null;
	}

	function handlePointerMove(event: ReactPointerEvent<HTMLAnchorElement>) {
		if (shouldReduceMotion) return;
		const rect = pointerRectRef.current ?? event.currentTarget.getBoundingClientRect();
		pointerRectRef.current = rect;
		const x = ((event.clientX - rect.left) / rect.width) * 100;
		const y = ((event.clientY - rect.top) / rect.height) * 100;
		event.currentTarget.style.setProperty("--mx", `${x}%`);
		event.currentTarget.style.setProperty("--my", `${y}%`);
	}

	function handleClick() {
		trackEvent("hero_floating_image_click", {
			slug: image.slug,
			position: position.idleAnimation,
		});
	}

	return (
		// Layer 1: parallax scroll (y + opacity).
		// `parallaxOpacity` is null when native CSS scroll-driven animations are supported —
		// the parent container handles opacity through `animation-timeline: scroll()` on the compositor thread.
		<m.div
			ref={ref}
			className={`absolute ${position.className} ${position.widthClasses} pointer-events-auto ${position.visibilityClass}`}
			style={
				shouldReduceMotion
					? undefined
					: {
							x: pointerXSpring,
							y: combinedY,
							...(parallaxOpacity !== null && { opacity: parallaxOpacity }),
							willChange: isInView ? "transform" : "auto",
						}
			}
		>
			{/* Layer 2: CSS idle animation only — isolated from Framer Motion transforms */}
			<div
				style={
					shouldReduceMotion
						? undefined
						: {
								animationName: position.idleAnimation,
								animationDuration: `${position.idleDuration}s`,
								animationTimingFunction: "ease-in-out",
								animationIterationCount: "infinite",
								animationDelay: `${position.delay + position.idleDelay}s`,
								animationPlayState: isInView ? "running" : "paused",
							}
				}
			>
				{/* Layer 3: Framer Motion entrance + whileHover + whileTap */}
				<m.div
					initial={FLOAT_VARIANTS.initial[mode]}
					animate={FLOAT_VARIANTS.animate[mode]}
					transition={
						shouldReduceMotion
							? undefined
							: {
									opacity: {
										duration: MOTION_CONFIG.duration.slower,
										delay: position.delay,
										ease: MOTION_CONFIG.easing.easeOut,
									},
									scale: {
										duration: MOTION_CONFIG.duration.slower,
										delay: position.delay,
										ease: MOTION_CONFIG.easing.easeOut,
									},
								}
					}
					whileHover={shouldReduceMotion ? undefined : FLOAT_VARIANTS.whileHover.full}
					whileTap={shouldReduceMotion ? undefined : FLOAT_VARIANTS.whileTap.full}
				>
					{/* tabIndex={-1}: intentionally excluded from tab order — these products
            are decorative hero images and are accessible in the "Dernières créations"
            section below. The parent container also has aria-hidden="true". */}
					<Link
						href={`/creations/${image.slug}`}
						tabIndex={-1}
						prefetch
						onPointerEnter={handlePointerEnter}
						onPointerLeave={handlePointerLeave}
						onPointerMove={handlePointerMove}
						onClick={handleClick}
						className="group relative block overflow-hidden rounded-2xl border border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)] backdrop-blur-sm hover:shadow-[0_8px_30px_var(--img-glow),0_0_60px_var(--img-glow)] motion-safe:transition-shadow motion-safe:duration-[var(--duration-slow)]"
						style={
							{
								"--img-glow": position.glowColor,
								"--mx": "50%",
								"--my": "50%",
							} as React.CSSProperties
						}
					>
						{/* Glow layer — visible on hover */}
						<div
							className="absolute -inset-3 rounded-3xl opacity-0 blur-xl motion-safe:transition-opacity motion-safe:duration-[var(--duration-slow)] motion-safe:group-hover:opacity-60"
							style={{ backgroundColor: position.glowColor }}
						/>

						{/* Pointer-tracking spotlight — native 2026 pattern (Apple/Linear/Vercel).
            `mix-blend-screen` always brightens (vs `overlay` which can disappear on
            mid-tone images and burn out on dark/light photographs). */}
						<div
							aria-hidden="true"
							className="pointer-events-none absolute inset-0 z-20 opacity-0 mix-blend-screen group-hover:opacity-100 motion-safe:transition-opacity motion-safe:duration-[var(--duration-normal)] motion-reduce:hidden"
							style={{
								background:
									"radial-gradient(160px circle at var(--mx) var(--my), rgb(255 255 255 / 0.22), transparent 65%)",
							}}
						/>

						<Image
							src={image.url}
							alt={image.alt}
							width={position.width}
							height={position.height}
							preload={isPriority}
							className="relative aspect-4/5 w-full object-cover"
							sizes={position.sizes}
							quality={85}
							placeholder={image.blurDataUrl ? "blur" : "empty"}
							blurDataURL={image.blurDataUrl}
						/>
					</Link>
				</m.div>
			</div>
		</m.div>
	);
}
