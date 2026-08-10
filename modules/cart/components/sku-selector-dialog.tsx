"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";

import type { GetCartReturn } from "@/modules/cart/types/cart.types";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
// Chemin direct, comme les deux autres consommateurs (`footer.tsx`,
// `section-heading.tsx`) : le barrel `animations/index.ts` n'a aucun importeur.
import { HandDrawnUnderline } from "@/shared/components/animations/hand-drawn-accent";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { useServerFieldErrors } from "@/shared/hooks/use-server-field-errors";
import { useDialog } from "@/shared/providers/overlay-store-provider";
import { useAddToCart } from "@/modules/cart/hooks/use-add-to-cart";
import { SKU_SELECTOR_TEXTS } from "@/modules/cart/constants/sku-selector-texts";

import type { SkuSelectorDialogData } from "../types/dialog-data.types";
import { SKU_SELECTOR_DIALOG_ID } from "./sku-selector-utils";
import { SkuSelectorPieces } from "./sku-selector-pieces";

export type { SkuSelectorDialogData };

interface SkuSelectorDialogProps {
	/** Panier serveur — sert à soustraire ce qui est déjà pris de chaque pièce. */
	cart: GetCartReturn;
	isStoreClosed?: boolean;
	storeClosureMessage?: string | null;
}

/**
 * Dialog de choix de variante, ouvert depuis une carte produit à plusieurs SKU.
 *
 * Direction « Une pièce à la fois » (audit design 2026-08-04) : une ligne par SKU
 * réel — sa photo, sa combinaison, son prix, son stock — au lieu de trois axes
 * croisés à recombiner. À ~20 commandes/mois et deux à six variantes par bijou,
 * croiser des attributs était un problème de gros catalogue qu'on n'a pas.
 *
 * Conséquence non cosmétique : **la taille est écrite sur chaque ligne**, qu'une
 * constante la déclare requise ou non. `PRODUCT_TYPES_REQUIRING_SIZE` a pointé
 * pendant des mois vers des slugs inexistants (`ring` vs `bagues`) — on pouvait
 * acheter une bague sans jamais voir sa taille. La correction est faite par ailleurs ;
 * ici, il n'y a plus de constante à croire.
 */
export function SkuSelectorDialog({
	cart,
	isStoreClosed = false,
	storeClosureMessage = null,
}: SkuSelectorDialogProps) {
	const cartItems = cart.items.map((item) => ({
		skuId: item.sku.id,
		quantity: item.quantity,
	}));

	const { isOpen, data, close } = useDialog<SkuSelectorDialogData>(SKU_SELECTOR_DIALOG_ID);
	const { state, action, isPending } = useAddToCart({
		openSheetOnSuccess: true,
		onSuccess: close,
	});

	// `createToastCallbacks` retire les VALIDATION_ERROR du toast (affichage inline
	// supposé) : sans cette alerte, un refus de `addToCartSchema` serait muet.
	const serverErrors = useServerFieldErrors({ state });

	const product = data?.product;

	// Le store n'est jamais ouvert sans produit : `openSkuSelector({ product })` les
	// pose ensemble. L'ancien squelette de 48 lignes gardé par cette condition était
	// structurellement inatteignable — l'attente réelle est le chunk, et elle se voit
	// désormais sur le bouton de la carte.
	if (!product) return null;

	const activeSkus = product.skus.filter((sku) => sku.isActive);
	const allSoldOut = activeSkus.length > 0 && activeSkus.every((sku) => sku.inventory <= 0);

	const description =
		activeSkus.length === 0
			? SKU_SELECTOR_TEXTS.NO_ACTIVE_SKUS
			: allSoldOut
				? SKU_SELECTOR_TEXTS.ALL_SOLD_OUT
				: SKU_SELECTOR_TEXTS.pieceCount(activeSkus.length);

	return (
		<ResponsiveDialog open={isOpen} onOpenChange={(open) => !open && close()}>
			{/* ⚠️ `md:flex md:flex-col md:overflow-y-hidden` : le DialogContent desktop est
			    une GRILLE `overflow-y-auto` — `min-h-0 flex-1` (form) et `mt-auto shrink-0`
			    (footer) sont des propriétés d'enfant flex, inertes en grille. Sans ces trois
			    classes, au-delà de 85vh c'est le dialog ENTIER qui scrolle et le CTA prix
			    part sous le pli ; avec elles, la liste des pièces scrolle en interne et le
			    footer reste visible — comme sur mobile, où le wrapper du drawer est déjà
			    flex-col. */}
			<ResponsiveDialogContent className="group/sku-selector md:flex md:max-h-[85vh] md:max-w-130 md:flex-col md:overflow-y-hidden">
				<ResponsiveDialogHeader className="shrink-0">
					<ResponsiveDialogTitle className="line-clamp-2 text-balance">
						{product.title}
					</ResponsiveDialogTitle>
					{/* ⚠️ `inView={false}` obligatoire : le dialog est portalisé, et
					    `animation-timeline: view()` n'y déclenche jamais.
					    `self-start` : le header est un `flex flex-col`, dont le stretch
					    étirerait le tracé sur toute la largeur.
					    `length="l"` : le tracé long (11:1) — l'ancien couple 130×9 sur le
					    tracé 6:1 letterboxait à l'échelle 0,45 (54 px d'encre rendus sur
					    130, le pire cas du dépôt — audit 2026-08-05). Couleur : défaut
					    cascadé (repli --primary) — `rose-strong` était le ton dont le
					    JSDoc de squiggle-underline documente le retrait. */}
					<HandDrawnUnderline
						inView={false}
						length="l"
						width={130}
						className="-mt-1 block shrink-0 self-start"
					/>
					<ResponsiveDialogDescription>{description}</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				{activeSkus.length === 0 ? (
					<div className="space-y-3 py-8 text-center">
						<Link
							href={`/creations/${product.slug}`}
							onClick={close}
							aria-label={SKU_SELECTOR_TEXTS.viewProductAriaLabel(product.title)}
							className="text-muted-foreground can-hover:hover:text-foreground focus-ring inline-flex items-center gap-1 rounded-sm text-sm transition-colors"
						>
							{SKU_SELECTOR_TEXTS.VIEW_PRODUCT}
							<ArrowRightIcon className="size-3.5" aria-hidden="true" />
						</Link>
					</div>
				) : (
					<form
						action={action}
						className="flex min-h-0 flex-1 flex-col"
						data-pending={isPending ? "" : undefined}
					>
						<FormServerErrorAlert errors={serverErrors} className="mb-4" />
						<SkuSelectorPieces
							key={product.id}
							product={product}
							activeSkus={activeSkus}
							cartItems={cartItems}
							preselectedColor={data.preselectedColor}
							isPending={isPending}
							isStoreClosed={isStoreClosed}
							storeClosureMessage={storeClosureMessage}
							onClose={close}
						/>
					</form>
				)}
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
