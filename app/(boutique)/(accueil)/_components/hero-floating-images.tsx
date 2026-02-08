"use client";

import type { HeroProductImage } from "../_utils/extract-hero-images";
import {
	motion,
	useReducedMotion,
	useScroll,
	useTransform,
} from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";

// Diamond layout: 4 images around central content with varied sizes
const IMAGE_POSITIONS = [
	// Top-left — large anchor
	{
		className: "left-[2%] xl:left-[4%] top-[12%]",
		rotate: -8,
		width: 160,
		height: 200,
		widthClasses: "w-32 md:w-36 lg:w-40 xl:w-48 2xl:w-56",
		sizes: "(min-width: 1536px) 224px, (min-width: 1280px) 192px, (min-width: 1024px) 160px, 144px",
		delay: 0.3,
		glowColor: "var(--color-glow-pink)",
		parallaxSpeed: 45,
		parallaxDirection: 1 as const,
		idleAnimation: "hero-idle-float-1",
		idleDuration: 20,
		idleDelay: 0,
		tabletVisible: true,
	},
	// Top-right — medium balance
	{
		className: "right-[3%] xl:right-[5%] top-[8%]",
		rotate: 5,
		width: 128,
		height: 160,
		widthClasses: "w-32 xl:w-40 2xl:w-48",
		sizes: "(min-width: 1536px) 192px, (min-width: 1280px) 160px, 128px",
		delay: 0.5,
		glowColor: "var(--color-glow-lavender)",
		parallaxSpeed: 75,
		parallaxDirection: 1 as const,
		idleAnimation: "hero-idle-float-2",
		idleDuration: 22,
		idleDelay: 2,
		tabletVisible: false,
	},
	// Bottom-left — small depth
	{
		className: "left-[12%] xl:left-[14%] bottom-[14%]",
		rotate: 3,
		width: 112,
		height: 140,
		widthClasses: "w-28 xl:w-34 2xl:w-40",
		sizes: "(min-width: 1536px) 160px, (min-width: 1280px) 136px, 112px",
		delay: 0.7,
		glowColor: "var(--color-glow-mint)",
		parallaxSpeed: 105,
		parallaxDirection: -1 as const,
		idleAnimation: "hero-idle-float-3",
		idleDuration: 18,
		idleDelay: 4,
		tabletVisible: false,
	},
	// Bottom-right — medium balance
	{
		className: "right-[10%] xl:right-[12%] bottom-[18%]",
		rotate: -4,
		width: 128,
		height: 160,
		widthClasses: "w-32 md:w-34 lg:w-32 xl:w-38 2xl:w-44",
		sizes: "(min-width: 1536px) 176px, (min-width: 1280px) 152px, (min-width: 1024px) 128px, 136px",
		delay: 0.9,
		glowColor: "var(--color-glow-yellow)",
		parallaxSpeed: 60,
		parallaxDirection: -1 as const,
		idleAnimation: "hero-idle-float-4",
		idleDuration: 24,
		idleDelay: 6,
		tabletVisible: true,
	},
] as const;

interface HeroFloatingImagesProps {
	images: HeroProductImage[];
}

interface FloatingImageProps {
	image: HeroProductImage;
	position: (typeof IMAGE_POSITIONS)[number];
	scrollProgress: ReturnType<typeof useScroll>["scrollYProgress"];
	parallaxOpacity: ReturnType<typeof useTransform>;
	shouldReduceMotion: boolean | null;
	index: number;
}

function FloatingImage({
	image,
	position,
	scrollProgress,
	parallaxOpacity,
	shouldReduceMotion,
	index,
}: FloatingImageProps) {
	// Scroll-driven parallax: bidirectional for depth
	const parallaxY = useTransform(
		scrollProgress,
		[0, 1],
		[0, position.parallaxSpeed * position.parallaxDirection],
	);

	return (
		<motion.div
			className={`absolute ${position.className} ${position.widthClasses} pointer-events-auto ${position.tabletVisible ? "hidden md:block" : "hidden lg:block"}`}
			style={
				shouldReduceMotion
					? undefined
					: { y: parallaxY, opacity: parallaxOpacity }
			}
		>
			<motion.div
				className={
					shouldReduceMotion
						? undefined
						: "animate-hero-idle-float"
				}
				style={
					shouldReduceMotion
						? undefined
						: {
								animationName: position.idleAnimation,
								animationDuration: `${position.idleDuration}s`,
								animationTimingFunction: "ease-in-out",
								animationIterationCount: "infinite",
								animationDelay: `${position.delay + position.idleDelay}s`,
							}
				}
				initial={
					shouldReduceMotion
						? { opacity: 1 }
						: { opacity: 0, scale: 0.9 }
				}
				animate={
					shouldReduceMotion
						? { opacity: 1 }
						: { opacity: 1, scale: 1 }
				}
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
				whileHover={
					shouldReduceMotion
						? undefined
						: {
								scale: 1.08,
								y: -6,
								rotate: 0,
								transition: MOTION_CONFIG.spring.bouncy,
							}
				}
				whileTap={
					shouldReduceMotion
						? undefined
						: {
								scale: 0.97,
								transition: MOTION_CONFIG.spring.snappy,
							}
				}
			>
				<Link
					href={`/creations/${image.slug}`}
					aria-label={`Voir ${image.title}`}
					className="pointer-events-auto group relative block overflow-hidden rounded-2xl border border-white/20 backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)] transition-shadow duration-300 hover:shadow-[0_8px_30px_var(--img-glow),0_0_60px_var(--img-glow)] hover:ring-1 hover:ring-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
					style={{ "--img-glow": position.glowColor } as React.CSSProperties}
				>
					{/* Glow layer — visible on hover */}
					<div
						className="absolute -inset-3 rounded-3xl opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-60"
						style={{ backgroundColor: position.glowColor }}
					/>

					{/* Light reflection overlay */}
					<div className="absolute inset-0 z-10 bg-gradient-to-b from-white/8 via-transparent to-transparent pointer-events-none" />

					<Image
						src={image.url}
						alt={image.alt}
						width={position.width}
						height={position.height}
						className="relative aspect-[4/5] w-full object-cover"
						sizes={position.sizes}
						loading={index === 0 ? "eager" : "lazy"}
						placeholder={image.blurDataUrl ? "blur" : "empty"}
						blurDataURL={image.blurDataUrl}
					/>

					</Link>
			</motion.div>
		</motion.div>
	);
}

export function HeroFloatingImages({ images }: HeroFloatingImagesProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const shouldReduceMotion = useReducedMotion();

	const { scrollYProgress } = useScroll({
		target: containerRef,
		offset: ["start start", "end start"],
	});

	// Single shared opacity transform instead of one per image
	const parallaxOpacity = useTransform(
		scrollYProgress,
		[0, 0.4, 1],
		[1, 1, 0.2],
	);

	if (images.length === 0) return null;

	return (
		<div
			ref={containerRef}
			role="group"
			aria-label="Aperçu des dernières créations"
			className="absolute inset-0 z-0 hidden md:block pointer-events-none"
			style={{ contain: "layout paint" }}
		>
			{images.map((image, index) => {
				const pos = IMAGE_POSITIONS[index];
				if (!pos) return null;

				return (
					<FloatingImage
						key={image.slug}
						image={image}
						position={pos}
						scrollProgress={scrollYProgress}
						parallaxOpacity={parallaxOpacity}
						shouldReduceMotion={shouldReduceMotion}
						index={index}
					/>
				);
			})}
		</div>
	);
}
