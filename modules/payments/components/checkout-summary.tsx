"use client";

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { calculateShipping } from "@/modules/orders/services/shipping.service";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import type { ShippingCountry } from "@/shared/constants/countries";
import { formatEuro } from "@/shared/utils/format-euro";
import { useSheet } from "@/shared/providers/sheet-store-provider";
import { Pencil, ShoppingBag, TruckIcon } from "lucide-react";
import Image from "next/image";

interface CheckoutSummaryProps {
	cart: NonNullable<GetCartReturn>;
	selectedCountry?: ShippingCountry;
}

/**
 * Composant résumé de la commande pour la page checkout
 * Affiche le récapitulatif des articles, frais de port et total
 */
export function CheckoutSummary({ cart, selectedCountry = "FR" }: CheckoutSummaryProps) {
	const { open: openCart } = useSheet("cart");

	// Calculer le nombre total d'articles
	const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

	// Calculer le sous-total (somme des prix snapshot * quantités)
	const subtotal = cart.items.reduce((sum, item) => {
		return sum + item.priceAtAdd * item.quantity;
	}, 0);

	// Frais de port (dynamique selon le pays sélectionné)
	const shipping = calculateShipping(selectedCountry);

	// Total
	const total = subtotal + shipping;

	return (
		<Card className="rounded-xl shadow-sm border-2 sticky top-24">
			{/* Heading h2 pour lecteurs d'écran */}
			<h2 className="sr-only">Récapitulatif de ta commande</h2>

			<CardHeader className="pb-4">
				<CardTitle className="flex items-center gap-2 text-lg/7 tracking-tight antialiased">
					<ShoppingBag className="w-5 h-5" />
					Ta commande
				</CardTitle>
			</CardHeader>

			<CardContent className="space-y-4 pb-6">
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
								<p className="font-mono font-medium text-sm">
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
						<span className="font-mono font-medium text-base/6">
							{formatEuro(subtotal)}
						</span>
					</div>

					{/* Frais de port */}
					<div className="flex justify-between items-center">
						<span className="text-muted-foreground flex items-center gap-1.5">
							<TruckIcon className="w-4 h-4" />
							Livraison
						</span>
						<span className="font-mono font-medium text-base/6">
							{formatEuro(shipping)}
						</span>
					</div>
				</div>

				<Separator />

				{/* Total */}
				<div className="space-y-2">
					<div className="flex justify-between items-center text-lg/7 sm:text-xl/7 tracking-tight antialiased font-semibold">
						<span>Total</span>
						<span className="font-mono text-xl/7 sm:text-2xl/8">
							{formatEuro(total)}
						</span>
					</div>
					{/* Info micro-entreprise */}
					<div className="text-xs/5 tracking-normal antialiased text-muted-foreground text-right">
						TVA non applicable, art. 293 B du CGI
					</div>
				</div>

				{/* Message sécurité */}
				<div className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
					<p className="text-xs text-center text-muted-foreground">
						🔒 Paiement sécurisé via Stripe
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
