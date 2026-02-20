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
export function ProductPrice({
	price,
	compareAtPrice,
	className = "",
}: ProductPriceProps) {
	const hasDiscount = compareAtPrice && compareAtPrice > price;

	return (
		<div className={`flex items-center gap-2 ${className}`}>
			<span className="tabular-nums font-semibold text-foreground text-base sm:text-lg tracking-tight">
				{formatEuro(price)}
			</span>
			{hasDiscount && (
				<>
					{/* Texte pour lecteurs d'écran expliquant le prix barré */}
					<span className="sr-only">
						Prix original : {formatEuro(compareAtPrice)}
					</span>
					<span
						className="tabular-nums text-foreground/70 line-through text-sm"
						aria-hidden="true"
					>
						{formatEuro(compareAtPrice)}
					</span>
				</>
			)}
		</div>
	);
}
