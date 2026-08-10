import { cn } from "@/shared/utils/cn";
import { formatEuro } from "@/shared/utils/format-euro";

interface ProductPriceProps {
	price: number;
	className?: string;
}

/**
 * Affichage compact du prix pour les cartes produits.
 * Note: Schema.org géré par le parent (ProductCard)
 *
 * ⚠️ Pas de prix barré ni de pastille de remise ici (retrait Omnibus 2026-08-08) :
 * annoncer une réduction exige de référencer le prix le plus bas des 30 derniers
 * jours (art. L. 112-1-1 C. conso), et rien en base ne trace l'historique de prix.
 * La réouverture passe par l'infrastructure `lowestPriceLast30d` (lot A2), pas par
 * un simple ré-affichage de `compareAtPrice`.
 */
export function ProductPrice({ price, className = "" }: ProductPriceProps) {
	return (
		<div className={cn("flex flex-wrap items-center gap-2", className)}>
			<span className="text-foreground text-base font-semibold tracking-tight tabular-nums sm:text-lg">
				{formatEuro(price)}
			</span>
		</div>
	);
}
