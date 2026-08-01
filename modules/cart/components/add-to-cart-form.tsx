"use client";

import { Suspense, type ComponentProps } from "react";
import { Button } from "@/shared/components/ui/button";
import { useAddToCart } from "@/modules/cart/hooks/use-add-to-cart";
import { useVariantValidation } from "@/modules/skus/hooks/use-sku-validation";
import type { GetProductReturn, ProductSku } from "@/modules/products/types/product.types";
import { useSearchParams } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { Spinner } from "@/shared/components/ui/spinner";

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
function AddToCartFormInner({ product, selectedSku }: AddToCartFormProps) {
	const { action, isPending, state } = useAddToCart({ showErrorToast: false });
	const searchParams = useSearchParams();

	// Validation des variantes pour message explicite.
	// La couleur est pilotée par `?variant=<comboKey>` (M2M depuis 2026-05-15) ;
	// lire `color` ici reviendrait à valider un param mort (toujours absent).
	const colorParam = searchParams.get("variant") ?? searchParams.get("color");
	const { requiresColor, requiresMaterial, requiresSize } = useVariantValidation({
		product,
		selection: {
			color: colorParam,
			material: searchParams.get("material"),
			size: searchParams.get("size"),
		},
	});

	// Message specifique selon les options manquantes
	const getMissingOptionsMessage = () => {
		const missing: string[] = [];
		if (requiresColor && !colorParam) missing.push("la couleur");
		if (requiresMaterial && !searchParams.get("material")) missing.push("le matériau");
		if (requiresSize && !searchParams.get("size")) missing.push("la taille");

		if (missing.length === 0) return "Choisissez vos options";
		if (missing.length === 1) return `Choisissez ${missing[0]}`;
		if (missing.length === 2) return `Choisissez ${missing[0]} et ${missing[1]}`;
		return `Choisissez ${missing.slice(0, -1).join(", ")} et ${missing[missing.length - 1]}`;
	};

	// Vérifier si le produit a un seul SKU
	const hasOnlyOneSku = product.skus.length === 1;

	// Vérifier si le SKU est disponible
	const isAvailable = selectedSku ? selectedSku.inventory > 0 && selectedSku.isActive : false;

	const canAddToCart = selectedSku && isAvailable;

	const hasError =
		!!state && state.status !== "success" && state.status !== "initial" && !isPending;

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
					"w-full tracking-wide shadow-lg",
					// Style amélioré pour meilleur contraste
					"bg-primary hover:bg-primary/90",
					"text-primary-foreground font-semibold",
					// Animation fluide
					"transform-gpu transition-[transform,box-shadow] duration-300",
					"can-hover:hover:scale-[1.02] can-hover:hover:shadow-xl",
					"active:scale-[0.98]",
					// Anneau de focus accessible
					"focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2",
				)}
				disabled={!canAddToCart || isPending}
				size="lg"
				aria-invalid={hasError ? true : undefined}
				aria-describedby={hasError ? "add-to-cart-error" : undefined}
			>
				{isPending ? (
					<span className="inline-flex items-center gap-2">
						<Spinner presentational />
						<span>Ajout en cours…</span>
					</span>
				) : !selectedSku ? (
					<>
						{hasOnlyOneSku ? (
							<span>Produit non disponible</span>
						) : (
							<span>{getMissingOptionsMessage()}</span>
						)}
					</>
				) : !isAvailable ? (
					<span>Indisponible</span>
				) : (
					<span>Ajouter au panier</span>
				)}
			</Button>

			{/* Inline error message after failed add-to-cart */}
			{hasError && (
				<p id="add-to-cart-error" className="text-destructive text-center text-sm" role="alert">
					{state.message}
				</p>
			)}
		</form>
	);
}

export function AddToCartForm(props: ComponentProps<typeof AddToCartFormInner>) {
	return (
		<Suspense fallback={null}>
			<AddToCartFormInner {...props} />
		</Suspense>
	);
}
