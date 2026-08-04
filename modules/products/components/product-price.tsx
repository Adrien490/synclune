import { cn } from "@/shared/utils/cn";
import { formatEuro } from "@/shared/utils/format-euro";

interface ProductPriceProps {
	price: number;
	compareAtPrice?: number | null;
	/**
	 * Remise en % affichée en pastille à côté du prix barré (promo recollée au
	 * prix, plus de badge sur l'image). aria-hidden : le parent (ProductCard)
	 * annonce déjà la promotion via aria-describedby.
	 */
	discountPercent?: number;
	className?: string;
}

/**
 * Affichage compact du prix pour les cartes produits
 * Note: Schema.org géré par le parent (ProductCard)
 */
export function ProductPrice({
	price,
	compareAtPrice,
	discountPercent,
	className = "",
}: ProductPriceProps) {
	const hasDiscount = compareAtPrice && compareAtPrice > price;

	return (
		<div className={cn("flex flex-wrap items-center gap-2", className)}>
			<span className="text-foreground text-base font-semibold tracking-tight tabular-nums sm:text-lg">
				{/* Sans libellé, un lecteur d'écran enchaîne « 12 € Prix original : 15 € »
				    sans dire lequel des deux est le prix payé */}
				{hasDiscount ? <span className="sr-only">Prix promotionnel : </span> : null}
				{formatEuro(price)}
			</span>
			{hasDiscount && (
				<>
					{/* Texte pour lecteurs d'écran expliquant le prix barré */}
					<span className="sr-only">Prix original : {formatEuro(compareAtPrice)}</span>
					<span className="text-foreground/70 text-sm tabular-nums line-through" aria-hidden="true">
						{formatEuro(compareAtPrice)}
					</span>
				</>
			)}
			{hasDiscount && discountPercent ? (
				// Même motif que la remise du quick-search (search-result-item)
				<span
					aria-hidden="true"
					className="bg-destructive/10 text-destructive text-2xs rounded-full px-1.5 py-0.5 font-medium tabular-nums"
				>
					-{discountPercent}%
				</span>
			) : null}
		</div>
	);
}
