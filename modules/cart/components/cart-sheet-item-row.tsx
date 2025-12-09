"use client";

import { Badge } from "@/shared/components/ui/badge";
import { getVideoMimeType } from "@/modules/media/utils/media-utils";
import { formatEuro } from "@/shared/utils/format-euro";
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
		<div
			className={`flex gap-3 p-3 border rounded-lg ${
				hasIssue ? "border-destructive/50 bg-destructive/5" : "border-border"
			}`}
		>
			{/* Image */}
			<Link
				href={`/creations/${item.sku.product.slug}`}
				onClick={onClose}
				className="relative w-20 h-20 shrink-0 rounded-md overflow-hidden bg-muted"
			>
				{primaryImage ? (
					primaryImage.mediaType === "VIDEO" ? (
						<video
							className="w-full h-full object-cover"
							muted
							loop
							playsInline
							preload="none"
							aria-label={
								primaryImage.altText || `Video ${item.sku.product.title}`
							}
						>
							<source
								src={primaryImage.url}
								type={getVideoMimeType(primaryImage.url)}
							/>
						</video>
					) : (
						<Image
							src={primaryImage.url}
							alt={primaryImage.altText || item.sku.product.title}
							fill
							className="object-cover"
							sizes="80px"
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
					className="font-medium text-sm hover:text-foreground transition-colors line-clamp-1 block"
				>
					{item.sku.product.title}
				</Link>

				{/* Attributs */}
				<div className="text-xs text-muted-foreground">
					{[
						item.sku.color && (
							<span key="color" className="inline-flex items-center gap-1">
								<span
									className="w-2.5 h-2.5 rounded-full border border-border inline-block"
									style={{ backgroundColor: item.sku.color.hex }}
								/>
								{item.sku.color.name}
							</span>
						),
						item.sku.material && (
							<span key="material">{item.sku.material.name}</span>
						),
						item.sku.size && <span key="size">{item.sku.size}</span>,
					]
						.filter(Boolean)
						.map((el, i, arr) => (
							<span key={i}>
								{el}
								{i < arr.length - 1 && " / "}
							</span>
						))}
				</div>

				{/* Prix */}
				<div className="flex items-center gap-2">
					<span className="font-mono font-medium text-sm">
						{formatEuro(item.priceAtAdd)}
					</span>
					{hasDiscount && (
						<>
							<span className="text-xs text-muted-foreground line-through font-mono">
								{formatEuro(item.sku.compareAtPrice!)}
							</span>
							<Badge
								variant="secondary"
								className="text-[10px] px-1 py-0 bg-accent/20"
							>
								-{discountPercent}%
							</Badge>
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

			{/* Actions */}
			<div className="flex flex-col items-end justify-between gap-1">
				<CartItemRemoveButton
					cartItemId={item.id}
					itemName={item.sku.product.title}
				/>

				<CartItemQuantitySelector
					cartItemId={item.id}
					currentQuantity={item.quantity}
					maxQuantity={item.sku.inventory}
					isInactive={isInactive}
				/>

				<div className="text-right">
					<span className="text-[10px] text-muted-foreground block">Sous-total</span>
					<span className="font-mono font-semibold text-sm">
						{formatEuro(subtotal)}
					</span>
				</div>
			</div>
		</div>
	);
}
