"use client";

import { Badge } from "@/shared/components/ui/badge";
import { getVideoMimeType } from "@/modules/media/utils/media-utils";
import { formatEuro } from "@/shared/utils/format-euro";
import { cn } from "@/shared/utils/cn";
import { CartItemQuantitySelector } from "./cart-item-quantity-selector";
import { CartItemRemoveButton } from "./cart-item-remove-button";
import type { CartItem } from "../types/cart.types";
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
	const subtotal = item.priceAtAdd * item.quantity;

	const isOutOfStock = item.sku.inventory < item.quantity;
	const isInactive = !item.sku.isActive || item.sku.product.status !== "PUBLIC";
	const hasIssue = isOutOfStock || isInactive;

	const hasDiscount =
		item.sku.compareAtPrice && item.sku.compareAtPrice > item.priceAtAdd;

	const discountPercent = hasDiscount
		? Math.round(
				((item.sku.compareAtPrice! - item.priceAtAdd) /
					item.sku.compareAtPrice!) *
					100
			)
		: 0;

	const primaryImage = item.sku.images[0];

	return (
		<article
			className={cn(
				"group/item border rounded-lg p-3",
				"grid grid-cols-[5rem_1fr] sm:grid-cols-[6rem_1fr_auto] gap-3",
				hasIssue ? "border-destructive/50 bg-destructive/5" : "border-border"
			)}
			aria-label={`${item.sku.product.title}, quantité ${item.quantity}`}
		>
			{/* Image - row-span-2 sur mobile pour occuper les 2 lignes */}
			<Link
				href={`/creations/${item.sku.product.slug}`}
				onClick={onClose}
				className="relative size-20 sm:size-24 row-span-2 sm:row-span-1 rounded-md overflow-hidden bg-muted active:opacity-80 transition-opacity group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50 group-has-[[data-pending]]/item:pointer-events-none group-has-[[data-pending]]/item:opacity-50"
				aria-label={`Voir ${item.sku.product.title}`}
			>
				{primaryImage ? (
					primaryImage.mediaType === "VIDEO" ? (
						<video
							className="w-full h-full object-cover"
							muted
							loop
							playsInline
							preload="none"
							poster={primaryImage.thumbnailUrl ?? undefined}
							aria-label={
								primaryImage.altText || `Video du produit ${item.sku.product.title}`
							}
							aria-describedby={`video-desc-${item.id}`}
						>
							<source
								src={primaryImage.url}
								type={getVideoMimeType(primaryImage.url)}
							/>
							<p id={`video-desc-${item.id}`} className="sr-only">
								Video de presentation du bijou {item.sku.product.title}. La video
								est en lecture automatique et sans son.
							</p>
						</video>
					) : (
						<Image
							src={primaryImage.url}
							alt={primaryImage.altText || item.sku.product.title}
							fill
							className="object-cover"
							sizes="(min-width: 640px) 96px, 80px"
							quality={80}
							placeholder={primaryImage.blurDataUrl ? "blur" : "empty"}
							blurDataURL={primaryImage.blurDataUrl ?? undefined}
						/>
					)
				) : (
					<div className="w-full h-full flex items-center justify-center text-muted-foreground">
						<span className="text-[10px]">Pas d&apos;image</span>
					</div>
				)}
			</Link>

			{/* Infos */}
			<div className="flex-1 min-w-0 space-y-1">
				{/* Nom */}
				<Link
					href={`/creations/${item.sku.product.slug}`}
					onClick={onClose}
					className="font-medium text-sm hover:text-foreground active:text-muted-foreground transition-colors line-clamp-1 block group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50 group-has-[[data-pending]]/item:pointer-events-none group-has-[[data-pending]]/item:opacity-50"
					aria-label={`Voir ${item.sku.product.title}`}
				>
					{item.sku.product.title}
				</Link>

				{/* Attributs */}
				<dl className="flex flex-wrap gap-x-1 text-xs text-muted-foreground">
					{item.sku.color && (
						<div className="inline-flex items-center gap-1">
							<dt className="sr-only">Couleur</dt>
							<dd className="inline-flex items-center gap-1">
								<span
									className="w-2.5 h-2.5 rounded-full border border-border inline-block"
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
							{(item.sku.color || item.sku.material) && (
								<span aria-hidden="true" className="mr-1">
									/
								</span>
							)}
							<dt className="sr-only">Taille</dt>
							<dd>{item.sku.size}</dd>
						</div>
					)}
				</dl>

				{/* Prix */}
				<div className="flex items-center gap-2">
					<span className="font-mono font-medium text-sm">
						{formatEuro(item.priceAtAdd)}
					</span>
					{hasDiscount && (
						<>
							<span
								className="text-xs text-muted-foreground line-through font-mono"
								aria-hidden="true"
							>
								{formatEuro(item.sku.compareAtPrice!)}
							</span>
							<Badge
								variant="secondary"
								className="text-[10px] px-1 py-0 bg-accent/20"
								aria-label={`Reduction de ${discountPercent} pourcent`}
							>
								-{discountPercent}%
							</Badge>
							<span className="sr-only">
								Prix reduit de {formatEuro(item.sku.compareAtPrice!)} a{" "}
								{formatEuro(item.priceAtAdd)}
							</span>
						</>
					)}
				</div>

				{/* Badges problemes */}
				{hasIssue && (
					<div className="flex gap-1">
						{isOutOfStock && (
							<Badge variant="destructive" className="text-[10px] px-1.5 py-0">
								Rupture
							</Badge>
						)}
						{isInactive && (
							<Badge variant="destructive" className="text-[10px] px-1.5 py-0">
								Indisponible
							</Badge>
						)}
					</div>
				)}
			</div>

			{/* Actions - pleine largeur sur mobile (ligne 2), colonne droite sur desktop */}
			<div
				className={cn(
					"col-span-2 sm:col-span-1",
					"flex items-center justify-between gap-2",
					"sm:flex-col sm:items-end sm:gap-2"
				)}
			>
				{/* Supprimer - à droite sur mobile, en haut sur desktop */}
				<div className="order-3 sm:order-1">
					<CartItemRemoveButton
						cartItemId={item.id}
						itemName={item.sku.product.title}
					/>
				</div>

				{/* Quantité - à gauche sur mobile, au milieu sur desktop */}
				<div className="order-1 sm:order-2 sm:mt-auto">
					<CartItemQuantitySelector
						cartItemId={item.id}
						currentQuantity={item.quantity}
						maxQuantity={item.sku.inventory}
						isInactive={isInactive}
					/>
				</div>

				{/* Sous-total - au milieu sur mobile, en bas sur desktop */}
				<span
					aria-label={`Sous-total: ${formatEuro(subtotal)}`}
					className={cn(
						"order-2 sm:order-3 font-mono font-semibold text-sm transition-opacity duration-200",
						"group-has-[[data-pending]]/item:opacity-50 group-has-[[data-pending]]/item:animate-pulse"
					)}
				>
					{formatEuro(subtotal)}
				</span>
			</div>
		</article>
	);
}
