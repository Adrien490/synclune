import { Sparkles } from "lucide-react";
import Link from "next/link";

import type { GetProductReturn } from "@/modules/products/types/product.types";
import { Reveal } from "@/shared/components/animations/reveal";
import { Button } from "@/shared/components/ui/button";

interface ProductCustomizationLinkProps {
	product: GetProductReturn;
}

/**
 * ProductCustomizationLink - CTA secondaire vers le flow de personnalisation
 *
 * Ouvre une porte de sortie éditoriale pour les clients qui veulent un bijou
 * unique, tout en laissant le CTA primaire « Ajouter au panier » dominant.
 *
 * Le lien pré-alimente le formulaire `/personnalisation` avec le slug du produit
 * source et le type (ex: bague) pour que le devis démarre avec du contexte.
 */
export function ProductCustomizationLink({ product }: ProductCustomizationLinkProps) {
	const typeParam = product.type?.slug ? `&type=${product.type.slug}` : "";
	const href = `/personnalisation?inspiredBy=${product.slug}${typeParam}#form`;

	return (
		<Reveal y={12} amount={0.4}>
			<div className="space-y-1.5">
				<Button
					asChild
					variant="outline"
					size="lg"
					className="w-full gap-2 font-medium lg:max-w-md"
				>
					<Link href={href} prefetch>
						<Sparkles className="h-4 w-4" aria-hidden="true" />
						Créer une version personnalisée
					</Link>
				</Button>
				<p className="text-muted-foreground text-xs lg:max-w-md">
					Un bijou unique, adapté à vos envies.
				</p>
			</div>
		</Reveal>
	);
}
