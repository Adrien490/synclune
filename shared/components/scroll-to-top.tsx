"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/shared/utils/cn";
import { ChevronUp } from "lucide-react";
import {
	AnimatePresence,
	motion,
	useReducedMotion,
	useScroll,
	useTransform,
} from "motion/react";
import {
	MOTION_CONFIG,
	maybeReduceMotion,
} from "@/shared/components/animations/motion.config";

const SCROLL_THRESHOLD = 1200;

export function ScrollToTop() {
	const [visible, setVisible] = useState(false);
	const statusRef = useRef<HTMLDivElement>(null);
	const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const prefersReducedMotion = useReducedMotion();
	const reducedMotion = prefersReducedMotion ?? false;
	const transition = maybeReduceMotion(
		MOTION_CONFIG.spring.snappy,
		reducedMotion,
	);

	// Scroll progress for the SVG ring
	const { scrollYProgress } = useScroll();
	const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

	// Throttled scroll listener with rAF
	useEffect(() => {
		let ticking = false;

		function onScroll() {
			if (!ticking) {
				requestAnimationFrame(() => {
					setVisible(window.scrollY > SCROLL_THRESHOLD);
					ticking = false;
				});
				ticking = true;
			}
		}

		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	// Announce visibility changes to screen readers
	useEffect(() => {
		if (statusRef.current) {
			statusRef.current.textContent = visible
				? "Retour en haut disponible"
				: "";

			if (statusTimeoutRef.current) {
				clearTimeout(statusTimeoutRef.current);
			}
			statusTimeoutRef.current = setTimeout(() => {
				if (statusRef.current) statusRef.current.textContent = "";
			}, 1000);
		}
	}, [visible]);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (statusTimeoutRef.current) {
				clearTimeout(statusTimeoutRef.current);
			}
		};
	}, []);

	function scrollToTop() {
		window.scrollTo({
			top: 0,
			behavior: reducedMotion ? "instant" : "smooth",
		});
	}

	// SVG ring dimensions
	const ringSize = 44;
	const strokeWidth = 2;
	const radius = (ringSize - strokeWidth) / 2;

	return (
		<>
			{/* Screen reader announcements */}
			<div
				ref={statusRef}
				role="status"
				aria-live="polite"
				className="sr-only"
			/>

			<AnimatePresence>
				{visible && (
					<motion.button
						type="button"
						onClick={scrollToTop}
						aria-label="Retour en haut de la page"
						initial={
							reducedMotion
								? { opacity: 0 }
								: { opacity: 0, y: 16, scale: 0.9 }
						}
						animate={
							reducedMotion
								? { opacity: 1 }
								: { opacity: 1, y: 0, scale: 1 }
						}
						exit={
							reducedMotion
								? { opacity: 0 }
								: { opacity: 0, y: 16, scale: 0.9 }
						}
						transition={transition}
						whileHover={reducedMotion ? undefined : { scale: 1.05 }}
						whileTap={reducedMotion ? undefined : { scale: 0.95 }}
						className={cn(
							"fixed bottom-[calc(var(--bottom-bar-height,0px)+max(1rem,env(safe-area-inset-bottom)))] md:bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1.5rem,env(safe-area-inset-right))] z-40",
							"size-11 rounded-full bg-background/90 backdrop-blur-md shadow-md",
							"flex items-center justify-center cursor-pointer",
							"hover:bg-background hover:shadow-lg",
							"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
						)}
					>
						{/* Scroll progress ring */}
						{!reducedMotion && (
							<svg
								width={ringSize}
								height={ringSize}
								viewBox={`0 0 ${ringSize} ${ringSize}`}
								className="absolute inset-0 -rotate-90 pointer-events-none"
								aria-hidden="true"
							>
								{/* Track */}
								<circle
									cx={ringSize / 2}
									cy={ringSize / 2}
									r={radius}
									fill="none"
									stroke="currentColor"
									strokeWidth={strokeWidth}
									className="text-primary/10"
								/>
								{/* Progress */}
								<motion.circle
									cx={ringSize / 2}
									cy={ringSize / 2}
									r={radius}
									fill="none"
									stroke="currentColor"
									strokeWidth={strokeWidth}
									strokeLinecap="round"
									className="text-primary"
									style={{ pathLength }}
								/>
							</svg>
						)}
						<ChevronUp className="size-5" />
					</motion.button>
				)}
			</AnimatePresence>
		</>
	);
}
