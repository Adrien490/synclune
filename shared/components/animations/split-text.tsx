"use client";

import { motion, useReducedMotion } from "motion/react";

export interface SplitTextProps {
	children: string;
	/** Stagger delay between words (seconds) */
	stagger?: number;
	className?: string;
}

const wordVariants = {
	hidden: {
		y: 20,
		filter: "blur(4px)",
	},
	visible: {
		opacity: 1,
		y: 0,
		filter: "blur(0px)",
	},
};

/**
 * Word-by-word staggered reveal animation.
 *
 * - Splits text into <span> per word with staggered entrance
 * - Each word animates: opacity, translateY, blur
 * - Text stays visible during hydration for LCP (no opacity:0 in hidden variant)
 * - Respects prefers-reduced-motion: renders without animation
 */
export function SplitText({ children, stagger = 0.08, className }: SplitTextProps) {
	const prefersReducedMotion = useReducedMotion();
	const words = children.split(" ");

	// Always render same DOM structure to avoid hydration mismatch
	// (useReducedMotion returns null on server, true/false on client)
	return (
		<motion.span
			className={className}
			initial={prefersReducedMotion ? "visible" : "hidden"}
			animate="visible"
			transition={prefersReducedMotion ? { duration: 0 } : { staggerChildren: stagger }}
			aria-label={children}
		>
			{words.map((word, i) => (
				<motion.span
					key={`${word}-${i}`}
					variants={wordVariants}
					transition={
						prefersReducedMotion ? { duration: 0 } : { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }
					}
					className="inline-block"
					aria-hidden="true"
				>
					{word}
					{i < words.length - 1 && "\u00A0"}
				</motion.span>
			))}
		</motion.span>
	);
}
