import { Badge } from "@/shared/components/ui/badge";
import type { GetProductReturn } from "@/modules/products/types/product.types";
// import { WishlistButtonCompact } from "@/domains/wishlist-item/features/add-to-wishlist/components/wishlist-button-compact";
import { Crown, Heart } from "lucide-react";
import Link from "next/link";
import { ViewTransition } from "react";

interface ProductInfoProps {
	product: GetProductReturn;
	isInWishlist?: boolean;
	selectedSkuId?: string;
}

/**
 * ProductInfo - Affiche les informations de base du produit
 *
 * Responsabilités :
 * - Titre du produit avec bouton wishlist
 * - Description
 * - Badge type (catégorie)
 * - Badge collection avec lien
 * - Badge "Créé à la main"
 */
export function ProductInfo({
	product,
	isInWishlist,
	selectedSkuId,
}: ProductInfoProps) {
	return (
		<div className="space-y-4">
			{/* Titre (wishlist button désactivé temporairement) */}
			{/* {selectedSkuId && (
				<div className="flex items-start justify-between gap-3">
					<h1
						className="text-3xl/10 sm:text-4xl/10 font-bold tracking-tight text-foreground flex-1"
						itemProp="name"
					>
						{product.title}
					</h1>
					<WishlistButtonCompact
						skuId={selectedSkuId}
						isInWishlist={isInWishlist ?? false}
					/>
				</div>
			)} */}

			{/* {!selectedSkuId && ( */}
				<ViewTransition name={`product-title-${product.slug}`}>
					<h1
						className="text-3xl/10 sm:text-4xl/10 font-bold tracking-tight text-foreground"
						itemProp="name"
					>
						{product.title}
					</h1>
				</ViewTransition>
			{/* )} */}

			{/* Labels et badges */}
			<div className="flex flex-wrap items-center gap-2">
				{product.type && (
					<Badge
						variant="outline"
						className="text-xs/5 tracking-normal antialiased font-medium px-3 py-1"
					>
						<Crown className="w-3 h-3 mr-1" aria-hidden="true" />
						{product.type.label}
					</Badge>
				)}

				{product.collection && (
					<Link href={`/collections/${product.collection.slug}`}>
						<Badge
							variant="outline"
							className="text-xs/5 tracking-normal antialiased font-medium px-3 py-1 gap-1.5 cursor-pointer hover:bg-primary/10 transition-colors"
						>
							<Heart className="w-3 h-3" aria-hidden="true" />
							{product.collection.name}
						</Badge>
					</Link>
				)}
			</div>

			{/* Description */}
			{product.description && (
				<div
					className="text-base/7 tracking-normal antialiased text-muted-foreground prose-sm max-w-none space-y-2"
					itemProp="description"
				>
					{product.description.split("\n").map((line, i) => (
						<p key={i}>{line || "\u00A0"}</p>
					))}
				</div>
			)}
		</div>
	);
}
