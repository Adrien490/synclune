import type { Transition } from "motion/react";

/**
 * Default animation configuration values
 */
export const MOTION_CONFIG = {
	// Default durations in seconds - aligned with CSS variables
	duration: {
		fast: 0.15, // 150ms - matches --duration-fast
		normal: 0.2, // 200ms - matches --duration-normal
		slow: 0.3, // 300ms - matches --duration-slow
		slower: 0.5, // 500ms - matches --duration-slower
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

		// Responsive hover spring (hero floating images)
		hover: {
			type: "spring" as const,
			stiffness: 300,
			damping: 25,
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
	},

	// Homepage section animation presets (shared across 4+ sections)
	section: {
		title: { y: 20, duration: 0.6 },
		subtitle: { y: 10, delay: 0.1, duration: 0.6 },
		grid: { stagger: 0.08, y: 25 },
		cta: { y: 15, delay: 0.3, duration: 0.5 },
		timeline: { stagger: 0.12, y: 30 },
		footer: { y: 10, duration: 0.4, stagger: 0.08 },
		carousel: { y: 20, duration: 0.8, delay: 0.2 },
		content: { y: 20, duration: 0.6, delay: 0.2 },
	},

	// Background animation presets
	background: {
		blob: {
			cycle: 20, // 20s CSS animation cycle
			fadeIn: 1.5, // Framer Motion fade-in duration
			stagger: 0.2, // Delay between blobs
		},
		sparkle: {
			durationRange: [2, 4] as readonly [number, number],
			delayMax: 3,
		},
		scrollIndicator: {
			duration: 1.5,
		},
	},
} as const;

/**
 * Utility function to modify transitions based on reduced motion preference
 */
export function maybeReduceMotion(
	transition: Transition | undefined,
	prefersReducedMotion: boolean
): Transition {
	if (prefersReducedMotion) {
		return {
			duration: 0,
			type: "tween" as const,
		};
	}

	return transition || {};
}

/**
 * Creates a transition with reduced motion support
 */
export function createTransition(
	duration: number = MOTION_CONFIG.duration.normal,
	easing: Transition["ease"] = MOTION_CONFIG.easing.easeOut,
	prefersReducedMotion: boolean = false
): Transition {
	const transition: Transition = {
		duration,
		ease: easing,
		type: "tween",
	};

	return maybeReduceMotion(transition, prefersReducedMotion);
}
