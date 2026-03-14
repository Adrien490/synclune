"use client";

import { m, useReducedMotion } from "motion/react";

/** Animated hamburger ↔ X morph icon (3 bars → cross) */
export function HamburgerIcon({ isOpen }: { isOpen: boolean }) {
	const shouldReduceMotion = useReducedMotion();
	const transition = shouldReduceMotion
		? { duration: 0 }
		: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const };

	return (
		<svg
			width={20}
			height={20}
			viewBox="0 0 20 20"
			fill="none"
			aria-hidden="true"
			className="text-current"
		>
			{/* Top bar → top-left to bottom-right diagonal */}
			<m.line
				x1="3"
				x2="17"
				y1="5"
				y2="5"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				initial={{ x1: 3, x2: 17, y1: 5, y2: 5, opacity: 1 }}
				animate={
					isOpen
						? { x1: 4, x2: 16, y1: 4, y2: 16, opacity: 1 }
						: { x1: 3, x2: 17, y1: 5, y2: 5, opacity: 1 }
				}
				transition={transition}
			/>
			{/* Middle bar → fades out */}
			<m.line
				x1="3"
				x2="17"
				y1="10"
				y2="10"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				initial={{ opacity: 1 }}
				animate={isOpen ? { opacity: 0 } : { opacity: 1 }}
				transition={transition}
			/>
			{/* Bottom bar → bottom-left to top-right diagonal */}
			<m.line
				x1="3"
				x2="17"
				y1="15"
				y2="15"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				initial={{ x1: 3, x2: 17, y1: 15, y2: 15, opacity: 1 }}
				animate={
					isOpen
						? { x1: 4, x2: 16, y1: 16, y2: 4, opacity: 1 }
						: { x1: 3, x2: 17, y1: 15, y2: 15, opacity: 1 }
				}
				transition={transition}
			/>
		</svg>
	);
}
