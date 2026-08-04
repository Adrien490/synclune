import { HandIcon } from "@phosphor-icons/react/ssr";

import { BRAND } from "@/shared/constants/brand";
import { ShareButton } from "@/modules/products/components/share-button";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import { WishlistButton } from "@/modules/wishlist/components/wishlist-button";

interface ProductInfoProps {
	product: GetProductReturn;
	isInWishlist?: boolean;
}

/**
 * ProductInfo - En-tête de la fiche : type, titre, provenance, partage, favoris.
 *
 * Trois points de vigilance hérités d'un audit (2026-08-04) :
 *
 * 1. **Le type est un eyebrow, plus un `Badge`.** Il annonce la famille du bijou
 *    au-dessus du titre au lieu de flotter dans une rangée à lui ; c'est ce qui
 *    libère la ligne du titre pour les deux seules actions de l'en-tête.
 * 2. **Un seul cluster partage + favoris.** Il en existait deux — un `sm:hidden`
 *    et un `hidden sm:flex` — donc deux boutons portant le même nom accessible
 *    dans l'arbre, dont un masqué. Un seul cluster, à droite du titre.
 * 3. **Plus d'accent dessiné en flux.** Un `<svg>` est `display:inline` : posé
 *    entre deux blocs il formait sa propre ligne, et le cœur se retrouvait seul
 *    au milieu de rien. La primitive `HandDrawnAccent` sert à souligner ou à
 *    entourer quelque chose — pas à flotter.
 */
export function ProductInfo({ product, isInWishlist }: ProductInfoProps) {
	return (
		<div className="flex items-start justify-between gap-4">
			{/* `min-w-0` : sans lui, un titre long empêche le cluster d'actions de
			    rester à droite (un item flex ne passe pas sous sa taille min-content). */}
			<div className="min-w-0 flex-1 space-y-1">
				{product.type && (
					<p className="text-muted-foreground text-xs/5 font-medium tracking-widest uppercase antialiased">
						{product.type.label}
					</p>
				)}

				{/* h1 sr-only mobile : PageHeader (h1 desktop) est `hidden sm:block`, donc absent du DOM mobile.
				    Mobile-first indexing Google + lecteurs d'écran iOS/Android attendent un h1. */}
				<h1 className="sr-only sm:hidden">{product.title}</h1>
				<p
					className="font-display text-foreground text-3xl/10 font-normal tracking-tight text-balance sm:text-4xl/12"
					itemProp="name"
				>
					{product.title}
				</p>

				<p className="text-muted-foreground flex items-center gap-1.5 text-xs sm:text-sm">
					<HandIcon className="size-3.5 shrink-0" aria-hidden="true" />
					<span>Fait main, chez moi, à {BRAND.contact.location.city}</span>
				</p>
			</div>

			<div className="flex shrink-0 items-center gap-1">
				<ShareButton
					title={product.title}
					text={`Découvre ${product.title} sur Synclune`}
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
	);
}
