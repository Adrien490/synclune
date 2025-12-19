"use client";

import { Button } from "@/shared/components/ui/button";
import { useAddToCart } from "@/modules/cart/hooks/use-add-to-cart";
import { useVariantValidation } from "@/modules/skus/hooks/use-sku-validation";
import type {
	GetProductReturn,
	ProductSku,
} from "@/modules/products/types/product.types";
import { useSearchParams } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { ShoppingCart } from "lucide-react";

interface AddToCartFormProps {
	product: GetProductReturn;
	selectedSku: ProductSku | null;
}

/**
 * AddToCartForm - Formulaire d'ajout au panier
 *
 * Composant client minimal pour l'ajout au panier.
 * Les badges de réassurance sont dans ProductReassurance (RSC).
 * La quantité est toujours 1, modifiable ensuite dans le panier.
 */
export function AddToCartForm({
	product,
	selectedSku,
}: AddToCartFormProps) {
	const { action, isPending } = useAddToCart();
	const searchParams = useSearchParams();

	// Validation des variantes pour message explicite
	const { validationErrors } = useVariantValidation({
		product,
		selection: {
			color: searchParams.get("color"),
			material: searchParams.get("material"),
			size: searchParams.get("size"),
		},
	});

	// Vérifier si le produit a un seul SKU
	const hasOnlyOneSku = product.skus && product.skus.length === 1;

	// Vérifier si le SKU est disponible
	const isAvailable = selectedSku
		? selectedSku.inventory > 0 && selectedSku.isActive
		: false;

	const canAddToCart = selectedSku && isAvailable;

	return (
		<form
			id="add-to-cart-form"
			action={action}
			className="space-y-6"
			data-cart-pending={isPending ? "" : undefined}
			aria-busy={isPending}
			aria-label="Formulaire d'ajout au panier"
		>
			{/* Champs cachés */}
			{selectedSku && (
				<>
					<input type="hidden" name="skuId" value={selectedSku.id} />
					<input type="hidden" name="quantity" value="1" />
				</>
			)}

			{/* Bouton ajout au panier */}
			<Button
				type="submit"
				className={cn(
					"w-full shadow-md",
					"transition-transform duration-200 transform-gpu",
					"hover:scale-[1.02] hover:shadow-lg",
					"active:scale-[0.98]"
				)}
				disabled={!canAddToCart || isPending}
				size="lg"
			>
				{isPending ? (
					<span>Ajout en cours...</span>
				) : !isAvailable ? (
					<span>Indisponible</span>
				) : !selectedSku ? (
					<>
						{hasOnlyOneSku ? (
							<span>Produit non disponible</span>
						) : (
							<>
								<span className="sm:hidden">{validationErrors[0] || "Choisis tes options"}</span>
								<span className="hidden sm:inline">{validationErrors[0] || "Sélectionne tes options"}</span>
							</>
						)}
					</>
				) : (
					<>
						<ShoppingCart size={18} className="sm:hidden" aria-hidden="true" />
						<span>Ajouter au panier</span>
					</>
				)}
			</Button>
		</form>
	);
}
