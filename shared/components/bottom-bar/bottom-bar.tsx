"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { useBottomBarHeight } from "@/shared/hooks";
import { cn } from "@/shared/utils/cn";

// ---------------------------------------------------------------------------
// Shared class constants
// ---------------------------------------------------------------------------

/** Classes for the inner container (flex row with dividers). */
export const bottomBarContainerClass =
	"flex items-stretch h-14";

/** Classes for an individual item (button or link) inside the bar. */
export const bottomBarItemClass = cn(
	"flex-1 flex flex-col items-center justify-center gap-1",
	"h-full min-h-14",
	"transition-colors duration-200",
	"active:scale-[0.98] active:bg-primary/10",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
	"relative",
	"text-muted-foreground hover:text-foreground",
);

/** Icon size class. */
export const bottomBarIconClass = "size-5";

/** Label text class. */
export const bottomBarLabelClass = "text-xs font-medium";

// ---------------------------------------------------------------------------
// ActiveDot
// ---------------------------------------------------------------------------

/** Small dot indicator shown above the active item. */
export function ActiveDot() {
	return (
		<span
			className="absolute -top-0.5 left-1/2 -translate-x-1/2 size-1.5 bg-primary rounded-full animate-in zoom-in-50 duration-200"
			aria-hidden="true"
		/>
	);
}

// ---------------------------------------------------------------------------
// BottomBar
// ---------------------------------------------------------------------------

interface BottomBarProps {
	children: ReactNode;
	/** HTML element to render. @default "div" */
	as?: "div" | "nav";
	/** Tailwind responsive-hide class. @default "md:hidden" */
	breakpointClass?: string;
	/** z-index class. @default "z-50" */
	zIndex?: string;
	/** Bar height in px (reported to useBottomBarHeight). @default 56 */
	height?: number;
	/** Whether the bar is mounted / height should be registered. @default true */
	enabled?: boolean;
	/** When true, the bar slides out and becomes non-interactive. */
	isHidden?: boolean;
	className?: string;
	"aria-label"?: string;
}

export function BottomBar({
	children,
	as = "div",
	breakpointClass = "md:hidden",
	zIndex = "z-50",
	height = 56,
	enabled = true,
	isHidden = false,
	className,
	"aria-label": ariaLabel,
}: BottomBarProps) {
	useBottomBarHeight(height, enabled && !isHidden);
	const prefersReducedMotion = useReducedMotion();

	const Component = as === "nav" ? motion.nav : motion.div;

	return (
		<Component
			initial={prefersReducedMotion ? false : { y: 100, opacity: 0 }}
			animate={isHidden ? { y: 100, opacity: 0 } : { y: 0, opacity: 1 }}
			transition={MOTION_CONFIG.spring.bar}
			aria-label={ariaLabel}
			className={cn(
				breakpointClass,
				"fixed bottom-0 left-0 right-0",
				zIndex,
				"pb-[env(safe-area-inset-bottom)]",
				"bg-background/95 backdrop-blur-md",
				"border-t border-x border-border",
				"rounded-t-2xl",
				"shadow-[0_-4px_20px_rgba(0,0,0,0.08)]",
				isHidden && "pointer-events-none",
				className,
			)}
		>
			{children}
		</Component>
	);
}
