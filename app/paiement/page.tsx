import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { getCart } from "@/modules/cart/data/get-cart";
import { validateCart } from "@/modules/cart/actions/validate-cart";
import { HandDrawnUnderline } from "@/shared/components/animations/hand-drawn-accent";
import { HAND_DRAWN_STROKES } from "@/shared/components/hand-drawn/constants";
import { ShoppingBagIcon, WarningIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { CheckoutForm } from "@/modules/payments/components/checkout-form";
import { OpenCartButton } from "./_components/open-cart-button";

import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Finaliser ma commande | Synclune",
	description: "Finalise ta commande de bijoux artisanaux faits main. Livraison en France.",
	robots: {
		index: false,
		follow: true,
	},
};

/**
 * Page de checkout — parcours invité (la seule session possible est celle de
 * l'administratrice, qui peut acheter sur sa propre boutique).
 *
 * - Validation du panier (stock, disponibilité) avant d'afficher le formulaire
 * - Paiement par Stripe Elements dans la page (pas de redirection vers
 *   Stripe Checkout)
 */
export default async function CheckoutPage() {
	const cart = await getCart();

	// Empty cart — render a friendly empty state instead of a silent redirect.
	// Cart is a Sheet, not a route, so we surface the situation here with clear next steps.
	if (cart.items.length === 0) {
		return (
			<div className="min-h-dvh" style={{ viewTransitionName: "shop-paiement" }}>
				<section className="bg-background py-8 sm:py-10">
					<div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
						<div className="mb-6 sm:mb-8">
							<h1 className="font-display text-xl font-normal tracking-tight sm:text-2xl">
								Finaliser ma commande
							</h1>
						</div>
						<Card className="border-primary/10 rounded-lg shadow-md md:rounded-lg">
							<CardContent className="space-y-6 p-6 sm:p-8 sm:text-center">
								<div className="bg-muted/80 mx-auto flex size-16 items-center justify-center rounded-full">
									<ShoppingBagIcon className="text-muted-foreground size-8" aria-hidden="true" />
								</div>
								<div className="space-y-2">
									<h2 className="font-display text-xl font-normal sm:text-2xl">
										Ton panier est vide
									</h2>
									<p className="text-muted-foreground text-sm">
										Ajoute quelques bijoux à ton panier avant de finaliser ta commande.
									</p>
								</div>
								<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
									<Button render={<Link href="/produits" />} size="lg">
										Voir le catalogue
									</Button>
									<Button render={<Link href="/" />} variant="outline" size="lg">
										Retour à l&apos;accueil
									</Button>
								</div>
							</CardContent>
						</Card>
					</div>
				</section>
			</div>
		);
	}

	// Valider le panier (stock, disponibilité)
	const validation = await validateCart();

	// Stock / disponibilité KO — keep user on /paiement with clear remediation.
	if (validation.issues.length > 0) {
		return (
			<div className="min-h-dvh" style={{ viewTransitionName: "shop-paiement" }}>
				<section className="bg-background py-8 sm:py-10">
					<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
						<div className="mb-6 sm:mb-8">
							<h1 className="font-display text-xl font-normal tracking-tight sm:text-2xl">
								Finaliser ma commande
							</h1>
						</div>
						<Alert variant="destructive" className="mb-6">
							<WarningIcon className="size-4" aria-hidden="true" />
							<AlertTitle>Un petit ajustement est nécessaire</AlertTitle>
							<AlertDescription className="mt-2 space-y-4">
								<p className="text-sm">
									Quelques bijoux de ton panier ne sont plus disponibles — l&apos;atelier est en
									cours de réassort.
								</p>

								{/* Liste des problèmes */}
								<ul className="space-y-2 text-sm">
									{validation.issues.map((issue) => (
										<li key={issue.cartItemId} className="flex items-start gap-2">
											<span className="text-destructive mt-0.5">•</span>
											<div>
												<span className="font-medium">{issue.productTitle}</span>
												<span className="text-muted-foreground"> — </span>
												<span>{issue.message}</span>
											</div>
										</li>
									))}
								</ul>

								<div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
									{/* Action principale : corriger le panier sans quitter /paiement —
									    le Sheet panier est monté par le layout (CartAndSkuWrapper). */}
									<OpenCartButton>Modifier mon panier</OpenCartButton>
									<Button render={<Link href="/produits" />} variant="outline">
										Voir le catalogue
									</Button>
									<Button render={<Link href="/" />} variant="outline">
										Retour à l&apos;accueil
									</Button>
								</div>
							</AlertDescription>
						</Alert>
					</div>
				</section>
			</div>
		);
	}

	return (
		<div className="relative min-h-dvh" style={{ viewTransitionName: "shop-paiement" }}>
			{/* Decorative background fourni par layout.tsx (SSOT) — pas de duplication ici. */}
			{/* `pb-8` : la réserve de la barre CTA est déjà portée par la colonne
			    formulaire (`--pay-bar-height`) et la safe-area par la barre elle-même
			    (`pb-[max(0.75rem,env(safe-area-inset-bottom))]`) — le `calc()` ici était une
			    troisième réserve cumulative, et `theme()` est l'API Tailwind v3. */}
			<section className="py-4 pb-8 sm:py-8 md:py-10 md:pb-10">
				<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
					<div className="mb-4 sm:mb-6">
						<h1 className="font-display text-xl font-normal tracking-wide max-sm:text-center sm:text-3xl">
							Finaliser ma commande
						</h1>
						<div className="mt-2 max-sm:flex max-sm:justify-center">
							{/* UN SVG pour un trait (il y en avait deux, un masqué par
							    breakpoint). La largeur est responsive en CSS ; `h-auto`
							    dérive la hauteur du ratio natif 6:1 — pas de letterbox.
							    Couleur : défaut cascadé (repli --primary, même rendu). */}
							<HandDrawnUnderline
								strokeWidth={HAND_DRAWN_STROKES.fin}
								inView={false}
								className="h-auto w-15 sm:w-20"
							/>
						</div>
					</div>
					<CheckoutForm cart={cart} />
				</div>
			</section>
		</div>
	);
}
