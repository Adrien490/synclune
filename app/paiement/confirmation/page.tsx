import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Fade } from "@/shared/components/animations/fade";
import { Stagger } from "@/shared/components/animations/stagger";
import { SuccessIcon } from "./_components/success-icon";
import {
	getOrderBySessionId,
	getOrderForConfirmation,
	type OrderForConfirmation,
} from "@/modules/orders/data/get-order-for-confirmation";
import { getShippingInfo } from "@/modules/orders/services/shipping.service";
import type { ShippingCountry } from "@/shared/constants/countries";
import { formatEuro } from "@/shared/utils/format-euro";
import { stripe } from "@/shared/lib/stripe";
import {
	Clock,
	ExternalLink,
	Heart,
	Package,
	Receipt,
	Sparkles,
	TruckIcon,
	UserPlus,
} from "lucide-react";
import { getSession } from "@/modules/auth/lib/get-current-session";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type Stripe from "stripe";

import { IMAGE_BLUR_FALLBACK } from "@/shared/constants/images";
import { PurchaseTracker } from "@/shared/components/analytics/purchase-tracker";

function extractReceiptUrl(charge: Stripe.PaymentIntent["latest_charge"]): string | null {
	if (charge && typeof charge !== "string") {
		return charge.receipt_url ?? null;
	}
	return null;
}

interface PendingPlaceholder {
	totalAmount: number | null;
	sessionRef: string;
}

export const metadata: Metadata = {
	title: "Commande confirmée | Synclune",
	description: "Ta commande a été confirmée avec succès. Merci pour ta confiance !",
	robots: {
		index: false,
		follow: false,
	},
};

interface CheckoutSuccessPageProps {
	searchParams: Promise<{
		order_id?: string;
		order_number?: string;
		session_id?: string;
		pending?: string;
	}>;
}

/**
 * Page de confirmation de commande réussie
 * Affichée après le paiement Stripe réussi
 *
 * SÉCURISÉ : Trois branches d'entrée possibles :
 * 1) `order_id + order_number` → lookup standard double vérification (chemin nominal)
 * 2) `session_id + pending=true` + Order créée → lookup par sessionId (webhook arrivé entre retour et confirm)
 * 3) `session_id + pending=true` + Order absente → placeholder Stripe Session (paiement async SEPA, webhook en retard)
 */
