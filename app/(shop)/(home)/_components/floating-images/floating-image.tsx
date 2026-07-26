"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { trackEvent } from "@/shared/lib/analytics/track";
import type { FloatingImageProps } from "./types";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";

/**
 * A single hero floating product image.
 *
 * Zero motion-react: every layer is CSS so the image paints at FCP without
 * waiting for JS hydration (the old motion-react Layer-3 entrance left it at
 * opacity:0 until the bundle ran — ~2.1s render delay). These images are
 * decorative (`hidden md:block`) and are NOT preloaded — the real LCP is
 * ProductCard[0] in the LatestCreations section (see regression
 * `mobile-lcp-preload-2026-05-24`).
 *
 * Layer stack (each isolated to one transform-ish property):
 *  1. `.hero-image-parallax` — scroll-bound vertical drift (CSS scroll-timeline)
 *  2. idle float            — infinite `hero-idle-float` keyframe, per-image base
 *                             rotation via `--idle-rotate` (inline)
 *  3. `.hero-image-entrance` — opacity+scale fade-in on load
 *
 * The images do NOT follow the cursor (no pointer-reactive depth). The only
 * cursor-aware bit is the per-image hover spotlight (`--mx`/`--my`), which
 * tracks the pointer only while hovering a single image. No motion-react.
 */
export function FloatingImage({ image, position }: FloatingImageProps) {
	const rectRef = useRef<DOMRect | null>(null);

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
			position: position.positionKey,
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
			{/* Layer 2: CSS idle float — isolated from the parallax transform.
			    Reduced motion is handled in CSS via `[style*="hero-idle-float"]`. */}
			<div
				style={
					{
						"--idle-rotate": position.idleRotate,
						animationName: "hero-idle-float",
						animationDuration: `${position.idleDuration}s`,
						animationTimingFunction: "ease-in-out",
						animationIterationCount: "infinite",
						animationDelay: `${position.delay + position.idleDelay}s`,
					} as CSSProperties
				}
			>
				{/* Layer 3: entrance fade+scale — CSS keyframe, paints at FCP, no JS. */}
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
						className="group shadow-floating relative block overflow-hidden rounded-2xl border border-white/20 hover:shadow-[0_8px_30px_var(--img-glow),0_0_60px_var(--img-glow)] motion-safe:transition-[box-shadow,translate,scale] motion-safe:duration-300 motion-safe:hover:-translate-y-[3px] motion-safe:hover:scale-105 motion-safe:active:scale-[0.97]"
						style={
							{
								"--img-glow": position.glowColor,
								"--mx": "50%",
								"--my": "50%",
							} as CSSProperties
						}
					>
						{/* Hover glow is delivered by the colored `box-shadow` above
						    (`--img-glow`), which blooms OUTWARD past the card — a blur
						    layer here would be clipped by `overflow-hidden` and painted
						    under the opaque image (dead paint). */}

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
							className="relative aspect-4/5 w-full object-cover"
							sizes={position.sizes}
							quality={IMAGE_QUALITY.HERO}
							placeholder={image.blurDataUrl ? "blur" : "empty"}
							blurDataURL={image.blurDataUrl}
						/>
					</Link>
				</div>
			</div>
		</div>
	);
}
