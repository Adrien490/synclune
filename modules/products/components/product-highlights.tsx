import type { GetProductReturn } from "../types/product.types";
import { generateHighlights } from "../utils/generate-highlights";

interface ProductHighlightsProps {
	product: GetProductReturn;
}

/**
 * ProductHighlights - Badges scannables des points cles produit
 *
 * Ameliore la scanabilite UX (78% des sites echouent selon Baymard).
 * Genere automatiquement depuis les donnees existantes.
 */
export function ProductHighlights({ product }: ProductHighlightsProps) {
	const highlights = generateHighlights(product);

	if (highlights.length === 0) {
		return null;
	}

	return (
		<ul
			className="flex flex-wrap gap-2"
			aria-label="Points cles du produit"
		>
			{highlights.map((highlight) => {
				const Icon = highlight.icon;
				return (
					<li
						key={highlight.id}
						className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 text-sm text-muted-foreground"
					>
						<Icon
							className="w-3.5 h-3.5 text-primary shrink-0"
							aria-hidden="true"
						/>
						<span>{highlight.label}</span>
					</li>
				);
			})}
		</ul>
	);
}
