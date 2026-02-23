"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { useRef, useSyncExternalStore } from "react";
import { useIsTouchDevice } from "@/shared/hooks";
import "./scroll-progress-line.css";

// Hydration safety pattern (évite mismatch server/client)
const subscribeNoop = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

// CSS scroll-driven animation support detection (hydration-safe)
const getCssSupportSnapshot = () =>
	typeof CSS !== "undefined" && CSS.supports("animation-timeline", "view()");
const getCssSupportServerSnapshot = () => false;

/**
 * Ligne statique (sans animation scroll)
 * Utilisée sur mobile/tactile et quand reduced-motion est activé
 */
function StaticLine() {
	return (
		<div
			className="absolute left-5 sm:left-6 top-6 bottom-6 z-0 hidden sm:block"
			aria-hidden="true"
		>
			<div className="absolute inset-0 w-0.5 sm:w-1 bg-secondary/40 rounded-full" />
		</div>
	);
}

/**
 * CSS Scroll-Driven line — uses animation-timeline: view()
 * Zero JS scroll tracking, GPU-composited
 */
function CssAnimatedLine() {
	return (
		<div className="scroll-progress-line-css absolute left-5 sm:left-6 top-6 bottom-6 z-0">
			{/* Background track */}
			<div
				className="absolute inset-0 w-0.5 sm:w-1 bg-secondary/20 rounded-full"
				aria-hidden="true"
			/>
			{/* Progress fill — animated via CSS scroll-driven animation */}
			<div
				className="absolute top-0 left-0 w-0.5 sm:w-1 h-full bg-secondary/60 rounded-full"
				aria-hidden="true"
			/>
		</div>
	);
}

/**
 * JS fallback — Motion useScroll/useTransform
 * For browsers without animation-timeline support
 */
function JsAnimatedLine() {
	const containerRef = useRef<HTMLDivElement>(null);

	const { scrollYProgress } = useScroll({
		target: containerRef,
		offset: ["start 0.8", "end 0.5"],
	});

	const clipPath = useTransform(scrollYProgress, (v) => `inset(0 0 ${100 - v * 100}% 0)`);
	const opacity = useTransform(scrollYProgress, [0, 0.1], [0.3, 1]);

	return (
		<div ref={containerRef} className="absolute left-5 sm:left-6 top-6 bottom-6 z-0">
			{/* Background track */}
			<div
				className="absolute inset-0 w-0.5 sm:w-1 bg-secondary/20 rounded-full"
				aria-hidden="true"
			/>
			{/* Progress fill — JS-driven clipPath */}
			<motion.div
				className="absolute top-0 left-0 w-0.5 sm:w-1 h-full bg-secondary/60 rounded-full"
				style={{
					clipPath,
					opacity,
				}}
				aria-hidden="true"
			/>
		</div>
	);
}

/**
 * Ligne de progression animée au scroll
 *
 * Progressive enhancement:
 * - CSS animation-timeline: view() when supported (zero JS)
 * - Motion useScroll fallback for older browsers
 * - Static line for mobile/touch and reduced-motion
 */
export function ScrollProgressLine() {
	const prefersReducedMotion = useReducedMotion();
	const isTouchDevice = useIsTouchDevice();

	const isMounted = useSyncExternalStore(
		subscribeNoop,
		getClientSnapshot,
		getServerSnapshot
	);

	const supportsCssScrollTimeline = useSyncExternalStore(
		subscribeNoop,
		getCssSupportSnapshot,
		getCssSupportServerSnapshot,
	);

	const shouldReduceMotion = isMounted && prefersReducedMotion;

	// Mobile/touch or reduced-motion: static line
	if (shouldReduceMotion || isTouchDevice) {
		return <StaticLine />;
	}

	// CSS scroll-driven animation (zero JS) when supported
	if (supportsCssScrollTimeline) {
		return <CssAnimatedLine />;
	}

	return <JsAnimatedLine />;
}
