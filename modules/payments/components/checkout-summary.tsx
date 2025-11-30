"use client";

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { getFinalShippingCost } from "@/modules/orders/constants/shipping";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import { formatEuro } from "@/shared/utils/format-euro";
import {
	CheckCircle2,
	Gift,
	Loader2,
	Pencil,
	ShoppingBag,
	Tag,
	TruckIcon,
	X,
} from "lucide-react";
import Link from "next/link";
import { useState, useCallback } from "react";
import { useApplyDiscountCode } from "@/modules/discounts/hooks/use-apply-discount-code";

interface AppliedDiscount {
	id: string;
	code: string;
	type: "PERCENTAGE" | "FIXED_AMOUNT";
	value: number;
	discountAmount: number;
}

interface CheckoutSummaryProps {
	cart: NonNullable<GetCartReturn>;
	userId?: string;
	customerEmail?: string;
	onDiscountChange?: (discount: AppliedDiscount | null) => void;
}

/**
 * Composant résumé de la commande pour la page checkout
 * Affiche le récapitulatif des articles, frais de port, code promo et total
 */
export function CheckoutSummary({
	cart,
	userId,
	customerEmail,
	onDiscountChange,
}: CheckoutSummaryProps) {
	// États pour le code promo
	const [discountCode, setDiscountCode] = useState("");
	const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);

	// Hook pour appliquer le code promo (pattern établi avec toast automatique)
	const { applyCode, isPending } = useApplyDiscountCode({
		onSuccess: (discount) => {
			setAppliedDiscount(discount);
			onDiscountChange?.(discount);
		},
		onError: () => {
			setAppliedDiscount(null);
			onDiscountChange?.(null);
		},
	});

	// Calculer le nombre total d'articles
	const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

	// Calculer le sous-total (somme des prix snapshot * quantités)
	const subtotal = cart.items.reduce((sum, item) => {
		return sum + item.priceAtAdd * item.quantity;
	}, 0);

	// Frais de port
	const shipping = getFinalShippingCost(subtotal);

	// Montant de la réduction
	const discountAmount = appliedDiscount?.discountAmount || 0;

	// Total avec réduction
	const total = Math.max(0, subtotal - discountAmount + shipping);

	// Appliquer un code promo
	const handleApplyDiscount = useCallback(() => {
		if (!discountCode.trim()) return;
		applyCode(discountCode, subtotal, userId, customerEmail);
	}, [discountCode, subtotal, userId, customerEmail, applyCode]);

	// Retirer le code promo
	const handleRemoveDiscount = useCallback(() => {
		setAppliedDiscount(null);
		setDiscountCode("");
		onDiscountChange?.(null);
	}, [onDiscountChange]);

	// Formater la valeur du discount pour affichage
	const formatDiscountLabel = (discount: AppliedDiscount) => {
		if (discount.type === "PERCENTAGE") {
			return `-${discount.value}%`;
		}
		return `-${formatEuro(discount.value)}`;
	};

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
									<img
										src={item.sku.images[0].url}
										alt={item.sku.images[0].altText || item.sku.product.title}
										className="w-full h-full object-cover"
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
								{item.sku.materialRelation && (
									<p className="text-xs text-muted-foreground">
										Matière: {item.sku.materialRelation.name}
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

				{/* Lien modifier panier */}
				<div className="text-center">
					<Link
						href="/panier"
						className="text-xs text-foreground underline hover:no-underline inline-flex items-center gap-1"
					>
						<Pencil className="w-3 h-3" />
						Modifier mon panier
					</Link>
				</div>

				<Separator />

				{/* Section Code Promo */}
				<div className="space-y-3">
					<div className="flex items-center gap-2 text-sm font-medium">
						<Gift className="w-4 h-4 text-primary" />
						<span>Code promo</span>
					</div>

					{appliedDiscount ? (
						// Code promo appliqué
						<div className="p-3 bg-muted/50 border border-border rounded-lg">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<CheckCircle2 className="w-4 h-4 text-foreground" />
									<span className="font-mono text-sm font-medium">
										{appliedDiscount.code}
									</span>
									<span className="text-xs text-muted-foreground font-medium">
										({formatDiscountLabel(appliedDiscount)})
									</span>
								</div>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
									onClick={handleRemoveDiscount}
								>
									<X className="w-4 h-4" />
									<span className="sr-only">Retirer le code promo</span>
								</Button>
							</div>
						</div>
					) : (
						// Champ de saisie
						<div className="space-y-2">
							<div className="flex gap-2">
								<div className="relative flex-1">
									<Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
									<Input
										type="text"
										placeholder="Entrer un code"
										value={discountCode}
										onChange={(e) => {
											setDiscountCode(e.target.value.toUpperCase());
										}}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												handleApplyDiscount();
											}
										}}
										className="pl-9 h-10 font-mono uppercase"
										disabled={isPending}
										maxLength={30}
									/>
								</div>
								<Button
									type="button"
									variant="secondary"
									size="sm"
									className="h-10 px-4"
									onClick={handleApplyDiscount}
									disabled={isPending || !discountCode.trim()}
								>
									{isPending ? (
										<Loader2 className="w-4 h-4 animate-spin" />
									) : (
										"Appliquer"
									)}
								</Button>
							</div>
						</div>
					)}

					{/* Input caché pour envoyer le code au formulaire */}
					{appliedDiscount && (
						<input
							type="hidden"
							name="discountCode"
							value={appliedDiscount.code}
						/>
					)}
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

					{/* Réduction (si appliquée) */}
					{discountAmount > 0 && (
						<div className="flex justify-between items-center text-foreground">
							<span className="flex items-center gap-1.5">
								<Tag className="w-4 h-4" />
								Réduction
							</span>
							<span className="font-mono font-medium text-base/6">
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
