"use client";

import { useAppForm } from "@/shared/components/forms";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Spinner } from "@/shared/components/ui/spinner";
import { useAddToCart } from "@/modules/cart/hooks/use-add-to-cart";
import { useVariantValidation } from "@/modules/skus/hooks/use-sku-validation";
import type {
	GetProductReturn,
	ProductSku,
} from "@/modules/products/types/product.types";
import { useSearchParams } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { MAX_QUANTITY_PER_ORDER } from "@/modules/cart/constants/cart.constants";

interface AddToCartFormProps {
	product: GetProductReturn;
	selectedSku: ProductSku | null;
}

/**
 * AddToCartForm - Formulaire d'ajout au panier
 *
 * Composant client minimal pour l'ajout au panier.
 * Les badges de réassurance sont dans ProductReassurance (RSC).
 *
 * Responsabilités :
 * - Sélecteur de quantité
 * - Bouton submit avec états (loading, disabled, validation)
 */
export function AddToCartForm({
	product,
	selectedSku,
}: AddToCartFormProps) {
	// Hook TanStack Form
	const { action, isPending } = useAddToCart();
	const searchParams = useSearchParams();

	const form = useAppForm({
		defaultValues: {
			quantity: 1,
		},
	});

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
			{/* Champ caché pour le SKU */}
			{selectedSku && (
				<input type="hidden" name="skuId" value={selectedSku.id} />
			)}

			{/* Champ caché pour la quantité */}
			<form.Subscribe selector={(state) => [state.values.quantity]}>
				{([quantity]) => (
					<input type="hidden" name="quantity" value={quantity} />
				)}
			</form.Subscribe>

			{/* Sélecteur de quantité */}
			{selectedSku && (
				<Card>
					<CardContent className="pt-6">
						<form.Field name="quantity">
							{(field) => {
								const maxQuantity = Math.min(selectedSku.inventory, MAX_QUANTITY_PER_ORDER);
								const showQuantityControls = maxQuantity > 1;

								return (
									<div className="flex items-center justify-between">
										<span
											id="quantity-label"
											className="text-sm/6 font-semibold tracking-tight antialiased"
										>
											Quantité
										</span>
										{showQuantityControls ? (
											<div className="flex items-center gap-2" role="group" aria-labelledby="quantity-label">
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={() =>
														field.handleChange(Math.max(1, field.state.value - 1))
													}
													disabled={field.state.value <= 1}
													className="h-11 w-11 p-0"
													aria-label="Diminuer la quantité"
													aria-controls="quantity-value"
												>
													-
												</Button>
												<span
													id="quantity-value"
													className="text-base/6 tracking-normal antialiased font-medium w-8 text-center"
													role="status"
													aria-live="polite"
													aria-label={`Quantité sélectionnée: ${field.state.value}`}
												>
													{field.state.value}
												</span>
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={() =>
														field.handleChange(
															Math.min(maxQuantity, field.state.value + 1)
														)
													}
													disabled={field.state.value >= maxQuantity}
													className="h-11 w-11 p-0"
													aria-label="Augmenter la quantité"
													aria-controls="quantity-value"
												>
													+
												</Button>
											</div>
										) : (
											<span
												id="quantity-value"
												className="text-base/6 tracking-normal antialiased font-medium"
												role="status"
												aria-label="Quantité: 1"
											>
												1
											</span>
										)}
									</div>
								);
							}}
						</form.Field>
						{/* Message explicatif sur la limite de quantité - min-h pour éviter layout shift */}
						<form.Subscribe selector={(state) => [state.values.quantity]}>
							{([quantity]) => {
								let message: string | null = null;

								if (selectedSku.inventory <= MAX_QUANTITY_PER_ORDER) {
									message = `Maximum disponible : ${selectedSku.inventory}`;
								} else if (quantity >= MAX_QUANTITY_PER_ORDER) {
									message = `Limite de ${MAX_QUANTITY_PER_ORDER} par commande`;
								}

								return (
									<p
										className="text-xs/5 tracking-normal antialiased text-muted-foreground mt-2 min-h-5"
										role="status"
										aria-live="polite"
									>
										{message ?? "\u00A0"}
									</p>
								);
							}}
						</form.Subscribe>
					</CardContent>
				</Card>
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
					<div className="flex items-center gap-2">
						<Spinner className="w-4 h-4" />
						<span>Ajout en cours...</span>
					</div>
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
					<span>Ajouter au panier</span>
				)}
			</Button>
		</form>
	);
}
