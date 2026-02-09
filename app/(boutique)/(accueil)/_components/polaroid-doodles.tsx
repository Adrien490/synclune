"use client";

import { HandDrawnAccent } from "@/shared/components/animations/hand-drawn-accent";

/**
 * Decorative hand-drawn doodles around the polaroid grid.
 * Client component (island) because HandDrawnAccent uses motion/react.
 * Delays are sequenced after polaroid stagger (~0.6s+).
 */
export function PolaroidDoodles() {
	return (
		<>
			{/* Heart — top-left, visible on all sizes */}
			<HandDrawnAccent
				variant="heart"
				color="var(--color-glow-pink)"
				width={28}
				height={28}
				delay={0.6}
				className="absolute -top-4 -left-2 sm:-top-5 sm:-left-4"
			/>

			{/* Heart — bottom-left, lavender, visible on all sizes */}
			<HandDrawnAccent
				variant="heart"
				color="var(--color-glow-lavender)"
				width={24}
				height={24}
				delay={0.8}
				className="absolute -bottom-3 left-4 sm:-bottom-4 sm:left-6"
			/>

			{/* Star — bottom-right, gold, desktop only */}
			<HandDrawnAccent
				variant="star"
				color="var(--color-glow-yellow)"
				width={26}
				height={26}
				delay={1.0}
				className="absolute -bottom-4 -right-3 hidden lg:block"
			/>

			{/* Arrow — between polaroid 1 and 2, desktop only */}
			<HandDrawnAccent
				variant="arrow"
				color="var(--color-glow-mint)"
				width={40}
				height={22}
				delay={1.2}
				className="absolute top-1/3 left-[23%] hidden lg:block"
			/>

			{/* Star — above polaroid 3, mint, desktop only */}
			<HandDrawnAccent
				variant="star"
				color="var(--color-glow-mint)"
				width={22}
				height={22}
				delay={1.4}
				className="absolute -top-5 left-[55%] hidden lg:block"
			/>
		</>
	);
}
