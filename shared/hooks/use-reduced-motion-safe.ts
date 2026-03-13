"use client";

import { useReducedMotion } from "motion/react";
import { useMounted } from "./use-mounted";

/**
 * Hydration-safe wrapper around motion's useReducedMotion.
 * Returns null during SSR and hydration to prevent mismatch,
 * then the actual value after mount.
 */
export function useReducedMotionSafe(): boolean | null {
	const prefersReducedMotion = useReducedMotion();
	const isMounted = useMounted();
	return isMounted ? prefersReducedMotion : null;
}
