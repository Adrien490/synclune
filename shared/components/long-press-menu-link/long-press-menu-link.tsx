"use client";

import Link from "next/link";
import { EllipsisVertical } from "lucide-react";
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
	 * Remplace l'indice visuel de long-press par défaut. Rendu absolute dans le
	 * Link wrapper, donc doit être `pointer-events-none` — c'est purement visuel.
	 *
	 * Passer `null` retire l'indice (à ne faire que si la carte porte déjà son
	 * propre repère visuel : sans indice, le menu d'actions devient un geste de
	 * 500 ms invisible).
	 */
	affordance?: ReactNode;
}

/**
 * Indice visuel par défaut : un chevron d'actions à droite de la carte.
 *
 * **Pourquoi c'est un défaut et non une option.** Cet indice a d'abord été un prop
 * facultatif — construit, testé, documenté, et passé par **zéro** des 10 listes
 * admin mobiles. Le menu d'actions y était donc accessible uniquement par un
 * appui long de 500 ms que rien à l'écran n'annonçait. Un mécanisme de
 * découvrabilité qu'il faut penser à activer ne l'est jamais : il est désormais
 * rendu par défaut, et son retrait doit être explicite (`affordance={null}`).
 */
export function DefaultLongPressAffordance() {
	return (
		<EllipsisVertical
			className="text-muted-foreground/50 pointer-events-none absolute top-1/2 right-1 size-4 -translate-y-1/2"
			aria-hidden="true"
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
 *
 * **Découvrabilité.** Un chevron d'actions est rendu par défaut à droite de la
 * carte (`DefaultLongPressAffordance`) : sans lui, le menu n'était atteignable que
 * par un appui long de 500 ms que rien n'annonçait à l'écran.
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

	// `undefined` → indice par défaut ; `null` → retrait explicite par le consommateur.
	const usesDefaultAffordance = affordance === undefined;

	const { bind } = useLongPress(() => setOpen(true), {
		haptic: "medium",
		onClick: () => haptic("light"),
	});

	// Escape clavier : raccourcis OS standard d'ouverture de menu contextuel
	// (WAI-ARIA). preventDefault pour bloquer le menu natif du navigateur.
	// Pas d'haptique ici : le chemin est CLAVIER, pas tactile.
	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
			e.preventDefault();
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
					// L'indice est positionné en absolute : sans réserve à droite, il
					// chevaucherait le contenu de la carte (titres tronqués, badges).
					usesDefaultAffordance && "pr-5",
					className,
				)}
			>
				{children}
				{usesDefaultAffordance ? <DefaultLongPressAffordance /> : affordance}
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
