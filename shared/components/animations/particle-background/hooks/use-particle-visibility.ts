"use client";

import { useInView } from "motion/react";
import { useRef } from "react";

export interface ParticleVisibilityOutput {
	containerRef: React.RefObject<HTMLDivElement | null>;
	isInView: boolean;
}

/**
 * Tracks whether the particle container is in the viewport (`useInView`, no margin:
 * particles stay mounted as long as any part of the container is visible).
 *
 * No `visibilitychange` handling: browsers already throttle rAF in hidden tabs, so the
 * looping animations are effectively paused for free — unmounting on tab switch only
 * caused a visible entrance replay ("pop") when coming back.
 *
 * The particles are purely ambient — they never react to the cursor.
 */
export function useParticleVisibility(): ParticleVisibilityOutput {
	const containerRef = useRef<HTMLDivElement>(null);
	const isInView = useInView(containerRef);

	return { containerRef, isInView };
}
