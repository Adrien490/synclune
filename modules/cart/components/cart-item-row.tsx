import { ShimmerLine } from "@/shared/components/animations/shimmer-line";
import { Badge } from "@/shared/components/ui/badge";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import { CartItemRemoveButton } from "./cart-item-remove-button";
import { CartItemAdjustButton } from "./cart-item-adjust-button";
import { CartItemQuantitySelector } from "./cart-item-quantity-selector";
import { getVideoMimeType } from "@/shared/utils/media-utils";
import { formatEuro } from "@/shared/utils/format-euro";
import Image from "next/image";
import Link from "next/link";

type CartItem = NonNullable<GetCartReturn>["items"][number];

interface CartItemRowProps {
	item: CartItem;
}

/**
 * Server Component pour afficher une ligne d'article dans le panier
 * Structure en 3 colonnes : Produit | Quantité | Total
 * Compatible Next.js 16 + React 19.2
 *
 * Fonctionnalités :
 * - Layout en 3 colonnes sur desktop (table-like)
 * - Responsive : vertical sur mobile
 * - Affiche l'image, le nom, les attributs, le prix unitaire
 * - Badges uniquement pour problèmes (rupture de stock, indisponible)
 * - Délègue les interactions (quantité, supprimer) à des Client Components
 * - Calculs côté serveur pour de meilleures performances
 */
export function CartItemRow({ item }: CartItemRowProps) {
	// Calcul du sous-total (utilise item.quantity - valeur serveur)
	const subtotal = item.priceAtAdd * item.quantity;

	// Vérifications de disponibilité
	const isOutOfStock = item.sku.inventory < item.quantity;
	const isInactive = !item.sku.isActive || item.sku.product.status !== "PUBLIC";
	const hasIssue = isOutOfStock || isInactive;

	// Détection promotion (compareAtPrice au moment de l'ajout)
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
			className={`grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4 md:gap-6 p-4 border rounded-xl ${
				hasIssue ? "border-destructive/50 bg-destructive/5" : "border-border"
			}`}
		>
			{/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
			    COLONNE 1 : PRODUIT (Image + Informations)
			    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
			<div className="flex gap-4">
				{/* Image ou vidéo du produit */}
				<Link
					href={`/products/${item.sku.product.slug}`}
					className="relative w-24 h-24 shrink-0 rounded-md overflow-hidden bg-muted"
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
									primaryImage.altText || `Vidéo ${item.sku.product.title}`
								}
							>
								<source
									src={primaryImage.url}
									type={getVideoMimeType(primaryImage.url)}
								/>
								Votre navigateur ne supporte pas la lecture de vidéos.
							</video>
						) : (
							<Image
								src={primaryImage.url}
								alt={primaryImage.altText || item.sku.product.title}
								fill
								className="object-cover"
								sizes="96px"
							/>
						)
					) : (
						<div className="w-full h-full flex items-center justify-center text-muted-foreground">
							<span className="text-xs">Pas d&apos;image</span>
						</div>
					)}
				</Link>

				{/* Informations du produit */}
				<div className="flex-1 min-w-0 space-y-2">
					{/* Nom du produit */}
					<Link
						href={`/products/${item.sku.product.slug}`}
						className="font-medium text-sm hover:text-foreground transition-colors line-clamp-2 block"
					>
						{item.sku.product.title}
					</Link>

					{/* Prix unitaire */}
					<div className="flex items-center gap-2">
						<div className="font-mono font-medium text-sm">
							{formatEuro(item.priceAtAdd)}
						</div>
						{hasDiscount && (
							<>
								<span className="text-xs text-muted-foreground line-through font-mono">
									{formatEuro(item.sku.compareAtPrice!)}
								</span>
								<Badge
									variant="secondary"
									className="text-[10px] px-1.5 py-0 bg-accent/20 text-accent-foreground border border-accent/30"
								>
									-{discountPercent}%
								</Badge>
							</>
						)}
					</div>

					{/* Attributs du variant */}
					<div className="text-sm text-muted-foreground">
						{[
							item.sku.color && (
								<span key="color" className="inline-flex items-center gap-1">
									<span
										className="w-3 h-3 rounded-full border border-border inline-block"
										style={{ backgroundColor: item.sku.color.hex }}
									/>
									{item.sku.color.name}
								</span>
							),
							item.sku.material && (
								<span key="material">{item.sku.material}</span>
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

					{/* Badges - Afficher uniquement les problèmes */}
					<div className="flex flex-wrap gap-1.5">
						{isOutOfStock && (
							<Badge
								variant="destructive"
								className="text-xs"
								role="alert"
								aria-live="assertive"
							>
								Rupture de stock
							</Badge>
						)}
						{isInactive && (
							<Badge
								variant="destructive"
								className="text-xs"
								role="alert"
								aria-live="assertive"
							>
								Indisponible
							</Badge>
						)}
					</div>

					{/* Messages d'erreur avec bouton ajuster */}
					{hasIssue && (
						<div className="text-sm text-destructive space-y-2">
							{isInactive && (
								<p>Ce produit n&apos;est plus disponible à la vente</p>
							)}
							{isOutOfStock && (
								<>
									<p>Stock insuffisant pour votre quantité</p>
									{item.sku.inventory > 0 && (
										<CartItemAdjustButton
											cartItemId={item.id}
											availableStock={item.sku.inventory}
										/>
									)}
								</>
							)}
						</div>
					)}
				</div>
			</div>

			{/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
			    COLONNE 2 : QUANTITÉ (Select + Supprimer)
			    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
			<div className="flex md:flex-col items-center justify-between md:justify-center gap-3 md:gap-2">
				{/* Select de quantité avec optimistic UI et debounce */}
				<CartItemQuantitySelector
					cartItemId={item.id}
					currentQuantity={item.quantity}
					maxQuantity={item.sku.inventory}
					isInactive={isInactive}
				/>

				{/* Bouton supprimer */}
				<CartItemRemoveButton
					cartItemId={item.id}
					itemName={item.sku.product.title}
				/>
			</div>

			{/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
			    COLONNE 3 : TOTAL
			    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
			<div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-1">
				<span className="text-xs text-muted-foreground md:hidden">Total</span>
				<div className="relative font-mono font-semibold text-lg md:text-base">
					{formatEuro(subtotal)}
					{/* ShimmerLine visible uniquement quand le ButtonGroup a data-pending */}
					<ShimmerLine className="hidden group-has-data-pending:block" />
				</div>
			</div>
		</div>
	);
}
