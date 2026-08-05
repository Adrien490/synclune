"use client";

import { XIcon } from "@phosphor-icons/react/ssr";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/utils/cn";
import type { ReactNode } from "react";

// `import type` seulement : `product-filter-compartments` importe CE fichier, un
// import de valeur créerait un cycle. Le type, lui, est effacé à la compilation.
import type { FilterHost } from "./product-filter-compartments";

// ============================================================================
// TYPES
// ============================================================================

interface FilterCompartmentProps {
	/**
	 * Hôte de rendu. Il dérive DEUX choses, et c'est pour ça qu'il est un seul
	 * prop plutôt que deux : la portée des `id` et la gouttière de l'en-tête
	 * collant. Les deux hôtes coexistent dans le même document (le rail est
	 * masqué en CSS, pas démonté), donc un `filter-compartment-colors` nu était
	 * présent deux fois et chaque `aria-labelledby` résolvait vers la copie du
	 * rail.
	 */
	host: FilterHost;
	/** Identifiant de section, non préfixé (ex. « colors »). */
	id: string;
	label: string;
	/** Nombre de filtres actifs : affiche le badge + le bouton reset si > 0. */
	count: number;
	/** Contenu personnalisé du badge (ex: "50€ - 200€"). Défaut : `count`. */
	badgeContent?: ReactNode;
	/**
	 * Aplat d'accent (SSOT `FILTER_SECTION_ACCENTS`) : trait dans l'en-tête +
	 * fond du badge, encre `--foreground`.
	 */
	accent?: string;
	onReset: () => void;
	children: ReactNode;
	className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Compartiment du panneau de filtres (« Le trieur ») : rien ne se replie, ce
 * sont les LISTES qui se bornent (cf. `FilterOverflowList`).
 *
 * L'en-tête est collant dans la zone de défilement (32 px, capitales, fond
 * translucide + blur) : on sait toujours dans quel critère on est.
 *
 * Le bouton reset est un frère de l'en-tête `<h3>`, jamais un descendant d'un
 * bouton (HTML invalide) ; sa zone tactile est étendue à 44 px par pseudo-
 * élément, comme les poignées du slider.
 */
export function FilterCompartment({
	host,
	id,
	label,
	count,
	badgeContent,
	accent,
	onReset,
	children,
	className,
}: FilterCompartmentProps) {
	const hasActive = count > 0;
	const headingId = `filter-compartment-${host}-${id}`;

	return (
		<section aria-labelledby={headingId} className={className}>
			{/*
			 * La gouttière vient de l'hôte via `--filter-gutter`, jamais d'un `-mx-6`
			 * en dur : ce débord est juste pour le panneau (dont le conteneur de
			 * défilement a `px-6`), mais dans le rail il faisait dépasser la bande de
			 * 24 px de chaque côté — et comme le rail est `overflow-y-auto`, CSS
			 * promeut alors `overflow-x` à `auto` : la colonne devenait scrollable
			 * horizontalement.
			 */}
			<div className="bg-background/92 sticky top-0 z-10 mx-[calc(-1*var(--filter-gutter))] flex h-8 items-center gap-2 px-[var(--filter-gutter)] backdrop-blur-sm">
				{accent && (
					<span
						className={cn("h-[0.1875rem] w-4 shrink-0 rounded-full", accent)}
						aria-hidden="true"
					/>
				)}
				<h3
					id={headingId}
					className="text-muted-foreground text-[0.625rem] font-semibold tracking-[0.09em] uppercase"
				>
					{label}
				</h3>
				{hasActive && (
					<Badge
						variant="secondary"
						className={cn(
							"h-5 px-1.5 text-xs font-semibold",
							// Aplat d'accent + encre --foreground : le seul registre où les
							// pastels passent AA (7,85-12,68:1, cf. catalog-accents SSOT).
							accent && cn(accent, "text-foreground border-transparent"),
						)}
					>
						{badgeContent ?? count}
					</Badge>
				)}
				{hasActive && (
					<button
						type="button"
						onClick={onReset}
						className="text-muted-foreground can-hover:hover:text-destructive can-hover:hover:bg-destructive/10 focus-ring relative ml-auto flex size-8 shrink-0 items-center justify-center rounded-md transition-colors before:absolute before:-inset-1.5 before:content-['']"
						aria-label={`Effacer le filtre ${label}`}
					>
						<XIcon className="size-3" aria-hidden="true" />
					</button>
				)}
			</div>
			<div className="pt-2">{children}</div>
		</section>
	);
}
