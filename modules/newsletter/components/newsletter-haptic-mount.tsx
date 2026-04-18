"use client";

import { useEffect } from "react";

import { triggerHaptic, type HapticPattern } from "@/shared/hooks/use-haptic";

/**
 * Fires a single haptic pulse on mount. Used on newsletter confirmation /
 * unsubscribe result pages where the outcome is server-rendered.
 */
export function NewsletterHapticMount({ pattern }: { pattern: HapticPattern }) {
	useEffect(() => {
		triggerHaptic(pattern);
	}, [pattern]);
	return null;
}
