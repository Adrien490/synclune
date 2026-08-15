"use client";

import { useTransition } from "react";
import { useAddToCart } from "@/modules/cart/hooks/use-add-to-cart";
import { dispatchFlyToCart } from "@/modules/cart/lib/fly-to-cart";
import { useDialog } from "@/shared/providers/overlay-store-provider";
import type { ProductCarouselItem } from "@/modules/products/types/product.types";
// ⚠️ Depuis le module FEUILLE, pas depuis `./variant-selector-dialog` : ce bouton est
// rendu sur chaque carte de la grille, et importer l'identifiant du dialog tirait
// tout son graphe (motion, ResponsiveDialog) dans le bundle du catalogue.
import { VARIANT_SELECTOR_DIALOG_ID } from "./variant-selector-utils";
import { cn } from "@/shared/utils/cn";
import { ShoppingBagIcon } from "@phosphor-icons/react/ssr";
import { Spinner } from "@/shared/components/ui/spinner";
import { Button } from "@/shared/components/ui/button";

interface AddToCartCardButtonProps {
	variantId: string;
	productTitle?: string;
	/**
	 * Produit complet pour déterminer si une sélection de variante est nécessaire.
	 * Required pour ouvrir le dialog de sélection VARIANT si le produit a plusieurs variantes.
	 */
	product: ProductCarouselItem;
	/** Couleur pré-sélectionnée depuis les swatches de la ProductCard */
	preselectedColor?: string | null;
	/** Variante d'affichage: "icon" (défaut) ou "mobile-full" (pleine largeur mobile) */
	variant?: "icon" | "mobile-full";
	className?: string;
}

/**
 * Bouton d'ajout au panier pour les cartes produit (redesign Atelier 2026-08-03)
 *
 * Deux variants:
 * - "icon" (desktop, masqué < sm par le call site) : pastille arrondie
 *   « Ajouter au panier » posée sur la photo, révélée au survol ET au
 *   focus clavier (parité WCAG 2.4.7, verrouillée par hover-focus-parity) ;
 *   toujours visible sur tactile ≥ sm sans hover fin (iPad, paysage)
 * - "mobile-full" : pleine largeur en pilule primary, cohérent avec le
 *   bouton primaire du site
 *
 * - Disabled pendant le pending pour éviter double-click
 * - Ouvre le dialog de sélection VARIANT uniquement si le produit a plusieurs variantes
 * - Ajoute directement au panier si le produit n'a qu'un seul VARIANT
 */
