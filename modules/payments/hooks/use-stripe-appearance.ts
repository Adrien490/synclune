"use client";

import { useSyncExternalStore } from "react";
import type { Appearance } from "@stripe/stripe-js";
import { stripeAppearance, stripeAppearanceDark } from "../constants/stripe-appearance";

function subscribeColorScheme(callback: () => void) {
	const mql = window.matchMedia("(prefers-color-scheme: dark)");
	mql.addEventListener("change", callback);
	return () => mql.removeEventListener("change", callback);
}

function getColorSchemeSnapshot() {
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getColorSchemeServerSnapshot() {
	return false;
}

/**
 * Returns the Stripe Elements appearance config matching the user's color scheme.
 * Reactive to system theme changes via `matchMedia`.
 */
export function useStripeAppearance(): Appearance {
	const isDark = useSyncExternalStore(
		subscribeColorScheme,
		getColorSchemeSnapshot,
		getColorSchemeServerSnapshot,
	);
	return isDark ? stripeAppearanceDark : stripeAppearance;
}