export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
	const params = await searchParams;
	const orderId = params.order_id;
	const orderNumber = params.order_number;
	const sessionId = params.session_id;
	const isPending = params.pending === "true";

	let order: OrderForConfirmation | null = null;
	let pendingPlaceholder: PendingPlaceholder | null = null;
	const session = await getSession();

	if (orderId && orderNumber) {
		order = await getOrderForConfirmation(orderId, orderNumber);
	} else if (sessionId && isPending) {
		order = await getOrderBySessionId(sessionId);
		if (!order) {
			let stripeSession: Awaited<ReturnType<typeof stripe.checkout.sessions.retrieve>> | null =
				null;
			try {
				stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
			} catch {
				stripeSession = null;
			}
			if (!stripeSession) {
				redirect("/");
			}
			pendingPlaceholder = {
				totalAmount: stripeSession.amount_total ?? null,
				sessionRef: sessionId.slice(-8).toUpperCase(),
			};
		}
	}

	if (!order && !pendingPlaceholder) {
		redirect("/");
	}

	// Delivery estimate based on shipping country (only when order is known)
	const shippingInfo = order
		? getShippingInfo(
				((order.shippingCountry as ShippingCountry | null) ?? "FR") as ShippingCountry,
				order.shippingPostalCode,
			)
		: null;

	// Fetch Stripe receipt URL (best-effort, non-blocking)
	let receiptUrl: string | null = null;
	if (order?.stripePaymentIntentId && !isPending) {
		try {
			const pi = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId, {
				expand: ["latest_charge"],
			});
			receiptUrl = extractReceiptUrl(pi.latest_charge);
		} catch {
			// Non-critical: receipt link is optional
		}
	}

	const displayOrderNumber = order?.orderNumber ?? null;
	const displaySessionRef = pendingPlaceholder?.sessionRef ?? null;

	return (
		<div className="relative min-h-dvh min-h-screen">
			{/* Decorative background */}
			<div className="from-primary/2 to-secondary/3 fixed inset-0 -z-10 bg-linear-to-br via-transparent" />
			<h1 className="sr-only">Confirmation de commande</h1>

			{/* Funnel analytics : purchase (only after paid order, sessionStorage-deduped) */}
			{order && !isPending && (
				<PurchaseTracker orderNumber={order.orderNumber} valueCents={order.total} />
			)}
			<section className="py-8 sm:py-10">
				<div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
					{/* Message de succès principal */}
					<Card className="border-primary/20 from-primary/5 to-background rounded-2xl border-2 bg-linear-to-br shadow-md">
						<CardHeader className="space-y-4 pb-6 text-center">
							<SuccessIcon />
							<Fade y={10} delay={0.15}>
								<CardTitle className="font-display text-2xl sm:text-3xl">
									Merci pour ta confiance ! <span aria-hidden="true">✨</span>
								</CardTitle>
							</Fade>
							<Fade y={10} delay={0.25}>
								<div className="space-y-2">
									<p className="text-muted-foreground text-sm">
										{isPending
											? "Ta commande a été enregistrée"
											: "Ton paiement a été accepté avec succès"}
									</p>
									{displayOrderNumber ? (
										<p className="text-lg font-semibold">Commande #{displayOrderNumber}</p>
									) : displaySessionRef ? (
										<p className="text-muted-foreground text-sm">
											Référence : <span className="font-medium">{displaySessionRef}</span>
										</p>
									) : null}
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
										Ton paiement est en cours de traitement. Tu recevras un email de confirmation
										dès que le paiement sera validé.
									</AlertDescription>
								</Alert>
							)}

							{/* Articles commandés — visible uniquement si Order présente */}
							{order && order.items.length > 0 && (
								<div className="bg-muted/50 border-primary/5 space-y-3 rounded-xl border p-4">
									<h3 className="text-base font-semibold">Articles commandés</h3>
									<div className="space-y-3">
										{order.items.map((item) => (
											<div key={item.id} className="flex gap-3 text-sm">
												<div className="bg-muted relative size-14 shrink-0 overflow-hidden rounded-xl border">
													{item.skuImageUrl ? (
														<Image
															src={item.skuImageUrl}
															alt={item.productTitle}
															fill
															sizes="56px"
															quality={70}
															className="object-cover"
															placeholder="blur"
															blurDataURL={IMAGE_BLUR_FALLBACK}
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
							{order ? (
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
										<div className="space-y-1">
											<div className="flex justify-between">
												<span className="text-muted-foreground">Livraison</span>
												<span>{formatEuro(order.shippingCost)}</span>
											</div>
											{shippingInfo && (
												<div className="text-muted-foreground flex items-center gap-1 pl-0.5 text-xs">
													<TruckIcon className="size-3" />
													Délai estimé : {shippingInfo.estimatedDays}
												</div>
											)}
										</div>
										<div className="flex justify-between border-t pt-2 text-base font-semibold">
											<span>Total</span>
											<span>{formatEuro(order.total)}</span>
										</div>
									</div>
								</div>
							) : pendingPlaceholder?.totalAmount !== null &&
							  pendingPlaceholder?.totalAmount !== undefined ? (
								<div className="bg-muted/50 border-primary/5 space-y-3 rounded-xl border p-4">
									<h3 className="text-base font-semibold">Récapitulatif</h3>
									<div className="flex justify-between text-base font-semibold">
										<span>Total</span>
										<span className="tabular-nums">
											{formatEuro(pendingPlaceholder.totalAmount / 100)}
										</span>
									</div>
									<p className="text-muted-foreground text-xs">
										Le détail complet apparaîtra ici dès que le paiement sera validé.
									</p>
								</div>
							) : null}

							{/* Adresse de livraison — visible uniquement si Order présente */}
							{order && (
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
							)}

							{/* Receipt link */}
							{receiptUrl && (
								<div className="flex justify-center">
									<a
										href={receiptUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-sm text-sm underline transition-colors hover:no-underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
									>
										<Receipt className="size-4" />
										Télécharger mon reçu
										<ExternalLink className="size-3" />
									</a>
								</div>
							)}

							{/* Message personnalisé */}
							<Alert>
								<Heart />
								<AlertTitle>
									Merci du fond du cœur <span aria-hidden="true">💕</span>
								</AlertTitle>
								<AlertDescription>
									Je vais préparer ta commande avec le plus grand soin ! Chaque bijou est emballé
									avec amour dans mon atelier.
								</AlertDescription>
							</Alert>

							{/* Prochaines étapes */}
							<div className="space-y-4">
								<h3 className="font-display flex items-center gap-2 font-normal">
									<Sparkles className="text-primary size-5" />
									Que va-t-il se passer maintenant ?
								</h3>

								<Stagger className="space-y-3" stagger={0.1} y={15} delay={0.3}>
									<div className="flex items-start gap-3">
										<div className="bg-primary/10 mt-1 flex size-8 shrink-0 items-center justify-center rounded-full">
											<span className="text-primary text-sm font-semibold">1</span>
										</div>
										<div>
											<p className="font-medium">Email de confirmation</p>
											<p className="text-muted-foreground text-sm">
												Tu vas recevoir un email récapitulatif dans les prochaines minutes. Pense à
												vérifier tes spams si tu ne le reçois pas.
											</p>
										</div>
									</div>

									<div className="flex items-start gap-3">
										<div className="bg-primary/10 mt-1 flex size-8 shrink-0 items-center justify-center rounded-full">
											<span className="text-primary text-sm font-semibold">2</span>
										</div>
										<div>
											<p className="font-medium">Je prépare ta commande</p>
											<p className="text-muted-foreground text-sm">
												Ton bijou sera préparé avec soin et expédié dans les prochains jours ouvrés.
											</p>
										</div>
									</div>

									<div className="flex items-start gap-3">
										<div className="bg-primary/10 mt-1 flex size-8 shrink-0 items-center justify-center rounded-full">
											<span className="text-primary text-sm font-semibold">3</span>
										</div>
										<div>
											<p className="font-medium">Suivi de livraison</p>
											<p className="text-muted-foreground text-sm">
												Tu recevras un email avec le numéro de suivi dès que ton colis sera expédié.
											</p>
										</div>
									</div>
								</Stagger>
							</div>

							{/* Guest account creation CTA (Baymard: post-purchase account creation) */}
							{!session && (
								<Card className="rounded-xl border-dashed">
									<CardContent className="flex items-start gap-4 p-4">
										<div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-full">
											<UserPlus className="text-primary size-5" />
										</div>
										<div className="space-y-2">
											<h3 className="font-semibold">Crée ton compte pour suivre ta commande</h3>
											<p className="text-muted-foreground text-sm">
												Accède au suivi de ta commande, enregistre tes adresses et simplifie tes
												prochains achats.
											</p>
											<Button asChild variant="outline" size="sm">
												<Link href="/inscription">
													<UserPlus className="size-4" />
													Créer mon compte
												</Link>
											</Button>
										</div>
									</CardContent>
								</Card>
							)}

							{/* Actions */}
							<div className="flex flex-col gap-3 pt-4 sm:flex-row">
								{session && order ? (
									<Button asChild size="lg" className="flex-1">
										<Link href={`/commandes/${order.orderNumber}`}>
											<Package className="mr-2 size-4" />
											Suivre ma commande
										</Link>
									</Button>
								) : null}
								<Button asChild variant="outline" size="lg" className="flex-1">
									<Link href="/produits">Continuer mes achats</Link>
								</Button>
							</div>
						</CardContent>
					</Card>

					{/* Message de support */}
					<div className="mt-8 space-y-2 text-center">
						<p className="text-muted-foreground text-sm">Une question sur ta commande ?</p>
						<Button asChild variant="link">
							<Link href="mailto:contact@synclune.fr">Écris-moi</Link>
						</Button>
					</div>
				</div>
			</section>
		</div>
	);
}
