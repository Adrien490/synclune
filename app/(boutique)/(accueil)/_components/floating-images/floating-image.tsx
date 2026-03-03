"use client";

import { motion, useTransform } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { FLOAT_VARIANTS } from "./float-variants";
import type { FloatingImageProps } from "./types";

export function FloatingImage({
	image,
	position,
	scrollProgress,
	parallaxOpacity,
	shouldReduceMotion,
	isInView,
	index,
}: FloatingImageProps) {
	// Scroll-driven parallax: bidirectional for depth
	const parallaxY = useTransform(
		scrollProgress,
		[0, 1],
		[0, position.parallaxSpeed * position.parallaxDirection],
	);

	const mode = shouldReduceMotion ? "reduced" : "full";

	return (
		// Layer 1: parallax scroll (y + opacity)
		<motion.div
			className={`absolute ${position.className} ${position.widthClasses} pointer-events-auto ${position.tabletVisible ? "hidden md:block" : "hidden lg:block"}`}
			style={
				shouldReduceMotion
					? undefined
					: {
							y: parallaxY,
							opacity: parallaxOpacity,
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
				<motion.div
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
						className="group focus-visible:ring-primary focus-visible:ring-offset-background relative block overflow-hidden rounded-2xl border border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)] backdrop-blur-sm transition-shadow duration-300 hover:shadow-[0_8px_30px_var(--img-glow),0_0_60px_var(--img-glow)] hover:ring-1 hover:ring-white/30 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
						style={{ "--img-glow": position.glowColor } as React.CSSProperties}
					>
						{/* Glow layer — visible on hover */}
						<div
							className="absolute -inset-3 rounded-3xl opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-60"
							style={{ backgroundColor: position.glowColor }}
						/>

						{/* Light reflection overlay */}
						<div className="pointer-events-none absolute inset-0 z-10 bg-linear-to-b from-white/8 via-transparent to-transparent" />

						<Image
							src={image.url}
							alt={image.alt}
							width={position.width}
							height={position.height}
							className="relative aspect-4/5 w-full object-cover"
							sizes={position.sizes}
							preload={index === 0}
							quality={85}
							placeholder={image.blurDataUrl ? "blur" : "empty"}
							blurDataURL={image.blurDataUrl}
						/>
					</Link>
				</motion.div>
			</div>
		</motion.div>
	);
}
