"use client";

import { cn } from "@/shared/utils/cn";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useEffectEvent, useState } from "react";

export interface RotatingWordProps {
	/** List of words that rotate with animation */
	words: string[];
	/** Display duration per word (ms) */
	duration?: number;
	/** Additional CSS classes for the pill container */
	className?: string;
}

/**
 * Animated rotating word inside a styled pill.
 *
 * Designed to be composed with server-rendered static text so only
 * the animated word requires client-side JS (better LCP).
 *
 * Anti-CLS: width is locked to the longest word via an invisible placeholder.
 * Respects prefers-reduced-motion.
 */
export function RotatingWord({
	words,
	duration = 3000,
	className,
}: RotatingWordProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const shouldReduceMotion = useReducedMotion();

	const longestWord = words.reduce((a, b) => (a.length > b.length ? a : b));

	// Effect Event: reads words.length without restarting the interval
	const onTick = useEffectEvent(() => {
		setCurrentIndex((prev) => (prev + 1) % words.length);
	});

	useEffect(() => {
		if (shouldReduceMotion) return;

		const interval = setInterval(onTick, duration);

		return () => clearInterval(interval);
	}, [duration, shouldReduceMotion]);

	const pillStyles = cn(
		"inline-flex items-center justify-center",
		"rounded-xl px-4 py-2",
		"bg-gradient-to-r from-primary/15 via-primary/10 to-secondary/20",
		"ring-1 ring-primary/25",
		"shadow-md shadow-primary/15",
		"transition-shadow duration-300",
		"hover:shadow-lg hover:shadow-primary/25",
		className,
	);

	const textStyles = "text-foreground font-medium whitespace-nowrap";

	if (shouldReduceMotion) {
		return (
			<span className={pillStyles} style={{ contain: "layout paint" }}>
				<span className={textStyles}>{words[0]}</span>
			</span>
		);
	}

	return (
		<span
			className={pillStyles}
			style={{ contain: "layout paint" }}
			lang="fr"
			aria-live="polite"
			aria-atomic="true"
		>
			<span className="relative inline-flex items-center">
				<AnimatePresence mode="wait">
					<motion.span
						key={currentIndex}
						initial={{ y: 20, opacity: 0, filter: "blur(4px)" }}
						animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
						exit={{ y: -20, opacity: 0, filter: "blur(4px)" }}
						transition={{
							duration: 0.35,
							ease: [0.25, 0.1, 0.25, 1],
						}}
						className={cn(
							textStyles,
							"absolute inset-0 flex items-center justify-center",
						)}
					>
						{words[currentIndex]}
					</motion.span>
				</AnimatePresence>

				{/* Invisible placeholder - reserves width of the longest word */}
				<span
					className={cn(textStyles, "invisible select-none")}
					aria-hidden="true"
				>
					{longestWord}
				</span>
			</span>
		</span>
	);
}
