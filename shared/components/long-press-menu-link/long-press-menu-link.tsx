"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { useState, type ReactNode } from "react";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	type ActionMenuSection,
} from "@/shared/components/responsive-action-menu";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useLongPress } from "@/shared/hooks/use-long-press";
import { cn } from "@/shared/utils/cn";

export interface LongPressMenuLinkProps {
	/** Destination de la navigation au tap simple (Next.js `<Link>`). */
	href: string;
	/** Label accessible appliqué au Link (lu par les screen readers). */
	ariaLabel: string;
	/** Sections d'actions identiques aux *-row-actions desktop. */
	sections: ActionMenuSection[];
	/** Titre rendu en haut du menu mobile / aria-label desktop. */
	menuTitle: string;
	/** Sous-titre optionnel sous le titre (mobile uniquement). */
	menuDescription?: string;
	/** Classes Tailwind appliquées au Link wrapper. */
	className?: string;
	/** Contenu visuel de la card. */
	children: ReactNode;
	/** Désactive l'ouverture du menu au long-press. @default false */
	disabled?: boolean;
	/** Forwarded à `<Link prefetch>`. */
	prefetch?: boolean | null;
	/** Nom de View Transition propagé sur le Link pour morph card → page détail. */
	viewTransitionName?: string;
}

/**
 * Overlay rendu uniquement pendant la navigation (Next.js `useLinkStatus`).
 * Doit être un descendant direct du `<Link>` parent.
 */
function LinkPendingOverlay() {
	const { pending } = useLinkStatus();
	if (!pending) return null;
	return (
		<span
			aria-hidden="true"
			className="bg-foreground/5 motion-safe:animate-in motion-safe:fade-in pointer-events-none absolute inset-0 rounded-[inherit] [animation-delay:120ms] [animation-fill-mode:backwards] motion-safe:duration-200"
		/>
	);
}

/**
 * Card admin mobile combinant :
 * - **Tap simple** → navigation `<Link>` Next.js (prefetch + cmd-click natifs) avec haptic `light`.
 * - **Long-press 500ms** → ouverture programmatique de `ResponsiveActionMenu`
 *   avec parité d'actions vs `*-row-actions` desktop, haptic `medium`.
 *
 * Le `firedRef` interne du hook `useLongPress` supprime automatiquement le
 * synthetic click qui suit un long-press (`preventDefault()` + `stopPropagation()`),
 * donc `onClick` ne se déclenche que sur les vrais taps.
 */
export function LongPressMenuLink({
	href,
	ariaLabel,
	sections,
	menuTitle,
	menuDescription,
	className,
	children,
	disabled = false,
	prefetch,
	viewTransitionName,
}: LongPressMenuLinkProps) {
	const [open, setOpen] = useState(false);
	const haptic = useHaptic();

	const { bind } = useLongPress(
		() => {
			if (disabled) return;
			setOpen(true);
		},
		{
			haptic: "medium",
			onClick: () => haptic("light"),
		},
	);

	return (
		<>
			<Link
				href={href}
				aria-label={ariaLabel}
				prefetch={prefetch}
				{...bind}
				style={viewTransitionName ? { ...bind.style, viewTransitionName } : bind.style}
				className={cn(
					"focus-visible:ring-primary relative block w-full rounded-lg",
					"focus-visible:ring-2 focus-visible:outline-none",
					"transform-gpu active:scale-[0.98] motion-safe:transition-transform motion-safe:duration-150",
					className,
				)}
			>
				{children}
				<LinkPendingOverlay />
			</Link>

			<ResponsiveActionMenu open={open} onOpenChange={setOpen}>
				<ResponsiveActionMenuContent
					title={menuTitle}
					description={menuDescription}
					sections={sections}
				/>
			</ResponsiveActionMenu>
		</>
	);
}
