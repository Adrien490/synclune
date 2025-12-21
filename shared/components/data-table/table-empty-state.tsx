import {
	Empty,
	EmptyActions,
	EmptyContent,
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
	/** Description de l'etat vide */
	description: string;
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
	action,
	actionElement,
	className,
}: TableEmptyStateProps) {
	return (
		<Empty size="lg" className={className}>
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<Icon />
				</EmptyMedia>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>
			{(action || actionElement) && (
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
