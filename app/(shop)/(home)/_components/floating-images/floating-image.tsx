"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { trackEvent } from "@/shared/lib/analytics/track";
import { PARALLAX_SPEED_MAX, PARALLAX_SPEED_MIN } from "./image-positions";
import type { FloatingImageProps } from "./types";

// Pointer-reactive depth: images with higher parallaxSpeed (perceived closer)
// react more to the cursor. Bounded 4px..8px for a subtle "floating" feel.
const POINTER_DEPTH_MIN_PX = 4;
const POINTER_DEPTH_MAX_PX = 8;

/**
 * A single hero floating product image.
 *
 * Zero motion-react: every layer is CSS so the image paints at FCP without
 * waiting for JS hydration (the old motion-react Layer-3 entrance left the
 * LCP image at opacity:0 until the bundle ran — ~2.1s render delay).
 *
 * Layer stack (each isolated to one transform-ish property):
 *  1. `.hero-image-parallax` — scroll-bound vertical drift (CSS scroll-timeline)
 *  2. `.hero-image-pointer`  — cursor-reactive depth (CSS var + transition)
 *  3. idle float            — infinite `hero-idle-float-*` keyframe (inline)
 *  4. `.hero-image-entrance` — opacity+scale fade-in on load
 *
 * The `<Link>` keeps a small client footprint: the cursor spotlight
 * (`--mx`/`--my`) and the analytics click event. No motion-react.
 */
export function FloatingImage({ image, position }: FloatingImageProps) {
	const rectRef = useRef<DOMRect | null>(null);

	// Pointer-reactive depth derived from the image's parallax speed.
	const depth =
		POINTER_DEPTH_MIN_PX +
		((position.parallaxSpeed - PARALLAX_SPEED_MIN) / (PARALLAX_SPEED_MAX - PARALLAX_SPEED_MIN)) *
			(POINTER_DEPTH_MAX_PX - POINTER_DEPTH_MIN_PX);

	// Spotlight follows the cursor via CSS custom properties. The rect is cached
	// on pointerenter — reading getBoundingClientRect() on every move forces a
	// synchronous reflow. Invalidated on pointerleave.
	function handlePointerEnter(event: ReactPointerEvent<HTMLAnchorElement>) {
		rectRef.current = event.currentTarget.getBoundingClientRect();
	}

	function handlePointerLeave() {
		rectRef.current = null;
	}

	function handlePointerMove(event: ReactPointerEvent<HTMLAnchorElement>) {
		const rect = rectRef.current ?? event.currentTarget.getBoundingClientRect();
		rectRef.current = rect;
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
		// Layer 1: scroll parallax — compositor-thread CSS scroll-timeline.
		<div
			className={`hero-image-parallax absolute ${position.className} ${position.widthClasses} pointer-events-auto ${position.visibilityClass}`}
			style={
				{
					"--parallax-distance": `${position.parallaxSpeed * position.parallaxDirection}px`,
				} as CSSProperties
			}
		>
			{/* Layer 2: pointer-reactive depth — CSS var written by the container. */}
			<div className="hero-image-pointer" style={{ "--depth": `${depth}px` } as CSSProperties}>
				{/* Layer 3: CSS idle float — isolated from parallax / pointer transforms.
				    Reduced motion is handled in CSS via `[style*="hero-idle-float"]`. */}
				<div
					style={{
						animationName: position.idleAnimation,
						animationDuration: `${position.idleDuration}s`,
						animationTimingFunction: "ease-in-out",
						animationIterationCount: "infinite",
						animationDelay: `${position.delay + position.idleDelay}s`,
					}}
				>
					{/* Layer 4: entrance fade+scale — CSS keyframe, paints at FCP, no JS. */}
					<div
						className="hero-image-entrance"
						style={{ "--enter-delay": `${position.delay * 1000}ms` } as CSSProperties}
					>
						{/* tabIndex={-1}: decorative — these products are reachable in the
						    "Dernières créations" section below; the container is aria-hidden. */}
						<Link
							href={`/creations/${image.slug}`}
							tabIndex={-1}
							prefetch
							onPointerEnter={handlePointerEnter}
							onPointerLeave={handlePointerLeave}
							onPointerMove={handlePointerMove}
							onClick={handleClick}
							className="group relative block overflow-hidden rounded-2xl border border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)] backdrop-blur-sm hover:shadow-[0_8px_30px_var(--img-glow),0_0_60px_var(--img-glow)] motion-safe:transition-[box-shadow,translate,scale] motion-safe:duration-300 motion-safe:hover:-translate-y-[3px] motion-safe:hover:scale-105 motion-safe:active:scale-[0.97]"
							style={
								{
									"--img-glow": position.glowColor,
									"--mx": "50%",
									"--my": "50%",
								} as CSSProperties
							}
						>
							{/* Glow layer — visible on hover */}
							<div
								className="absolute -inset-3 rounded-3xl opacity-0 blur-xl motion-safe:transition-opacity motion-safe:duration-[var(--duration-slow)] motion-safe:group-hover:opacity-60"
								style={{ backgroundColor: position.glowColor }}
							/>

							{/* Pointer-tracking spotlight — `mix-blend-screen` always brightens.
							    `motion-reduce:hidden` removes it entirely under reduced motion. */}
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
								preload={position.isLcpCandidate}
								fetchPriority={position.isLcpCandidate ? "high" : "auto"}
								className="relative aspect-4/5 w-full object-cover"
								sizes={position.sizes}
								quality={85}
								placeholder={image.blurDataUrl ? "blur" : "empty"}
								blurDataURL={image.blurDataUrl}
							/>
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
