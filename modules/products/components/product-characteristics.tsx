import type { ProductVariant } from "@/modules/products/types/product.types";

interface ProductCharacteristicsProps {
	selectedVariant?: ProductVariant | null;
}

/**
 * ProductCharacteristics — la dimension de la variante choisie.
 *
 * Ancien état : une `Card` autonome en `bg-muted/30`, posée entre deux autres
 * panneaux portant EXACTEMENT la même enveloppe (`ProductReassurance` et
 * `ProductHighlights`). Trois natures d'information — la matière, la dimension
 * et la logistique — avaient le même fond, la même bordure et le même rayon :
 * l'œil ne pouvait plus les trier. Les trois vivent désormais dans une seule
 * fiche à filets, montée par `ProductDetails` ; ce composant ne rend plus que
 * son contenu et son padding.
 *
 * Retourne `null` sans taille — et c'est ce qui impose que le padding vive ICI
 * plutôt que dans un conteneur chez l'appelant : un wrapper rendu autour d'un
 * enfant nul laisserait une case vide et un filet orphelin dans la fiche.
 */
export function ProductCharacteristics({ selectedVariant }: ProductCharacteristicsProps) {
	const sizeInfo = selectedVariant?.size
		? {
				size: selectedVariant.size,
				isAdjustable: selectedVariant.size.toLowerCase().includes("ajustable"),
			}
		: null;

	if (!sizeInfo) {
		return null;
	}

	return (
		<section
			aria-labelledby="product-characteristics-title"
			className="p-4 transition-opacity duration-200 group-has-[[data-pending]]/product-details:opacity-60"
		>
			<h2 id="product-characteristics-title" className="text-foreground mb-3 text-sm font-semibold">
				Taille
			</h2>
			<p className="text-muted-foreground text-sm">
				<span className="text-foreground font-medium">{sizeInfo.size}</span>
				{sizeInfo.isAdjustable && " — ajustable, elle convient à la plupart des morphologies"}
			</p>
		</section>
	);
}
