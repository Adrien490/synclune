"use client";

import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

export interface ParticleVisibilityOptions {
	/** Pause the animation when the tab is hidden (default: true) */
	pauseWhenHidden: boolean;
}

export interface ParticleVisibilityOutput {
	containerRef: React.RefObject<HTMLDivElement | null>;
	isInView: boolean;
}

/**
 * Tracks whether the particle container should animate.
 *
 * Combines viewport visibility (`useInView`, margin -100px) with the tab visibility
 * (`document.visibilityState`) so particles pause when scrolled away or when the tab
 * is hidden. The particles are purely ambient — they never react to the cursor.
 */
export function useParticleVisibility(
	options: ParticleVisibilityOptions,
): ParticleVisibilityOutput {
	const { pauseWhenHidden } = options;
	const containerRef = useRef<HTMLDivElement>(null);
	const viewportInView = useInView(containerRef, { margin: "-100px" });
	const [tabVisible, setTabVisible] = useState(true);

	useEffect(() => {
		if (!pauseWhenHidden) return;
		function onVisibilityChange() {
			setTabVisible(document.visibilityState === "visible");
		}
		document.addEventListener("visibilitychange", onVisibilityChange);
		return () => document.removeEventListener("visibilitychange", onVisibilityChange);
	}, [pauseWhenHidden]);

	const isInView = viewportInView && (pauseWhenHidden ? tabVisible : true);

	return { containerRef, isInView };
}
