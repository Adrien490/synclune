"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { Search, X } from "lucide-react";
import type { ReactNode } from "react";

// ============================================================================
// FILTER SECTION (accordéon)
// ============================================================================

interface FilterSectionProps {
	/** Valeur stable de l'AccordionItem (identifiant DOM). */
	value: string;
	label: string;
	/** Nombre de filtres actifs : affiche le badge + le bouton reset si > 0. */
	count: number;
	/** Contenu personnalisé du badge (ex: "50€ - 200€"). Défaut : `count`. */
	badgeContent?: ReactNode;
	onReset: () => void;
	children: ReactNode;
	/** Classe additionnelle sur l'AccordionItem (ex: `border-b-0` pour le dernier). */
	className?: string;
}

/**
 * Section repliable du filtre produit : en-tête (libellé + badge + reset) puis
 * contenu.
 *
 * Le bouton de réinitialisation est un `<button>` **frère** de
 * l'`AccordionTrigger`, jamais imbriqué dans son `<button>` : un élément
 * interactif descendant d'un `<button>` est du HTML invalide et crée un
 * tab-stop parasite. Il est positionné en absolu sur la ligne d'en-tête.
 */
export function FilterSection({
	value,
	label,
	count,
	badgeContent,
	onReset,
	children,
	className,
}: FilterSectionProps) {
	const hasActive = count > 0;

	return (
		<AccordionItem value={value} className={className}>
			<div className="relative">
				<AccordionTrigger headingLevel={3} className="hover:no-underline">
					<span className="flex flex-1 items-center gap-2 pr-9">
						<span>{label}</span>
						{hasActive && (
							<Badge variant="secondary" className="h-5 px-1.5 text-xs font-semibold">
								{badgeContent ?? count}
							</Badge>
						)}
					</span>
				</AccordionTrigger>
				{hasActive && (
					<button
						type="button"
						onClick={onReset}
						className="text-muted-foreground can-hover:hover:text-destructive can-hover:hover:bg-destructive/10 focus-ring absolute top-1/2 right-8 flex size-11 -translate-y-1/2 items-center justify-center rounded-md transition-colors"
						aria-label={`Effacer le filtre ${label}`}
					>
						<X className="size-3" aria-hidden="true" />
					</button>
				)}
			</div>
			<AccordionContent>{children}</AccordionContent>
		</AccordionItem>
	);
}

// ============================================================================
// SECTION SEARCH
// ============================================================================

interface SectionSearchProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
}

/**
 * Champ de recherche affiché en tête des sections de filtre longues
 * (couleurs / matériaux au-delà de {@link SEARCH_THRESHOLD} entrées).
 */
export function SectionSearch({
	value,
	onChange,
	placeholder = "Rechercher…",
}: SectionSearchProps) {
	return (
		<div className="relative mb-2">
			<Search
				className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
				aria-hidden="true"
			/>
			<Input
				type="search"
				inputMode="search"
				enterKeyHint="search"
				autoComplete="off"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				aria-label={placeholder}
				className="h-10 pr-3 pl-8 text-xs"
			/>
		</div>
	);
}

// Threshold for showing search input in filter sections
export const SEARCH_THRESHOLD = 8;
