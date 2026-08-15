import type { Metadata } from "next";
import Link from "next/link";
import { CHECKOUT_RESERVATION_LABEL } from "@/modules/payments/constants/checkout.constants";
import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/shared/constants/urls";

export const metadata: Metadata = {
	title: "Paiement annulé | Synclune",
	robots: { index: false, follow: false },
};

/**
 * Landing du `cancel_url` Stripe Checkout (lot 3).
 *
 * Le panier n'est PAS vidé — la cliente doit pouvoir réessayer telle quelle.
 * Le stock réservé par la session abandonnée se libère à l'expiration de la
 * session (webhook `checkout.session.expired`), pas au clic — on l'affiche
 * honnêtement.
 */
export default function CheckoutCancelPage() {
	return (
		<main
			id="main-content"
			tabIndex={-1}
			className="bg-background flex min-h-dvh items-center justify-center px-4 py-12"
		>
			<div className="w-full max-w-md space-y-6 text-center">
				<h1 className="font-display text-3xl font-normal tracking-tight">Paiement annulé</h1>
				<p className="text-muted-foreground">
					Pas de souci, ton panier est toujours là. Tu peux reprendre le paiement quand tu veux.
				</p>
				<p className="text-muted-foreground text-sm">
					Les articles de ta commande abandonnée restent réservés {CHECKOUT_RESERVATION_LABEL} —
					au-delà, ils redeviennent disponibles pour tout le monde.
				</p>
				<div className="flex flex-col gap-3">
					<Button render={<Link href={ROUTES.SHOP.CHECKOUT} />} size="lg">
						Reprendre le paiement
					</Button>
					<Button render={<Link href={ROUTES.SHOP.PRODUCTS} />} size="lg" variant="outline">
						Continuer mes découvertes
					</Button>
				</div>
			</div>
		</main>
	);
}
