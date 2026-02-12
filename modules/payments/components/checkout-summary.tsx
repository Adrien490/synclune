"use client";

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { Separator } from "@/shared/components/ui/separator";
import { calculateShipping } from "@/modules/orders/services/shipping.service";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import type { ShippingCountry } from "@/shared/constants/countries";
import { formatEuro } from "@/shared/utils/format-euro";
import { useSheet } from "@/shared/providers/sheet-store-provider";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { ChevronDown, Pencil, Shield, ShoppingBag, Tag, TruckIcon } from "lucide-react";
import {
	VisaIcon,
	MastercardIcon,
	CBIcon,
} from "@/shared/components/icons/payment-icons";
import type { ValidateDiscountCodeReturn } from "@/modules/discounts/types/discount.types";
import Image from "next/image";
import Link from "next/link";

type AppliedDiscount = NonNullable<ValidateDiscountCodeReturn["discount"]>;

interface CheckoutSummaryProps {
	cart: NonNullable<GetCartReturn>;
	selectedCountry?: ShippingCountry;
	postalCode?: string;
	appliedDiscount?: AppliedDiscount | null;
}

/**
 * Composant résumé de la commande pour la page checkout
 * Affiche le récapitulatif des articles, frais de port et total
 * Détecte automatiquement la Corse via le code postal pour afficher les bons frais
 * Mobile: collapsible summary. Desktop: sticky sidebar.
 */
