import type { MotionProps, Transition, Variants } from "framer-motion";

/**
 * Base motion props that can be passed to override default animations
 */
export interface BaseMotionProps {
	initial?: MotionProps["initial"];
	animate?: MotionProps["animate"];
	exit?: MotionProps["exit"];
	variants?: Variants;
	transition?: Transition;
	motionProps?: Omit<
		MotionProps,
		"initial" | "animate" | "exit" | "variants" | "transition" | "children"
	>;
}

/**
 * Common props shared across animation components
 */
export interface CommonAnimationProps extends BaseMotionProps {
	className?: string;
	duration?: number;
	delay?: number;
}

/**
 * Props for Fade component
 */
export interface FadeProps extends CommonAnimationProps {
	y?: number;
}

/**
 * Props for Slide component
 */
export interface SlideProps extends CommonAnimationProps {
	direction?: "up" | "down" | "left" | "right";
	distance?: number;
}

/**
 * Props for Reveal component (whileInView)
 */
export interface RevealProps extends CommonAnimationProps {
	y?: number;
	once?: boolean;
	amount?: number | "some" | "all";
}

/**
 * Props for Stagger component
 */
export interface StaggerProps extends BaseMotionProps {
	className?: string;
	stagger?: number;
	delayChildren?: number;
	initial?: "hidden" | false;
	animate?: "show" | false;
}

/**
 * Direction type for slide animations
 */
export type SlideDirection = "up" | "down" | "left" | "right";

/**
 * Viewport amount type for reveal animations
 */
export type ViewportAmount = number | "some" | "all";
