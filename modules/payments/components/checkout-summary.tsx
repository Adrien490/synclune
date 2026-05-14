"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import type { ShippingRate } from "@/modules/orders/constants/shipping-rates";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import { formatEuro } from "@/shared/utils/format-euro";
import { useSheet } from "@/shared/providers/sheet-store-provider";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { withViewTransition } from "@/shared/utils/with-view-transition";
import { ChevronDown, Info, Shield } from "lucide-react";
import { VisaIcon, MastercardIcon, CBIcon } from "@/shared/components/icons/payment-icons";
import type { ValidateDiscountCodeReturn } from "@/modules/discounts/types/discount.types";
import Image from "next/image";
import Link from "next/link";

type AppliedDiscount = NonNullable<ValidateDiscountCodeReturn["discount"]>;

interface CheckoutSummaryProps {
	cart: NonNullable<GetCartReturn>;
	subtotal: number;
	shipping: number;
	shippingUnavailable: boolean;
	shippingInfo: ShippingRate | null;
	total: number;
	discountAmount: number;
	appliedDiscount?: AppliedDiscount | null;
}

/**
 * Composant résumé de la commande pour la page checkout
 * Affiche le récapitulatif des articles, frais de port et total
 * Mobile: collapsible summary. Desktop: sticky sidebar.
 */
interface SummaryContentProps {
	cart: NonNullable<GetCartReturn>;
	subtotal: number;
	shipping: number;
	shippingUnavailable: boolean;
	shippingInfo: ShippingRate | null;
	total: number;
	discountAmount: number;
	appliedDiscount?: AppliedDiscount | null;
	totalItems: number;
	onEditCart: () => void;
}

function SummaryContent({
	cart,
	subtotal,
	shipping,
	shippingUnavailable,
	shippingInfo,
	total,
	discountAmount,
	appliedDiscount,
	totalItems,
	onEditCart,
}: SummaryContentProps) {
	return (
		<>
			{/* Liste des articles */}
			<div className="space-y-3">
				{cart.items.map((item) => (
					<div key={item.id} className="flex gap-3 text-sm">
						{/* Image */}
						<div
							className="bg-muted border-primary/10 relative size-16 shrink-0 overflow-hidden rounded-xl border"
							style={{ viewTransitionName: `checkout-item-${item.id}` }}
						>
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
					onClick={onEditCart}
					className="text-foreground focus-visible:ring-ring inline-flex items-center gap-1 rounded-sm text-xs underline hover:no-underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
				>
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
					<div className="text-success flex items-center justify-between">
						<span>Réduction ({appliedDiscount.code})</span>
						<span className="text-base/6 font-medium tabular-nums">
							-{formatEuro(discountAmount)}
						</span>
					</div>
				)}

				{/* Frais de port */}
				<div className="flex items-center justify-between">
					<span className="text-muted-foreground">Livraison</span>
					<span className="text-base/6 font-medium tabular-nums">
						{shippingUnavailable ? (
							<span className="text-muted-foreground text-sm italic">Sélectionne ton pays</span>
						) : (
							formatEuro(shipping)
						)}
					</span>
				</div>
				{shippingInfo && !shippingUnavailable && (
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
				aria-label={`Total mis à jour : ${formatEuro(total)}`}
			>
				<div className="flex items-center justify-between text-lg/7 font-semibold tracking-tight antialiased sm:text-xl/7">
					<span>Total</span>
					<span className="text-xl/7 tabular-nums sm:text-2xl/8">{formatEuro(total)}</span>
				</div>
				{/* Info micro-entreprise */}
				<TooltipProvider delayDuration={200}>
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								type="button"
								className="text-muted-foreground focus-visible:ring-ring ml-auto flex items-center gap-1 rounded-sm text-xs/5 tracking-normal antialiased focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
								aria-label="Pourquoi pas de TVA ?"
							>
								<span>TVA non applicable, art. 293 B du CGI</span>
								<Info className="size-3" aria-hidden="true" />
							</button>
						</TooltipTrigger>
						<TooltipContent className="max-w-xs text-center">
							Synclune est en franchise en base de TVA (régime micro-entreprise). Aucune TVA
							n&apos;est facturée sur vos commandes.
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
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
					<Shield className="text-success size-3.5" />
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
}

export function CheckoutSummary({
	cart,
	subtotal,
	shipping,
	shippingUnavailable,
	shippingInfo,
	total,
	discountAmount,
	appliedDiscount,
}: CheckoutSummaryProps) {
	const { open: openCart } = useSheet("cart");
	const haptic = useHaptic();
	const [isMobileOpen, setIsMobileOpen] = useState(true);

	const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

	const handleEditCart = () => {
		haptic("light");
		withViewTransition(() => openCart());
	};

	const contentProps: SummaryContentProps = {
		cart,
		subtotal,
		shipping,
		shippingUnavailable,
		shippingInfo,
		total,
		discountAmount,
		appliedDiscount,
		totalItems,
		onEditCart: handleEditCart,
	};

	return (
		<>
			{/* Mobile: collapsible summary (open by default so users see their cart).
			    Content is conditionally rendered to avoid mounting <Image> requests when collapsed. */}
			<section className="md:hidden" aria-label="Récapitulatif de votre commande">
				<h2 className="sr-only">Récapitulatif de votre commande</h2>

				<Card className="border-primary/10 rounded-2xl shadow-md">
					<button
						type="button"
						onClick={() => {
							haptic("selection");
							setIsMobileOpen((prev) => !prev);
						}}
						aria-expanded={isMobileOpen}
						aria-controls="checkout-summary-mobile-content"
						className="w-full text-left"
					>
						<CardHeader className="pb-0">
							<div className="flex items-center justify-between">
								<CardTitle className="text-base">
									{totalItems} article{totalItems > 1 ? "s" : ""}
								</CardTitle>
								<div className="flex items-center gap-2">
									<span className="text-lg font-semibold tabular-nums">{formatEuro(total)}</span>
									<ChevronDown
										className={`text-muted-foreground size-4 transition-transform ${
											isMobileOpen ? "rotate-180" : ""
										}`}
									/>
								</div>
							</div>
						</CardHeader>
					</button>
					{isMobileOpen && (
						<CardContent id="checkout-summary-mobile-content" className="space-y-4 pt-4 pb-6">
							<SummaryContent {...contentProps} />
						</CardContent>
					)}
				</Card>
			</section>

			{/* Desktop: sticky sidebar */}
			<Card className="border-primary/10 hidden rounded-2xl shadow-md md:sticky md:top-24 md:block">
				<h2 className="sr-only">Récapitulatif de votre commande</h2>

				<CardHeader className="pb-4">
					<CardTitle className="font-display text-lg/7 tracking-wide antialiased">
						Ta commande
					</CardTitle>
				</CardHeader>

				<CardContent className="space-y-4 pb-6">
					<SummaryContent {...contentProps} />
				</CardContent>
			</Card>
		</>
	);
}
