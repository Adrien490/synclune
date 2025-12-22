import { PageHeader } from "@/shared/components/page-header";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { getCart } from "@/modules/cart/data/get-cart";
import { validateCart } from "@/modules/cart/actions/validate-cart";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { getUserAddresses } from "@/modules/addresses/data/get-user-addresses";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutContainer } from "@/modules/payments/components/checkout-container";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Finaliser ma commande | Synclune",
	description:
		"Finalisez votre commande de bijoux artisanaux faits main. Livraison en France.",
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
	// Charger en parallèle
	const [cart, session] = await Promise.all([getCart(), getSession()]);

	// Charger les adresses si l'utilisateur est connecté
	const addresses = session?.user ? await getUserAddresses() : null;

	// Vérifier que le panier existe et n'est pas vide
	if (!cart || cart.items.length === 0) {
		redirect("/");
	}

	// Valider le panier (stock, disponibilité)
	const validation = await validateCart();

	// Si le panier a des problèmes, rediriger vers le panier
	if (validation.issues.length > 0) {
		return (
			<div className="min-h-screen">
				<PageHeader
					title="Finaliser ma commande"
				/>

				<section className="bg-background pt-4 pb-12 lg:pt-6 lg:pb-16">
					<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
						<Alert variant="destructive" className="mb-6">
							<AlertTriangle className="h-4 w-4" />
							<AlertTitle>
								Un petit ajustement est nécessaire 🌸
							</AlertTitle>
							<AlertDescription className="mt-2 space-y-4">
								<p className="text-sm">
									Certains articles de ton panier ne sont plus disponibles ou ont un stock insuffisant.
								</p>

								{/* Liste des problèmes */}
								<ul className="space-y-2 text-sm">
									{validation.issues.map((issue) => (
										<li key={issue.cartItemId} className="flex items-start gap-2">
											<span className="text-destructive mt-0.5">•</span>
											<div>
												<span className="font-medium">{issue.productTitle}</span>
												<span className="text-muted-foreground"> - </span>
												<span>{issue.message}</span>
												{issue.availableStock !== undefined &&
													issue.availableStock > 0 && (
														<span className="text-xs text-muted-foreground">
															{" "}
															(Stock disponible: {issue.availableStock})
														</span>
													)}
											</div>
										</li>
									))}
								</ul>

								<div className="flex gap-2">
									<Button asChild variant="outline">
										<Link href="/creations">Continuer mes achats</Link>
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
		<div className="min-h-screen">
			<PageHeader
				title="Finaliser ma commande"
				description="Vérifie tes informations et procède au paiement sécurisé"
			/>

			<section className="bg-background pt-4 pb-12 lg:pt-6 lg:pb-16">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<CheckoutContainer
						cart={cart}
						session={session}
						addresses={addresses}
					/>
				</div>
			</section>
		</div>
	);
}
