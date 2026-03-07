"use client";

import posthog from "posthog-js";

/**
 * Feature flag keys - centralized definition
 * Add flags here as they are created in PostHog dashboard
 */
export const FEATURE_FLAGS = {
	// Example flags - replace with actual flags from PostHog dashboard
	// NEW_CHECKOUT_FLOW: "new-checkout-flow",
	// SHOW_REVIEWS: "show-reviews",
} as const;

/**
 * Check if a feature flag is enabled
 * Falls back to false if PostHog is not initialized
 */
export function isFeatureEnabled(flag: string): boolean {
	if (typeof window === "undefined") return false;
	return posthog.isFeatureEnabled(flag) ?? false;
}

/**
 * Get a feature flag payload (for multivariate flags)
 */
export function getFeatureFlagPayload(flag: string): unknown {
	if (typeof window === "undefined") return undefined;
	return posthog.getFeatureFlagPayload(flag);
}
