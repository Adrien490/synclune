import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { getOrderForConfirmation } from "@/modules/orders/data/get-order-for-confirmation";
import { formatEuro } from "@/shared/utils/format-euro";
import { CheckCircle2, Heart, Package, Sparkles, UserPlus } from "lucide-react";
import { getSession } from "@/modules/auth/lib/get-current-session";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
	title: "Commande confirmée | Synclune",
	description: "Votre commande a été confirmée avec succès. Merci pour votre confiance !",
	robots: {
		index: false,
		follow: false,
	},
};

interface CheckoutSuccessPageProps {
	searchParams: Promise<{
		order_id?: string;
		order_number?: string;
	}>;
}

/**
 * Page de confirmation de commande réussie
 * Affichée après le paiement Stripe réussi
 *
 * SÉCURISÉ : Nécessite order_id + order_number (double vérification)
 * Accepte paymentStatus PENDING car le webhook peut ne pas avoir encore process
 */
export default async function CheckoutSuccessPage({
	searchParams,
}: CheckoutSuccessPageProps) {
	const params = await searchParams;
	const orderId = params.order_id;
	const orderNumber = params.order_number;

	// Both params required for secure lookup
	if (!orderId || !orderNumber) {
		redirect("/");
	}

	// Fetch order and session in parallel
	const [order, session] = await Promise.all([
		getOrderForConfirmation(orderId, orderNumber),
		getSession(),
	]);

	// Accept both PENDING and PAID: Stripe already confirmed payment on the return page,
	// but the webhook may not have processed yet (race condition)
	if (!order) {
		redirect("/");
	}

	return (
		<div className="min-h-screen">
			<section className="bg-background py-8 sm:py-10">
				<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
					{/* Message de succès principal */}
					<Card className="border-2 border-primary/20 bg-linear-to-br from-primary/5 to-background">
						<CardHeader className="text-center space-y-4 pb-6">
							<div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
								<CheckCircle2 className="w-10 h-10 text-primary" />
							</div>
							<CardTitle className="text-2xl sm:text-3xl">
								Merci pour votre confiance !{" "}
								<span aria-hidden="true">✨</span>
							</CardTitle>
							<div className="space-y-2">
								<p className="text-sm text-muted-foreground">
									Votre paiement a été accepté avec succès
								</p>
								<p className="text-lg font-semibold">
									Commande #{order.orderNumber}
								</p>
							</div>
						</CardHeader>

						<CardContent className="space-y-6">
							{/* Articles commandés */}
							{order.items.length > 0 && (
								<div className="bg-muted/50 rounded-lg p-4 space-y-3">
									<h3 className="font-semibold text-base">Articles commandés</h3>
									<div className="space-y-3">
										{order.items.map((item) => (
											<div key={item.id} className="flex gap-3 text-sm">
												<div className="relative w-14 h-14 shrink-0 rounded-md overflow-hidden bg-muted border">
													{item.skuImageUrl ? (
														<Image
															src={item.skuImageUrl}
															alt={item.productTitle}
															fill
															sizes="56px"
															quality={70}
															className="object-cover"
														/>
													) : (
														<div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
															N/A
														</div>
													)}
												</div>
												<div className="flex-1 min-w-0">
													<p className="font-medium line-clamp-1">{item.productTitle}</p>
													<div className="text-xs text-muted-foreground space-x-2">
														{item.skuSize && <span>Taille: {item.skuSize}</span>}
														{item.skuColor && <span>Couleur: {item.skuColor}</span>}
														{item.skuMaterial && <span>Matière: {item.skuMaterial}</span>}
													</div>
													<p className="text-xs text-muted-foreground">Qté: {item.quantity}</p>
												</div>
												<div className="text-right shrink-0">
													<p className="tabular-nums font-medium">
														{formatEuro(item.price * item.quantity)}
													</p>
												</div>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Récapitulatif montants */}
							<div className="bg-muted/50 rounded-lg p-4 space-y-3">
								<h3 className="font-semibold text-base">Récapitulatif</h3>
								<div className="space-y-2 text-sm">
									<div className="flex justify-between">
										<span className="text-muted-foreground">Sous-total</span>
										<span>{formatEuro(order.subtotal)}</span>
									</div>
									{order.discountAmount > 0 && (
										<div className="flex justify-between text-green-600 dark:text-green-400">
											<span>Réduction</span>
											<span>-{formatEuro(order.discountAmount)}</span>
										</div>
									)}
									<div className="flex justify-between">
										<span className="text-muted-foreground">Livraison</span>
										<span>{formatEuro(order.shippingCost)}</span>
									</div>
									<div className="border-t pt-2 flex justify-between font-semibold text-base">
										<span>Total</span>
										<span>{formatEuro(order.total)}</span>
									</div>
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
									<p className="mt-1 text-xs">
										<span aria-hidden="true">📞</span> {order.shippingPhone}
									</p>
								</div>
							</div>

							{/* Message personnalisé */}
							<Alert>
								<Heart />
								<AlertTitle>
									Merci du fond du cœur <span aria-hidden="true">💕</span>
								</AlertTitle>
								<AlertDescription>
									Je vais préparer votre commande avec le plus grand soin ! Chaque bijou
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
												Vous allez recevoir un email récapitulatif dans
												les prochaines minutes. Pensez à vérifier vos spams
												si vous ne le recevez pas.
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
											<p className="font-medium">Je prépare votre commande</p>
											<p className="text-sm text-muted-foreground">
												Votre bijou sera préparé avec soin et expédié dans les
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
												Vous recevrez un email avec le numéro de suivi dès que
												votre colis sera expédié.
											</p>
										</div>
									</div>
								</div>
							</div>

							{/* Guest account creation CTA (Baymard: post-purchase account creation) */}
							{!session && (
								<Card className="border-dashed">
									<CardContent className="flex items-start gap-4 p-4">
										<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
											<UserPlus className="w-5 h-5 text-primary" />
										</div>
										<div className="space-y-2">
											<h3 className="font-semibold">Créez votre compte pour suivre votre commande</h3>
											<p className="text-sm text-muted-foreground">
												Accédez au suivi de votre commande, enregistrez vos adresses et simplifiez
												vos prochains achats.
											</p>
											<Button asChild variant="outline" size="sm">
												<Link href="/inscription">
													<UserPlus className="w-4 h-4" />
													Créer mon compte
												</Link>
											</Button>
										</div>
									</CardContent>
								</Card>
							)}

							{/* Actions */}
							<div className="flex flex-col sm:flex-row gap-3 pt-4">
								<Button asChild size="lg" className="flex-1">
									<Link href="/">
										<Package className="w-4 h-4 mr-2" />
										Retour à l'accueil
									</Link>
								</Button>
								<Button asChild variant="outline" size="lg" className="flex-1">
									<Link href="/creations">Continuer mes achats</Link>
								</Button>
							</div>
						</CardContent>
					</Card>

					{/* Message de support */}
					<div className="mt-8 text-center space-y-2">
						<p className="text-sm text-muted-foreground">
							Une question sur votre commande ?
						</p>
						<Button asChild variant="link">
							<Link href="/personnalisation">Écrivez-moi</Link>
						</Button>
					</div>
				</div>
			</section>
		</div>
	);
}
