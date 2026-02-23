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
		opacity: 0,
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
 * - Text is immediately visible in DOM for SSR/LCP (motion handles initial state)
 * - Respects prefers-reduced-motion: renders without animation
 */
export function SplitText({
	children,
	stagger = 0.08,
	className,
}: SplitTextProps) {
	const prefersReducedMotion = useReducedMotion();
	const words = children.split(" ");

	// Reduced motion: render immediately without animation
	if (prefersReducedMotion) {
		return <span className={className}>{children}</span>;
	}

	return (
		<motion.span
			className={className}
			initial="hidden"
			animate="visible"
			transition={{ staggerChildren: stagger }}
		>
			{words.map((word, i) => (
				<motion.span
					key={`${word}-${i}`}
					variants={wordVariants}
					transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
					className="inline-block"
				>
					{word}
					{i < words.length - 1 && "\u00A0"}
				</motion.span>
			))}
		</motion.span>
	);
}
