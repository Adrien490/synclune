"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/shared/utils/cn";
import { ChevronUp } from "lucide-react";
import { AnimatePresence, m, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { MOTION_CONFIG, maybeReduceMotion } from "@/shared/components/animations/motion.config";

const SCROLL_THRESHOLD = 1200;

// Extracted sub-component to avoid instantiating motion values when reducedMotion is true
function ScrollRing() {
	const { scrollYProgress } = useScroll();

	const ringSize = 48;
	const strokeWidth = 2;
	const radius = (ringSize - strokeWidth) / 2;

	return (
		<svg
			width={ringSize}
			height={ringSize}
			viewBox={`0 0 ${ringSize} ${ringSize}`}
			className="pointer-events-none absolute inset-0 -rotate-90"
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
			<m.circle
				cx={ringSize / 2}
				cy={ringSize / 2}
				r={radius}
				fill="none"
				stroke="currentColor"
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				className="text-primary"
				style={{ pathLength: scrollYProgress }}
			/>
		</svg>
	);
}

export function ScrollToTop() {
	const [visible, setVisible] = useState(false);
	const visibleRef = useRef(false);
	const statusRef = useRef<HTMLDivElement>(null);
	const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const prefersReducedMotion = useReducedMotion();
	const reducedMotion = prefersReducedMotion ?? false;
	const transition = maybeReduceMotion(MOTION_CONFIG.spring.snappy, reducedMotion);

	// Unified scroll tracking via Framer Motion
	const { scrollY } = useScroll();
	useMotionValueEvent(scrollY, "change", (latest) => {
		const next = latest > SCROLL_THRESHOLD;
		if (visibleRef.current !== next) {
			visibleRef.current = next;
			setVisible(next);
		}
	});

	// SR announcements + cleanup in a single effect
	useEffect(() => {
		if (statusRef.current) {
			statusRef.current.textContent = visible ? "Retour en haut disponible" : "";

			if (statusTimeoutRef.current) {
				clearTimeout(statusTimeoutRef.current);
			}
			statusTimeoutRef.current = setTimeout(() => {
				if (statusRef.current) statusRef.current.textContent = "";
			}, 1000);
		}

		return () => {
			if (statusTimeoutRef.current) {
				clearTimeout(statusTimeoutRef.current);
			}
		};
	}, [visible]);

	function scrollToTop() {
		window.scrollTo({
			top: 0,
			behavior: reducedMotion ? "instant" : "smooth",
		});
	}

	return (
		<>
			{/* Screen reader announcements */}
			<div ref={statusRef} role="status" aria-live="polite" className="sr-only" />

			<AnimatePresence mode="wait">
				{visible && (
					<m.button
						type="button"
						onClick={scrollToTop}
						aria-label="Retour en haut de la page"
						initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.9 }}
						animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
						exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.9 }}
						transition={transition}
						whileHover={reducedMotion ? undefined : { scale: 1.05 }}
						whileTap={reducedMotion ? undefined : { scale: 0.95 }}
						className={cn(
							"fixed right-[max(1.5rem,env(safe-area-inset-right))] bottom-[calc(var(--bottom-bar-height,0px)+max(1rem,env(safe-area-inset-bottom)))] z-40 md:bottom-[max(1.5rem,env(safe-area-inset-bottom))]",
							"bg-background/90 size-12 rounded-full shadow-md backdrop-blur-md",
							"hidden cursor-pointer items-center justify-center md:flex",
							"hover:bg-background hover:shadow-lg",
							"focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
						)}
					>
						{!reducedMotion && <ScrollRing />}
						<ChevronUp className="size-5" aria-hidden="true" />
					</m.button>
				)}
			</AnimatePresence>
		</>
	);
}
