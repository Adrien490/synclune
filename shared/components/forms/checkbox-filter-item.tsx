"use client";

import { Checkbox } from "@/shared/components/ui/checkbox";
import { cn } from "@/shared/utils/cn";
import { type ReactNode } from "react";

interface CheckboxFilterItemProps {
	id: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	children: ReactNode;
	description?: string;
	/**
	 * Indicateur visuel optionnel (ex: pastille de couleur, icone)
	 */
	indicator?: ReactNode;
	/**
	 * Compteur optionnel (ex: nombre de produits)
	 */
	count?: number;
	/**
	 * Signal d'INTENTION — survol ou focus, avant tout clic.
	 *
	 * Sert au préchargement de la route qu'une coche va ouvrir (filtre « type »
	 * du catalogue, seul filtre qui change de path). Doit rester idempotent et
	 * sans effet visible : il peut se déclencher plusieurs fois, et ne jamais
	 * être suivi d'un clic.
	 */
	onIntent?: () => void;
}

/**
 * Composant checkbox avec zone de touch etendue (44px min) pour les filtres.
 * Conforme WCAG pour l'accessibilite mobile.
 */
export function CheckboxFilterItem({
	id,
	checked,
	onCheckedChange,
	children,
	description,
	indicator,
	count,
	onIntent,
}: CheckboxFilterItemProps) {
	return (
		<label
			htmlFor={id}
			// Le SURVOL porte sur la rangée entière — c'est elle que la souris vise.
			// Sur tactile il n'y a pas de survol : `onPointerDown` précède le clic
			// d'assez pour valoir un temps d'avance.
			// ⚠️ Le pendant clavier (`onFocus`) vit sur la Checkbox, pas ici : un
			// `<label>` n'est pas focusable, et `jsx-a11y` refuse à juste titre un
			// gestionnaire de focus sur un élément non interactif.
			onPointerEnter={onIntent}
			onPointerDown={onIntent}
			className={cn(
				"-mx-3 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5",
				"transition-colors duration-150",
				// Parité survol ⇔ focus SANS anneau de ligne : la Checkbox interne porte
				// déjà l'utilitaire SSOT focus-ring (outline --foreground). L'ancien
				// anneau de ligne doublait celui du contrôle en rose 1,55:1 et
				// survivait au clic souris (déclenché au focus, pas au focus clavier).
				"can-hover:hover:bg-accent/50 has-focus-visible:bg-accent/50",
				checked && "bg-primary/5",
			)}
		>
			{/* `aria-labelledby` EXPLICITE, posé dès le SSR : un `<label>` HTML ne
			    nomme pas un `role="checkbox"` (le span Base UI n'est pas labelable),
			    et Base UI ne câble sa liaison — le même id `${id}-label` — qu'à
			    l'hydratation. Entre les deux, la case était sans nom (axe
			    `aria-toggle-field-name`, attrapé par l'audit du catalogue au lot 7). */}
			<Checkbox
				id={id}
				aria-labelledby={`${id}-label`}
				checked={checked}
				onCheckedChange={onCheckedChange}
				onFocus={onIntent}
				className="shrink-0"
			/>
			<div className="flex min-w-0 flex-1 items-center gap-2">
				{indicator && (
					// `flex` et non un simple `shrink-0` : ce wrapper est blockifié (flex
					// item) mais son ENFANT resterait inline — un `<span size-6>` de
					// pastille se peignait 2 px de large, `width` ignorée (boîte inline).
					<span className="flex shrink-0 items-center" aria-hidden="true">
						{indicator}
					</span>
				)}
				<div className="min-w-0 flex-1">
					<span id={`${id}-label`} className="text-sm font-normal">
						{children}
					</span>
					{description && (
						<span className="text-muted-foreground mt-0.5 block text-xs">{description}</span>
					)}
				</div>
				{count !== undefined && (
					<span className="text-muted-foreground shrink-0 text-xs">({count})</span>
				)}
			</div>
		</label>
	);
}
