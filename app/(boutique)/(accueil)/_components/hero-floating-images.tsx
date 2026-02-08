"use client";

import type { HeroProductImage } from "../_utils/extract-hero-images";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";

const IMAGE_POSITIONS = [
	// Left side
	{
		className: "left-[3%] xl:left-[5%] top-[18%]",
		rotate: -6,
		width: 144,
		height: 180,
		widthClasses: "w-36 xl:w-44 2xl:w-52",
		delay: 0.3,
	},
	// Right side
	{
		className: "right-[3%] xl:right-[5%] top-[15%]",
		rotate: 4,
		width: 144,
		height: 180,
		widthClasses: "w-36 xl:w-44 2xl:w-52",
		delay: 0.5,
	},
	// Bottom right
	{
		className: "right-[15%] xl:right-[18%] bottom-[12%]",
		rotate: 2,
		width: 144,
		height: 180,
		widthClasses: "w-36 xl:w-44 2xl:w-52",
		delay: 0.7,
	},
] as const;

interface HeroFloatingImagesProps {
	images: HeroProductImage[];
}

export function HeroFloatingImages({ images }: HeroFloatingImagesProps) {
	const shouldReduceMotion = useReducedMotion();

	if (images.length === 0) return null;

	return (
		<div
			className="absolute inset-0 z-0 hidden lg:block pointer-events-none"
			aria-hidden="true"
		>
			{images.map((image, index) => {
				const pos = IMAGE_POSITIONS[index];
				if (!pos) return null;

				return (
					<motion.div
						key={image.slug}
						className={`absolute ${pos.className} ${pos.widthClasses}`}
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
										duration: 0.6,
										delay: pos.delay,
										ease: "easeOut",
									}
						}
						style={{ rotate: pos.rotate }}
					>
						<Link
							href={`/creations/${image.slug}`}
							className="pointer-events-auto block overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 transition-all duration-300 hover:scale-105 hover:shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)]"
							tabIndex={-1}
							aria-hidden="true"
						>
							<Image
								src={image.url}
								alt={image.alt}
								width={pos.width}
								height={pos.height}
								className="aspect-[4/5] w-full object-cover"
								sizes="(min-width: 1536px) 208px, (min-width: 1280px) 176px, 144px"
								priority={index === 0}
								placeholder={image.blurDataUrl ? "blur" : "empty"}
								blurDataURL={image.blurDataUrl}
							/>
						</Link>
					</motion.div>
				);
			})}
		</div>
	);
}
