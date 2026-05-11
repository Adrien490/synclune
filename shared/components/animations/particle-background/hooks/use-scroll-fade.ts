"use client";

import { type MotionValue, useScroll, useTransform } from "motion/react";
import type { RefObject } from "react";

/** Scroll progress mapping for progressive fade: 0→0, 15%→1, 85%→1, 100%→0 */
const SCROLL_FADE_INPUT: number[] = [0, 0.15, 0.85, 1];
const SCROLL_FADE_OUTPUT: number[] = [0, 1, 1, 0];

export interface ScrollFadeOutput {
	scrollYProgress: MotionValue<number>;
	scrollOpacity: MotionValue<number>;
}

/**
 * Tracks scroll progress for a target ref and produces a scroll-linked opacity MotionValue.
 * Hooks always run (rules-of-hooks); the caller decides whether to wire the returned MotionValues
 * into the rendered tree based on `scrollFade` / `scrollParallax` features.
 */
export function useScrollFade(ref: RefObject<HTMLElement | null>): ScrollFadeOutput {
	const { scrollYProgress } = useScroll({
		target: ref,
		offset: ["start end", "end start"],
	});
	const scrollOpacity = useTransform(scrollYProgress, SCROLL_FADE_INPUT, SCROLL_FADE_OUTPUT);
	return { scrollYProgress, scrollOpacity };
}
