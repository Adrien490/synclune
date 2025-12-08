"use client";

import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { calculateShipping } from "@/modules/orders/utils/shipping.utils";
import { formatEuro } from "@/shared/utils/format-euro";
import { ShoppingBag, TruckIcon } from "lucide-react";
import Link from "next/link";
import type { Cart } from "../types/cart.types";

interface CartSheetSummaryProps {
	cart: Cart;
	onClose: () => void;
}

/**
 * Recapitulatif du panier dans le sheet
 * Inclut sous-total, frais de port, total et CTAs
 */
export function CartSheetSummary({ cart, onClose }: CartSheetSummaryProps) {
	const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

	const subtotal = cart.items.reduce((sum, item) => {
		return sum + item.priceAtAdd * item.quantity;
	}, 0);

	const shipping = calculateShipping();
	const total = subtotal + shipping;

	const itemsWithIssues = cart.items.filter(
		(item) =>
			item.sku.inventory < item.quantity ||
			!item.sku.isActive ||
			item.sku.product.status !== "PUBLIC"
	);
	const hasStockIssues = itemsWithIssues.length > 0;

	return (
		<div className="w-full space-y-4">
			{/* Details */}
			<div className="space-y-2 text-sm">
				<div className="flex justify-between items-center">
					<span className="text-muted-foreground flex items-center gap-1.5">
						<ShoppingBag className="w-4 h-4" />
						Articles ({totalItems})
					</span>
					<span className="font-mono font-medium">{formatEuro(subtotal)}</span>
				</div>

				<div className="flex justify-between items-center">
					<span className="text-muted-foreground flex items-center gap-1.5">
						<TruckIcon className="w-4 h-4" />
						Livraison
					</span>
					<span className="font-mono font-medium">{formatEuro(shipping)}</span>
				</div>
			</div>

			<Separator />

			{/* Total */}
			<div className="flex justify-between items-center">
				<span className="font-semibold">Total</span>
				<span className="font-mono font-bold text-lg">{formatEuro(total)}</span>
			</div>

			<p className="text-[11px] text-muted-foreground text-right">
				TVA non applicable, art. 293 B du CGI
			</p>

			{/* Alerte si problemes */}
			{hasStockIssues && (
				<div
					className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-destructive"
					role="alert"
				>
					<p className="font-medium">Ajuste ton panier pour continuer</p>
					<p className="mt-0.5 text-destructive/80">
						{itemsWithIssues.length} article
						{itemsWithIssues.length > 1 ? "s" : ""} necessitent ton attention
					</p>
				</div>
			)}

			{/* CTAs */}
			<div className="space-y-2 pt-2">
				<Button
					asChild
					size="lg"
					className="w-full"
					disabled={hasStockIssues || totalItems === 0}
					onClick={onClose}
				>
					<Link href="/paiement">Passer commande</Link>
				</Button>

				<Button
					variant="ghost"
					size="sm"
					className="w-full text-sm"
					onClick={onClose}
					asChild
				>
					<Link href="/produits">Continuer mes achats</Link>
				</Button>
			</div>
		</div>
	);
}
