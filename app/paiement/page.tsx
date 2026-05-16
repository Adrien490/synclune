import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { getCart } from "@/modules/cart/data/get-cart";
import { validateCart } from "@/modules/cart/actions/validate-cart";
import { HandDrawnUnderline } from "@/shared/components/animations/hand-drawn-accent";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutEmbed } from "@/modules/payments/components/checkout-embed";
import { CheckoutMobileTrustHint } from "./_components/checkout-mobile-trust-hint";

import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Finaliser ma commande | Synclune",
	description: "Finalisez votre commande de bijoux artisanaux faits main. Livraison en France.",
	robots: {
		index: false,
		follow: true,
	},
};

/**
 * Page de paiement (Stripe Checkout Sessions — mode embedded).
 *
 * Le formulaire de paiement complet (email, adresse, méthodes de paiement) est
 * servi par Stripe dans une iframe. Synclune fournit l'enrobage (titre,
 * accroche, validation pré-checkout du panier).
 */
export default async function CheckoutPage() {
	const [cart, validation] = await Promise.all([getCart(), validateCart()]);

	if (!cart || cart.items.length === 0) {
		redirect("/");
	}

	if (validation.issues.length > 0) {
		return (
			<div className="min-h-dvh min-h-screen" style={{ viewTransitionName: "shop-paiement" }}>
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
										<Link href="/produits">Retour à la boutique</Link>
									</Button>
									<Button asChild variant="outline">
										<Link href="/produits">Continuer mes achats</Link>
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
		<div
			className="relative min-h-dvh min-h-screen"
			style={{ viewTransitionName: "shop-paiement" }}
		>
			<div
				className="from-primary/5 to-secondary/8 fixed inset-0 -z-10 bg-linear-to-br via-transparent"
				style={{ viewTransitionName: "none" }}
			/>

			<section className="py-4 pb-8 sm:py-8 md:py-10 md:pb-10">
				<div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
					<div className="max-sm:sr-only sm:mb-6">
						<h1 className="font-display text-2xl font-normal tracking-wide sm:text-3xl">
							Finaliser ma commande
						</h1>
						<div className="mt-2 hidden sm:block">
							<HandDrawnUnderline
								color="var(--primary)"
								width={80}
								strokeWidth={1.5}
								inView={false}
							/>
						</div>
						<p className="font-cursive text-muted-foreground mt-3 hidden text-base italic sm:block">
							Plus que quelques instants avant de recevoir tes bijoux.
						</p>
					</div>
					<p className="font-cursive text-muted-foreground mb-4 text-center text-base italic sm:hidden">
						Étape finale — tu y es presque
					</p>
					<CheckoutMobileTrustHint />
					<CheckoutEmbed cartKey={cart.id} />
				</div>
			</section>
		</div>
	);
}
