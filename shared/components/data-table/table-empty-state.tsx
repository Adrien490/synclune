import {
	Empty,
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
	/** Icône à afficher (composant Lucide) */
	icon: LucideIcon;
	/** Titre de l'état vide */
	title: string;
	/** Description de l'état vide */
	description: string;
	/** Action optionnelle (bouton) */
	action?: {
		/** Label du bouton */
		label: string;
		/** URL de destination */
		href: string;
	};
	/** Classe CSS additionnelle */
	className?: string;
}

/**
 * Composant d'état vide standardisé pour les data tables admin
 *
 * @example
 * ```tsx
 * <TableEmptyState
 *   icon={ShoppingBag}
 *   title="Aucune commande trouvée"
 *   description="Aucune commande ne correspond aux critères de recherche."
 *   action={{ label: "Créer une commande", href: "/admin/commandes/nouveau" }}
 * />
 * ```
 */
export function TableEmptyState({
	icon: Icon,
	title,
	description,
	action,
	className = "py-12",
}: TableEmptyStateProps) {
	return (
		<Empty className={className}>
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<Icon />
				</EmptyMedia>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>
			{action && (
				<EmptyContent>
					<Button asChild>
						<Link href={action.href}>{action.label}</Link>
					</Button>
				</EmptyContent>
			)}
		</Empty>
	);
}
