import {
	Empty,
	EmptyActions,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import { Button } from "@/shared/components/ui/button";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export interface TableEmptyStateProps {
	/** Icone a afficher (composant Lucide) */
	icon: LucideIcon;
	/** Titre de l'etat vide */
	title: string;
	/** Description de l'etat vide (shown when hasActiveFilters is true or undefined) */
	description: string;
	/** Whether there are active search/filter criteria. When false, shows noItemsDescription instead */
	hasActiveFilters?: boolean;
	/** Description when the table is truly empty (no filters active). Defaults to description. */
	noItemsDescription?: string;
	/** Action optionnelle (bouton avec lien) */
	action?: {
		/** Label du bouton */
		label: string;
		/** URL de destination */
		href: string;
	};
	/** Element d'action personnalise (alternative a action) */
	actionElement?: React.ReactNode;
	/** Classe CSS additionnelle */
	className?: string;
}

/**
 * Composant d'etat vide standardise pour les data tables admin
 *
 * @example
 * ```tsx
 * <TableEmptyState
 *   icon={ShoppingBag}
 *   title="Aucune commande trouvee"
 *   description="Aucune commande ne correspond aux criteres de recherche."
 *   action={{ label: "Creer une commande", href: "/admin/commandes/nouveau" }}
 * />
 * ```
 */
export function TableEmptyState({
	icon: Icon,
	title,
	description,
	hasActiveFilters,
	noItemsDescription,
	action,
	actionElement,
	className,
}: TableEmptyStateProps) {
	const displayDescription =
		hasActiveFilters === false ? (noItemsDescription ?? description) : description;

	return (
		<Empty size="lg" className={className}>
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<Icon />
				</EmptyMedia>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{displayDescription}</EmptyDescription>
			</EmptyHeader>
			{(action ?? actionElement) && (
				<EmptyActions>
					{actionElement ?? (
						<Button asChild>
							<Link href={action!.href}>{action!.label}</Link>
						</Button>
					)}
				</EmptyActions>
			)}
		</Empty>
	);
}
