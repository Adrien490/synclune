import { Gem, Hand, Layers, MapPin, Maximize2, Palette, type LucideIcon } from "lucide-react";

import { generateHighlights } from "../services/product-highlights.service";
import type { ProductHighlightId } from "../types/product-services.types";
import type { GetProductReturn } from "../types/product.types";

interface ProductHighlightsProps {
	product: GetProductReturn;
}

const HIGHLIGHT_ICONS = {
	material: Gem,
	color: Palette,
	handmade: Hand,
	french: MapPin,
	adjustable: Maximize2,
	collection: Layers,
} as const satisfies Record<ProductHighlightId, LucideIcon>;

/**
 * ProductHighlights - Points clés produit avec pattern Baymard
 *
 * Pattern: [ICÔNE TYPÉE] + [LABEL] + [DESCRIPTION]
 * Améliore la scanabilité UX (78% des sites échouent selon Baymard).
 * Aligné visuellement avec le sibling ProductReassurance (même PDP).
 */
export function ProductHighlights({ product }: ProductHighlightsProps) {
	const highlights = generateHighlights(product);

	if (highlights.length === 0) {
		return null;
	}

	return (
		<section
			aria-labelledby="highlights-title"
			className="bg-muted/30 border-border/50 rounded-xl border p-4"
		>
			<h2 id="highlights-title" className="text-foreground mb-3 text-sm font-semibold">
				Points clés
			</h2>
			<ul className="space-y-2.5">
				{highlights.map((highlight) => {
					const Icon = HIGHLIGHT_ICONS[highlight.id];
					return (
						<li key={highlight.id} className="flex items-start gap-2.5">
							<Icon className="text-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
							<div>
								<p className="text-foreground text-sm font-medium">{highlight.label}</p>
								<p className="text-muted-foreground text-xs">{highlight.description}</p>
							</div>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
