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
import { ShoppingCart, Truck, ShieldCheck, RotateCcw, CreditCard } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface AddToCartButtonProps {
	product: GetProductReturn;
	selectedSku: ProductSku | null;
}

/**
 * AddToCartButton - Action d'ajout au panier
 *
 * Responsabilités :
 * - Prend le skuId et quantity
 * - Appelle l'API /api/cart/add via Server Action
 * - Affiche un feedback (toast)
 * - Gère l'état loading
 * - Sélecteur de quantité
 * - Badges de réassurance
 * - Lien contact pour personnalisation
 */
export function AddToCartButton({
	product,
	selectedSku,
}: AddToCartButtonProps) {
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
		<form action={action} className="space-y-6">
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
							{(field) => (
								<div className="flex items-center justify-between">
									<span
										id="quantity-label"
										className="text-sm/6 font-semibold tracking-tight antialiased"
									>
										Quantité
									</span>
									<div className="flex items-center gap-2" role="group" aria-labelledby="quantity-label">
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() =>
												field.handleChange(Math.max(1, field.state.value - 1))
											}
											disabled={field.state.value <= 1}
											className="h-8 w-8 p-0"
											aria-label="Diminuer la quantité"
											aria-describedby="quantity-value"
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
													Math.min(
														Math.min(selectedSku.inventory, 10),
														field.state.value + 1
													)
												)
											}
											disabled={
												field.state.value >= Math.min(selectedSku.inventory, 10)
											}
											className="h-8 w-8 p-0"
											aria-label="Augmenter la quantité"
											aria-describedby="quantity-value"
										>
											+
										</Button>
									</div>
								</div>
							)}
						</form.Field>
						{/* Message explicatif sur la limite de quantité */}
						<form.Subscribe selector={(state) => [state.values.quantity]}>
							{([quantity]) => {
								const MAX_QUANTITY_PER_ORDER = 10;
								const maxAvailable = Math.min(selectedSku.inventory, MAX_QUANTITY_PER_ORDER);

								// Afficher quand on atteint la limite ou quand le stock est limité
								if (selectedSku.inventory <= MAX_QUANTITY_PER_ORDER) {
									return (
										<p className="text-xs/5 tracking-normal antialiased text-muted-foreground mt-2" role="status">
											Maximum disponible : {selectedSku.inventory}
										</p>
									);
								}

								if (quantity >= MAX_QUANTITY_PER_ORDER) {
									return (
										<p className="text-xs/5 tracking-normal antialiased text-muted-foreground mt-2" role="status">
											Limite de {MAX_QUANTITY_PER_ORDER} par commande
										</p>
									);
								}

								return null;
							}}
						</form.Subscribe>
					</CardContent>
				</Card>
			)}

			{/* Bouton ajout au panier */}
			<div className="space-y-3 sticky bottom-0 left-0 right-0 z-20 lg:static bg-background/95 backdrop-blur lg:bg-transparent lg:backdrop-blur-none p-4 lg:p-0 -mx-4 lg:mx-0 shadow-lg lg:shadow-none border-t lg:border-t-0">
				<Button
					type="submit"
					className="w-full shadow-md"
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
						<span>
							{hasOnlyOneSku
								? "Produit non disponible"
								: validationErrors[0] || "Sélectionnez vos options"}
						</span>
					) : (
						<div className="flex items-center gap-2">
							<ShoppingCart className="w-4 h-4" />
							<span>Ajouter au panier</span>
						</div>
					)}
				</Button>

				{/* Trust badges - Réassurance */}
				<div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground py-2">
					<div className="flex items-center gap-1.5">
						<ShieldCheck className="w-4 h-4 text-green-600" aria-hidden="true" />
						<span>Paiement sécurisé</span>
					</div>
					<div className="flex items-center gap-1.5">
						<RotateCcw className="w-4 h-4 text-blue-600" aria-hidden="true" />
						<span>Retours 14 jours</span>
					</div>
					<div className="flex items-center gap-1.5">
						<CreditCard className="w-4 h-4 text-primary" aria-hidden="true" />
						<span>CB, PayPal, Stripe</span>
					</div>
				</div>

				{/* Frais de livraison */}
				<div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
					<Truck className="w-3.5 h-3.5" />
					<span>Livraison France et UE</span>
				</div>

				{/* Contact */}
				<div className="text-center space-y-2 p-4 bg-linear-card rounded-lg border border-primary/10">
					<p className="text-sm/6 tracking-normal antialiased text-muted-foreground">
						Une envie de personnalisation ?
					</p>
					<Link
						className="inline-flex items-center gap-2 font-medium text-foreground underline-offset-4 hover:underline text-sm/6 tracking-normal antialiased transition-all duration-200 hover:gap-3"
						href={`/personnalisation?product=${product.slug}`}
					>
						<span className="text-base" aria-hidden="true">✨</span>
						<span>Parlons-en ensemble</span>
						<span className="text-xs" aria-hidden="true">→</span>
					</Link>
				</div>
			</div>
		</form>
	);
}
