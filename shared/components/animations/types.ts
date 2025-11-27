import type { MotionProps, Transition, Variants } from "framer-motion";
import type {
	ComponentPropsWithRef,
	ElementType,
	PropsWithChildren,
} from "react";

/**
 * Polymorphic component props that allow changing the underlying element
 */
export type PolymorphicProps<T extends ElementType, P = object> = PropsWithChildren<
	P & Omit<ComponentPropsWithRef<T>, keyof P>
> & {
	as?: T;
};

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
 * Props for Scale component
 */
export interface ScaleProps extends CommonAnimationProps {
	from?: number;
	opacity?: boolean;
}

/**
 * Props for Rotate component
 */
export interface RotateProps extends CommonAnimationProps {
	from?: number;
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
 * Props for Collapse component
 */
export interface CollapseProps {
	isOpen: boolean;
	unmountOnExit?: boolean;
	duration?: number;
	easing?: number[];
	className?: string;
	children: React.ReactNode;
}

/**
 * Direction type for slide animations
 */
export type SlideDirection = "up" | "down" | "left" | "right";

/**
 * Viewport amount type for reveal animations
 */
export type ViewportAmount = number | "some" | "all";
