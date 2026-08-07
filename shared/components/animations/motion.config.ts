import type { Transition } from "motion/react";

/**
 * Default animation configuration values
 */
export const MOTION_CONFIG = {
	// Default durations in seconds - aligned with CSS variables
	duration: {
		fast: 0.15, // 150ms - matches --duration-fast
		normal: 0.2, // 200ms - matches --duration-normal
		medium: 0.35, // 350ms - text flips, rotating words, checkout steps
		slow: 0.3, // 300ms - matches --duration-slow
		emphasis: 0.4, // 400ms - logo entrance, scroll reveals
		slower: 0.5, // 500ms - hand-drawn trait, entrances
		collapse: 0.28,
	},

	// Default stagger timing
	stagger: {
		fast: 0.04,
		normal: 0.06,
		slow: 0.1,
	},

	// Common easing functions
	easing: {
		// Tween-based easings for precise control
		easeInOut: [0.25, 0.1, 0.25, 1],
		easeOut: [0, 0, 0.2, 1],
		easeIn: [0.4, 0, 1, 1],

		// Emphasized deceleration for list/grid item animations
		emphasized: [0.4, 0, 0.2, 1],

		// Collapse specific easing
		collapse: [0.25, 0.1, 0.25, 1],
	},

	// Spring presets - centralized for consistency
	spring: {
		// Natural movement - default for most animations
		gentle: {
			type: "spring" as const,
			damping: 25,
			stiffness: 120,
			mass: 0.8,
		},

		// Snappy spring for quick UI elements (FAB, toggles)
		snappy: {
			type: "spring" as const,
			damping: 35,
			stiffness: 500,
			mass: 0.3,
		},

		// Bouncy spring for selectors, cards
		bouncy: {
			type: "spring" as const,
			damping: 15,
			stiffness: 400,
			mass: 0.5,
		},

		// Smooth list item transitions (cart, lists)
		list: {
			type: "spring" as const,
			stiffness: 400,
			damping: 30,
			mass: 1,
		},

		// Fixed bottom bar entrance (sort bar, cart CTA)
		bar: {
			type: "spring" as const,
			damping: 25,
			stiffness: 300,
		},

		// Success celebration (order confirmation icon)
		success: {
			type: "spring" as const,
			damping: 12,
			stiffness: 200,
		},

		// Animated number counting
		number: {
			mass: 0.8,
			stiffness: 75,
			damping: 15,
		},

		// Mobile pastille toast (top-center, single-slot, 1.2s)
		toast: {
			type: "spring" as const,
			stiffness: 380,
			damping: 28,
		},
	},

	// Default distances and transforms
	transform: {
		slideDistance: 24,
		fadeY: 8,
		scaleFrom: 0.96,
		rotateFrom: -4,
	},

	// Viewport intersection options
	viewport: {
		once: true,
		amount: 0.2,
		margin: "-50px",
	},

	// Section animation presets — seul `footer` a survécu au vidage de la
	// landing (2026-08-03) ; les presets title/grid/cta/timeline/carousel et
	// les presets background (blob/sparkle/scrollIndicator) sont partis avec.
	section: {
		// `stagger` retiré le 2026-08-04 : le footer n'a qu'un seul <Fade>, et plus
		// aucun consommateur ne lisait cette clé depuis le vidage de la landing.
		footer: { y: 10, duration: 0.4 },
	},
} as const;

/**
 * Utility function to modify transitions based on reduced motion preference
 */
export function maybeReduceMotion(
	transition: Transition | undefined,
	prefersReducedMotion: boolean,
): Transition {
	if (prefersReducedMotion) {
		return {
			duration: 0,
			type: "tween" as const,
		};
	}

	return transition ?? {};
}
