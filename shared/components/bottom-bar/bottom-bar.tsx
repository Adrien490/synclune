"use client";

import type { ReactNode } from "react";
import { m, useReducedMotion } from "motion/react";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { useBottomBarHeight } from "@/shared/hooks";
import { cn } from "@/shared/utils/cn";

// ---------------------------------------------------------------------------
// Shared class constants
// ---------------------------------------------------------------------------

/** Classes for the inner container (flex row with dividers). */
export const bottomBarContainerClass = "flex items-stretch h-14";

/** Classes for an individual item (button or link) inside the bar. */
export const bottomBarItemClass = cn(
	"flex-1 flex flex-col items-center justify-center gap-1",
	"h-full min-h-14 min-w-16",
	"transition-colors duration-200",
	"active:scale-[0.98] active:bg-primary/10",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
	"relative",
	"text-muted-foreground hover:text-foreground",
);

/**
 * Classes applied to an active item (in addition to bottomBarItemClass).
 *
 * Includes forced-colors (Windows High Contrast) and prefers-contrast: more
 * outlines so the active state remains perceivable without relying on color alone.
 */
export const bottomBarActiveItemClass = cn(
	"text-foreground",
	"forced-colors:outline forced-colors:outline-2 forced-colors:outline-[Highlight]",
	"contrast-more:outline contrast-more:outline-2 contrast-more:outline-current",
);

/** Icon size class. */
export const bottomBarIconClass = "size-5";

/** Label text class. */
export const bottomBarLabelClass = "text-xs font-medium truncate max-w-full";

/**
 * Badge class for count indicators on bottom-bar items
 * (e.g. cart count, unread notifications).
 *
 * Positioned absolutely over the icon's top-right corner.
 * Includes a background-colored outline to stay visible in forced-colors /
 * prefers-contrast: more modes.
 *
 * Usage:
 *   <span className={bottomBarBadgeClass} aria-live="polite">{count}</span>
 */
export const bottomBarBadgeClass = cn(
	"absolute -top-1 -right-1",
	"min-w-4 h-4 px-1",
	"rounded-full",
	"bg-destructive text-destructive-foreground",
	"text-[10px] font-semibold leading-none",
	"flex items-center justify-center",
	"ring-2 ring-background",
	"forced-colors:outline forced-colors:outline-1 forced-colors:outline-[CanvasText]",
);

// ---------------------------------------------------------------------------
// ActiveDot
// ---------------------------------------------------------------------------

/** Small dot indicator shown above the active item. */
export function ActiveDot() {
	return (
		<span
			className="bg-primary animate-in zoom-in-50 absolute -top-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full duration-200"
			aria-hidden="true"
		/>
	);
}

// ---------------------------------------------------------------------------
// BottomBarActivePill
// ---------------------------------------------------------------------------

interface BottomBarActivePillProps {
	/**
	 * Shared layoutId identifying this pill across sibling tabs.
	 * All tab items in the same bar must pass the same `groupId` so the pill
	 * morphs smoothly between them when the active tab changes.
	 */
	groupId: string;
	/** Override class names for custom sizing or color. */
	className?: string;
}

/**
 * iOS-18-style pill indicator rendered above the active tab.
 *
 * Render **only** on the active item. When the active tab changes, `motion/react`
 * morphs the pill from its previous position to the new one via shared `layoutId`.
 * Respects `prefers-reduced-motion` (static span, no layout animation).
 *
 * @example
 * ```tsx
 * {items.map(item => (
 *   <Link key={item.href} href={item.href} className={bottomBarItemClass}>
 *     {isActive(item) && <BottomBarActivePill groupId="shop-nav" />}
 *     <Icon className={bottomBarIconClass} />
 *     <span className={bottomBarLabelClass}>{item.label}</span>
 *   </Link>
 * ))}
 * ```
 */
export function BottomBarActivePill({ groupId, className }: BottomBarActivePillProps) {
	const prefersReducedMotion = useReducedMotion();

	const pillClass = cn(
		"absolute top-0 left-1/2 -translate-x-1/2",
		"w-8 h-1 rounded-full",
		"bg-primary",
		"forced-colors:bg-[Highlight]",
		className,
	);

	if (prefersReducedMotion) {
		return <span className={pillClass} aria-hidden="true" />;
	}

	return (
		<m.span
			layoutId={groupId}
			transition={MOTION_CONFIG.spring.snappy}
			className={pillClass}
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
	/** z-index class. @default "z-(--z-bar)" */
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

/**
 * Fixed mobile bottom-bar primitive (layout-only, non-opinionated).
 *
 * Registers its height in the shared `--bottom-bar-height` CSS variable so
 * scroll containers and sticky elements (FABs, sticky-cart-cta) can offset
 * themselves above it. Handles iOS safe-area-inset-bottom, backdrop blur with
 * a solid fallback, slide-out hide state (with `inert`), and entrance spring.
 *
 * **Composition tips:**
 * - If you want vertical dividers between items, wrap children in a flex
 *   container with `divide-x divide-border/30`.
 * - Render {@link BottomBarActivePill} only on the active item (with a shared
 *   `groupId`) for iOS-18-style morphing indicator, or {@link ActiveDot} for a
 *   minimal footprint indicator.
 * - For iOS/Android-native feel, call `triggerHaptic("selection")` from
 *   `@/shared/hooks/use-haptic` on tab click.
 * - Use {@link bottomBarBadgeClass} for count badges on icon items.
 * - Pair with `useScrollHideBottomBar` (opt-in) to auto-hide on fast down-scroll.
 */
export function BottomBar({
	children,
	as = "div",
	breakpointClass = "md:hidden",
	zIndex = "z-(--z-bar)",
	height = 56,
	enabled = true,
	isHidden = false,
	className,
	"aria-label": ariaLabel,
}: BottomBarProps) {
	useBottomBarHeight(height, enabled && !isHidden);
	const prefersReducedMotion = useReducedMotion();

	const Component = as === "nav" ? m.nav : m.div;

	return (
		<Component
			initial={prefersReducedMotion ? false : { y: 100, opacity: 0 }}
			animate={isHidden ? { y: 100, opacity: 0 } : { y: 0, opacity: 1 }}
			transition={prefersReducedMotion ? { duration: 0 } : MOTION_CONFIG.spring.bar}
			aria-label={ariaLabel}
			data-hide-on-keyboard=""
			{...(isHidden && { inert: true })}
			className={cn(
				breakpointClass,
				"fixed right-0 bottom-0 left-0",
				zIndex,
				"pb-[env(safe-area-inset-bottom)]",
				// bg-background/80 acts as fallback when backdrop-filter is unsupported;
				// stronger blur + lower opacity produces the native iOS Tab Bar material.
				"bg-background/80 backdrop-blur-xl",
				"border-border/60 border-t",
				"shadow-[0_-0.5px_0_oklch(0_0_0/0.06)]",
				isHidden && "pointer-events-none",
				className,
			)}
		>
			{children}
		</Component>
	);
}
