"use client";

import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { cn } from "@/shared/utils/cn";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
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
 * Respects prefers-reduced-m.
 */
export function RotatingWord({ words, duration = 3000, className }: RotatingWordProps) {
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

	// Always render same DOM structure to avoid hydration mismatch
	// (useReducedMotion returns null on server, true/false on client)
	return (
		<span
			className={pillStyles}
			style={{ contain: "layout paint" }}
			lang="fr"
			role="group"
			aria-label={words.join(" et ")}
		>
			<span className="relative inline-flex items-center" aria-hidden="true">
				<AnimatePresence mode="wait">
					<m.span
						key={shouldReduceMotion ? "static" : currentIndex}
						initial={shouldReduceMotion ? false : { y: 20, opacity: 0, filter: "blur(4px)" }}
						animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
						exit={shouldReduceMotion ? undefined : { y: -20, opacity: 0, filter: "blur(4px)" }}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { duration: MOTION_CONFIG.duration.medium, ease: MOTION_CONFIG.easing.easeInOut }
						}
						className={cn(textStyles, "absolute inset-0 flex items-center justify-center")}
					>
						{words[shouldReduceMotion ? 0 : currentIndex]}
					</m.span>
				</AnimatePresence>

				{/* Invisible placeholder - reserves width of the longest word */}
				<span className={cn(textStyles, "invisible select-none")}>{longestWord}</span>
			</span>
		</span>
	);
}
