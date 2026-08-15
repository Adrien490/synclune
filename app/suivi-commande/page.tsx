import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/shared/constants/urls";

export const metadata: Metadata = {
	title: "Suivi de commande | Synclune",
	robots: { index: false, follow: false },
};

/**
 * STUB (migration lean, lot 2) — le suivi par lien tokenisé est réécrit au
 * lot 4 sur le schéma lean. Les anciennes commandes vivent dans le dashboard
 * Stripe ; la cliente peut écrire à la boutique en attendant.
 */
export default function SuiviCommandeStubPage() {
	return (
		<main className="bg-background flex min-h-dvh items-center justify-center px-4 py-12">
			<div className="w-full max-w-md space-y-6 text-center">
				<h1 className="font-display text-3xl font-normal tracking-tight">Suivi de commande</h1>
				<p className="text-muted-foreground">
					Le suivi en ligne est indisponible pendant la migration de la boutique. Écris-nous si tu
					as une question sur ta commande — on te répond vite !
				</p>
				<Button render={<Link href={ROUTES.SHOP.HOME} />} size="lg">
					Retour à la boutique
				</Button>
			</div>
		</main>
	);
}
