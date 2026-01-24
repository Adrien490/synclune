import { PageHeader } from "@/shared/components/page-header";
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
			<PageHeader
				title={errorInfo.title}
				breadcrumbs={[
					{ label: "Paiement", href: "/paiement" },
					{ label: "Annulation", href: "/paiement/annulation" },
				]}
			/>

			<section className="bg-background py-12">
				<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
					<Card className="border-2">
						<CardHeader className="text-center space-y-4 pb-6">
							<div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
								<ErrorIcon className="w-10 h-10 text-muted-foreground" />
							</div>
							<CardTitle className="text-2xl sm:text-3xl">
								{errorInfo.title}
							</CardTitle>
							<CardDescription className="text-base">
								Ta commande n'a pas été finalisée
							</CardDescription>
						</CardHeader>

						<CardContent className="space-y-6">
							{/* 🔴 CORRECTION : Message d'erreur spécifique */}
							<Alert variant={reason && reason !== "canceled" ? "destructive" : "default"}>
								<Info className="h-4 w-4" />
								<AlertDescription>
									{errorInfo.description}
								</AlertDescription>
							</Alert>

							{/* 🔴 CORRECTION : Afficher l'ID de commande si disponible */}
							{orderId && (
								<Alert>
									<Info className="h-4 w-4" />
									<AlertDescription>
										Référence de commande : <span className="font-mono">{orderId}</span>
									</AlertDescription>
								</Alert>
							)}

							{/* 🔴 CORRECTION : Informations et conseils spécifiques */}
							<div className="space-y-3 text-sm text-muted-foreground">
								<p>
									Ton panier est toujours disponible avec tous tes articles
									sélectionnés. Tu peux reprendre ta commande à tout
									moment.
								</p>

								{/* Conseils spécifiques selon le type d'erreur */}
								{reason === "card_declined" && (
									<p className="flex items-start gap-2">
										<span className="mt-0.5">💡</span>
										<span>
											<strong>Que faire ?</strong> Vérifie que ta carte est activée pour les paiements en ligne,
											ou contacte ta banque si le problème persiste.
										</span>
									</p>
								)}

								{reason === "insufficient_funds" && (
									<p className="flex items-start gap-2">
										<span className="mt-0.5">💡</span>
										<span>
											<strong>Que faire ?</strong> Vérifie ton solde ou utilise une autre carte bancaire.
										</span>
									</p>
								)}

								{reason === "authentication_failed" && (
									<p className="flex items-start gap-2">
										<span className="mt-0.5">💡</span>
										<span>
											<strong>Que faire ?</strong> Assure-toi d'avoir accès à ton application bancaire
											ou SMS pour valider l'authentification 3D Secure.
										</span>
									</p>
								)}

								{(!reason || reason === "canceled") && (
									<p className="flex items-start gap-2">
										<span className="mt-0.5">💡</span>
										<span>
											Si tu as rencontré un problème lors du paiement,
											n'hésite pas à me contacter !
										</span>
									</p>
								)}
							</div>

							{/* Actions */}
							<div className="flex flex-col sm:flex-row gap-3 pt-4">
								<Button asChild size="lg" className="flex-1">
									<Link href="/paiement">
										<ShoppingBag className="w-4 h-4 mr-2" />
										Reprendre ma commande
									</Link>
								</Button>
								<Button asChild variant="outline" size="lg" className="flex-1">
									<Link href="/personnalisation">Nous contacter</Link>
								</Button>
							</div>
						</CardContent>
					</Card>

				</div>
			</section>
		</div>
	);
}