export function CheckoutSummary({ cart, selectedCountry = "FR", postalCode, appliedDiscount }: CheckoutSummaryProps) {
	const { open: openCart } = useSheet("cart");
	const isMobile = useIsMobile();

	// Calculer le nombre total d'articles
	const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

	// Calculer le sous-total (somme des prix snapshot * quantités)
	const subtotal = cart.items.reduce((sum, item) => {
		return sum + item.priceAtAdd * item.quantity;
	}, 0);

	// Frais de port (dynamique selon le pays et code postal pour la Corse)
	const shipping = calculateShipping(selectedCountry, postalCode);

	// Discount
	const discountAmount = appliedDiscount?.discountAmount ?? 0;

	// Total
	const total = subtotal - discountAmount + shipping;

	const summaryContent = (
		<>
			{/* Liste des articles */}
			<div className="space-y-3">
				{cart.items.map((item) => (
					<div key={item.id} className="flex gap-3 text-sm">
						{/* Image */}
						<div className="relative w-16 h-16 shrink-0 rounded-md overflow-hidden bg-muted border">
							{item.sku.images[0] ? (
								<Image
									src={item.sku.images[0].url}
									alt={item.sku.images[0].altText || item.sku.product.title}
									fill
									sizes="64px"
									quality={70}
									className="object-cover"
								/>
							) : (
								<div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
									N/A
								</div>
							)}
						</div>

						{/* Détails */}
						<div className="flex-1 min-w-0">
							<p className="font-medium line-clamp-2 text-sm">
								{item.sku.product.title}
							</p>
							{item.sku.size && (
								<p className="text-xs text-muted-foreground">
									Taille: {item.sku.size}
								</p>
							)}
							{item.sku.color && (
								<p className="text-xs text-muted-foreground">
									Couleur: {item.sku.color.name}
								</p>
							)}
							{item.sku.material && (
								<p className="text-xs text-muted-foreground">
									Matière: {item.sku.material.name}
								</p>
							)}
							<p className="text-xs text-muted-foreground mt-1">
								Qté: {item.quantity}
							</p>
						</div>

						{/* Prix */}
						<div className="text-right">
							<p className="tabular-nums font-medium text-sm">
								{formatEuro(item.priceAtAdd * item.quantity)}
							</p>
							{item.quantity > 1 && (
								<p className="text-xs text-muted-foreground">
									{formatEuro(item.priceAtAdd)} × {item.quantity}
								</p>
							)}
						</div>
					</div>
				))}
			</div>

			{/* Bouton modifier panier */}
			<div className="text-center">
				<button
					type="button"
					onClick={openCart}
					aria-label="Modifier mon panier"
					className="text-xs text-foreground underline hover:no-underline inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
				>
					<Pencil className="w-3 h-3" />
					Modifier mon panier
				</button>
			</div>

			<Separator />

			{/* Détails du panier */}
			<div className="space-y-3 text-sm/6 tracking-normal antialiased">
				<div className="flex justify-between items-center">
					<span className="text-muted-foreground">
						Sous-total ({totalItems} article{totalItems > 1 ? "s" : ""})
					</span>
					<span className="tabular-nums font-medium text-base/6">
						{formatEuro(subtotal)}
					</span>
				</div>

				{/* Discount line */}
				{appliedDiscount && discountAmount > 0 && (
					<div className="flex justify-between items-center">
						<span className="text-green-600 dark:text-green-400 flex items-center gap-1.5">
							<Tag className="w-4 h-4" />
							Réduction ({appliedDiscount.code})
						</span>
						<span className="tabular-nums font-medium text-base/6 text-green-600 dark:text-green-400">
							-{formatEuro(discountAmount)}
						</span>
					</div>
				)}

				{/* Frais de port */}
				<div className="flex justify-between items-center">
					<span className="text-muted-foreground flex items-center gap-1.5">
						<TruckIcon className="w-4 h-4" />
						Livraison
					</span>
					<span className="tabular-nums font-medium text-base/6">
						{formatEuro(shipping)}
					</span>
				</div>
				<p className="text-xs text-muted-foreground pl-5.5">
					Expédition sous 2 à 5 jours ouvrés
				</p>
			</div>

			<Separator />

			{/* Total */}
			<div className="space-y-2" aria-live="polite" aria-atomic="true">
				<div className="flex justify-between items-center text-lg/7 sm:text-xl/7 tracking-tight antialiased font-semibold">
					<span>Total</span>
					<span className="tabular-nums text-xl/7 sm:text-2xl/8">
						{formatEuro(total)}
					</span>
				</div>
				{/* Info micro-entreprise */}
				<div className="text-xs/5 tracking-normal antialiased text-muted-foreground text-right">
					TVA non applicable, art. 293 B du CGI
				</div>
			</div>

			{/* Badges de confiance (Baymard: icônes CB + message sécurité) */}
			<div className="space-y-3 pt-2">
				{/* Icônes cartes acceptées */}
				<div className="flex items-center justify-center gap-2">
					<VisaIcon className="h-5 w-auto text-muted-foreground" />
					<MastercardIcon className="h-5 w-auto text-muted-foreground" />
					<CBIcon className="h-5 w-auto text-muted-foreground" />
				</div>

				{/* Message sécurité */}
				<div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
					<Shield className="w-3.5 h-3.5 text-green-600" />
					<span>Paiement 100% sécurisé</span>
				</div>

				{/* Trust links */}
				<div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
					<Link href="/retractation" className="underline hover:no-underline" target="_blank">
						Politique de retour
					</Link>
					<span aria-hidden="true">·</span>
					<Link href="/cgv" className="underline hover:no-underline" target="_blank">
						CGV
					</Link>
				</div>
			</div>
		</>
	);

	if (isMobile) {
		return (
			<Collapsible>
				{/* Accessible heading */}
				<h2 className="sr-only">Récapitulatif de ta commande</h2>

				<Card className="rounded-xl shadow-sm border">
					<CollapsibleTrigger className="w-full text-left">
						<CardHeader className="pb-0">
							<div className="flex items-center justify-between">
								<CardTitle className="flex items-center gap-2 text-base">
									<ShoppingBag className="w-4 h-4" />
									{totalItems} article{totalItems > 1 ? "s" : ""}
								</CardTitle>
								<div className="flex items-center gap-2">
									<span className="tabular-nums font-semibold text-lg">
										{formatEuro(total)}
									</span>
									<ChevronDown className="w-4 h-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
								</div>
							</div>
						</CardHeader>
					</CollapsibleTrigger>
					<CollapsibleContent>
						<CardContent className="space-y-4 pt-4 pb-6">
							{summaryContent}
						</CardContent>
					</CollapsibleContent>
				</Card>
			</Collapsible>
		);
	}

	return (
		<Card className="rounded-xl shadow-sm border sticky top-20">
			{/* Heading h2 pour lecteurs d'écran */}
			<h2 className="sr-only">Récapitulatif de ta commande</h2>

			<CardHeader className="pb-4">
				<CardTitle className="flex items-center gap-2 text-lg/7 tracking-tight antialiased">
					<ShoppingBag className="w-5 h-5" />
					Ta commande
				</CardTitle>
			</CardHeader>

			<CardContent className="space-y-4 pb-6">
				{summaryContent}
			</CardContent>
		</Card>
	);
}
