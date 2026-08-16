"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/shared/components/ui/button";
import { ResponsiveDialogFooter } from "@/shared/components/responsive-dialog";
import { useRadioGroupKeyboard } from "@/shared/hooks/use-radio-group-keyboard";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { formatEuro } from "@/shared/utils/format-euro";
import { cn } from "@/shared/utils/cn";
import type { ProductCarouselItem } from "@/modules/products/types/product.types";
import { MAX_QUANTITY_PER_ORDER } from "@/modules/cart/constants/cart";
import { VARIANT_SELECTOR_TEXTS } from "@/modules/cart/constants/variant-selector-texts";

import type { ActiveVariant } from "./variant-selector-utils";
import {
	buildPieceLabel,
	describeStock,
	getDistinguishingDimensions,
	getQuantityInCart,
	getVariantImage,
	pickInitialVariant,
} from "./variant-selector-utils";
import { VariantSelectorPieceRow } from "./variant-selector-piece-row";
import { QuantitySection } from "./variant-selector-quantity";

// Le guide des tailles ne se charge qu'à l'ouverture.
const SizeGuideDialog = dynamic(() =>
	import("@/modules/variants/components/size-guide-dialog").then((mod) => mod.SizeGuideDialog),
);

export interface VariantSelectorPiecesProps {
	product: ProductCarouselItem;
	activeVariants: ActiveVariant[];
	cartItems: { variantId: string; quantity: number }[];
	preselectedColor?: string | null;
	isPending: boolean;
	onClose: () => void;
}

/**
 * « Une pièce à la fois » — une ligne par VARIANT réel, pas trois axes croisés.
 *
 * Ce que la structure règle, et qu'aucun correctif ne pouvait tenir durablement :
 * chaque ligne EST une combinaison qui existe, donc le cul-de-sac muet (couleur ×
 * matériau sans VARIANT en stock, bouton gris, prix d'aucune variante, zéro message)
 * devient impossible — il n'y a plus de croisement à faire.
 *
 * ⚠️ Aucun `useEffect` de synchronisation : l'état est un identifiant, dérivable au
 * rendu. La remise à zéro au changement de produit passe par `key={product.id}` chez
 * l'appelant. La version précédente réinitialisait un formulaire TanStack dans un
 * effet, pour un formulaire sans validator, sans `onSubmit` et sans `Field`.
 */
