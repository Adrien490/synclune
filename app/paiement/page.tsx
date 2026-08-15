import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/shared/constants/urls";

export const metadata: Metadata = {
	title: "Paiement | Synclune",
	robots: { index: false, follow: false },
};

/**
 * STUB (migration lean, lot 2) — l'ancien tunnel Stripe Elements est parti,
 * le checkout Stripe HÉBERGÉ arrive au lot 3 (`createCheckoutSession` +
 * redirect). En attendant, la page annonce l'indisponibilité.
 */
export default function PaiementIndisponiblePage() {
	return (
		<main className="bg-background flex min-h-dvh items-center justify-center px-4 py-12">
			<div className="w-full max-w-md space-y-6 text-center">
				<h1 className="font-display text-3xl font-normal tracking-tight">Paiement indisponible</h1>
				<p className="text-muted-foreground">
					La boutique fait peau neuve : le paiement est indisponible pendant la migration. Ton
					panier reste au chaud — reviens un peu plus tard !
				</p>
				<Button render={<Link href={ROUTES.SHOP.HOME} />} size="lg">
					Retour à la boutique
				</Button>
			</div>
		</main>
	);
}
