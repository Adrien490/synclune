"use client";

import { formatEuro } from "@/shared/utils/format-euro";
import { cn } from "@/shared/utils/cn";
import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";
import { SwipeableCard } from "@/shared/components/swipeable-card";
import { CARD_SURFACE_FOCUS, CARD_SURFACE_HOVER } from "@/shared/components/card-surface.constants";
import { useGestureHintOnce } from "@/shared/hooks/use-gesture-hint-once";
import { CartStateChip } from "./cart-state-chip";
import { useAlertDialogStore } from "@/shared/providers/overlay-store-provider";
import { CartItemQuantitySelector } from "./cart-item-quantity-selector";
import { CartItemRemoveButton } from "./cart-item-remove-button";
import { REMOVE_CART_ITEM_DIALOG_ID } from "./remove-cart-item-alert-dialog";
import { buildSwatchStyle } from "@/modules/colors/utils/swatch-style";
import { resolveMediaThumbSrc } from "@/modules/media/utils/media-utils";
import {
	getSkuColorsDisplayLabel,
	getColorHexes,
	getColorNames,
} from "@/modules/skus/utils/sku-colors-label";
import { getSkuMaterialsLabel } from "@/modules/skus/utils/sku-materials-label";

import type { CartItem } from "../types/cart.types";
import {
	getCartItemSubtotal,
	isCartItemOutOfStock,
	isCartItemInactive,
	hasCartItemIssue,
	getCartItemPrimaryImage,
	CART_ITEM_ISSUE_LABELS,
} from "../services/cart-item.service";
import { TrashIcon } from "@phosphor-icons/react/ssr";
import Image from "next/image";
import Link from "next/link";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";

interface CartSheetItemRowProps {
	item: CartItem;
	onClose?: () => void;
	/**
	 * Mobile viewport → enables swipe-to-delete gesture via SwipeableCard wrapper.
	 * Desktop keeps the click-remove button only.
	 */
	isMobile?: boolean;
	/**
	 * Rang dans la liste. Sert à deux choses : le « peek nudge » de
	 * découvrabilité du swipe-to-delete (premier article seulement,
	 * `useGestureHintOnce`) et le sens de la rotation du tirage.
	 */
	index?: number;
}

/**
 * Ligne d'article du cart sheet — surface « tirage » posée sur le panneau.
 *
 * La rotation de ±0,4° est volontairement SOUS le seuil de perception
 * consciente : on ne la voit pas, on lit une pile plutôt qu'une liste. Ce n'est
 * pas une animation (valeur statique) — elle survit donc à
 * `prefers-reduced-motion`, contrairement au halo de survol.
 */
