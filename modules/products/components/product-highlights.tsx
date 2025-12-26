import type { GetProductReturn } from "../types/product.types";
import { generateHighlights } from "../utils/generate-highlights";

interface ProductHighlightsProps {
	product: GetProductReturn;
}

/**
 * ProductHighlights - Points cles produit avec pattern Baymard
 *
 * Pattern: [ICONE] + [TITRE] + [DESCRIPTION]
 * Ameliore la scanabilite UX (78% des sites echouent selon Baymard).
 * Genere automatiquement depuis les donnees existantes.
 */
export function ProductHighlights({ product }: ProductHighlightsProps) {
	const highlights = generateHighlights(product);

	if (highlights.length === 0) {
		return null;
	}

	return (
		<section aria-labelledby="highlights-title">
			<h2 id="highlights-title" className="sr-only">
				Points clés du produit
			</h2>
			<ul className="grid gap-4 sm:grid-cols-2">
				{highlights.map((highlight) => {
					const Icon = highlight.icon;
					return (
						<li key={highlight.id} className="flex items-start gap-3">
							<div
								className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"
								aria-hidden="true"
							>
								<Icon className="w-5 h-5 text-primary" />
							</div>
							<div className="min-w-0">
								<p className="text-sm/6 font-medium tracking-normal antialiased">
									{highlight.label}
								</p>
								<p className="text-xs/5 tracking-normal antialiased text-muted-foreground">
									{highlight.description}
								</p>
							</div>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
