import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";

// Extracted motion variants to reduce inline ternary verbosity
export const FLOAT_VARIANTS = {
	initial: {
		reduced: { opacity: 1 },
		full: { opacity: 0, scale: 0.9 },
	},
	animate: {
		reduced: { opacity: 1 },
		full: { opacity: 1, scale: 1 },
	},
	whileHover: {
		full: {
			scale: 1.08,
			y: -6,
			rotate: 0,
			transition: MOTION_CONFIG.spring.hover,
		},
	},
	whileTap: {
		full: {
			scale: 0.97,
			transition: MOTION_CONFIG.spring.snappy,
		},
	},
} as const;
