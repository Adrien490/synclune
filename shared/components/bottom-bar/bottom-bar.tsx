"use client";

import type { ReactNode } from "react";
import { m, useReducedMotion } from "motion/react";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { useKeyboardOpen } from "@/shared/components/visual-viewport-bridge";
import { useBottomBarHeight } from "@/shared/hooks";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { mediaBelow } from "@/shared/constants/breakpoints";
import { cn } from "@/shared/utils/cn";
// Les constantes de classes vivent dans `./bottom-bar.styles` : un fichier de
// composants qui exporte aussi des non-composants casse le Fast Refresh
// (rechargement complet au lieu de la préservation d'état).

// ---------------------------------------------------------------------------
// ActiveDot
// ---------------------------------------------------------------------------

/** Small dot indicator shown above the active item. */
export function ActiveDot() {
	return (
		<span
			className="bg-primary motion-safe:animate-in motion-safe:zoom-in-50 absolute -top-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full duration-200"
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
	/**
	 * Breakpoint at and above which the bar is hidden. Drives BOTH the Tailwind
	 * hide class (`md:hidden` / `lg:hidden`) and the `matchMedia` query used to
	 * decide whether to publish `--bottom-bar-height` — the two must never be
	 * derived independently, see {@link mediaBelow}.
	 *
	 * - `"md"` (admin) : la sidebar prend le relais à 48rem.
	 * - `"lg"` (boutique) : la nav desktop prend le relais à 64rem, la bottom-nav
	 *   couvre donc l'iPad portrait (audit responsive 2026-07-26).
	 *
	 * @default "md"
	 */
	breakpoint?: "md" | "lg";
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
 * Slides out automatically when the soft keyboard opens (via {@link useKeyboardOpen},
 * folded into the animation target — the CSS `[data-hide-on-keyboard]` rule alone
 * cannot win against Framer's inline transform). Requires `<VisualViewportBridge />`
 * mounted at the surface root.
 *
 * **Composition tips:**
 * - If you want vertical dividers between items, wrap children in a flex
 *   container with `divide-x divide-border/30`.
 * - Render {@link BottomBarActivePill} only on the active item (with a shared
 *   `groupId`) for iOS-18-style morphing indicator, or {@link ActiveDot} for a
 *   minimal footprint indicator.
 * - For iOS/Android-native feel, call `triggerHaptic("selection")` from
 *   `@/shared/hooks/use-haptic` on tab click.
 * - Use `<CountBadge>` (shared/components/ui/count-badge) for neutral counters
 *   on icon items; use {@link bottomBarBadgeClass} only for destructive-tone
 *   alerts that demand action (e.g. admin orders pending).
 */
export function BottomBar({
	children,
	as = "div",
	breakpoint = "md",
	zIndex = "z-(--z-bar)",
	height = 56,
	enabled = true,
	isHidden = false,
	className,
	"aria-label": ariaLabel,
}: BottomBarProps) {
	// La barre n'est masquée qu'en CSS (`md:hidden`), donc le composant reste
	// monté à toutes les largeurs. Sans cette garde, `--bottom-bar-height` était
	// publiée à 56px sur desktop pour une barre invisible : chaque consommateur
	// devait la neutraliser avec un override `md:` codé en dur, et le premier qui
	// l'oubliait héritait de 56px fantômes (audit responsive 2026-07-26).
	const isBarVisible = useMediaQuery(mediaBelow(breakpoint));
	useBottomBarHeight(height, enabled && !isHidden && isBarVisible);
	const prefersReducedMotion = useReducedMotion();
	// Soft-keyboard open → slide out. The CSS `[data-hide-on-keyboard]` rule is
	// overridden by Framer's inline `transform` in the motion path, so we must
	// fold `keyboardOpen` into the React-driven animation target instead of
	// relying on the attribute alone. (`data-hide-on-keyboard` is kept as a
	// harmless belt-and-suspenders for the reduced-motion path.)
	const keyboardOpen = useKeyboardOpen();
	const hidden = isHidden || keyboardOpen;

	const sharedClassName = cn(
		// Littéraux statiques : Tailwind ne scanne pas les classes construites.
		breakpoint === "lg" ? "lg:hidden" : "md:hidden",
		"fixed right-0 bottom-0 left-0",
		zIndex,
		"pb-[env(safe-area-inset-bottom)]",
		// bg-background/80 acts as fallback when backdrop-filter is unsupported;
		// stronger blur + lower opacity produces the native iOS Tab Bar material.
		"bg-background/80 backdrop-blur-xl",
		"border-border/60 border-t",
		"shadow-[0_-0.5px_0_oklch(0_0_0/0.06)]",
		hidden && "pointer-events-none",
		className,
	);

	// Reduced-motion: skip Framer entirely. No entrance spring, no diff/animate
	// overhead; `hidden` attribute snaps the bar instantly when hidden flips
	// (covers isHidden + soft-keyboard).
	if (prefersReducedMotion) {
		const commonProps = {
			"aria-label": ariaLabel,
			"data-hide-on-keyboard": "",
			hidden,
			...(hidden && { inert: true }),
			className: sharedClassName,
		};
		return as === "nav" ? (
			<nav {...commonProps}>{children}</nav>
		) : (
			<div {...commonProps}>{children}</div>
		);
	}

	const Component = as === "nav" ? m.nav : m.div;

	return (
		<Component
			initial={{ y: "100%", opacity: 0 }}
			animate={hidden ? { y: "100%", opacity: 0 } : { y: 0, opacity: 1 }}
			transition={MOTION_CONFIG.spring.bar}
			aria-label={ariaLabel}
			data-hide-on-keyboard=""
			{...(hidden && { inert: true })}
			className={sharedClassName}
		>
			{children}
		</Component>
	);
}