export function CartSheetItemRow({
	item,
	onClose,
	isMobile = false,
	index = 0,
}: CartSheetItemRowProps) {
	const isFirst = index === 0;
	// Le swipe-to-delete n'avait aucun indice : `useGestureHintOnce` (le mécanisme
	// prévu pour ça, et que `swipeable-card` recommande explicitement) n'était câblé
	// que sur les commandes admin. Le hook est appelé inconditionnellement
	// (rules-of-hooks) mais désactivé hors 1er article — pas de lecture localStorage
	// superflue sur les autres lignes.
	const peek = useGestureHintOnce("cart-swipe-delete", { enabled: isFirst && isMobile });
	const subtotal = getCartItemSubtotal(item);
	const isOutOfStock = isCartItemOutOfStock(item);
	const isInactive = isCartItemInactive(item);
	const hasIssue = hasCartItemIssue(item);
	const primaryImage = getCartItemPrimaryImage(item);
	const openAlertDialog = useAlertDialogStore((state) => state.openAlertDialog);

	const materialsLabel = getSkuMaterialsLabel(item.sku.materials);
	const colorsLabel = getSkuColorsDisplayLabel(item.sku.colors);
	const colorHexes = getColorHexes(item.sku.colors);
	const colorNames = getColorNames(item.sku.colors);
	const titleId = `cart-item-title-${item.id}`;

	const handleSwipeRemove = () => {
		openAlertDialog(REMOVE_CART_ITEM_DIALOG_ID, {
			skuId: item.sku.id,
			itemName: item.sku.product.title,
			quantity: item.quantity,
		});
	};

	// Une video sans poster n'est pas decodable par l'optimiseur -> fallback "Pas d'image"
	const thumbSrc = primaryImage ? resolveMediaThumbSrc(primaryImage) : null;

	const article = (
		<article
			className={cn(
				"group/item bg-card shadow-paper rounded-md border p-3 sm:p-3.5",
				"grid grid-cols-[5rem_1fr] gap-3.5 sm:grid-cols-[6rem_1fr]",
				"transition-[border-color,box-shadow] duration-300 ease-out motion-reduce:transition-colors",
				CARD_SURFACE_HOVER,
				CARD_SURFACE_FOCUS,
				// `border-transparent` au repos : c'est `shadow-paper` qui sépare la ligne du
				// panneau, pas un filet.
				//
				// ⚠️ Le `border-border` posé le matin du 2026-08-05 était un correctif
				// sous-dimensionné : sur `bg-card`, `--border` ne rend que **1,27:1**, donc il
				// ne séparait presque rien tout en consommant le 1 px que le survol réserve à
				// `border-primary/40`. L'ombre rétablit la séparation d'origine (ΔL 0,0602,
				// contre 0,0600 pour l'ancien fond `bg-muted`) et rend le filet disponible pour
				// ce qu'il signale vraiment : le survol, le focus, et l'état fautif ci-dessous.
				hasIssue ? "border-destructive/50" : "border-transparent",
			)}
			style={{ transform: index % 2 === 0 ? "rotate(-0.4deg)" : "rotate(0.4deg)" }}
			/*
			 * `aria-labelledby` vers le titre, et NON un `aria-label` reconstruit.
			 *
			 * ⚠️ L'ancien `aria-label` concaténait titre + couleurs + matière + quantité +
			 * prix — c'est-à-dire exactement ce que les enfants rendent déjà. Le rôle
			 * `article` accepte un nom SANS masquer son contenu : le lecteur d'écran
			 * annonçait donc le nom composé à l'entrée, puis relisait les mêmes cinq
			 * informations une par une. Précédent propre du dépôt : `product-card.tsx`.
			 */
			aria-labelledby={titleId}
		>
			<Link
				href={`/creations/${item.sku.product.slug}`}
				onClick={onClose}
				className="focus-ring bg-muted relative row-span-2 size-20 overflow-hidden rounded-md transition-opacity group-has-[[data-pending]]/item:pointer-events-none group-has-[[data-pending]]/item:opacity-50 group-data-pending/sheet:pointer-events-none group-data-pending/sheet:opacity-50 active:opacity-80 sm:size-24"
				aria-label={`Voir ${item.sku.product.title}`}
			>
				{primaryImage && thumbSrc ? (
					<Image
						src={thumbSrc}
						alt={primaryImage.altText ?? item.sku.product.title}
						fill
						className="object-cover"
						sizes="(min-width: 640px) 96px, 80px"
						quality={IMAGE_QUALITY.STANDARD}
						placeholder={primaryImage.blurDataUrl ? "blur" : "empty"}
						blurDataURL={primaryImage.blurDataUrl ?? undefined}
					/>
				) : (
					<div className="text-muted-foreground flex h-full w-full items-center justify-center">
						<span className="text-2xs">Pas d&apos;image</span>
					</div>
				)}
			</Link>

			{/*
			 * `grid`, et pas seulement `min-w-0` : le parent `<article>` est lui-même une
			 * grille, donc ce div en est une CELLULE — un conteneur de bloc. Les `flex-1`
			 * et `gap-y-1` qu'il portait n'avaient aucun effet (l'un ne vaut que pour un
			 * enfant de flex, l'autre que pour un conteneur flex/grid), si bien que le
			 * rythme de 4 px voulu entre le titre, le `<dl>` et le prix n'existait pas.
			 * En `grid`, `gap-y-1` devient réel et devient le SEUL propriétaire de cet
			 * espacement — d'où le retrait des `mt-1` posés plus bas en compensation.
			 */}
			<div className="grid min-w-0 gap-y-1">
				<h3 className="text-sm" id={titleId}>
					<Link
						href={`/creations/${item.sku.product.slug}`}
						onClick={onClose}
						className="focus-ring can-hover:hover:text-foreground active:text-muted-foreground line-clamp-2 block rounded font-medium transition-colors group-has-[[data-pending]]/item:pointer-events-none group-has-[[data-pending]]/item:opacity-50 group-data-pending/sheet:pointer-events-none group-data-pending/sheet:opacity-50 sm:line-clamp-1"
					>
						{item.sku.product.title}
					</Link>
				</h3>

				<dl className="text-muted-foreground flex flex-wrap gap-x-1 text-xs">
					{colorsLabel && (
						<div className="inline-flex items-center gap-1">
							<dt className="sr-only">{colorNames.length > 1 ? "Couleurs" : "Couleur"}</dt>
							<dd className="inline-flex items-center gap-1">
								<span
									className="border-border inline-block size-2.5 rounded-full border"
									style={buildSwatchStyle(colorHexes)}
									aria-hidden="true"
								/>
								{colorsLabel}
							</dd>
						</div>
					)}
					{materialsLabel && (
						<div className="inline-flex items-center">
							{colorsLabel && (
								<span aria-hidden="true" className="mr-1">
									/
								</span>
							)}
							<dt className="sr-only">Matière</dt>
							<dd>{materialsLabel}</dd>
						</div>
					)}
					{item.sku.size && (
						<div className="inline-flex items-center">
							{/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- helpers return string ("" is falsy, ?? misses) */}
							{(colorsLabel || materialsLabel) && (
								<span aria-hidden="true" className="mr-1">
									/
								</span>
							)}
							<dt className="sr-only">Taille</dt>
							<dd>{item.sku.size}</dd>
						</div>
					)}
				</dl>

				<div
					className={cn(
						"text-sm font-medium tabular-nums",
						"group-has-[[data-pending]]/item:opacity-50 group-has-[[data-pending]]/item:motion-safe:animate-pulse",
					)}
				>
					{/* Pas de prix barré/remise (retrait Omnibus 2026-08-08, cf. ProductPrice) */}
					{item.quantity > 1 ? (
						<>
							{formatEuro(subtotal)}{" "}
							<span className="text-muted-foreground font-normal">
								({item.quantity} x {formatEuro(item.priceAtAdd)})
							</span>
						</>
					) : (
						formatEuro(item.priceAtAdd)
					)}
				</div>

				{/* Libellés via `CART_ITEM_ISSUE_LABELS` : la liste de l'en-tête du panier
				    (`cart-sheet.tsx`) affiche le même état via `getCartItemIssueLabel`, qui lit
				    la même SSOT. Les deux pastilles peuvent coexister — un SKU désactivé ET en
				    rupture — ce que le libellé unique du service ne peut pas exprimer. */}
				{hasIssue ? (
					<div className="flex flex-wrap gap-1">
						{isOutOfStock && (
							<CartStateChip tone="danger">{CART_ITEM_ISSUE_LABELS.outOfStock}</CartStateChip>
						)}
						{isInactive && (
							<CartStateChip tone="danger">{CART_ITEM_ISSUE_LABELS.inactive}</CartStateChip>
						)}
					</div>
				) : item.sku.inventory > 1 && item.sku.inventory <= STOCK_THRESHOLDS.LOW ? (
					<p>
						<CartStateChip tone="warning">Plus que {item.sku.inventory} en stock</CartStateChip>
					</p>
				) : null}
			</div>

			<div
				className="flex items-center justify-between gap-2"
				data-no-swipe
				data-base-ui-swipe-ignore=""
			>
				{item.sku.inventory === 1 && !hasIssue ? (
					<CartStateChip tone="warning">Il n&apos;en reste qu&apos;un</CartStateChip>
				) : (
					<CartItemQuantitySelector
						skuId={item.sku.id}
						currentQuantity={item.quantity}
						maxQuantity={item.sku.inventory}
						isInactive={isInactive}
						itemName={item.sku.product.title}
					/>
				)}

				<CartItemRemoveButton
					skuId={item.sku.id}
					itemName={item.sku.product.title}
					quantity={item.quantity}
				/>
			</div>
		</article>
	);

	if (!isMobile) return article;

	return (
		<SwipeableCard
			className="rounded-md"
			peek={peek}
			leftAction={{
				children: <TrashIcon className="text-destructive-foreground size-5" aria-hidden="true" />,
				label: `Supprimer ${item.sku.product.title} du panier`,
				onAction: handleSwipeRemove,
			}}
		>
			{article}
		</SwipeableCard>
	);
}
