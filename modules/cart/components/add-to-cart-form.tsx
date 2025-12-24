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
	const { validationErrors, requiresColor, requiresMaterial, requiresSize } = useVariantValidation({
		product,
		selection: {
			color: searchParams.get("color"),
			material: searchParams.get("material"),
			size: searchParams.get("size"),
		},
	});

	// Message specifique selon les options manquantes
	const getMissingOptionsMessage = () => {
		const missing: string[] = [];
		if (requiresColor && !searchParams.get("color")) missing.push("la couleur");
		if (requiresMaterial && !searchParams.get("material")) missing.push("le materiau");
		if (requiresSize && !searchParams.get("size")) missing.push("la taille");

		if (missing.length === 0) return "Choisis tes options";
		if (missing.length === 1) return `Choisis ${missing[0]}`;
		if (missing.length === 2) return `Choisis ${missing[0]} et ${missing[1]}`;
		return `Choisis ${missing.slice(0, -1).join(", ")} et ${missing[missing.length - 1]}`;
	};

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
			data-pending={isPending ? "" : undefined}
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

			{/* Bouton ajout au panier - CTA principal avec contraste élevé */}
			<Button
				type="submit"
				className={cn(
					"w-full shadow-lg",
					// Style amélioré pour meilleur contraste
					"bg-primary hover:bg-primary/90",
					"text-primary-foreground font-semibold",
					// Animation fluide
					"transition-all duration-200 transform-gpu",
					"hover:scale-[1.02] hover:shadow-xl",
					"active:scale-[0.98]",
					// Anneau de focus accessible
					"focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
							<span>{getMissingOptionsMessage()}</span>
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
