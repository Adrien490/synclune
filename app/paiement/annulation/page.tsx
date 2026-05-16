import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { getCheckoutCancelMessage } from "@/modules/payments/constants/checkout-cancel-messages";
import { Info, ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "Paiement annulé | Synclune",
	description: "Ton paiement a été annulé. Ton panier est toujours disponible.",
	robots: {
		index: false,
		follow: false,
	},
};

interface CheckoutCancelPageProps {
	searchParams: Promise<{
		reason?: string;
	}>;
}

/**
 * Page d'annulation de paiement.
 *
 * Avec Stripe Checkout Sessions (embedded), les erreurs liées à la carte sont
 * gérées entièrement dans l'iframe — l'utilisateur ne quitte pas /paiement.
 * On atterrit ici uniquement pour : annulation explicite, session expirée,
 * ou erreur serveur lors de la vérification de retour.
 */
export default async function CheckoutCancelPage({ searchParams }: CheckoutCancelPageProps) {
	const params = await searchParams;
	const reason = params.reason;

	const errorInfo = getCheckoutCancelMessage(reason);
	const ErrorIcon = errorInfo.icon;

	return (
		<div className="relative min-h-dvh min-h-screen">
			<div className="from-primary/2 to-secondary/3 fixed inset-0 -z-10 bg-linear-to-br via-transparent" />
			<section className="py-8 sm:py-10">
				<div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
					<Card className="border-primary/10 rounded-2xl shadow-md">
						<CardHeader className="space-y-4 pb-6 text-center">
							<div className="bg-muted/80 mx-auto flex size-18 items-center justify-center rounded-full">
								<ErrorIcon className="text-muted-foreground size-10" />
							</div>
							<CardTitle className="font-display text-2xl sm:text-3xl">{errorInfo.title}</CardTitle>
							<CardDescription className="text-base">
								Ta commande n&apos;a pas été finalisée
							</CardDescription>
						</CardHeader>

						<CardContent className="space-y-6">
							<Alert variant={reason && reason !== "canceled" ? "destructive" : "default"}>
								<Info className="size-4" />
								<AlertDescription>{errorInfo.description}</AlertDescription>
							</Alert>

							<div className="text-muted-foreground space-y-3 text-sm">
								<p>
									Ton panier est toujours disponible avec tous tes articles sélectionnés. Tu peux
									reprendre ta commande à tout moment.
								</p>

								<aside role="note" aria-label="Conseil" className="flex items-start gap-2">
									<span className="mt-0.5" aria-hidden="true">
										💡
									</span>
									<span>
										Si tu as rencontré un souci lors du paiement, n&apos;hésite pas à m&apos;écrire
										— je reprends la main avec toi.
									</span>
								</aside>
							</div>

							<p className="text-muted-foreground text-center text-sm">
								Ton panier et tes informations sont sauvegardés. Tu peux réessayer dès maintenant.
							</p>

							<div className="flex flex-col gap-3 pt-4 sm:flex-row">
								<Button asChild size="lg" className="flex-1">
									<Link href="/paiement">
										<ShoppingBag className="mr-2 size-4" />
										Reprendre ma commande
									</Link>
								</Button>
								<Button asChild variant="outline" size="lg" className="flex-1">
									<Link href="mailto:contact@synclune.fr">M&apos;écrire</Link>
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			</section>
		</div>
	);
}
