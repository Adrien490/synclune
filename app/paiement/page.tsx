import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { getCart } from "@/modules/cart/data/get-cart";
import { validateCart } from "@/modules/cart/actions/validate-cart";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { getUserAddresses } from "@/modules/addresses/data/get-user-addresses";
import { HandDrawnUnderline } from "@/shared/components/animations/hand-drawn-accent";
import { ShoppingBag, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { CheckoutForm } from "@/modules/payments/components/checkout-form";
import { ORDERS_AVAILABLE } from "@/shared/constants/orders-availability";
import { OrdersClosedNotice } from "@/modules/store-settings/components/orders-closed-notice";

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
 * Page de checkout
 *
 * Fonctionnalités :
 * - Détection automatique utilisateur connecté/guest
 * - Validation du panier (stock, disponibilité)
 * - Pré-remplissage des données si utilisateur connecté
 * - Chargement des adresses enregistrées pour utilisateurs connectés
 * - Création de compte optionnelle pour les guests
 * - Redirection vers Stripe Checkout après validation
 */
export default async function CheckoutPage() {
	// Pré-lancement : commandes pas encore ouvertes. On court-circuite AVANT toute
	// initialisation paiement (le Server Action `initializePayment` est de toute
	// façon bloqué côté serveur) et on affiche un message clair plutôt qu'un
	// formulaire en erreur. La boutique reste navigable.
	if (!ORDERS_AVAILABLE) {
		return (
			<div className="min-h-dvh" style={{ viewTransitionName: "shop-paiement" }}>
				<section className="bg-background py-8 sm:py-10">
					<div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
						<div className="mb-6 sm:mb-8">
							<h1 className="font-display text-xl font-normal tracking-tight sm:text-2xl">
								Finaliser ma commande
							</h1>
						</div>
						<Card className="border-primary/10 rounded-2xl shadow-md">
							<CardContent className="space-y-6 p-6 sm:p-8">
								<OrdersClosedNotice />
								<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
									<Button asChild size="lg">
										<Link href="/produits">Voir les créations</Link>
									</Button>
									<Button asChild variant="outline" size="lg">
										<Link href="/">Retour à l&apos;accueil</Link>
									</Button>
								</div>
							</CardContent>
						</Card>
					</div>
				</section>
			</div>
		);
	}

	// Charger en parallèle (getUserAddresses retourne null si non authentifié)
	const [cart, session, addresses] = await Promise.all([
		getCart(),
		getSession(),
		getUserAddresses(),
	]);

	// Empty cart — render a friendly empty state instead of a silent redirect.
	// Cart is a Sheet, not a route, so we surface the situation here with clear next steps.
	if (!cart || cart.items.length === 0) {
		return (
			<div className="min-h-dvh" style={{ viewTransitionName: "shop-paiement" }}>
				<section className="bg-background py-8 sm:py-10">
					<div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
						<div className="mb-6 sm:mb-8">
							<h1 className="font-display text-xl font-normal tracking-tight sm:text-2xl">
								Finaliser ma commande
							</h1>
						</div>
						<Card className="border-primary/10 rounded-2xl shadow-md">
							<CardContent className="space-y-6 p-6 sm:p-8 sm:text-center">
								<div className="bg-muted/80 mx-auto flex size-16 items-center justify-center rounded-full">
									<ShoppingBag className="text-muted-foreground size-8" aria-hidden="true" />
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
									<Button asChild size="lg">
										<Link href="/produits">Voir le catalogue</Link>
									</Button>
									<Button asChild variant="outline" size="lg">
										<Link href="/">Retour à l&apos;accueil</Link>
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
							<TriangleAlert className="size-4" />
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
									<Button asChild>
										<Link href="/produits">Voir le catalogue</Link>
									</Button>
									<Button asChild variant="outline">
										<Link href="/">Retour à l&apos;accueil</Link>
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
			<section className="py-4 pb-[calc(theme(spacing.8)+env(safe-area-inset-bottom))] sm:py-8 md:py-10 md:pb-10">
				<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
					<div className="mb-4 sm:mb-6">
						<h1 className="font-display text-xl font-normal tracking-wide max-sm:text-center sm:text-3xl">
							Finaliser ma commande
						</h1>
						<div className="mt-2 max-sm:flex max-sm:justify-center">
							<HandDrawnUnderline
								color="var(--primary)"
								width={60}
								strokeWidth={1.5}
								inView={false}
								className="sm:hidden"
							/>
							<div className="hidden sm:block">
								<HandDrawnUnderline
									color="var(--primary)"
									width={80}
									strokeWidth={1.5}
									inView={false}
								/>
							</div>
						</div>
					</div>
					<CheckoutForm cart={cart} session={session} addresses={addresses} />
				</div>
			</section>
		</div>
	);
}
