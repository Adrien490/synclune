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

				{/* L'UNIQUE h1 de la fiche, visible à tous les viewports. L'ancien
				    montage le partageait avec un PageHeader desktop (`hidden sm:block`)
				    et un repli `sr-only sm:hidden` ici — deux porteurs pour un titre.
				    Depuis l'harmonisation sur « L'étal continue », la page n'a plus
				    de bande d'en-tête : le titre appartient à la fiche. */}
				{/* Pas d'`itemProp` : la page n'a aucun `itemScope`/`itemType`, donc
				    l'attribut était de la microdata orpheline, inerte pour tout
				    consommateur. Le nom du produit est porté par le JSON-LD
				    (`generateStructuredData`, `Product.name`). */}
				{/* `wrap-anywhere` (PAS `break-words`) : à 200% de zoom texte sur mobile
				    (WCAG 1.4.4), un mot long du titre dépasse la colonne `min-w-0` et met
				    un scroll horizontal à la page. `overflow-wrap: break-word` ne change
				    pas la taille min-content de l'item flex — la colonne refusait de
				    rétrécir et le débordement restait (93px mesurés) ; `anywhere` la
				    change, et ne casse un mot qu'en dernier recours. */}
				<h1 className="font-display text-foreground text-3xl/10 font-normal tracking-tight text-balance wrap-anywhere sm:text-4xl/12">
					{product.name}
				</h1>

				{/* `flex-wrap` + `min-w-0` : à 200% de zoom texte, les 3 derniers px de
				    débordement de la fiche venaient de cette ligne icône+texte, dont le
				    min-content excédait la colonne (WCAG 1.4.4). */}
				<p className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-1.5 text-xs sm:text-sm">
					<HandIcon className="size-3.5 shrink-0" aria-hidden="true" />
					<span>Fait main, chez moi, à {BRAND.contact.location.city}</span>
				</p>
			</div>

			<div className="flex shrink-0 items-center gap-1">
				<ShareButton
					title={product.name}
					text={`Découvre ${product.name} sur Synclune`}
					url={`/creations/${product.slug}`}
					size="lg"
				/>
				<WishlistButton
					productTitle={product.name}
					productId={product.id}
					isInWishlist={isInWishlist ?? false}
					size="lg"
					enableUndoToast
				/>
			</div>
		</div>
	);
}
