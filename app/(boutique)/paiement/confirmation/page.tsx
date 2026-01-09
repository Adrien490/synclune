import { PageHeader } from "@/shared/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { getOrder } from "@/modules/orders/data/get-order";
import { formatEuro } from "@/shared/utils/format-euro";
import { CheckCircle2, Heart, Package, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
	title: "Commande confirmée | Synclune",
	description: "Ta commande a été confirmée avec succès. Merci pour ta confiance !",
	robots: {
		index: false, // Ne pas indexer les pages de confirmation de commande
		follow: false,
	},
};

interface CheckoutSuccessPageProps {
	searchParams: Promise<{
		order_id?: string;
	}>;
}

/**
 * Page de confirmation de commande réussie
 * Affichée après le paiement Stripe réussi
 *
 * SÉCURISÉ : Nécessite order_id en paramètre et vérifie que la commande est payée
 */
export default async function CheckoutSuccessPage({
	searchParams,
}: CheckoutSuccessPageProps) {
	const params = await searchParams;
	const orderId = params.order_id;

	// Si pas d'order_id, rediriger vers les commandes
	if (!orderId) {
		redirect("/orders");
	}

	// Récupérer la commande
	const order = await getOrder({ orderNumber: orderId });

	// Si commande introuvable ou non payée, rediriger
	if (!order || order.paymentStatus !== "PAID") {
		redirect("/orders");
	}

	return (
		<div className="min-h-screen">
			<PageHeader
				title="Commande confirmée"
				breadcrumbs={[
					{ label: "Paiement", href: "/paiement" },
					{ label: "Confirmation", href: "/paiement/confirmation" },
				]}
			/>

			<section className="bg-background py-12">
				<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
					{/* Message de succès principal */}
					<Card className="border-2 border-primary/20 bg-linear-to-br from-primary/5 to-background">
						<CardHeader className="text-center space-y-4 pb-6">
							<div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
								<CheckCircle2 className="w-10 h-10 text-primary" />
							</div>
							<CardTitle className="text-2xl sm:text-3xl">
								Merci pour ta confiance !{" "}
								<span aria-hidden="true">✨</span>
							</CardTitle>
							<div className="space-y-2">
								<p className="text-sm text-muted-foreground">
									Ton paiement a été accepté avec succès
								</p>
								<p className="text-lg font-semibold">
									Commande #{order.orderNumber}
								</p>
							</div>
						</CardHeader>

						<CardContent className="space-y-6">
							{/* Récapitulatif de la commande */}
							<div className="bg-muted/50 rounded-lg p-4 space-y-3">
								<h3 className="font-semibold text-base">Récapitulatif</h3>
								<div className="space-y-2 text-sm">
									<div className="flex justify-between">
										<span className="text-muted-foreground">Sous-total</span>
										<span>{formatEuro(order.subtotal)}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Livraison</span>
										<span>{formatEuro(order.shippingCost)}</span>
									</div>
									<div className="border-t pt-2 flex justify-between font-semibold text-base">
										<span>Total</span>
										<span>{formatEuro(order.total)}</span>
									</div>
									<p className="text-xs text-muted-foreground text-right">
									</p>
								</div>
							</div>

							{/* Adresse de livraison */}
							<div className="bg-muted/50 rounded-lg p-4 space-y-2">
								<h3 className="font-semibold text-base">Adresse de livraison</h3>
								<div className="text-sm text-muted-foreground">
									<p className="font-medium text-foreground">
										{order.shippingFirstName} {order.shippingLastName}
									</p>
									<p>{order.shippingAddress1}</p>
									{order.shippingAddress2 && <p>{order.shippingAddress2}</p>}
									<p>
										{order.shippingPostalCode} {order.shippingCity}
									</p>
									<p className="mt-1 text-xs">📞 {order.shippingPhone}</p>
								</div>
							</div>

							{/* Message personnalisé */}
							<Alert>
								<Heart />
								<AlertTitle>Merci du fond du cœur 💕</AlertTitle>
								<AlertDescription>
									Je vais préparer ta commande avec le plus grand soin ! Chaque bijou
									est emballé avec amour dans mon atelier.
								</AlertDescription>
							</Alert>

							{/* Prochaines étapes */}
							<div className="space-y-4">
								<h3 className="font-semibold flex items-center gap-2">
									<Sparkles className="w-5 h-5 text-primary" />
									Que va-t-il se passer maintenant ?
								</h3>

								<div className="space-y-3">
									<div className="flex gap-3 items-start">
										<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
											<span className="text-sm font-semibold text-primary">
												1
											</span>
										</div>
										<div>
											<p className="font-medium">Email de confirmation</p>
											<p className="text-sm text-muted-foreground">
												Tu vas recevoir un email récapitulatif dans
												quelques instants.
											</p>
										</div>
									</div>

									<div className="flex gap-3 items-start">
										<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
											<span className="text-sm font-semibold text-primary">
												2
											</span>
										</div>
										<div>
											<p className="font-medium">Je prépare ta commande</p>
											<p className="text-sm text-muted-foreground">
												Ton bijou sera préparé avec soin et expédié dans les
												prochains jours ouvrés.
											</p>
										</div>
									</div>

									<div className="flex gap-3 items-start">
										<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
											<span className="text-sm font-semibold text-primary">
												3
											</span>
										</div>
										<div>
											<p className="font-medium">Suivi de livraison</p>
											<p className="text-sm text-muted-foreground">
												Tu recevras un email avec le numéro de suivi dès que
												ton colis sera expédié.
											</p>
										</div>
									</div>
								</div>
							</div>

							{/* Actions */}
							<div className="flex flex-col sm:flex-row gap-3 pt-4">
								<Button asChild size="lg" className="flex-1">
									<Link href="/commandes">
										<Package className="w-4 h-4 mr-2" />
										Suivre ma commande
									</Link>
								</Button>
								<Button asChild variant="outline" size="lg" className="flex-1">
									<Link href="/produits">Continuer mes achats</Link>
								</Button>
							</div>
						</CardContent>
					</Card>

					{/* Message de support */}
					<div className="mt-8 text-center space-y-2">
						<p className="text-sm text-muted-foreground">
							Une question sur ta commande ?
						</p>
						<Button asChild variant="link">
							<Link href="/personnalisation">Contacte-nous</Link>
						</Button>
					</div>
				</div>
			</section>
		</div>
	);
}
