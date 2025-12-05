import { formatEuro } from "@/shared/utils/format-euro";

interface ProductPriceCompactProps {
	price: number;
	compareAtPrice?: number | null;
	className?: string;
}

/**
 * Affichage compact du prix pour les cartes produits
 * Note: Schema.org géré par le parent (ProductCard)
 */
export function ProductPriceCompact({
	price,
	compareAtPrice,
	className = "",
}: ProductPriceCompactProps) {
	const hasDiscount = compareAtPrice && compareAtPrice > price;

	return (
		<div className={`flex items-center gap-2 ${className}`}>
			<span className="font-mono font-semibold text-foreground text-sm">
				{formatEuro(price)}
			</span>
			{hasDiscount && (
				<span className="font-mono text-muted-foreground line-through text-xs">
					{formatEuro(compareAtPrice)}
				</span>
			)}
		</div>
	);
}
