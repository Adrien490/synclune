import type { Transition, Variants } from "framer-motion";

/**
 * Default animation configuration values
 */
export const MOTION_CONFIG = {
	// Default durations in seconds
	duration: {
		fast: 0.4,
		normal: 0.4,
		slow: 0.6,
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
		// Spring-based easings for natural movement
		spring: {
			type: "spring" as const,
			damping: 25,
			stiffness: 120,
			mass: 0.8,
		},

		// Tween-based easings for precise control
		easeInOut: [0.25, 0.1, 0.25, 1],
		easeOut: [0, 0, 0.2, 1],
		easeIn: [0.4, 0, 1, 1],

		// Collapse specific easing
		collapse: [0.25, 0.1, 0.25, 1],
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

/**
 * Common variants for fade animations
 */
export const fadeVariants: Variants = {
	hidden: {
		opacity: 0,
	},
	show: {
		opacity: 1,
		transition: createTransition(),
	},
};

/**
 * Common variants for slide animations
 */
export function createSlideVariants(
	direction: "up" | "down" | "left" | "right",
	distance = MOTION_CONFIG.transform.slideDistance
): Variants {
	const transforms = {
		up: { y: distance },
		down: { y: -distance },
		left: { x: distance },
		right: { x: -distance },
	};

	return {
		hidden: {
			opacity: 0,
			...transforms[direction],
		},
		show: {
			opacity: 1,
			x: 0,
			y: 0,
			transition: createTransition(),
		},
	};
}

/**
 * Common variants for scale animations
 */
export function createScaleVariants(
	from = MOTION_CONFIG.transform.scaleFrom,
	includeOpacity = true
): Variants {
	return {
		hidden: {
			scale: from,
			...(includeOpacity && { opacity: 0 }),
		},
		show: {
			scale: 1,
			...(includeOpacity && { opacity: 1 }),
			transition: createTransition(),
		},
	};
}

/**
 * Common variants for rotate animations
 */
export function createRotateVariants(
	from = MOTION_CONFIG.transform.rotateFrom
): Variants {
	return {
		hidden: {
			rotate: from,
			opacity: 0,
		},
		show: {
			rotate: 0,
			opacity: 1,
			transition: createTransition(),
		},
	};
}

/**
 * Stagger container variants
 */
export function createStaggerVariants(
	stagger = MOTION_CONFIG.stagger.normal,
	delayChildren = 0
): Variants {
	return {
		hidden: {},
		show: {
			transition: {
				staggerChildren: stagger,
				delayChildren,
			},
		},
	};
}

/**
 * Child variants for staggered animations (to be used with stagger containers)
 */
export const staggerChildVariants: Variants = {
	hidden: {
		opacity: 0,
		y: 8,
	},
	show: {
		opacity: 1,
		y: 0,
		transition: createTransition(0.4, MOTION_CONFIG.easing.easeOut, false),
	},
};
