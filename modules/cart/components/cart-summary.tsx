import { ShimmerLine } from "@/shared/components/animations/shimmer-line";
import { Button } from "@/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { CART_INFO_MESSAGES } from "@/modules/cart/constants/error-messages";
import {
	calculateShipping,
	// ❌ Micro-entreprise : calculateTaxAmount n'est plus utilisé (pas de TVA)
} from "@/modules/orders/constants/shipping";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import { RemoveUnavailableItemsButton } from "@/modules/cart/components/remove-unavailable-items-button";
import { formatEuro } from "@/shared/utils/format-euro";
import { ShoppingBag, TruckIcon } from "lucide-react";
import Link from "next/link";
import { CartPriceChangeAlert } from "./cart-price-change-alert";

interface CartSummaryProps {
	cart: NonNullable<GetCartReturn>;
}

export function CartSummary({ cart }: CartSummaryProps) {
	// Calculer le nombre total d'articles
	const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

	// Le pending state est géré par le group parent avec data-pending

	// Calculer le sous-total (somme des prix snapshot * quantités)
	// ⚠️ Utilise priceAtAdd (prix au moment de l'ajout) pas sku.priceInclTax (prix actuel)
	const subtotal = cart.items.reduce((sum, item) => {
		return sum + item.priceAtAdd * item.quantity;
	}, 0);

	// Frais de port forfaitaires
	const shipping = calculateShipping();

	// ℹ️ Micro-entreprise : Total SANS TVA (exonérée - art. 293 B du CGI)
	const total = subtotal + shipping;

	// Vérifier s'il y a des problèmes de stock et identifier les articles concernés
	const itemsWithIssues = cart.items.filter(
		(item) =>
			item.sku.inventory < item.quantity ||
			!item.sku.isActive ||
			item.sku.product.status !== "PUBLIC"
	);
	const hasStockIssues = itemsWithIssues.length > 0;

	return (
		<Card className="lg:sticky lg:top-24 rounded-xl shadow-sm border-2 relative">
			{/* Heading h2 pour lecteurs d'écran (améliore accessibilité WCAG AAA) */}
			<h2 className="sr-only">Récapitulatif de la commande</h2>

			<CardHeader className="pb-4">
				<CardTitle className="flex items-center gap-2 text-lg/7 tracking-tight antialiased">
					<ShoppingBag className="w-5 h-5" />
					Récapitulatif
				</CardTitle>
			</CardHeader>

			<CardContent className="space-y-4 pb-4">
				{/* Détails du groupe */}
				<div className="space-y-3 text-sm/6 tracking-normal antialiased">
					<div className="flex justify-between items-center">
						<span className="text-muted-foreground">
							Articles ({totalItems})
						</span>
						<span className="relative font-mono font-medium text-base/6 transition-all duration-300">
							{formatEuro(subtotal)}
							<ShimmerLine className="hidden group-has-data-pending:block" />
						</span>
					</div>

					{/* Frais de port */}
					<div className="flex justify-between items-center">
						<span className="text-muted-foreground flex items-center gap-1.5">
							<TruckIcon className="w-4 h-4" />
							Livraison
						</span>
						<span className="relative font-mono font-medium text-base/6 transition-all duration-300">
							{formatEuro(shipping)}
							<ShimmerLine className="hidden group-has-data-pending:block" />
						</span>
					</div>
				</div>

				<Separator />

				{/* Total */}
				<div className="space-y-2">
					<div className="flex justify-between items-center text-lg/7 sm:text-xl/7 tracking-tight antialiased font-semibold">
						<span>Total</span>
						<span className="relative font-mono text-xl/7 sm:text-2xl/8 transition-all duration-300">
							{formatEuro(total)}
							<ShimmerLine className="hidden group-has-data-pending:block" />
						</span>
					</div>
					{/* ℹ️ Micro-entreprise : Pas d'affichage TVA (exonérée - art. 293 B du CGI) */}
					<div className="text-xs/5 tracking-normal antialiased text-muted-foreground text-right">
						TVA non applicable, art. 293 B du CGI
					</div>
				</div>
			</CardContent>

			<CardFooter className="flex-col gap-3 pt-4">
				{/* 🆕 Alerte changement de prix */}
				<CartPriceChangeAlert items={cart.items} />

				{/* Message d'avertissement avec copywriting empathique */}
				{hasStockIssues && (
					<div
						className="w-full p-3 bg-destructive/10 border border-destructive/20 rounded-md text-xs/5 sm:text-sm/6 tracking-normal antialiased text-destructive"
						role="alert"
						aria-live="polite"
					>
						<p className="font-medium mb-1">
							Un petit ajustement nécessaire 🌸
						</p>
						<ul className="list-disc list-inside space-y-0.5 text-destructive/90">
							{itemsWithIssues.map((item) => (
								<li key={item.id} className="line-clamp-1">
									{item.sku.product.title}
								</li>
							))}
						</ul>
						<p className="mt-2 text-xs/5 tracking-normal antialiased text-destructive/80">
							Ajuste ton panier pour continuer ta commande 💕
						</p>
						{/* Bouton pour retirer automatiquement les articles indisponibles */}
						<div className="mt-3">
							<RemoveUnavailableItemsButton
								itemsCount={itemsWithIssues.length}
							/>
						</div>
					</div>
				)}

				{/* Bouton commander */}
				<Button
					asChild
					size="lg"
					className="w-full h-12 text-base/6 tracking-normal antialiased"
					disabled={hasStockIssues || totalItems === 0}
				>
					<Link href="/paiement">Passer commande</Link>
				</Button>

				{/* Lien continuer les achats */}
				<Button
					asChild
					variant="ghost"
					size="sm"
					className="w-full text-sm/6 tracking-normal antialiased"
				>
					<Link href="/produits">Continuer mes achats</Link>
				</Button>
			</CardFooter>
		</Card>
	);
}
