"use client";

import type { ReactNode } from "react";
import { Check, MoreVertical } from "lucide-react";
import { m, useReducedMotion } from "motion/react";

import { useBulkSelectionContextOptional } from "@/shared/components/data-table";
import {
	LongPressMenuLink,
	type LongPressMenuLinkProps,
} from "@/shared/components/long-press-menu-link";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";

type LongPressProps = Omit<LongPressMenuLinkProps, "children" | "affordance">;

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
	/**
	 * Affiche un MoreVertical discret en haut-droite de la card pour signaler
	 * la disponibilité du long-press menu (découvrabilité). Caché en
	 * `selectionMode` (la checkbox prend le relais visuel). Default `true`.
	 * Ignoré si `longPressProps` est omis (pas de menu à signaler).
	 */
	showAffordance?: boolean;
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
 * **Note design — long-press en mode ON :** intentionnellement désactivé en mode
 * sélection (le `<button role="checkbox">` capture le tap exclusif). Parité iOS
 * Mail : une fois en sélection, tap = toggle, pas de menu d'actions. L'admin
 * sort du mode (Annuler / back-button / Escape / swipe-right) pour retrouver le
 * menu long-press.
 *
 * Si aucun `BulkSelectionProvider` n'est trouvé en parent (composant utilisé hors
 * admin), comportement = mode OFF.
 */
export function MobileSelectableCard({
	id,
	itemLabel,
	longPressProps,
	showAffordance = true,
	children,
}: MobileSelectableCardProps) {
	const ctx = useBulkSelectionContextOptional();
	const prefersReducedMotion = useReducedMotion();
	const selectionMode = ctx?.selectionMode ?? false;
	const isSelected = ctx?.isSelected(id) ?? false;

	if (!selectionMode || !ctx) {
		return longPressProps ? (
			<LongPressMenuLink
				{...longPressProps}
				affordance={
					showAffordance ? (
						<MoreVertical
							aria-hidden="true"
							className="text-muted-foreground/40 pointer-events-none absolute top-2 right-2 size-4 motion-safe:transition-opacity"
						/>
					) : undefined
				}
			>
				{children}
			</LongPressMenuLink>
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
			onClick={() => {
				triggerHaptic("selection");
				ctx.toggle(id);
			}}
			className={cn(
				"focus-ring relative flex min-h-11 w-full items-center gap-3 rounded-lg text-left",
				"transform-gpu active:scale-[0.985] motion-safe:transition-[background-color,box-shadow] motion-safe:duration-150",
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
