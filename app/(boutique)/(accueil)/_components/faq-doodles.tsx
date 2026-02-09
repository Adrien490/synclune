"use client";

import { HandDrawnAccent } from "@/shared/components/animations/hand-drawn-accent";

/**
 * Decorative hand-drawn doodles around the FAQ accordion.
 * Client component (island) because HandDrawnAccent uses motion/react.
 * Delays are sequenced after accordion stagger (~0.5s+).
 */
export function FaqDoodles() {
	return (
		<>
			{/* Heart — top-right, pink, desktop only */}
			<HandDrawnAccent
				variant="heart"
				color="var(--color-glow-pink)"
				width={26}
				height={26}
				delay={0.5}
				className="absolute -top-3 -right-2 hidden lg:block"
			/>

			{/* Star — bottom-left, yellow, desktop only */}
			<HandDrawnAccent
				variant="star"
				color="var(--color-glow-yellow)"
				width={24}
				height={24}
				delay={0.7}
				className="absolute -bottom-4 -left-3 hidden lg:block"
			/>
		</>
	);
}
