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
	description: "Votre paiement a été annulé. Votre panier est toujours disponible.",
	robots: {
		index: false, // Ne pas indexer les pages de paiement
		follow: false,
	},
};

interface CheckoutCancelPageProps {
	searchParams: Promise<{
		order_id?: string;
		reason?: string;
	}>;
}

/**
 * 🔴 CORRECTION : Page d'annulation de paiement avec messages d'erreur spécifiques
 * Affichée quand l'utilisateur annule le paiement Stripe ou rencontre une erreur
 *
 * Paramètres URL supportés :
 * - order_id : ID de la commande annulée
 * - reason : Raison de l'annulation (card_declined, expired_card, insufficient_funds, etc.)
 */
export default async function CheckoutCancelPage({ searchParams }: CheckoutCancelPageProps) {
	const params = await searchParams;
	const orderId = params.order_id;
	const reason = params.reason;

	const errorInfo = getCheckoutCancelMessage(reason);
	const ErrorIcon = errorInfo.icon;
	return (
		<div className="min-h-screen">
			<section className="bg-background py-8 sm:py-10">
				<div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
					<Card className="border-2">
						<CardHeader className="space-y-4 pb-6 text-center">
							<div className="bg-muted mx-auto flex h-16 w-16 items-center justify-center rounded-full">
								<ErrorIcon className="text-muted-foreground h-10 w-10" />
							</div>
							<CardTitle className="text-2xl sm:text-3xl">{errorInfo.title}</CardTitle>
							<CardDescription className="text-base">
								Votre commande n'a pas été finalisée
							</CardDescription>
						</CardHeader>

						<CardContent className="space-y-6">
							{/* 🔴 CORRECTION : Message d'erreur spécifique */}
							<Alert variant={reason && reason !== "canceled" ? "destructive" : "default"}>
								<Info className="h-4 w-4" />
								<AlertDescription>{errorInfo.description}</AlertDescription>
							</Alert>

							{/* 🔴 CORRECTION : Afficher l'ID de commande si disponible */}
							{orderId && (
								<Alert>
									<Info className="h-4 w-4" />
									<AlertDescription>
										Référence de commande : <span className="tabular-nums">{orderId}</span>
									</AlertDescription>
								</Alert>
							)}

							{/* 🔴 CORRECTION : Informations et conseils spécifiques */}
							<div className="text-muted-foreground space-y-3 text-sm">
								<p>
									Votre panier est toujours disponible avec tous vos articles sélectionnés. Vous
									pouvez reprendre votre commande à tout moment.
								</p>

								{/* Conseils spécifiques selon le type d'erreur */}
								{reason === "card_declined" && (
									<p className="flex items-start gap-2">
										<span className="mt-0.5" aria-hidden="true">
											💡
										</span>
										<span>
											<strong>Que faire ?</strong> Vérifiez que votre carte est activée pour les
											paiements en ligne, ou contactez votre banque si le problème persiste.
										</span>
									</p>
								)}

								{reason === "insufficient_funds" && (
									<p className="flex items-start gap-2">
										<span className="mt-0.5" aria-hidden="true">
											💡
										</span>
										<span>
											<strong>Que faire ?</strong> Vérifiez votre solde ou utilisez une autre carte
											bancaire.
										</span>
									</p>
								)}

								{reason === "authentication_failed" && (
									<p className="flex items-start gap-2">
										<span className="mt-0.5" aria-hidden="true">
											💡
										</span>
										<span>
											<strong>Que faire ?</strong> Assurez-vous d'avoir accès à votre application
											bancaire ou SMS pour valider l'authentification 3D Secure.
										</span>
									</p>
								)}

								{(!reason || reason === "canceled") && (
									<p className="flex items-start gap-2">
										<span className="mt-0.5" aria-hidden="true">
											💡
										</span>
										<span>
											Si vous avez rencontré un problème lors du paiement, n'hésite pas à me
											contacter !
										</span>
									</p>
								)}
							</div>

							{/* Reassurance message */}
							<p className="text-muted-foreground text-center text-sm">
								Votre panier et vos informations ont été sauvegardés. Vous pouvez réessayer
								immédiatement.
							</p>

							{/* Actions */}
							<div className="flex flex-col gap-3 pt-4 sm:flex-row">
								<Button asChild size="lg" className="flex-1">
									<Link href="/paiement">
										<ShoppingBag className="mr-2 h-4 w-4" />
										Reprendre ma commande
									</Link>
								</Button>
								<Button asChild variant="outline" size="lg" className="flex-1">
									<Link href="/personnalisation">M'écrire</Link>
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			</section>
		</div>
	);
}
