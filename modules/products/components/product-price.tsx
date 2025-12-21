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
			<span className="font-mono font-semibold text-foreground text-base sm:text-lg">
				{formatEuro(price)}
			</span>
			{hasDiscount && (
				<>
					{/* Texte pour lecteurs d'écran expliquant le prix barré */}
					<span className="sr-only">
						Prix original : {formatEuro(compareAtPrice)}
					</span>
					<span
						className="font-mono text-foreground/60 line-through text-sm"
						aria-hidden="true"
					>
						{formatEuro(compareAtPrice)}
					</span>
				</>
			)}
		</div>
	);
}
