"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	type ActionMenuSection,
} from "@/shared/components/responsive-action-menu";
import { useLongPress } from "@/shared/hooks/use-long-press";
import { cn } from "@/shared/utils/cn";

interface LongPressMenuLinkProps {
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
}

/**
 * Card admin mobile combinant :
 * - **Tap simple** → navigation `<Link>` Next.js vers `href` (prefetch + cmd-click natifs).
 * - **Long-press 500ms** → ouverture programmatique de `ResponsiveActionMenu`
 *   avec parité d'actions vs `*-row-actions` desktop.
 *
 * Le `firedRef` interne du hook `useLongPress` supprime automatiquement le
 * synthetic click qui suit un long-press (`preventDefault()` + `stopPropagation()`)
 * — donc pas besoin de wrapper `onClick` ici, le `<Link>` reçoit l'event natif.
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
}: LongPressMenuLinkProps) {
	const [open, setOpen] = useState(false);

	const { bind } = useLongPress(
		() => {
			if (disabled) return;
			setOpen(true);
		},
		{ haptic: "medium" },
	);

	return (
		<>
			<Link
				href={href}
				aria-label={ariaLabel}
				prefetch={prefetch}
				{...bind}
				className={cn(
					"focus-visible:ring-primary block w-full rounded-lg",
					"focus-visible:ring-2 focus-visible:outline-none",
					"transform-gpu active:scale-[0.98] motion-safe:transition-transform motion-safe:duration-150",
					className,
				)}
			>
				{children}
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
