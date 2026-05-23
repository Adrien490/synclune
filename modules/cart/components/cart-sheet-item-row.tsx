"use client";

import { Badge } from "@/shared/components/ui/badge";
import { formatEuro } from "@/shared/utils/format-euro";
import { cn } from "@/shared/utils/cn";
import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";
import { SwipeableCard } from "@/shared/components/swipeable-card";
import { useAlertDialogStore } from "@/shared/providers/alert-dialog-store-provider";
import { CartItemQuantitySelector } from "./cart-item-quantity-selector";
import { CartItemRemoveButton } from "./cart-item-remove-button";
import { REMOVE_CART_ITEM_DIALOG_ID } from "./remove-cart-item-alert-dialog";
import { buildSwatchStyle } from "@/modules/colors/utils/swatch-style";
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
	hasCartItemDiscount,
	getCartItemDiscountPercent,
	getCartItemPrimaryImage,
} from "../services/cart-item.service";
import { Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface CartSheetItemRowProps {
	item: CartItem;
	onClose?: () => void;
	/**
	 * Mobile viewport → enables swipe-to-delete gesture via SwipeableCard wrapper.
	 * Desktop keeps the click-remove button only.
	 */
	isMobile?: boolean;
}

/**
 * Ligne d'article version compacte pour le cart sheet
 * Layout vertical optimise pour la largeur du sheet
 */
export function CartSheetItemRow({ item, onClose, isMobile = false }: CartSheetItemRowProps) {
	const subtotal = getCartItemSubtotal(item);
	const isOutOfStock = isCartItemOutOfStock(item);
	const isInactive = isCartItemInactive(item);
	const hasIssue = hasCartItemIssue(item);
	const hasDiscount = hasCartItemDiscount(item);
	const discountPercent = getCartItemDiscountPercent(item);
	const primaryImage = getCartItemPrimaryImage(item);
	const openAlertDialog = useAlertDialogStore((state) => state.openAlertDialog);

	const materialsLabel = getSkuMaterialsLabel(item.sku.materials);
	const colorsLabel = getSkuColorsDisplayLabel(item.sku.colors);
	const colorHexes = getColorHexes(item.sku.colors);
	const colorNames = getColorNames(item.sku.colors);
	const ariaLabelParts = [
		item.sku.product.title,
		colorsLabel,
		materialsLabel,
		`quantité ${item.quantity}`,
		formatEuro(subtotal),
	].filter(Boolean);

	const handleSwipeRemove = () => {
		openAlertDialog(REMOVE_CART_ITEM_DIALOG_ID, {
			cartItemId: item.id,
			skuId: item.sku.id,
			itemName: item.sku.product.title,
			quantity: item.quantity,
		});
	};

	const thumbSrc =
		primaryImage?.mediaType === "VIDEO"
			? (primaryImage.thumbnailUrl ?? primaryImage.url)
			: primaryImage?.url;

	const article = (
		<article
			className={cn(
				"group/item rounded-lg border p-3.5",
				"grid grid-cols-[5rem_1fr] gap-3.5 sm:grid-cols-[6rem_1fr]",
				hasIssue ? "border-destructive/50 bg-destructive/5" : "border-border",
			)}
			aria-label={ariaLabelParts.join(", ")}
		>
			<Link
				href={`/creations/${item.sku.product.slug}`}
				onClick={onClose}
				className="bg-muted focus-visible:ring-ring relative row-span-2 size-20 overflow-hidden rounded-md transition-opacity group-has-[[data-pending]]/item:pointer-events-none group-has-[[data-pending]]/item:opacity-50 group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:opacity-80 sm:size-24"
				aria-label={`Voir ${item.sku.product.title}`}
			>
				{primaryImage && thumbSrc ? (
					<Image
						src={thumbSrc}
						alt={primaryImage.altText ?? item.sku.product.title}
						fill
						className="object-cover"
						sizes="(min-width: 640px) 96px, 80px"
						quality={80}
						placeholder={primaryImage.blurDataUrl ? "blur" : "empty"}
						blurDataURL={primaryImage.blurDataUrl ?? undefined}
					/>
				) : (
					<div className="text-muted-foreground flex h-full w-full items-center justify-center">
						<span className="text-2xs">Pas d&apos;image</span>
					</div>
				)}
			</Link>

			<div className="min-w-0 flex-1 gap-y-1">
				<h3 className="text-sm">
					<Link
						href={`/creations/${item.sku.product.slug}`}
						onClick={onClose}
						className="hover:text-foreground active:text-muted-foreground focus-visible:ring-ring line-clamp-2 block rounded font-medium transition-colors group-has-[[data-pending]]/item:pointer-events-none group-has-[[data-pending]]/item:opacity-50 group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:line-clamp-1"
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
					{hasDiscount && (
						<span className="ml-2 inline-flex items-center gap-1">
							<span className="text-muted-foreground text-xs line-through" aria-hidden="true">
								{formatEuro(item.sku.compareAtPrice!)}
							</span>
							<Badge
								variant="secondary"
								className="bg-accent/20 text-2xs px-1 py-0"
								aria-label={`Reduction de ${discountPercent} pourcent`}
							>
								-{discountPercent}%
							</Badge>
							<span className="sr-only">
								Prix reduit de {formatEuro(item.sku.compareAtPrice!)} a{" "}
								{formatEuro(item.priceAtAdd)}
							</span>
						</span>
					)}
				</div>

				{hasIssue ? (
					<div className="flex gap-1">
						{isOutOfStock && (
							<Badge variant="destructive" className="text-2xs px-1.5 py-0">
								Rupture
							</Badge>
						)}
						{isInactive && (
							<Badge variant="destructive" className="text-2xs px-1.5 py-0">
								Indisponible
							</Badge>
						)}
					</div>
				) : item.sku.inventory > 1 && item.sku.inventory <= STOCK_THRESHOLDS.LOW ? (
					<p className="text-xs text-amber-700">Plus que {item.sku.inventory} en stock</p>
				) : null}
			</div>

			<div className="flex items-center justify-between gap-2" data-no-swipe data-vaul-no-drag>
				{item.sku.inventory === 1 && !hasIssue ? (
					<span className="text-xs font-medium text-amber-700">Dernière pièce !</span>
				) : (
					<CartItemQuantitySelector
						cartItemId={item.id}
						currentQuantity={item.quantity}
						maxQuantity={item.sku.inventory}
						isInactive={isInactive}
					/>
				)}

				<CartItemRemoveButton
					cartItemId={item.id}
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
			className="rounded-lg"
			leftAction={{
				children: <Trash2 className="text-destructive-foreground size-5" aria-hidden="true" />,
				label: `Supprimer ${item.sku.product.title} du panier`,
				onAction: handleSwipeRemove,
			}}
		>
			{article}
		</SwipeableCard>
	);
}
