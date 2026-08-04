"use client";

import { useRef, useState, type ReactNode } from "react";
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
 *   <li key={item.href} className="flex-1">
 *     <Link href={item.href} className={bottomBarItemClass}>
 *       {isActive(item) && <BottomBarActivePill groupId="shop-nav" />}
 *       <Icon className={bottomBarIconClass} />
 *       <span className={bottomBarLabelClass}>{item.label}</span>
 *     </Link>
 *   </li>
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
	/**
	 * Height in px used as a **fallback until the bar has been measured** — la
	 * hauteur publiée dans `--bottom-bar-height` est celle de l'élément réel
	 * (`offsetHeight`), pas cette valeur. Ce n'est donc pas une hypothèse sur la
	 * hauteur de la barre : c'est ce qui tient lieu de mesure au premier effet et
	 * dans les environnements sans layout (jsdom). Doit rester d'accord avec le
	 * `h-14` de `bottomBarContainerClass` — verrouillé par
	 * `bottom-bar-height-contract.regression.test.ts`.
	 *
	 * @default 56
	 */
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
 * Publishes its **measured** height in the shared `--bottom-bar-height` CSS
 * variable so scroll containers and sticky elements (FABs, banners, toaster) can
 * offset themselves above it. That value is the *total* occupied height,
 * `env(safe-area-inset-bottom)` included — consumers add their own breathing room
 * (`+ 1rem`) and **never** re-add the safe-area inset. Handles iOS
 * safe-area insets (bottom + sides), backdrop blur with an *opaque* fallback,
 * slide-out hide state (with `inert`), and entrance spring.
 *
 * Slides out automatically when the soft keyboard opens (via {@link useKeyboardOpen},
 * folded into the animation target — the CSS `[data-hide-on-keyboard]` rule alone
 * cannot win against Framer's inline transform). Requires `<VisualViewportBridge />`
 * mounted at the surface root.
 *
 * **Composition tips:**
 * - Wrap items in a `<ul role="list">` carrying {@link bottomBarContainerClass},
 *   one `<li className="flex-1">` per tab, so screen readers announce the item count.
 * - Render {@link BottomBarActivePill} only on the active item (with a shared
 *   `groupId`) for the iOS-18-style morphing indicator.
 * - For iOS/Android-native feel, call `triggerHaptic("selection")` from
 *   `@/shared/hooks/use-haptic` on tab change (skip it when the tab is already active).
 * - Use `<CountBadge>` (shared/components/ui/count-badge) for counters on icon
 *   items — it carries the correct live-region pattern; use {@link bottomBarBadgeClass}
 *   only for destructive-tone alerts that demand action (e.g. admin orders pending).
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
	const barRef = useRef<HTMLElement | null>(null);
	// La barre n'est masquée qu'en CSS (`md:hidden`), donc le composant reste
	// monté à toutes les largeurs. Sans cette garde, `--bottom-bar-height` était
	// publiée pour une barre invisible : chaque consommateur devait la neutraliser
	// avec un override `md:` codé en dur, et le premier qui l'oubliait héritait
	// d'une hauteur fantôme (audit responsive 2026-07-26).
	const isBarVisible = useMediaQuery(mediaBelow(breakpoint));
	const prefersReducedMotion = useReducedMotion();
	// Soft-keyboard open → slide out. The CSS `[data-hide-on-keyboard]` rule is
	// overridden by Framer's inline `transform` in the motion path, so we must
	// fold `keyboardOpen` into the React-driven animation target instead of
	// relying on the attribute alone. (`data-hide-on-keyboard` is kept as a
	// harmless belt-and-suspenders for the reduced-motion path.)
	const keyboardOpen = useKeyboardOpen();
	const hidden = isHidden || keyboardOpen;

	// La hauteur reste publiée pendant TOUTE la sortie, pas seulement jusqu'à ce
	// que `hidden` bascule : la barre met un ressort à sortir, et désenregistrer
	// tout de suite faisait redescendre toaster / bandeau cookies / FAB sur une
	// barre encore bien visible pendant ~300 ms. `slidOut` n'est vrai qu'une fois
	// l'animation de sortie terminée. Initialisé à `hidden` pour le montage direct
	// sur une route masquée, où la cible égale l'état initial et où
	// `onAnimationComplete` peut donc ne jamais se déclencher.
	const [slidOut, setSlidOut] = useState(hidden);
	const [prevHidden, setPrevHidden] = useState(hidden);
	if (prevHidden !== hidden) {
		setPrevHidden(hidden);
		// À l'entrée, la barre occupe l'espace dès la première frame de remontée :
		// réserver immédiatement évite que les dépendants soient recouverts.
		if (!hidden) setSlidOut(false);
	}

	// Chemin reduced-motion : pas d'animation, donc rien à différer.
	const occupiesSpace = prefersReducedMotion ? !hidden : !slidOut;
	useBottomBarHeight(barRef, {
		fallback: height,
		enabled: enabled && isBarVisible && occupiesSpace,
	});

	const sharedClassName = cn(
		// Littéraux statiques : Tailwind ne scanne pas les classes construites.
		breakpoint === "lg" ? "lg:hidden" : "md:hidden",
		"fixed right-0 bottom-0 left-0",
		zIndex,
		// Encoche : le fond continue de courir jusqu'aux bords, seul le contenu
		// s'insère. En paysage iPhone la barre boutique reste montée (844px < 64rem)
		// et les onglets extrêmes tombaient sous l'encoche / le coin arrondi.
		"pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]",
		// Le repli sans `backdrop-filter` doit être OPAQUE : un fond à 20 % de
		// transparence *sans flou* laisse passer la photo produit derrière des
		// libellés `text-xs text-muted-foreground` et tombe sous 4.5:1 (WCAG 1.4.3).
		// Avec flou, `/80` produit le matériau de la Tab Bar iOS.
		"bg-background supports-[backdrop-filter]:bg-background/80 backdrop-blur-xl",
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
			<nav ref={barRef} {...commonProps}>
				{children}
			</nav>
		) : (
			// `barRef` est typé `HTMLElement` (contrat du hook de mesure), l'élément
			// concret est décidé par `as` juste au-dessus.
			<div ref={barRef as React.Ref<HTMLDivElement>} {...commonProps}>
				{children}
			</div>
		);
	}

	// Branches explicites plutôt qu'un `Component = as === "nav" ? m.nav : m.div` :
	// l'union des deux composants ne peut pas accepter un même `ref` typé.
	const motionProps = {
		initial: { y: "100%", opacity: 0 },
		animate: hidden ? { y: "100%", opacity: 0 } : { y: 0, opacity: 1 },
		transition: MOTION_CONFIG.spring.bar,
		onAnimationComplete: () => {
			if (hidden) setSlidOut(true);
		},
		"aria-label": ariaLabel,
		"data-hide-on-keyboard": "",
		...(hidden && { inert: true }),
		className: sharedClassName,
	};

	return as === "nav" ? (
		<m.nav ref={barRef} {...motionProps}>
			{children}
		</m.nav>
	) : (
		<m.div ref={barRef as React.Ref<HTMLDivElement>} {...motionProps}>
			{children}
		</m.div>
	);
}
