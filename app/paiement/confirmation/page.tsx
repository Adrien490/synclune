import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Fade } from "@/shared/components/animations/fade";
import { Stagger } from "@/shared/components/animations/stagger";
import { SuccessIcon } from "./_components/success-icon";
import { getOrderForConfirmation } from "@/modules/orders/data/get-order-for-confirmation";
import { formatEuro } from "@/shared/utils/format-euro";
import { Clock, Heart, Package, Sparkles, UserPlus } from "lucide-react";
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
		pending?: string;
	}>;
}

/**
 * Page de confirmation de commande réussie
 * Affichée après le paiement Stripe réussi
 *
 * SÉCURISÉ : Nécessite order_id + order_number (double vérification)
 * Accepte paymentStatus PENDING car le webhook peut ne pas avoir encore process
 */
export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
	const params = await searchParams;
	const orderId = params.order_id;
	const orderNumber = params.order_number;
	const isPending = params.pending === "true";

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
		<div className="relative min-h-screen">
			{/* Decorative background */}
			<div className="from-primary/2 to-secondary/3 fixed inset-0 -z-10 bg-linear-to-br via-transparent" />
			<h1 className="sr-only">Confirmation de commande</h1>
			<section className="py-8 sm:py-10">
				<div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
					{/* Message de succès principal */}
					<Card className="border-primary/20 from-primary/5 to-background rounded-2xl border-2 bg-linear-to-br shadow-md">
						<CardHeader className="space-y-4 pb-6 text-center">
							<SuccessIcon />
							<Fade y={10} delay={0.15}>
								<CardTitle className="font-display text-2xl sm:text-3xl">
									Merci pour votre confiance ! <span aria-hidden="true">✨</span>
								</CardTitle>
							</Fade>
							<Fade y={10} delay={0.25}>
								<div className="space-y-2">
									<p className="text-muted-foreground text-sm">
										{isPending
											? "Votre commande a été enregistrée"
											: "Votre paiement a été accepté avec succès"}
									</p>
									<p className="text-lg font-semibold">Commande #{order.orderNumber}</p>
								</div>
							</Fade>
						</CardHeader>

						<CardContent className="space-y-6">
							{/* Async payment pending banner */}
							{isPending && (
								<Alert>
									<Clock />
									<AlertTitle>Paiement en cours de traitement</AlertTitle>
									<AlertDescription>
										Votre paiement est en cours de traitement. Vous recevrez un email de
										confirmation dès que le paiement sera validé.
									</AlertDescription>
								</Alert>
							)}

							{/* Articles commandés */}
							{order.items.length > 0 && (
								<div className="bg-muted/50 border-primary/5 space-y-3 rounded-xl border p-4">
									<h3 className="text-base font-semibold">Articles commandés</h3>
									<div className="space-y-3">
										{order.items.map((item) => (
											<div key={item.id} className="flex gap-3 text-sm">
												<div className="bg-muted relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border">
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
														<div className="text-muted-foreground flex h-full w-full items-center justify-center text-xs">
															N/A
														</div>
													)}
												</div>
												<div className="min-w-0 flex-1">
													<p className="line-clamp-1 font-medium">{item.productTitle}</p>
													<div className="text-muted-foreground space-x-2 text-xs">
														{item.skuSize && <span>Taille: {item.skuSize}</span>}
														{item.skuColor && <span>Couleur: {item.skuColor}</span>}
														{item.skuMaterial && <span>Matière: {item.skuMaterial}</span>}
													</div>
													<p className="text-muted-foreground text-xs">Qté: {item.quantity}</p>
												</div>
												<div className="shrink-0 text-right">
													<p className="font-medium tabular-nums">
														{formatEuro(item.price * item.quantity)}
													</p>
												</div>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Récapitulatif montants */}
							<div className="bg-muted/50 border-primary/5 space-y-3 rounded-xl border p-4">
								<h3 className="text-base font-semibold">Récapitulatif</h3>
								<div className="space-y-2 text-sm">
									<div className="flex justify-between">
										<span className="text-muted-foreground">Sous-total</span>
										<span>{formatEuro(order.subtotal)}</span>
									</div>
									{order.discountAmount > 0 && (
										<div className="flex justify-between text-green-600">
											<span>Réduction</span>
											<span>-{formatEuro(order.discountAmount)}</span>
										</div>
									)}
									<div className="flex justify-between">
										<span className="text-muted-foreground">Livraison</span>
										<span>{formatEuro(order.shippingCost)}</span>
									</div>
									<div className="flex justify-between border-t pt-2 text-base font-semibold">
										<span>Total</span>
										<span>{formatEuro(order.total)}</span>
									</div>
								</div>
							</div>

							{/* Adresse de livraison */}
							<div className="bg-muted/50 border-primary/5 space-y-2 rounded-xl border p-4">
								<h3 className="text-base font-semibold">Adresse de livraison</h3>
								<div className="text-muted-foreground text-sm">
									<p className="text-foreground font-medium">
										{order.shippingFirstName} {order.shippingLastName}
									</p>
									<p>{order.shippingAddress1}</p>
									{order.shippingAddress2 && <p>{order.shippingAddress2}</p>}
									<p>
										{order.shippingPostalCode} {order.shippingCity}
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
									Je vais préparer votre commande avec le plus grand soin ! Chaque bijou est emballé
									avec amour dans mon atelier.
								</AlertDescription>
							</Alert>

							{/* Prochaines étapes */}
							<div className="space-y-4">
								<h3 className="font-display flex items-center gap-2 font-semibold">
									<Sparkles className="text-primary h-5 w-5" />
									Que va-t-il se passer maintenant ?
								</h3>

								<Stagger className="space-y-3" stagger={0.1} y={15} delay={0.3}>
									<div className="flex items-start gap-3">
										<div className="bg-primary/10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
											<span className="text-primary text-sm font-semibold">1</span>
										</div>
										<div>
											<p className="font-medium">Email de confirmation</p>
											<p className="text-muted-foreground text-sm">
												Vous allez recevoir un email récapitulatif dans les prochaines minutes.
												Pensez à vérifier vos spams si vous ne le recevez pas.
											</p>
										</div>
									</div>

									<div className="flex items-start gap-3">
										<div className="bg-primary/10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
											<span className="text-primary text-sm font-semibold">2</span>
										</div>
										<div>
											<p className="font-medium">Je prépare votre commande</p>
											<p className="text-muted-foreground text-sm">
												Votre bijou sera préparé avec soin et expédié dans les prochains jours
												ouvrés.
											</p>
										</div>
									</div>

									<div className="flex items-start gap-3">
										<div className="bg-primary/10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
											<span className="text-primary text-sm font-semibold">3</span>
										</div>
										<div>
											<p className="font-medium">Suivi de livraison</p>
											<p className="text-muted-foreground text-sm">
												Vous recevrez un email avec le numéro de suivi dès que votre colis sera
												expédié.
											</p>
										</div>
									</div>
								</Stagger>
							</div>

							{/* Guest account creation CTA (Baymard: post-purchase account creation) */}
							{!session && (
								<Card className="rounded-xl border-dashed">
									<CardContent className="flex items-start gap-4 p-4">
										<div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
											<UserPlus className="text-primary h-5 w-5" />
										</div>
										<div className="space-y-2">
											<h3 className="font-semibold">
												Créez votre compte pour suivre votre commande
											</h3>
											<p className="text-muted-foreground text-sm">
												Accédez au suivi de votre commande, enregistrez vos adresses et simplifiez
												vos prochains achats.
											</p>
											<Button asChild variant="outline" size="sm">
												<Link href="/inscription">
													<UserPlus className="h-4 w-4" />
													Créer mon compte
												</Link>
											</Button>
										</div>
									</CardContent>
								</Card>
							)}

							{/* Actions */}
							<div className="flex flex-col gap-3 pt-4 sm:flex-row">
								{session ? (
									<Button asChild size="lg" className="flex-1">
										<Link href={`/commandes/${order.orderNumber}`}>
											<Package className="mr-2 h-4 w-4" />
											Suivre ma commande
										</Link>
									</Button>
								) : (
									<Button asChild size="lg" className="flex-1">
										<Link href="/">
											<Package className="mr-2 h-4 w-4" />
											Retour à l'accueil
										</Link>
									</Button>
								)}
								<Button asChild variant="outline" size="lg" className="flex-1">
									<Link href="/produits">Continuer mes achats</Link>
								</Button>
							</div>
						</CardContent>
					</Card>

					{/* Message de support */}
					<div className="mt-8 space-y-2 text-center">
						<p className="text-muted-foreground text-sm">Une question sur votre commande ?</p>
						<Button asChild variant="link">
							<Link href="/personnalisation">Écrivez-moi</Link>
						</Button>
					</div>
				</div>
			</section>
		</div>
	);
}
