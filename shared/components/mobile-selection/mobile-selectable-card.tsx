"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { m, useReducedMotion } from "motion/react";

import { useBulkSelectionContextOptional } from "@/shared/components/data-table";
import {
	LongPressMenuLink,
	type LongPressMenuLinkProps,
} from "@/shared/components/long-press-menu-link";
import { cn } from "@/shared/utils/cn";

type LongPressProps = Omit<LongPressMenuLinkProps, "children">;

interface MobileSelectableCardProps {
	/** ID stable de l'item (pour `toggle`/`isSelected`). */
	id: string;
	/** Label accessible court du checkbox (ex: "Anneau doré"). Lu seul par le SR
	 * en mode sélection — les children sont aria-hidden pour éviter le bruit. */
	itemLabel: string;
	/**
	 * Props transmises à `LongPressMenuLink` en mode hors sélection. Si omis,
	 * le composant rend les `children` tels quels en mode OFF (cas des listes
	 * dont les items sont inertes — Reviews — ou ont leur propre wrapper interactif).
	 */
	longPressProps?: LongPressProps;
	children: ReactNode;
}

/**
 * Wrapper qui rend une card admin mobile en deux variantes selon le contexte
 * `BulkSelectionContext.selectionMode` :
 *
 * - **Mode OFF (défaut)** :
 *   - Si `longPressProps` est fourni : `<LongPressMenuLink>` strict — tap = nav,
 *     long-press = menu d'actions par item. Comportement actuel intact.
 *   - Sinon : children rendus directement (item inerte).
 * - **Mode ON** : `<button role="checkbox">` — tap = `toggle(id)`, leading checkbox
 *   visuelle slide-in (Motion `motion-safe`), navigation et long-press désactivés.
 *   Children sont `aria-hidden` pour que VoiceOver ne lise que l'`aria-label` court.
 *   État sélectionné : ring + bg primary + check-circle filled. Pattern Mail iOS.
 *
 * Si aucun `BulkSelectionProvider` n'est trouvé en parent (composant utilisé hors
 * admin), comportement = mode OFF.
 */
export function MobileSelectableCard({
	id,
	itemLabel,
	longPressProps,
	children,
}: MobileSelectableCardProps) {
	const ctx = useBulkSelectionContextOptional();
	const prefersReducedMotion = useReducedMotion();
	const selectionMode = ctx?.selectionMode ?? false;
	const isSelected = ctx?.isSelected(id) ?? false;

	if (!selectionMode || !ctx) {
		return longPressProps ? (
			<LongPressMenuLink {...longPressProps}>{children}</LongPressMenuLink>
		) : (
			<>{children}</>
		);
	}

	return (
		<button
			type="button"
			role="checkbox"
			aria-checked={isSelected}
			aria-label={`${isSelected ? "Désélectionner" : "Sélectionner"} ${itemLabel}`}
			onClick={() => ctx.toggle(id)}
			className={cn(
				"focus-visible:ring-primary relative flex w-full items-center gap-3 rounded-lg text-left",
				"focus-visible:ring-2 focus-visible:outline-none",
				"transform-gpu active:scale-[0.98] motion-safe:transition-[background-color,box-shadow] motion-safe:duration-150",
				isSelected && "bg-primary/5 ring-primary/30 ring-2",
			)}
		>
			<m.span
				aria-hidden="true"
				initial={prefersReducedMotion ? false : { x: -8, opacity: 0 }}
				animate={{ x: 0, opacity: 1 }}
				transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.15, ease: "easeOut" }}
				className={cn(
					"flex size-7 shrink-0 items-center justify-center rounded-full border-2",
					isSelected
						? "bg-primary border-primary text-primary-foreground"
						: "border-muted-foreground/40 bg-background",
				)}
			>
				{isSelected ? <Check className="size-4" strokeWidth={3} /> : null}
			</m.span>
			<m.span
				initial={prefersReducedMotion ? false : { x: -8 }}
				animate={{ x: 0 }}
				transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.15, ease: "easeOut" }}
				aria-hidden="true"
				className="block min-w-0 flex-1"
			>
				{children}
			</m.span>
		</button>
	);
}
