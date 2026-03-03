"use client";

import { Badge } from "@/shared/components/ui/badge";
import { getVideoMimeType } from "@/modules/media/utils/media-utils";
import { formatEuro } from "@/shared/utils/format-euro";
import { cn } from "@/shared/utils/cn";
import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";
import { CartItemQuantitySelector } from "./cart-item-quantity-selector";
import { CartItemRemoveButton } from "./cart-item-remove-button";

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
import Image from "next/image";
import Link from "next/link";

interface CartSheetItemRowProps {
	item: CartItem;
	onClose?: () => void;
}

/**
 * Ligne d'article version compacte pour le cart sheet
 * Layout vertical optimise pour la largeur du sheet
 */
export function CartSheetItemRow({ item, onClose }: CartSheetItemRowProps) {
	const subtotal = getCartItemSubtotal(item);
	const isOutOfStock = isCartItemOutOfStock(item);
	const isInactive = isCartItemInactive(item);
	const hasIssue = hasCartItemIssue(item);
	const hasDiscount = hasCartItemDiscount(item);
	const discountPercent = getCartItemDiscountPercent(item);
	const primaryImage = getCartItemPrimaryImage(item);

	const ariaLabelParts = [
		item.sku.product.title,
		item.sku.color?.name,
		item.sku.material?.name,
		`quantité ${item.quantity}`,
		`${formatEuro(getCartItemSubtotal(item))}`,
	].filter(Boolean);

	return (
		<article
			className={cn(
				"group/item rounded-lg border p-3.5",
				"grid grid-cols-[5rem_1fr] gap-3.5 sm:grid-cols-[6rem_1fr]",
				hasIssue ? "border-destructive/50 bg-destructive/5" : "border-border",
			)}
			aria-label={ariaLabelParts.join(", ")}
		>
			{/* Image - row-span-2 sur mobile pour occuper les 2 lignes */}
			<Link
				href={`/creations/${item.sku.product.slug}`}
				onClick={onClose}
				className="bg-muted focus-visible:ring-ring relative row-span-2 size-20 overflow-hidden rounded-md transition-opacity group-has-[[data-pending]]/item:pointer-events-none group-has-[[data-pending]]/item:opacity-50 group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:opacity-80 sm:size-24"
				aria-label={`Voir ${item.sku.product.title}`}
			>
				{primaryImage ? (
					primaryImage.mediaType === "VIDEO" ? (
						<video
							className="h-full w-full object-cover"
							autoPlay
							muted
							loop
							playsInline
							preload="none"
							poster={primaryImage.thumbnailUrl ?? undefined}
							aria-label={primaryImage.altText ?? `Video du produit ${item.sku.product.title}`}
							aria-describedby={`video-desc-${item.id}`}
						>
							<source src={primaryImage.url} type={getVideoMimeType(primaryImage.url)} />
							<p id={`video-desc-${item.id}`} className="sr-only">
								Video de presentation du bijou {item.sku.product.title}. La video est en lecture
								automatique et sans son.
							</p>
						</video>
					) : (
						<Image
							src={primaryImage.url}
							alt={primaryImage.altText ?? item.sku.product.title}
							fill
							className="object-cover"
							sizes="(min-width: 640px) 96px, 80px"
							quality={80}
							placeholder={primaryImage.blurDataUrl ? "blur" : "empty"}
							blurDataURL={primaryImage.blurDataUrl ?? undefined}
						/>
					)
				) : (
					<div className="text-muted-foreground flex h-full w-full items-center justify-center">
						<span className="text-[10px]">Pas d&apos;image</span>
					</div>
				)}
			</Link>

			{/* Infos */}
			<div className="min-w-0 flex-1 space-y-1">
				{/* Nom */}
				<Link
					href={`/creations/${item.sku.product.slug}`}
					onClick={onClose}
					className="hover:text-foreground active:text-muted-foreground focus-visible:ring-ring line-clamp-2 block rounded text-sm font-medium transition-colors group-has-[[data-pending]]/item:pointer-events-none group-has-[[data-pending]]/item:opacity-50 group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:line-clamp-1"
				>
					{item.sku.product.title}
				</Link>

				{/* Attributs */}
				<dl className="text-muted-foreground flex flex-wrap gap-x-1 text-xs">
					{item.sku.color && (
						<div className="inline-flex items-center gap-1">
							<dt className="sr-only">Couleur</dt>
							<dd className="inline-flex items-center gap-1">
								<span
									className="border-border inline-block h-2.5 w-2.5 rounded-full border"
									style={{ backgroundColor: item.sku.color.hex }}
									aria-hidden="true"
								/>
								{item.sku.color.name}
							</dd>
						</div>
					)}
					{item.sku.material && (
						<div className="inline-flex items-center">
							{item.sku.color && (
								<span aria-hidden="true" className="mr-1">
									/
								</span>
							)}
							<dt className="sr-only">Matiere</dt>
							<dd>{item.sku.material.name}</dd>
						</div>
					)}
					{item.sku.size && (
						<div className="inline-flex items-center">
							{(item.sku.color ?? item.sku.material) && (
								<span aria-hidden="true" className="mr-1">
									/
								</span>
							)}
							<dt className="sr-only">Taille</dt>
							<dd>{item.sku.size}</dd>
						</div>
					)}
				</dl>

				{/* Prix final */}
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
								className="bg-accent/20 px-1 py-0 text-[10px]"
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

				{/* Badges stock */}
				{hasIssue ? (
					<div className="flex gap-1">
						{isOutOfStock && (
							<Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
								Rupture
							</Badge>
						)}
						{isInactive && (
							<Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
								Indisponible
							</Badge>
						)}
					</div>
				) : item.sku.inventory <= STOCK_THRESHOLDS.LOW ? (
					<p className="text-xs text-orange-800">Plus que {item.sku.inventory} en stock</p>
				) : null}
			</div>

			{/* Actions - à droite de l'image, sous le prix */}
			<div className="flex items-center justify-between gap-2">
				{/* Quantité - à gauche (rendu uniquement si inventory > 1) */}
				{item.sku.inventory === 1 && !hasIssue ? (
					<span className="text-xs font-medium text-orange-800">Dernière pièce !</span>
				) : (
					<CartItemQuantitySelector
						cartItemId={item.id}
						currentQuantity={item.quantity}
						maxQuantity={item.sku.inventory}
						isInactive={isInactive}
					/>
				)}

				{/* Supprimer - à droite */}
				<CartItemRemoveButton
					cartItemId={item.id}
					itemName={item.sku.product.title}
					quantity={item.quantity}
				/>
			</div>
		</article>
	);
}
