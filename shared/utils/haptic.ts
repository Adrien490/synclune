/**
 * Haptic feedback utilities for mobile interactions.
 * Uses the Vibration API with perceptible durations.
 */

export function hapticLight() {
	if (typeof navigator !== "undefined" && "vibrate" in navigator) {
		navigator.vibrate(10);
	}
}

export function hapticMedium() {
	if (typeof navigator !== "undefined" && "vibrate" in navigator) {
		navigator.vibrate(20);
	}
}
