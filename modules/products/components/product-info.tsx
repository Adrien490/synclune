import { Hand } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { HandDrawnAccent } from "@/shared/components/animations";
import { ShareButton } from "@/modules/products/components/share-button";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import { WishlistButton } from "@/modules/wishlist/components/wishlist-button";

interface ProductInfoProps {
	product: GetProductReturn;
	isInWishlist?: boolean;
}

/**
 * ProductInfo - Affiche les informations de base du produit
 *
 * Responsabilités :
 * - Titre du produit avec bouton wishlist + partage
 * - Badge type (catégorie)
 * - Bouton wishlist
 */
export function ProductInfo({ product, isInWishlist }: ProductInfoProps) {
	return (
		<div className="space-y-4">
			{/* Titre avec boutons share + wishlist */}
			<div className="flex items-start justify-between gap-4">
				<div className="flex-1 gap-y-2">
					{/* h1 sr-only mobile : PageHeader (h1 desktop) est `hidden sm:block`, donc absent du DOM mobile.
					    Mobile-first indexing Google + lecteurs d'écran iOS/Android attendent un h1. */}
					<h1 className="sr-only sm:hidden">{product.title}</h1>
					<p
						className="font-display text-foreground text-3xl/10 font-normal tracking-tight text-balance sm:text-4xl/12"
						itemProp="name"
					>
						{product.title}
					</p>
					<HandDrawnAccent
						variant="heart"
						color="var(--primary)"
						width={22}
						height={22}
						className="opacity-70"
					/>
					<p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs sm:text-sm">
						<Hand className="size-3.5 shrink-0" aria-hidden="true" strokeWidth={1.6} />
						<span>Fait main en France</span>
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-1 sm:hidden">
					<ShareButton
						title={product.title}
						text={`Découvrez ${product.title} sur Synclune`}
						url={`/creations/${product.slug}`}
						size="lg"
					/>
					<WishlistButton
						productTitle={product.title}
						productId={product.id}
						isInWishlist={isInWishlist ?? false}
						size="lg"
						enableUndoToast
					/>
				</div>
			</div>

			{/* Labels et badges + boutons share/wishlist sur desktop */}
			<div className="flex flex-wrap items-center gap-2">
				{product.type && (
					<Badge
						variant="outline"
						className="border-primary/30 rounded-full px-3 py-1.5 text-xs/5 font-medium tracking-normal antialiased sm:py-1 sm:text-sm/6"
					>
						{product.type.label}
					</Badge>
				)}

				{/* Boutons share + wishlist sur desktop */}
				<div className="ml-auto hidden items-center gap-1 sm:flex">
					<ShareButton
						title={product.title}
						text={`Découvrez ${product.title} sur Synclune`}
						url={`/creations/${product.slug}`}
						size="lg"
					/>
					<WishlistButton
						productTitle={product.title}
						productId={product.id}
						isInWishlist={isInWishlist ?? false}
						size="lg"
						enableUndoToast
					/>
				</div>
			</div>
		</div>
	);
}