export function VariantSelectorPieces({
	product,
	activeVariants,
	cartItems,
	preselectedColor,
	isPending,
	onClose,
}: VariantSelectorPiecesProps) {
	const [chosenId, setChosenId] = useState<string | null>(null);
	const [quantity, setQuantity] = useState(1);

	const dimensions = getDistinguishingDimensions(activeVariants);
	const selectedVariant =
		activeVariants.find((variant) => variant.id === chosenId) ??
		pickInitialVariant(activeVariants, cartItems, preselectedColor);

	const selectedStock = selectedVariant
		? describeStock(selectedVariant, getQuantityInCart(selectedVariant.id, cartItems))
		: null;
	const availableToAdd = selectedVariant
		? Math.max(0, selectedVariant.stock - getQuantityInCart(selectedVariant.id, cartItems))
		: 0;

	const maxQuantity = Math.min(availableToAdd, MAX_QUANTITY_PER_ORDER);
	// Clamp au rendu : changer de pièce peut abaisser le plafond sous la quantité
	// déjà saisie. Le serveur CUMULE (`existing.quantity + quantity`), donc envoyer
	// plus que `stock − déjà au panier` déclencherait un INSUFFICIENT_STOCK.
	const submittedQuantity = maxQuantity > 0 ? Math.min(quantity, maxQuantity) : 1;

	const canAddToCart = Boolean(selectedVariant) && !selectedStock?.isBlocked;
	const hasAnySize = activeVariants.some((variant) => Boolean(variant.size));

	const selectPiece = (variant: ActiveVariant) => {
		triggerHaptic("selection");
		setChosenId(variant.id);
	};

	const { containerRef, handleKeyDown } = useRadioGroupKeyboard({
		options: activeVariants,
		getOptionId: (variant) => variant.id,
		// ⚠️ Ce gate ne gouverne QUE les flèches : elles SAUTENT les pièces épuisées.
		// (La raison d'origine — « sans lui une flèche vers une pièce épuisée ne
		// déplacerait rien du tout, `focusOption` excluant `[aria-disabled]` » — a
		// disparu le 2026-08-05 : le hook ne filtre plus que `[disabled]`, donc la
		// TRAVERSÉE est désormais possible. Le saut reste le choix de ce sélecteur,
		// parce qu'il n'a pas de tabindex roving, cf. juste en dessous.)
		//
		// L'annonce des pièces épuisées passe par le TAB, pas par les flèches : chaque
		// ligne est un tab stop (pas de roving tabindex), donc elles sont lues
		// « épuisée » (WCAG 1.3.1). C'est aussi ce qui rend la zone morte impossible —
		// la version précédente combinait ce gate AVEC un `disabled` HTML et un
		// tabindex glissant calculé sur `isSelected` : quand la sélection devenait
		// indisponible, tout le radiogroup sortait de l'ordre de tabulation.
		isOptionDisabled: (variant) => variant.stock <= 0,
		onSelect: selectPiece,
	});

	return (
		<>
			{selectedVariant && (
				<>
					<input type="hidden" name="variantId" value={selectedVariant.id} />
					<input type="hidden" name="quantity" value={submittedQuantity} />
				</>
			)}

			<div
				className={cn(
					"relative min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain py-1 pr-1 pb-4",
					"group-has-[[data-pending]]/variant-selector:pointer-events-none",
					"group-has-[[data-pending]]/variant-selector:opacity-50",
					"motion-safe:transition-opacity motion-safe:duration-200",
				)}
			>
				{/* `pt-2` : le scotch dépasse de 6 px au-dessus de la première ligne, et le
				    conteneur ci-dessus défile — sans cette réserve il serait rogné. */}
				<div
					ref={containerRef}
					role="radiogroup"
					aria-label={VARIANT_SELECTOR_TEXTS.PIECES_GROUP_LABEL}
					className="flex flex-col gap-2.5 pt-2"
				>
					{activeVariants.map((variant, index) => {
						const quantityInCart = getQuantityInCart(variant.id, cartItems);
						return (
							<VariantSelectorPieceRow
								key={variant.id}
								variant={variant}
								priceCents={variant.priceCents ?? product.priceCents}
								label={buildPieceLabel(variant, dimensions, index)}
								image={getVariantImage(variant, product)}
								stock={describeStock(variant, quantityInCart)}
								isSelected={selectedVariant?.id === variant.id}
								onSelect={() => selectPiece(variant)}
								onKeyDown={(event) => handleKeyDown(event, index)}
							/>
						);
					})}
				</div>

				{hasAnySize && (
					<div className="flex justify-start">
						<SizeGuideDialog productTypeSlug={product.type?.slug} />
					</div>
				)}

				{availableToAdd > 0 && (
					<QuantitySection
						quantity={submittedQuantity}
						maxQuantity={maxQuantity}
						onQuantityChange={setQuantity}
						isPending={isPending}
						unitPrice={selectedVariant ? (selectedVariant.priceCents ?? product.priceCents) : 0}
					/>
				)}
			</div>

			{/* ⚠️ Le footer par défaut est `flex-col-reverse … sm:flex-row sm:justify-end` :
			    sans ces surcharges, le lien passerait AU-DESSUS du CTA sur mobile et à
			    côté de lui sur desktop. */}
			<ResponsiveDialogFooter className="mt-auto shrink-0 flex-col border-t pt-4 sm:flex-col sm:justify-start">
				<Button type="submit" disabled={!canAddToCart || isPending} className="w-full" size="lg">
					{isPending
						? VARIANT_SELECTOR_TEXTS.SUBMIT_PENDING
						: VARIANT_SELECTOR_TEXTS.submitLabel(
								formatEuro(
									(selectedVariant ? (selectedVariant.priceCents ?? product.priceCents) : 0) *
										submittedQuantity,
								),
							)}
				</Button>
				<Link
					href={`/creations/${product.slug}`}
					onClick={onClose}
					aria-label={VARIANT_SELECTOR_TEXTS.viewProductAriaLabel(product.name)}
					className="text-muted-foreground can-hover:hover:text-foreground focus-ring mx-auto inline-flex items-center gap-1 rounded-sm text-sm transition-colors"
				>
					{VARIANT_SELECTOR_TEXTS.VIEW_PRODUCT}
					<ArrowRightIcon className="size-3.5" aria-hidden="true" />
				</Link>
			</ResponsiveDialogFooter>
		</>
	);
}
