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
		widthClasses: "w-40 xl:w-48 2xl:w-56",
		delay: 0.3,
		glowColor: "var(--color-glow-pink)",
		parallaxSpeed: 45,
		idleDuration: 20,
		idleDelay: 0,
	},
	// Top-right — medium balance
	{
		className: "right-[3%] xl:right-[5%] top-[8%]",
		rotate: 5,
		width: 128,
		height: 160,
		widthClasses: "w-32 xl:w-40 2xl:w-48",
		delay: 0.5,
		glowColor: "var(--color-glow-lavender)",
		parallaxSpeed: 75,
		idleDuration: 22,
		idleDelay: 2,
	},
	// Bottom-left — small depth
	{
		className: "left-[12%] xl:left-[14%] bottom-[14%]",
		rotate: 3,
		width: 112,
		height: 140,
		widthClasses: "w-28 xl:w-34 2xl:w-40",
		delay: 0.7,
		glowColor: "var(--color-glow-mint)",
		parallaxSpeed: 105,
		idleDuration: 18,
		idleDelay: 4,
	},
	// Bottom-right — medium balance
	{
		className: "right-[10%] xl:right-[12%] bottom-[18%]",
		rotate: -4,
		width: 128,
		height: 160,
		widthClasses: "w-32 xl:w-38 2xl:w-44",
		delay: 0.9,
		glowColor: "var(--color-glow-yellow)",
		parallaxSpeed: 60,
		idleDuration: 24,
		idleDelay: 6,
	},
] as const;

interface HeroFloatingImagesProps {
	images: HeroProductImage[];
}

interface FloatingImageProps {
	image: HeroProductImage;
	position: (typeof IMAGE_POSITIONS)[number];
	index: number;
	scrollProgress: ReturnType<typeof useScroll>["scrollYProgress"];
	shouldReduceMotion: boolean | null;
}

function FloatingImage({
	image,
	position,
	index,
	scrollProgress,
	shouldReduceMotion,
}: FloatingImageProps) {
	// Scroll-driven parallax: outer wrapper
	const parallaxY = useTransform(
		scrollProgress,
		[0, 1],
		[0, position.parallaxSpeed]
	);

	// Idle floating keyframes (organic Lissajous-like motion)
	const idleY = [0, -8, 2, 8, -2, 0];
	const idleX = [0, 4, -3, -4, 3, 0];
	const idleRotate = [
		position.rotate,
		position.rotate - 1.5,
		position.rotate + 0.5,
		position.rotate + 1.5,
		position.rotate - 0.5,
		position.rotate,
	];

	return (
		<motion.div
			className={`absolute ${position.className} ${position.widthClasses}`}
			style={shouldReduceMotion ? undefined : { y: parallaxY }}
		>
			<motion.div
				initial={
					shouldReduceMotion
						? { opacity: 1 }
						: { opacity: 0, scale: 0.9 }
				}
				animate={
					shouldReduceMotion
						? { opacity: 1 }
						: {
								opacity: 1,
								scale: 1,
								y: idleY,
								x: idleX,
								rotate: idleRotate,
							}
				}
				transition={
					shouldReduceMotion
						? undefined
						: {
								// One-shot entry for opacity and scale
								opacity: {
									duration: 0.6,
									delay: position.delay,
									ease: "easeOut",
								},
								scale: {
									duration: 0.6,
									delay: position.delay,
									ease: "easeOut",
								},
								// Continuous idle for y, x, rotate
								y: {
									duration: position.idleDuration,
									delay: position.delay + position.idleDelay,
									repeat: Infinity,
									ease: "easeInOut",
								},
								x: {
									duration: position.idleDuration * 1.3,
									delay: position.delay + position.idleDelay,
									repeat: Infinity,
									ease: "easeInOut",
								},
								rotate: {
									duration: position.idleDuration * 0.9,
									delay: position.delay + position.idleDelay,
									repeat: Infinity,
									ease: "easeInOut",
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
			>
				<Link
					href={`/creations/${image.slug}`}
					className="pointer-events-auto group relative block overflow-hidden rounded-2xl border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)] transition-shadow duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.1)] hover:ring-1 hover:ring-white/30"
					tabIndex={-1}
					aria-hidden="true"
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
						sizes="(min-width: 1536px) 224px, (min-width: 1280px) 192px, 160px"
						priority={index === 0}
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

	if (images.length === 0) return null;

	return (
		<div
			ref={containerRef}
			className="absolute inset-0 z-0 hidden lg:block pointer-events-none"
			aria-hidden="true"
		>
			{images.map((image, index) => {
				const pos = IMAGE_POSITIONS[index];
				if (!pos) return null;

				return (
					<FloatingImage
						key={image.slug}
						image={image}
						position={pos}
						index={index}
						scrollProgress={scrollYProgress}
						shouldReduceMotion={shouldReduceMotion}
					/>
				);
			})}
		</div>
	);
}
