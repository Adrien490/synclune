import { cn } from "@/shared/utils/cn";
import { formatEuro } from "@/shared/utils/format-euro";

interface ProductPriceProps {
	price: number;
	compareAtPrice?: number | null;
	className?: string;
}

/**
 * Affichage compact du prix pour les cartes produits
 * Note: Schema.org géré par le parent (ProductCard)
 */
export function ProductPrice({ price, compareAtPrice, className = "" }: ProductPriceProps) {
	const hasDiscount = compareAtPrice && compareAtPrice > price;

	return (
		<div className={cn("flex items-center gap-2", className)}>
			<span className="text-foreground text-base font-semibold tracking-tight tabular-nums sm:text-lg">
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
		</div>
	);
}
