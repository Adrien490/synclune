"use client";

import { getPostHog } from "@/shared/lib/posthog";

/**
 * Check if a feature flag is enabled
 * Falls back to false if PostHog is not initialized
 */
export function isFeatureEnabled(flag: string): boolean {
	if (typeof window === "undefined") return false;
	return getPostHog()?.isFeatureEnabled(flag) ?? false;
}

/**
 * Get a feature flag payload (for multivariate flags)
 */
export function getFeatureFlagPayload(flag: string): unknown {
	if (typeof window === "undefined") return undefined;
	return getPostHog()?.getFeatureFlagPayload(flag);
}
