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
		index: false, // Ne pas indexer les pages de paiement
		follow: false,
	},
};

interface CheckoutCancelPageProps {
	searchParams: Promise<{
		order_id?: string;
		order_number?: string;
		reason?: string;
	}>;
}

/**
 * Page d'annulation de paiement avec messages d'erreur spécifiques.
 * Affichée quand l'utilisateur annule le paiement Stripe ou rencontre une erreur.
 *
 * Paramètres URL supportés :
 * - order_id : ID interne de la commande (cuid, fallback display)
 * - order_number : numéro lisible de la commande (préféré pour l'affichage)
 * - reason : raison de l'annulation (card_declined, expired_card, insufficient_funds, etc.)
 */
export default async function CheckoutCancelPage({ searchParams }: CheckoutCancelPageProps) {
	const params = await searchParams;
	const orderId = params.order_id;
	const orderNumber = params.order_number;
	const reason = params.reason;
	const displayReference = orderNumber ?? orderId;

	const errorInfo = getCheckoutCancelMessage(reason);
	const ErrorIcon = errorInfo.icon;
	return (
		<div className="relative min-h-screen">
			{/* Decorative background */}
			<div className="from-primary/2 to-secondary/3 fixed inset-0 -z-10 bg-linear-to-br via-transparent" />
			<h1 className="sr-only">Paiement annulé</h1>
			<section className="py-8 sm:py-10">
				<div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
					<Card
						style={{ viewTransitionName: "checkout-pay-cta" }}
						className="border-primary/10 rounded-2xl shadow-md"
					>
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
							{/* 🔴 CORRECTION : Message d'erreur spécifique */}
							<Alert variant={reason && reason !== "canceled" ? "destructive" : "default"}>
								<Info className="size-4" />
								<AlertDescription>{errorInfo.description}</AlertDescription>
							</Alert>

							{/* Afficher la référence de commande si disponible (orderNumber préféré) */}
							{displayReference && (
								<Alert>
									<Info className="size-4" />
									<AlertDescription>
										Référence de commande :{" "}
										<span className="tabular-nums">
											{orderNumber ? `#${orderNumber}` : displayReference}
										</span>
									</AlertDescription>
								</Alert>
							)}

							{/* 🔴 CORRECTION : Informations et conseils spécifiques */}
							<div className="text-muted-foreground space-y-3 text-sm">
								<p>
									Ton panier est toujours disponible avec tous tes articles sélectionnés. Tu peux
									reprendre ta commande à tout moment.
								</p>

								{/* Conseils spécifiques selon le type d'erreur */}
								{reason === "card_declined" && (
									<aside role="note" aria-label="Conseil" className="flex items-start gap-2">
										<span className="mt-0.5" aria-hidden="true">
											💡
										</span>
										<span>
											<strong>Que faire ?</strong> Vérifie que ta carte est activée pour les
											paiements en ligne, ou contacte ta banque si le problème persiste.
										</span>
									</aside>
								)}

								{reason === "insufficient_funds" && (
									<aside role="note" aria-label="Conseil" className="flex items-start gap-2">
										<span className="mt-0.5" aria-hidden="true">
											💡
										</span>
										<span>
											<strong>Que faire ?</strong> Vérifie ton solde ou utilise une autre carte
											bancaire.
										</span>
									</aside>
								)}

								{reason === "authentication_failed" && (
									<aside role="note" aria-label="Conseil" className="flex items-start gap-2">
										<span className="mt-0.5" aria-hidden="true">
											💡
										</span>
										<span>
											<strong>Que faire ?</strong> Assure-toi d&apos;avoir accès à ton application
											bancaire ou SMS pour valider l&apos;authentification 3D Secure.
										</span>
									</aside>
								)}

								{(!reason || reason === "canceled") && (
									<aside role="note" aria-label="Conseil" className="flex items-start gap-2">
										<span className="mt-0.5" aria-hidden="true">
											💡
										</span>
										<span>
											Si tu as rencontré un problème lors du paiement, n&apos;hésite pas à me
											contacter !
										</span>
									</aside>
								)}
							</div>

							{/* Reassurance message */}
							<p className="text-muted-foreground text-center text-sm">
								Ton panier et tes informations ont été sauvegardés. Tu peux réessayer immédiatement.
							</p>

							{/* Actions */}
							<div className="flex flex-col gap-3 pt-4 sm:flex-row">
								<Button asChild size="lg" className="flex-1">
									<Link href="/paiement">
										<ShoppingBag className="mr-2 size-4" />
										Reprendre ma commande
									</Link>
								</Button>
								<Button asChild variant="outline" size="lg" className="flex-1">
									<Link href="mailto:contact@synclune.fr">M'écrire</Link>
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			</section>
		</div>
	);
}
