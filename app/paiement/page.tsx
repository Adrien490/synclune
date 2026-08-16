import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getCart } from "@/modules/cart/data/get-cart";
import { effectivePrice } from "@/modules/cart/services/cart-pricing-calculator.service";
import { validateCartItems } from "@/modules/cart/services/item-availability.service";
import { buildVariantSnapshot } from "@/modules/payments/services/checkout-order.service";
import { CheckoutForm } from "@/modules/payments/components/checkout-form";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/shared/constants/urls";
import { formatEuro } from "@/shared/utils/format-euro";

export const metadata: Metadata = {
	title: "Paiement | Synclune",
	robots: { index: false, follow: false },
};

/**
 * Récapitulatif avant paiement — Stripe Checkout HÉBERGÉ (lot 3).
 *
 * La page ne porte AUCUN formulaire de carte : elle montre le panier, fait
 * choisir le pays de livraison (qui fixe les frais de port) et envoie vers la
 * page Stripe via la Server Action `createCheckoutSession`. Le CTA est un
 * submit, jamais un lien : créer une session réserve du stock, un GET
 * préchargeable ne doit pas le faire.
 */
export default async function PaiementPage() {
	const { items } = await getCart();

	if (items.length === 0) {
		return (
			<main
				id="main-content"
				tabIndex={-1}
				className="bg-background flex min-h-dvh items-center justify-center px-4 py-12"
			>
				<div className="w-full max-w-md space-y-6 text-center">
					<h1 className="font-display text-3xl font-normal tracking-tight">Ton panier est vide</h1>
					<p className="text-muted-foreground">
						Ajoute une petite merveille à ton panier avant de passer au paiement.
					</p>
					<Button render={<Link href={ROUTES.SHOP.PRODUCTS} />} size="lg">
						Voir les créations
					</Button>
				</div>
			</main>
		);
	}

	const issues = validateCartItems(items.map((item) => ({ variantId: item.id, ...item })));
	const subtotalCents = items.reduce((sum, item) => sum + effectivePrice(item) * item.quantity, 0);

	return (
		<main id="main-content" tabIndex={-1} className="bg-background min-h-dvh px-4 py-12">
			<div className="mx-auto w-full max-w-lg space-y-8">
				<div className="space-y-2 text-center">
					<h1 className="font-display text-3xl font-normal tracking-tight">Ta commande</h1>
					<p className="text-muted-foreground text-sm">
						Vérifie ton panier, choisis ton pays de livraison, puis règle sur la page sécurisée
						Stripe.
					</p>
				</div>

				{issues.length > 0 && (
					<Alert variant="destructive">
						<AlertDescription>
							<p className="font-medium">Certains articles ne sont plus disponibles :</p>
							<ul className="mt-1 list-inside list-disc">
								{issues.map((issue) => (
									<li key={issue.variantId}>{issue.message}</li>
								))}
							</ul>
							<p className="mt-2">Mets ton panier à jour avant de payer.</p>
						</AlertDescription>
					</Alert>
				)}

				<ul className="divide-border divide-y">
					{items.map((item) => {
						const image = item.variant.product.media[0] ?? null;
						const variantLabel = buildVariantSnapshot(item.variant);
						return (
							<li key={item.id} className="flex items-center gap-4 py-4">
								<div className="bg-muted relative size-16 shrink-0 overflow-hidden rounded-lg">
									{image && (
										<Image
											src={image.url}
											alt={image.alt ?? item.variant.product.name}
											fill
											sizes="64px"
											className="object-cover"
										/>
									)}
								</div>
								<div className="min-w-0 flex-1">
									<p className="truncate font-medium">{item.variant.product.name}</p>
									<p className="text-muted-foreground text-sm">
										{variantLabel ? `${variantLabel} · ` : ""}× {item.quantity}
									</p>
								</div>
								<p className="text-sm font-medium">
									{formatEuro(effectivePrice(item) * item.quantity)}
								</p>
							</li>
						);
					})}
				</ul>

				<CheckoutForm subtotalCents={subtotalCents} />
			</div>
		</main>
	);
}
