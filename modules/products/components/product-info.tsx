import { Badge } from "@/shared/components/ui/badge";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductSku } from "@/modules/products/types/product-services.types";
import { WishlistButtonDynamic } from "@/modules/wishlist/components/wishlist-button-dynamic";
import { Crown, Heart } from "lucide-react";
import Link from "next/link";
import { ViewTransition } from "react";

interface ProductInfoProps {
	product: GetProductReturn;
	defaultSku: ProductSku;
	isInWishlist?: boolean;
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
	defaultSku,
	isInWishlist,
}: ProductInfoProps) {
	return (
		<div className="space-y-4">
			{/* Titre avec bouton wishlist */}
			<div className="flex items-start justify-between gap-3">
				<ViewTransition name={`product-detail-title-${product.slug}`}>
					<h1
						className="text-3xl/10 sm:text-4xl/10 font-bold tracking-tight text-foreground flex-1"
						itemProp="name"
					>
						{product.title}
					</h1>
				</ViewTransition>
				<WishlistButtonDynamic
					product={product}
					defaultSku={defaultSku}
					initialIsInWishlist={isInWishlist ?? false}
				/>
			</div>

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

				{product.collections?.map((pc) => (
					<Link key={pc.collection.id} href={`/collections/${pc.collection.slug}`}>
						<Badge
							variant="outline"
							className="text-xs/5 tracking-normal antialiased font-medium px-3 py-1 gap-1.5 cursor-pointer hover:bg-primary/10 transition-colors"
						>
							<Heart className="w-3 h-3" aria-hidden="true" />
							{pc.collection.name}
						</Badge>
					</Link>
				))}
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
