"use client";

import Link from "next/link";
import { useState, type KeyboardEvent, type ReactNode } from "react";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	type ActionMenuSection,
} from "@/shared/components/responsive-action-menu";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useLongPress } from "@/shared/hooks/use-long-press";
import { cn } from "@/shared/utils/cn";

import { LinkPendingOverlay } from "./link-pending-overlay";

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
	/**
	 * Contenu visuel de la card. Rendu **à l'intérieur du `<Link>` (`<a>`)** :
	 * ne doit donc contenir aucun élément interactif (button, a, input) — ce
	 * serait du HTML invalide et casserait le tap. Les actions vivent dans le
	 * menu (`sections`), rendu en portail (Drawer/DropdownMenu), donc exempt.
	 */
	children: ReactNode;
	/** Nom de View Transition propagé sur le Link pour morph card → page détail. */
	viewTransitionName?: string;
	/**
	 * Affordance visuelle optionnelle (ex: `<MoreVertical>` d'aide à la
	 * discoverabilité du long-press). Rendue absolute dans le Link wrapper.
	 * Doit être `pointer-events-none` côté consommateur — c'est purement visuel.
	 */
	affordance?: ReactNode;
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
 *
 * **Accessibilité — tactile-first.** Le long-press est tactile (`useLongPress`).
 * Au clavier, le menu s'ouvre via les raccourcis OS standard `ContextMenu` /
 * `Shift+F10` (cf. `handleKeyDown`). Les mêmes actions restent par ailleurs
 * opérables sans tactile via la page détail (`*-detail-header.tsx`) et la table
 * desktop (`*-row-actions.tsx`) — toutes alimentées par le même hook `use*Actions`.
 */
export function LongPressMenuLink({
	href,
	ariaLabel,
	sections,
	menuTitle,
	menuDescription,
	className,
	children,
	viewTransitionName,
	affordance,
}: LongPressMenuLinkProps) {
	const [open, setOpen] = useState(false);
	const haptic = useHaptic();

	const { bind } = useLongPress(() => setOpen(true), {
		haptic: "medium",
		onClick: () => haptic("light"),
	});

	// Escape clavier : raccourcis OS standard d'ouverture de menu contextuel
	// (WAI-ARIA). preventDefault pour bloquer le menu natif du navigateur.
	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
			e.preventDefault();
			haptic("medium");
			setOpen(true);
		}
	};

	return (
		<>
			<Link
				href={href}
				aria-label={ariaLabel}
				{...bind}
				onKeyDown={handleKeyDown}
				style={viewTransitionName ? { ...bind.style, viewTransitionName } : bind.style}
				className={cn(
					"focus-visible:ring-primary relative block w-full rounded-lg",
					"focus-visible:ring-2 focus-visible:outline-none",
					"transform-gpu active:scale-[0.98] motion-safe:transition-transform motion-safe:duration-150",
					className,
				)}
			>
				{children}
				{affordance}
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