export function AddToCartCardButton({
	variantId,
	productTitle,
	product,
	preselectedColor,
	variant = "icon",
	className,
}: AddToCartCardButtonProps) {
	const isMobileFull = variant === "mobile-full";
	const { action, isPending: isAdding } = useAddToCart();
	const { open: openVariantSelector } = useDialog(VARIANT_SELECTOR_DIALOG_ID);

	// Le dialog est chargé en `dynamic(…, { loading: () => null })` : entre le tap et
	// son apparition, il y a le téléchargement d'un chunk de plusieurs dizaines de
	// kilo-octets. Sans cet état, le bouton ne bougeait pas et le réflexe était de
	// retaper. On précharge AVANT d'ouvrir : le `import()` partage le chunk de
	// `dynamic()`, donc le second tap est instantané.
	//
	// L'attente vient de `useTransition` et non d'un booléen fait main : React
	// tient `isPending` vrai sur tout le corps async, ce qui supprime le `.finally`
	// de remise à zéro. Il reste distinct de `isAdding` (`useAddToCart`, qui couvre
	// la Server Action) — les deux sont unis ci-dessous, volontairement.
	const [isOpeningSelector, startOpenSelector] = useTransition();
	const isPending = isAdding || isOpeningSelector;

	// Détermine si le produit a plusieurs variantes actives (VARIANTs)
	// Note: On filtre par isActive car le dialog ne montre que les VARIANTs actifs
	const activeVariantsCount = product.variants.filter((s) => s.active).length;
	const hasMultipleVariants = activeVariantsCount > 1;

	// Handler de clic : ouvre le dialog si plusieurs variantes, sinon soumet le formulaire
	const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.stopPropagation();

		if (hasMultipleVariants) {
			// Plusieurs variantes : précharger le chunk du dialog, puis l'ouvrir.
			e.preventDefault();
			startOpenSelector(async () => {
				await import("./variant-selector-dialog").catch(() => {
					// Un échec de chargement du chunk ne doit pas empêcher l'ouverture :
					// `dynamic()` retentera son propre import au montage.
				});
				openVariantSelector({ product, preselectedColor });
			});
		} else {
			// Single VARIANT: trigger fly-to-cart animation
			dispatchFlyToCart(e.currentTarget);
		}
	};

	return (
		<form
			action={action}
			className={cn(
				isMobileFull
					? // Mobile full-width: position relative dans le flux
						"relative w-full"
					: // Icon variant: pastille centrée en bas de la photo, révélée au
						// survol de la carte et au focus clavier (translate + opacity).
						// Le MASQUAGE est gaté `can-hover:` (pas seulement le reveal) : sur
						// tactile ≥ sm (iPad, téléphone paysage) aucun survol ne peut révéler
						// la pastille, et un bouton opacity-0 resterait cliquable au-dessus
						// du stretched link — elle reste donc visible en permanence là-bas.
						cn(
							// Centrage par `inset-x` + flex, JAMAIS `left-1/2 -translate-x-1/2` :
							// la boîte de LAYOUT (avant transform) partait du centre de la carte
							// et s'étendait de toute la largeur du bouton vers la droite —
							// Chromium la compte dans `scrollWidth`, et la dernière carte de la
							// rangée mettait un scroll horizontal de 38px à la page entière à
							// 200% de zoom (WCAG 1.4.4, mesuré par zoom-a11y.spec).
							"pointer-events-none absolute inset-x-1.5 bottom-2.5 z-30 flex justify-center",
							"sm:can-hover:group-hover:translate-y-0 sm:can-hover:group-hover:opacity-100 sm:can-hover:translate-y-2 sm:can-hover:opacity-0 opacity-100 sm:focus-within:translate-y-0 sm:focus-within:opacity-100",
							// `translate` et non `transform` : Tailwind v4 compile `translate-y-*`
							// vers la propriété autonome `translate` — avec `transform` dans la
							// liste, le slide-up sautait à la frame 1, seule l'opacity fondait.
							"duration-300 motion-safe:transition-[opacity,translate]",
						),
				className,
			)}
		>
			<input type="hidden" name="variantId" value={variantId} />
			<input type="hidden" name="quantity" value="1" />
			<Button
				type="submit"
				disabled={isPending}
				aria-busy={isPending}
				onClick={handleClick}
				size="default"
				className={cn(
					isMobileFull
						? // Mobile full-width: pilule primary pleine largeur — le CTA le plus
							// vu de la boutique porte la couleur du bouton primaire du site
							// (WCAG 2.5.5 tap target conservé h-11)
							cn(
								"h-11 w-full rounded-full",
								"bg-primary text-primary-foreground",
								"can-hover:hover:bg-primary/85",
								"active:bg-primary/90 active:scale-[0.98]",
								"text-sm font-medium",
								"motion-safe:transition-all motion-safe:duration-200",
							)
						: // Icon variant: pastille arrondie posée sur la photo
							cn(
								// `pointer-events-auto` : le <form> hôte est en `pointer-events-none`
								// pour que la bande vide de part et d'autre laisse cliquer le
								// stretched link de la carte.
								"pointer-events-auto h-11 max-w-full min-w-0 gap-2 rounded-full px-4",
								"bg-primary text-primary-foreground",
								"shadow-lg shadow-black/20",
								"can-hover:hover:bg-primary/85 can-hover:hover:-translate-y-0.5 can-hover:hover:shadow-xl",
								"active:bg-primary/90 active:translate-y-0 active:shadow-md",
								"motion-safe:transition-all motion-safe:duration-200",
							),
					// Disabled (commun)
					"disabled:cursor-not-allowed disabled:hover:scale-100",
					// Animation pulse + ring pendant le chargement
					isPending && "ring-primary/30 ring-2 motion-safe:animate-pulse",
				)}
				aria-label={`Ajouter ${productTitle ?? "ce produit"} au panier`}
			>
				{isMobileFull ? (
					// Mobile full-width: icône + texte ou spinner
					isPending ? (
						<Spinner presentational />
					) : (
						<span className="inline-flex items-center gap-2">
							<ShoppingBagIcon size={18} aria-hidden="true" />
							<span className="text-sm font-medium">Ajouter</span>
						</span>
					)
				) : (
					<>
						<ShoppingBagIcon
							size={18}
							className={cn("shrink-0", isPending && "opacity-60")}
							aria-hidden="true"
						/>
						<span className="truncate text-sm font-medium">Ajouter au panier</span>
					</>
				)}
			</Button>
		</form>
	);
}
