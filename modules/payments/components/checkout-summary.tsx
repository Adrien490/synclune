"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { Separator } from "@/shared/components/ui/separator";
import { calculateShipping, getShippingInfo } from "@/modules/orders/services/shipping.service";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import type { ShippingCountry } from "@/shared/constants/countries";
import { formatEuro } from "@/shared/utils/format-euro";
import { useSheet } from "@/shared/providers/sheet-store-provider";
import { ChevronDown, Pencil, Shield, ShoppingBag, Tag, TruckIcon } from "lucide-react";
import { VisaIcon, MastercardIcon, CBIcon } from "@/shared/components/icons/payment-icons";
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
export function CheckoutSummary({
	cart,
	selectedCountry = "FR",
	postalCode,
	appliedDiscount,
}: CheckoutSummaryProps) {
	const { open: openCart } = useSheet("cart");

	// Calculer le nombre total d'articles
	const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

	// Calculer le sous-total (somme des prix snapshot * quantités)
	const subtotal = cart.items.reduce((sum, item) => {
		return sum + item.priceAtAdd * item.quantity;
	}, 0);

	// Frais de port (dynamique selon le pays et code postal pour la Corse)
	const shippingRaw = calculateShipping(selectedCountry, postalCode);
	const shippingUnavailable = shippingRaw === null;
	const shipping = shippingRaw ?? 0;

	// Delivery estimate
	const shippingInfo = getShippingInfo(selectedCountry, postalCode);

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
						<div className="bg-muted border-primary/10 relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border">
							{item.sku.images[0] ? (
								<Image
									src={item.sku.images[0].url}
									alt={item.sku.images[0].altText ?? item.sku.product.title}
									fill
									sizes="64px"
									quality={70}
									className="object-cover"
									placeholder={item.sku.images[0].blurDataUrl ? "blur" : "empty"}
									blurDataURL={item.sku.images[0].blurDataUrl ?? undefined}
								/>
							) : (
								<div className="text-muted-foreground flex h-full w-full items-center justify-center text-xs">
									N/A
								</div>
							)}
						</div>

						{/* Détails */}
						<div className="min-w-0 flex-1">
							<p className="line-clamp-2 text-sm font-medium">{item.sku.product.title}</p>
							{item.sku.size && (
								<p className="text-muted-foreground text-xs">Taille: {item.sku.size}</p>
							)}
							{item.sku.color && (
								<p className="text-muted-foreground text-xs">Couleur: {item.sku.color.name}</p>
							)}
							{item.sku.material && (
								<p className="text-muted-foreground text-xs">Matière: {item.sku.material.name}</p>
							)}
							<p className="text-muted-foreground mt-1 text-xs">Qté: {item.quantity}</p>
						</div>

						{/* Prix */}
						<div className="text-right">
							<p className="text-sm font-medium tabular-nums">
								{formatEuro(item.priceAtAdd * item.quantity)}
							</p>
							{item.quantity > 1 && (
								<p className="text-muted-foreground text-xs">
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
					className="text-foreground focus-visible:ring-ring inline-flex items-center gap-1 rounded-sm text-xs underline hover:no-underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
				>
					<Pencil className="h-3 w-3" />
					Modifier mon panier
				</button>
			</div>

			<Separator />

			{/* Détails du panier */}
			<div className="space-y-3 text-sm/6 tracking-normal antialiased">
				<div className="flex items-center justify-between">
					<span className="text-muted-foreground">
						Sous-total ({totalItems} article{totalItems > 1 ? "s" : ""})
					</span>
					<span className="text-base/6 font-medium tabular-nums">{formatEuro(subtotal)}</span>
				</div>

				{/* Discount line */}
				{appliedDiscount && discountAmount > 0 && (
					<div className="flex items-center justify-between">
						<span className="flex items-center gap-1.5 text-green-600">
							<Tag className="h-4 w-4" />
							Réduction ({appliedDiscount.code})
						</span>
						<span className="text-base/6 font-medium text-green-600 tabular-nums">
							-{formatEuro(discountAmount)}
						</span>
					</div>
				)}

				{/* Frais de port */}
				<div className="flex items-center justify-between">
					<span className="text-muted-foreground flex items-center gap-1.5">
						<TruckIcon className="h-4 w-4" />
						Livraison
					</span>
					<span className="text-base/6 font-medium tabular-nums">
						{shippingUnavailable ? "Indisponible" : formatEuro(shipping)}
					</span>
				</div>
				{shippingUnavailable && (
					<p className="text-destructive pl-5.5 text-xs">
						Nous ne livrons pas encore dans cette zone. Contactez-nous pour trouver une solution.
					</p>
				)}
				{shippingInfo && (
					<p className="text-muted-foreground pl-5.5 text-xs">
						Délai estimé : {shippingInfo.estimatedDays}
					</p>
				)}
			</div>

			<Separator />

			{/* Total */}
			<div
				className="bg-primary/3 -mx-1 space-y-2 rounded-xl p-3"
				aria-live="polite"
				aria-atomic="true"
			>
				<div className="flex items-center justify-between text-lg/7 font-semibold tracking-tight antialiased sm:text-xl/7">
					<span>Total</span>
					<span className="text-xl/7 tabular-nums sm:text-2xl/8">{formatEuro(total)}</span>
				</div>
				{/* Info micro-entreprise */}
				<div className="text-muted-foreground text-right text-xs/5 tracking-normal antialiased">
					TVA non applicable, art. 293 B du CGI
				</div>
			</div>

			{/* Badges de confiance (Baymard: icônes CB + message sécurité) */}
			<div className="border-primary/5 space-y-3 border-t pt-4">
				{/* Icônes cartes acceptées */}
				<div className="flex items-center justify-center gap-2">
					<VisaIcon className="text-muted-foreground h-5 w-auto" />
					<MastercardIcon className="text-muted-foreground h-5 w-auto" />
					<CBIcon className="text-muted-foreground h-5 w-auto" />
				</div>

				{/* Message sécurité */}
				<div className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs">
					<Shield className="h-3.5 w-3.5 text-green-600" />
					<span>Paiement 100% sécurisé</span>
				</div>

				{/* Trust links */}
				<div className="text-muted-foreground flex items-center justify-center gap-3 text-xs">
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

	return (
		<>
			{/* Mobile: collapsible summary (open by default so users see their cart) */}
			<Collapsible defaultOpen className="md:hidden">
				<h2 className="sr-only">Récapitulatif de votre commande</h2>

				<Card className="border-primary/10 rounded-2xl shadow-md">
					<CollapsibleTrigger className="w-full text-left">
						<CardHeader className="pb-0">
							<div className="flex items-center justify-between">
								<CardTitle className="flex items-center gap-2 text-base">
									<ShoppingBag className="h-4 w-4" />
									{totalItems} article{totalItems > 1 ? "s" : ""}
								</CardTitle>
								<div className="flex items-center gap-2">
									<span className="text-lg font-semibold tabular-nums">{formatEuro(total)}</span>
									<ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
								</div>
							</div>
						</CardHeader>
					</CollapsibleTrigger>
					<CollapsibleContent>
						<CardContent className="space-y-4 pt-4 pb-6">{summaryContent}</CardContent>
					</CollapsibleContent>
				</Card>
			</Collapsible>

			{/* Desktop: sticky sidebar */}
			<Card className="border-primary/10 hidden rounded-2xl shadow-md md:sticky md:top-24 md:block">
				<h2 className="sr-only">Récapitulatif de votre commande</h2>

				<CardHeader className="pb-4">
					<CardTitle className="font-display flex items-center gap-2 text-lg/7 tracking-wide antialiased">
						<ShoppingBag className="text-primary/70 h-5 w-5" />
						Votre commande
					</CardTitle>
				</CardHeader>

				<CardContent className="space-y-4 pb-6">{summaryContent}</CardContent>
			</Card>
		</>
	);
}
