import { Sparkles } from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
	Empty,
	EmptyActions,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/empty";

export interface EmptyFirstUseProps {
	/** Titre de l'etat vide */
	title: string;
	/** Description de l'etat vide */
	description: string;
	/** Icone a afficher (defaut: Sparkles) */
	icon?: LucideIcon;
	/** Action principale */
	action: {
		/** Label du bouton */
		label: string;
		/** URL de destination */
		href: string;
	};
	/** Action secondaire optionnelle */
	secondaryAction?: {
		/** Label du lien */
		label: string;
		/** URL de destination */
		href: string;
	};
	/** Classe CSS additionnelle */
	className?: string;
}

/**
 * Composant d'etat vide pour le premier usage (onboarding)
 *
 * @example
 * ```tsx
 * <EmptyFirstUse
 *   title="Bienvenue !"
 *   description="Commencez par creer votre premier produit."
 *   action={{ label: "Creer un produit", href: "/admin/produits/nouveau" }}
 * />
 * ```
 */
export function EmptyFirstUse({
	title,
	description,
	icon: Icon = Sparkles,
	action,
	secondaryAction,
	className,
}: EmptyFirstUseProps) {
	return (
		<Empty size="lg" className={className}>
			<EmptyHeader>
				<EmptyMedia>
					<Icon />
				</EmptyMedia>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>
			<EmptyActions>
				<Button asChild variant="primary">
					<Link href={action.href}>{action.label}</Link>
				</Button>
				{secondaryAction && (
					<Button asChild variant="outline">
						<Link href={secondaryAction.href}>{secondaryAction.label}</Link>
					</Button>
				)}
			</EmptyActions>
		</Empty>
	);
}
